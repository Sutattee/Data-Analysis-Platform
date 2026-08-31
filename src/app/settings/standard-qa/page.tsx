"use client";

import { useMemo, useRef, useState } from "react";
import {
  standardQaList,
  QA_DOMAINS,
  StandardQaItem,
} from "@/lib/mock-data/standard-qa";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";

const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";
const textareaCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

// 表单状态（相似问法按条目增删改）
interface FormState {
  question: string;
  domain: string;
  answer: string;
  similarList: string[];
}

const EMPTY_FORM: FormState = {
  question: "",
  domain: QA_DOMAINS[1],
  answer: "",
  similarList: [],
};

function toFormState(item: StandardQaItem): FormState {
  return {
    question: item.question,
    domain: item.domain,
    answer: item.answer,
    similarList: [...item.similarQuestions],
  };
}

// 取当前最大编号（qa-01 → 1），用于生成新条目编号
function maxIdNum(items: StandardQaItem[]): number {
  return items.reduce((m, it) => {
    const n = parseInt(it.id.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
}

function nowText(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 批量导入失败明细行（行号为 Excel 中的实际行号，含表头偏移）
interface ImportFailRow {
  rowNo: number;
  question: string;
  answer: string;
  similar: string;
  domain: string;
  reason: string;
}

interface ImportResult {
  okCount: number;
  fails: ImportFailRow[];
}

export default function StandardQaPage() {
  const toast = useToast();
  const [items, setItems] = useState<StandardQaItem[]>(() =>
    JSON.parse(JSON.stringify(standardQaList))
  );

  // 查询与筛选
  const [fKey, setFKey] = useState("");
  const [fDomain, setFDomain] = useState("all");

  // 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 查看 / 表单 / 删除
  const [viewItem, setViewItem] = useState<StandardQaItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<StandardQaItem | null>(null);

  // 批量导入
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [dupMode, setDupMode] = useState<"skip" | "overwrite">("skip");
  const [importStep, setImportStep] = useState<"upload" | "result">("upload");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // 默认按更新时间倒序
  const filtered = useMemo(() => {
    const kw = fKey.trim().toLowerCase();
    return items
      .filter((it) => {
        if (fDomain !== "all" && it.domain !== fDomain) return false;
        if (kw) {
          const hay = [it.question, ...it.similarQuestions].join(" ").toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [items, fKey, fDomain]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function resetFilters() {
    setFKey("");
    setFDomain("all");
    setPage(1);
  }

  // ========== 新增 / 编辑 ==========

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(item: StandardQaItem) {
    setEditingId(item.id);
    setForm(toFormState(item));
    setErrors({});
    setViewItem(null);
    setFormOpen(true);
  }

  function updateSimilar(idx: number, value: string) {
    setForm((f) => ({
      ...f,
      similarList: f.similarList.map((s, i) => (i === idx ? value : s)),
    }));
  }

  function removeSimilar(idx: number) {
    setForm((f) => ({ ...f, similarList: f.similarList.filter((_, i) => i !== idx) }));
  }

  function saveForm() {
    const question = form.question.trim();
    const answer = form.answer.trim();
    // 自动过滤空白相似问法，并去除当前 FAQ 内的重复问法
    const similar = Array.from(
      new Set(form.similarList.map((s) => s.trim()).filter(Boolean))
    );

    const errs: Record<string, string> = {};
    if (!question) errs.question = "标准问题不能为空";
    if (!answer) errs.answer = "标准答案不能为空";
    // 同一业务域内的标准问题不得重复
    if (
      question &&
      items.some(
        (o) => o.id !== editingId && o.domain === form.domain && o.question === question
      )
    ) {
      errs.question = `「${form.domain}」业务域内已存在相同的标准问题`;
    }
    // 相似问法与已有标准问题或相似问法完全重复时提示冲突
    const conflicts = similar.filter((s) =>
      items.some(
        (o) =>
          o.id !== editingId &&
          (o.question === s || o.similarQuestions.includes(s))
      )
    );
    if (conflicts.length > 0) {
      errs.similar = `相似问法存在冲突：「${conflicts.join("」「")}」与已有标准问题或相似问法完全重复`;
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setTimeout(() => {
      const now = nowText();
      if (editingId) {
        // 保存后同步更新匹配数据（标准问答库即匹配数据源）
        setItems((prev) =>
          prev.map((o) =>
            o.id === editingId
              ? {
                  ...o,
                  question,
                  answer,
                  similarQuestions: similar,
                  domain: form.domain,
                  updatedBy: "管理员",
                  updatedAt: now,
                }
              : o
          )
        );
        toast("标准问答已更新，匹配数据已同步", "success");
      } else {
        const nextNum = maxIdNum(items) + 1;
        setItems((prev) => [
          {
            id: `qa-${String(nextNum).padStart(2, "0")}`,
            question,
            answer,
            similarQuestions: similar,
            domain: form.domain,
            hitCount: 0,
            createdBy: "管理员",
            createdAt: now,
            updatedBy: "管理员",
            updatedAt: now,
          },
          ...prev,
        ]);
        toast("已新增标准问答，匹配数据已同步", "success");
      }
      setSaving(false);
      setFormOpen(false);
    }, 400);
  }

  // ========== 查看 / 删除 ==========

  function confirmDelete() {
    if (!deleteItem) return;
    setItems((prev) => prev.filter((o) => o.id !== deleteItem.id));
    setDeleteItem(null);
    toast("已删除，该问答不再参与智能问答匹配", "success");
  }

  // ========== 批量导入 ==========

  function openImport() {
    setImportStep("upload");
    setImportFile(null);
    setFileError("");
    setImportResult(null);
    setDupMode("skip");
    setImportOpen(true);
  }

  function closeImport() {
    setImportOpen(false);
    setImportFile(null);
    setFileError("");
    setImporting(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setImportFile(f);
    setFileError("");
    // 允许重复选择同一文件
    e.target.value = "";
  }

  // 下载标准问题模板
  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["标准问题", "标准答案", "相似问法", "所属业务域"],
      [
        "什么是设备综合效率（OEE）？",
        "设备综合效率（OEE）是评价设备运行效率的综合指标，通常由时间开动率、性能开动率和合格品率相乘得出。",
        "OEE是什么意思？\n设备综合效率如何计算？",
        "生产管理",
      ],
      [
        "什么是单箱卷烟综合能耗？",
        "单箱卷烟综合能耗是一定统计周期内卷烟综合能源消耗量与卷烟产量的比值，用于评价单位产品的综合能源利用水平。",
        "单箱综合能耗是什么意思？",
        "能源管理",
      ],
    ]);
    ws["!cols"] = [{ wch: 30 }, { wch: 60 }, { wch: 36 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "标准问答");
    XLSX.writeFile(wb, "标准问题模板.xlsx");
  }

  // 确认导入：校验文件 → 解析 → 逐行校验 → 展示结果
  async function confirmImport() {
    if (!importFile) {
      setFileError("上传文件不能为空");
      return;
    }
    if (!importFile.name.toLowerCase().endsWith(".xlsx")) {
      setFileError("仅支持.xlsx格式");
      return;
    }
    if (importFile.size > 50 * 1024 * 1024) {
      setFileError("文件大小不超过50MB");
      return;
    }

    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await importFile.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (rows.length === 0) {
        setFileError("未识别到可导入的数据，请检查文件内容");
        return;
      }

      const now = nowText();
      const accepted: StandardQaItem[] = [];
      const fails: ImportFailRow[] = [];
      let nextNum = maxIdNum(items);

      rows.forEach((raw, idx) => {
        const rowNo = idx + 2; // Excel 行号（含表头）
        const question = String(raw["标准问题"] ?? "").trim();
        const answer = String(raw["标准答案"] ?? "").trim();
        const similarTxt = String(raw["相似问法"] ?? "")
          .split(/\r?\n|；|;/)
          .map((s) => s.trim())
          .filter(Boolean);
        const similar = Array.from(new Set(similarTxt));
        const domain = String(raw["所属业务域"] ?? "").trim();

        let reason = "";
        if (!question) reason = "标准问题不能为空";
        else if (!answer) reason = "标准答案不能为空";
        else if (!QA_DOMAINS.includes(domain))
          reason = `所属业务域无效（可选：${QA_DOMAINS.join("、")}）`;

        if (reason) {
          fails.push({
            rowNo,
            question,
            answer,
            similar: similarTxt.join("\n"),
            domain,
            reason,
          });
          return;
        }

        // 重名处理：跳过同名问题（记为失败）/ 覆盖已有同名问题（保留原 id，更新内容与更新时间）
        const existing = items.find((o) => o.domain === domain && o.question === question);
        const acceptedIdx = accepted.findIndex(
          (o) => o.domain === domain && o.question === question
        );

        if (dupMode === "skip" && (existing || acceptedIdx !== -1)) {
          fails.push({
            rowNo,
            question,
            answer,
            similar: similarTxt.join("\n"),
            domain,
            reason: "同一业务域内已存在相同的标准问题",
          });
          return;
        }

        const base = existing ?? (acceptedIdx !== -1 ? accepted[acceptedIdx] : null);
        const entry: StandardQaItem = base
          ? { ...base, answer, similarQuestions: similar, updatedBy: "管理员", updatedAt: now }
          : {
              id: `qa-${String((nextNum += 1)).padStart(2, "0")}`,
              question,
              answer,
              similarQuestions: similar,
              domain,
              hitCount: 0,
              createdBy: "管理员",
              createdAt: now,
              updatedBy: "管理员",
              updatedAt: now,
            };
        if (acceptedIdx !== -1) accepted[acceptedIdx] = entry;
        else accepted.push(entry);
      });

      // 覆盖模式下同名条目按 id 替换原有记录，其余新增在前
      if (accepted.length > 0) {
        const acceptedIds = new Set(accepted.map((a) => a.id));
        setItems((prev) => [...accepted, ...prev.filter((p) => !acceptedIds.has(p.id))]);
      }
      setImportResult({ okCount: accepted.length, fails });
      setImportStep("result");
    } catch {
      setFileError("文件解析失败，请确认为有效的 .xlsx 文件");
    } finally {
      setImporting(false);
    }
  }

  // 下载导入失败明细
  async function downloadFailDetail() {
    if (!importResult) return;
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["行号", "标准问题", "标准答案", "相似问法", "所属业务域", "失败原因"],
      ...importResult.fails.map((f) => [
        f.rowNo,
        f.question,
        f.answer,
        f.similar,
        f.domain,
        f.reason,
      ]),
    ]);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 60 },
      { wch: 36 },
      { wch: 14 },
      { wch: 36 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "失败明细");
    XLSX.writeFile(wb, "标准问答导入失败明细.xlsx");
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";
  const td = "px-4 py-3 text-sm align-top";
  const actionLink = "text-xs text-primary-600 hover:underline";

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <h1 className="text-xl font-bold text-gray-900">标准问答</h1>

      {/* 查询与筛选 + 操作按钮（上下对齐） */}
      <Card padding={false}>
        <div className="flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-64">
              <Input
                label="问题关键词"
                value={fKey}
                onChange={(e) => {
                  setFKey(e.target.value);
                  setPage(1);
                }}
                placeholder="按标准问题 / 相似问法模糊查询"
              />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-xs text-gray-500">所属业务域</label>
              <select
                value={fDomain}
                onChange={(e) => {
                  setFDomain(e.target.value);
                  setPage(1);
                }}
                className={selectCls}
              >
                <option value="all">全部</option>
                {QA_DOMAINS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <Button variant="secondary" onClick={resetFilters}>重置</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openImport}>📥 批量导入</Button>
            <Button onClick={openCreate}>➕ 新增</Button>
          </div>
        </div>
      </Card>

      {/* 列表（默认按更新时间倒序 + 分页） */}
      <Card padding={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3">
          <div className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-800">{filtered.length}</span> 条
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>标准问题</th>
                <th className={th}>标准答案</th>
                <th className={th}>相似问法</th>
                <th className={th}>所属业务域</th>
                <th className={th}>更新人</th>
                <th className={th}>更新时间</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                paged.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50">
                    {/* 标准问题：单行省略，悬停查看全文 */}
                    <td className={td}>
                      <div
                        className="max-w-[220px] truncate font-medium text-gray-800"
                        title={it.question}
                      >
                        {it.question}
                      </div>
                    </td>
                    {/* 标准答案：最多两行省略 */}
                    <td className={td}>
                      <div className="line-clamp-2 max-w-[280px] text-gray-600" title={it.answer}>
                        {it.answer}
                      </div>
                    </td>
                    {/* 相似问法：单行展示，超出省略 */}
                    <td className={td}>
                      {it.similarQuestions.length > 0 ? (
                        <div
                          className="max-w-[180px] truncate text-gray-700"
                          title={it.similarQuestions.join("；")}
                        >
                          {it.similarQuestions.join("；")}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className={td}>
                      <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {it.domain}
                      </span>
                    </td>
                    <td className={`${td} text-gray-600`}>{it.updatedBy}</td>
                    <td className={`${td} whitespace-nowrap font-mono text-xs text-gray-500`}>
                      {it.updatedAt}
                    </td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <div className="inline-flex items-center gap-3">
                        <button onClick={() => setViewItem(it)} className={actionLink}>查看</button>
                        <button onClick={() => openEdit(it)} className={actionLink}>编辑</button>
                        <button
                          onClick={() => setDeleteItem(it)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          <Pagination
            total={filtered.length}
            page={safePage}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {/* 查看抽屉 */}
      <Drawer
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title="查看标准问答"
        width={600}
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setViewItem(null)}>关闭</Button>
          </div>
        }
      >
        {viewItem && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs text-gray-400">所属业务域</p>
                <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {viewItem.domain}
                </span>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-400">创建人 / 创建时间</p>
                <p className="text-gray-700">{viewItem.createdBy} · {viewItem.createdAt}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-400">更新人 / 更新时间</p>
                <p className="text-gray-700">{viewItem.updatedBy} · {viewItem.updatedAt}</p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-gray-400">标准问题</p>
              <p className="text-sm font-medium text-gray-800">{viewItem.question}</p>
            </div>

            <div>
              <p className="mb-1 text-xs text-gray-400">标准答案</p>
              <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                {viewItem.answer}
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-gray-400">
                全部相似问法（{viewItem.similarQuestions.length} 条）
              </p>
              {viewItem.similarQuestions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {viewItem.similarQuestions.map((q) => (
                    <span
                      key={q}
                      className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                    >
                      {q}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">暂无</p>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* 新增 / 编辑抽屉 */}
      <Drawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "编辑标准问答" : "新增标准问答"}
        width={560}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={saveForm} disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="标准问题"
            required
            value={form.question}
            error={errors.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            placeholder="用户最常见、最规范的问题表述"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              所属业务域<span className="ml-0.5 text-red-500">*</span>
            </label>
            <select
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              className={selectCls}
            >
              {QA_DOMAINS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">单选，用于限定 FAQ 的适用业务范围</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              标准答案<span className="ml-0.5 text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              placeholder="FAQ 命中后直接返回的标准回答"
              className={`${textareaCls} ${errors.answer ? "border-red-400 focus:ring-red-400" : ""}`}
            />
            {errors.answer && <p className="mt-1 text-xs text-red-500">{errors.answer}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">相似问法</label>
            <div className="space-y-2">
              {form.similarList.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={s}
                    onChange={(e) => updateSimilar(idx, e.target.value)}
                    placeholder={`相似问法 ${idx + 1}（与标准问题语义相同的其他表达）`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSimilar(idx)}
                    title="删除该条相似问法"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, similarList: [...f.similarList, ""] }))}
                className="text-sm text-primary-600 hover:underline"
              >
                ➕ 添加相似问法
              </button>
            </div>
            {errors.similar && <p className="mt-1 text-xs text-red-500">{errors.similar}</p>}
          </div>
        </div>
      </Drawer>

      {/* 删除二次确认 */}
      <Modal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="删除标准问答"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          确定要删除「{deleteItem?.question}」吗？删除后该标准问答不再参与智能问答匹配，且无法恢复。
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteItem(null)}>取消</Button>
          <Button variant="danger" onClick={confirmDelete}>确认删除</Button>
        </div>
      </Modal>

      {/* 批量导入弹窗 */}
      <Modal open={importOpen} onClose={closeImport} title="本地导入" size="md">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleFileChange}
        />

        {importStep === "upload" ? (
          <div className="space-y-3">
            {/* 重名处理 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">重名处理</label>
              <div className="flex gap-5">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                  <input type="radio" checked={dupMode === "skip"} onChange={() => setDupMode("skip")} className="accent-primary-600" />
                  跳过同名问题
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                  <input type="radio" checked={dupMode === "overwrite"} onChange={() => setDupMode("overwrite")} className="accent-primary-600" />
                  覆盖已有同名问题
                </label>
              </div>
            </div>

            {/* 上传区域 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 transition-colors hover:border-primary-400 hover:bg-primary-50/40"
            >
              <span className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
                点击上传
              </span>
              <p className="text-xs text-gray-400">支持.xlsx格式，文件大小不超过50MB</p>
              {importFile && (
                <p className="max-w-full truncate text-sm text-gray-700">
                  已选择：{importFile.name}
                </p>
              )}
            </div>
            {fileError && <p className="text-xs text-red-500">{fileError}</p>}
            {/* 模板下载 */}
            <button
              type="button"
              onClick={downloadTemplate}
              className="text-sm text-blue-600 hover:underline"
            >
              下载标准问题模板.xlsx
            </button>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeImport}>取消</Button>
              <Button onClick={confirmImport} disabled={importing}>
                {importing ? "导入中…" : "确认"}
              </Button>
            </div>
          </div>
        ) : (
          importResult && (
            <div className="space-y-4">
              {/* 导入结果统计 */}
              <div className="flex gap-4">
                <div className="flex-1 rounded-lg bg-green-50 px-4 py-3 text-sm text-gray-600">
                  成功导入 <span className="text-lg font-bold text-green-600">{importResult.okCount}</span> 条
                </div>
                <div className="flex-1 rounded-lg bg-red-50 px-4 py-3 text-sm text-gray-600">
                  失败 <span className="text-lg font-bold text-red-500">{importResult.fails.length}</span> 条
                </div>
              </div>

              {/* 失败明细 */}
              {importResult.fails.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">失败原因明细</p>
                    <button
                      type="button"
                      onClick={downloadFailDetail}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      下载失败明细
                    </button>
                  </div>
                  <div className="max-h-56 overflow-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="border-b border-gray-100">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">行号</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">标准问题</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">失败原因</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {importResult.fails.map((f) => (
                          <tr key={f.rowNo}>
                            <td className="px-3 py-2 text-xs text-gray-500">{f.rowNo}</td>
                            <td className="max-w-[180px] truncate px-3 py-2 text-gray-700" title={f.question}>
                              {f.question || "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-red-500">{f.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={closeImport}>关闭</Button>
              </div>
            </div>
          )
        )}
      </Modal>
    </div>
  );
}
