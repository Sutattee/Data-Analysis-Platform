"use client";

// 指标管理列表：搜索 + 业务域筛选 + 导入 + 列表（操作：查看 / 编辑 / 删除）
// 新增指标 / 编辑指标：右上角「新增指标」与操作列「编辑」→ 右侧滑出窗口；
// 业务域为下拉选择（字典来自业务域管理），关联数据表支持多选。
// 已下线：负责人字段、达标反推设置入口（ReverseSettingsDrawer 组件代码保留）。
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { metricList, METRIC_SOURCE_TABLES } from "@/lib/mock-data/metric-management";
import { BUSINESS_DOMAINS_SEED } from "@/lib/mock-data/business-domains";
import type { MetricManage } from "@/types";

// 只读字段
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1 break-words">{value ?? "—"}</span>
    </div>
  );
}

// 多行文本表单项（与 Input 样式一致）
function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none"
      />
    </div>
  );
}

// 关联数据表选择器：点击展开下拉菜单，先选择数据源，再展开勾选该数据源下的数据表；
// 数据源与数据表均支持多选（已选项以 chip 展示在触发框内，✕ 可移除）。
function SourceTableSelector({
  selectedSources,
  selectedTables,
  onToggleSource,
  onToggleTable,
}: {
  selectedSources: string[];
  selectedTables: string[];
  onToggleSource: (s: string) => void;
  onToggleTable: (t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // 点击组件外部关闭下拉
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const toggleExpand = (s: string) =>
    setExpanded((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <div className="w-full relative" ref={ref}>
      <label className="block text-sm font-medium text-gray-700 mb-1">关联数据表</label>
      {/* 触发框：已选数据源 / 数据表 chips */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[42px] px-2.5 py-1.5 pr-2 border border-gray-300 rounded-lg text-left bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 flex items-center flex-wrap gap-1.5"
      >
        {selectedSources.length === 0 && selectedTables.length === 0 ? (
          <span className="text-sm text-gray-400 px-0.5">点击选择数据源与数据表</span>
        ) : (
          <>
            {selectedSources.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs whitespace-nowrap"
              >
                📁 {s}
                <span
                  className="cursor-pointer hover:text-primary-900"
                  onClick={(e) => { e.stopPropagation(); onToggleSource(s); }}
                >
                  ✕
                </span>
              </span>
            ))}
            {selectedTables.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-xs font-mono whitespace-nowrap"
              >
                {t}
                <span
                  className="cursor-pointer hover:text-gray-900"
                  onClick={(e) => { e.stopPropagation(); onToggleTable(t); }}
                >
                  ✕
                </span>
              </span>
            ))}
          </>
        )}
        <span className="ml-auto text-gray-400 text-xs flex-shrink-0 px-1">▾</span>
      </button>

      {/* 下拉：数据源列表 → 展开该数据源下的数据表 */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-gray-200 bg-white shadow-lg max-h-72 overflow-y-auto">
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100 bg-white sticky top-0">
            勾选数据源关联整库，点击数据源展开并勾选数据表（均支持多选）
          </div>
          {METRIC_SOURCE_TABLES.map((g) => (
            <div key={g.source}>
              <div
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer select-none"
                onClick={() => toggleExpand(g.source)}
              >
                <input
                  type="checkbox"
                  checked={selectedSources.includes(g.source)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSource(g.source)}
                  className="w-3.5 h-3.5 accent-primary-600"
                />
                <span className="text-sm text-gray-700 flex-1">📁 {g.source}</span>
                <span className="text-xs text-gray-400">{g.tables.length} 张表</span>
                <span className="text-gray-400 text-xs w-4 text-center">{expanded.includes(g.source) ? "▾" : "▸"}</span>
              </div>
              {expanded.includes(g.source) &&
                g.tables.map((t) => (
                  <label key={t} className="flex items-center gap-2 pl-10 pr-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(t)}
                      onChange={() => onToggleTable(t)}
                      className="w-3.5 h-3.5 accent-primary-600"
                    />
                    <span className="text-xs font-mono text-gray-600">{t}</span>
                  </label>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 指标排序：单箱综合能耗（m7）/ 单位产量碳排放量（m1）固定前两项，其余保持原序
function sortMetrics(list: MetricManage[]): MetricManage[] {
  const order = ["m7", "m1"];
  return [...list].sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return 0;
  });
}

// 新增/编辑表单字段
interface MetricForm {
  nameCn: string;
  code: string;
  domain: string;
  definition: string;
  formula: string;
  calcFormula: string;
  unit: string;
  synonyms: string;
  sources: string[];
  tables: string[];
}

const EMPTY_FORM: MetricForm = {
  nameCn: "",
  code: "",
  domain: "",
  definition: "",
  formula: "",
  calcFormula: "",
  unit: "",
  synonyms: "",
  sources: [],
  tables: [],
};

// 当前时间 YYYY-MM-DD HH:mm
function nowStr() {
  return new Date().toLocaleString("sv-SE").slice(0, 16);
}

export default function MetricManagementPage() {
  const toast = useToast();
  const [metrics, setMetrics] = useState<MetricManage[]>(() =>
    sortMetrics(metricList.map((m) => ({ ...m })))
  );

  // 搜索 + 业务域筛选
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [domainFilter, setDomainFilter] = useState("全部");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // 导入
  const [importOpen, setImportOpen] = useState(false);
  const [dupMode, setDupMode] = useState<"skip" | "overwrite">("skip");
  const [file, setFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");

  // 详情 / 删除
  const [detailTarget, setDetailTarget] = useState<MetricManage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MetricManage | null>(null);

  // 新增/编辑表单（formEditing 非空 = 编辑，空 = 新增）
  const [formOpen, setFormOpen] = useState(false);
  const [formEditing, setFormEditing] = useState<MetricManage | null>(null);
  const [form, setForm] = useState<MetricForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof MetricForm, string>>>({});

  function confirmDelete() {
    if (!deleteTarget) return;
    setMetrics((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    toast("已删除", "success");
    setDeleteTarget(null);
  }

  const filtered = useMemo(() => {
    const kw = applied.trim().toLowerCase();
    return metrics.filter((m) => {
      if (kw && !(m.nameCn.toLowerCase().includes(kw) || m.code.toLowerCase().includes(kw))) return false;
      if (domainFilter !== "全部" && m.domain !== domainFilter) return false;
      return true;
    });
  }, [metrics, applied, domainFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSearch() { setApplied(keyword); setPage(1); }
  function handleReset() { setKeyword(""); setApplied(""); setDomainFilter("全部"); setPage(1); }

  // 下载模板（生成 csv 内容，模拟 xlsx 模板；表头与指标详情字段一致）
  function downloadTemplate() {
    const header = "指标中文名称,指标编码,业务域,业务定义,统计口径,计算公式,默认聚合,派生公式,数据源ID,主表,度量表达式,小数位数,度量单位,支持维度,统计对象,统计粒度,数据更新频率,同义词(选填),负责人,描述(选填)\n";
    const sample = "总利润,I_FIN_001,产品销售,,按月汇总收入总额与成本费用总额后相减,收入总额-成本费用总额,求和,income_total - cost_total,ds_finance_dw,ads_profit,SUM(income_total) - SUM(cost_total),2,元,时间、组织、产品,什邡卷烟厂,月,月,,Frank,\n";
    const blob = new Blob(["﻿" + header + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "指标模板.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(f: File | null) {
    setImportError("");
    if (!f) { setFile(null); return; }
    const isXlsx = f.name.endsWith(".xlsx");
    if (!isXlsx) { setImportError("仅支持.xlsx格式"); return; }
    if (f.size > 50 * 1024 * 1024) { setImportError("文件大小不超过50MB"); return; }
    setFile(f);
  }

  function handleImportConfirm() {
    if (!file) { setImportError("上传文件不能为空"); return; }
    toast(`已导入指标文件（${dupMode === "skip" ? "跳过同名" : "覆盖同名"}）`, "success");
    setImportOpen(false);
    setFile(null);
    setImportError("");
  }

  // ===== 新增/编辑 =====
  function openCreate() {
    setFormEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(m: MetricManage) {
    setFormEditing(m);
    setForm({
      nameCn: m.nameCn,
      code: m.code,
      domain: m.domain,
      definition: m.definition ?? "",
      formula: m.formula ?? "",
      calcFormula: m.calcFormula ?? "",
      unit: m.unit ?? "",
      synonyms: m.synonyms ?? "",
      sources: m.relatedSources ?? [],
      // 旧数据只有单个主表，编辑时转换为多选
      tables: m.relatedTables ?? (m.mainTable ? [m.mainTable] : []),
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function setField<K extends keyof MetricForm>(key: K, value: MetricForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleTable(t: string) {
    setForm((prev) => ({
      ...prev,
      tables: prev.tables.includes(t) ? prev.tables.filter((x) => x !== t) : [...prev.tables, t],
    }));
  }

  function toggleSource(s: string) {
    setForm((prev) => ({
      ...prev,
      sources: prev.sources.includes(s) ? prev.sources.filter((x) => x !== s) : [...prev.sources, s],
    }));
  }

  function handleFormSave() {
    const nameCn = form.nameCn.trim();
    const code = form.code.trim();
    const errors: Partial<Record<keyof MetricForm, string>> = {};
    if (!nameCn) errors.nameCn = "请输入指标中文名称";
    if (!code) errors.code = "请输入指标编码";
    else if (metrics.some((m) => m.code === code && m.id !== formEditing?.id)) errors.code = "指标编码已存在";
    if (!form.domain) errors.domain = "请选择业务域";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (formEditing) {
      const patch = {
        nameCn,
        code,
        domain: form.domain,
        definition: form.definition.trim(),
        formula: form.formula.trim(),
        calcFormula: form.calcFormula.trim(),
        unit: form.unit.trim(),
        synonyms: form.synonyms.trim(),
        mainTable: form.tables[0],
        relatedSources: form.sources,
        relatedTables: form.tables,
      };
      setMetrics((prev) => prev.map((m) => (m.id === formEditing.id ? { ...m, ...patch, updatedAt: nowStr() } : m)));
      // 详情抽屉若正展示同一指标，同步刷新
      setDetailTarget((prev) => (prev && prev.id === formEditing.id ? { ...prev, ...patch, updatedAt: nowStr() } : prev));
      toast("指标修改成功", "success");
    } else {
      const next: MetricManage = {
        id: `m-${Date.now().toString(36)}`,
        nameCn,
        nameEn: "",
        code,
        domain: form.domain,
        definition: form.definition.trim(),
        formula: form.formula.trim(),
        decimals: 2,
        unit: form.unit.trim(),
        synonyms: form.synonyms.trim(),
        dimensions: "",
        statObject: "",
        statGranularity: "",
        updateFrequency: "",
        owner: "",
        createdAt: nowStr(),
        updatedAt: nowStr(),
        calcFormula: form.calcFormula.trim(),
        mainTable: form.tables[0],
        relatedSources: form.sources,
        relatedTables: form.tables,
      };
      setMetrics((prev) => [next, ...prev]);
      // 清空筛选并回到第一页，保证新增行立即可见
      setKeyword("");
      setApplied("");
      setDomainFilter("全部");
      setPage(1);
      toast("指标新增成功", "success");
    }
    setFormOpen(false);
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">指标管理</h1>
      </div>

      {/* 搜索 + 业务域筛选 + 导入 */}
      <Card padding>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="搜索指标中文名称/指标编码"
            className="flex-1 min-w-[260px] max-w-[360px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          {/* 业务域筛选：默认全部 */}
          <select
            value={domainFilter}
            onChange={(e) => { setDomainFilter(e.target.value); setPage(1); }}
            className="w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-all duration-200"
          >
            <option value="全部">业务域：全部</option>
            {BUSINESS_DOMAINS_SEED.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
          <div className="ml-auto flex gap-2">
            <Button onClick={openCreate}>+ 新增指标</Button>
            <Button variant="secondary" onClick={() => { setImportOpen(true); setFile(null); setImportError(""); }}>导入指标</Button>
          </div>
        </div>
      </Card>

      {/* 指标列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>指标中文名称</th>
                <th className={th}>指标编码</th>
                <th className={th}>业务域</th>
                <th className={th}>同义词</th>
                <th className={th}>描述</th>
                <th className={th}>创建时间</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-gray-400">暂无数据</td></tr>
              ) : paged.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.nameCn}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{m.code}</td>
                  <td className="px-4 py-3 text-gray-600">{m.domain}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px]"><div className="truncate" title={m.synonyms}>{m.synonyms || "—"}</div></td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px]"><div className="truncate" title={m.description}>{m.description}</div></td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{m.createdAt}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setDetailTarget(m)}>查看</Button>
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => openEdit(m)}>编辑</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget(m)}
                      >
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination total={total} page={safePage} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </Card>

      {/* 导入指标弹窗 */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="本地导入">
        <div className="space-y-4">
          {/* 重名处理 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">重名处理</label>
            <div className="flex gap-5">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                <input type="radio" checked={dupMode === "skip"} onChange={() => setDupMode("skip")} className="accent-primary-600" />
                跳过同名指标
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                <input type="radio" checked={dupMode === "overwrite"} onChange={() => setDupMode("overwrite")} className="accent-primary-600" />
                覆盖已有同名指标
              </label>
            </div>
          </div>

          {/* 上传文件 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">上传文件</label>
            <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
              <span className="text-3xl text-gray-300 mb-2">📁</span>
              <span className="text-sm text-primary-600 font-medium">点击上传</span>
              {file && <span className="text-xs text-gray-500 mt-1">{file.name}</span>}
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
            </label>
            <div className="text-xs text-gray-400 mt-1.5">支持.xlsx格式，文件大小不超过50MB</div>
            <div className="mt-1.5">
              <button onClick={downloadTemplate} className="text-sm text-primary-600 hover:text-primary-700">下载指标模板.xlsx</button>
            </div>
            {importError && <p className="mt-1.5 text-xs text-red-500">{importError}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>取消</Button>
            <Button onClick={handleImportConfirm}>确认</Button>
          </div>
        </div>
      </Modal>

      {/* 指标详情抽屉（仅基础信息） */}
      <Drawer
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        title="指标详情"
        width={560}
        footer={
          <div className="flex">
            <Button onClick={() => setDetailTarget(null)}>取消</Button>
          </div>
        }
      >
        {detailTarget && (
          <div className="space-y-3">
            {/* 基础信息 */}
            <div className="text-sm font-semibold text-gray-800">基础信息</div>
            <Field label="指标中文名称" value={detailTarget.nameCn} />
            <Field label="指标编码" value={<code className="text-xs">{detailTarget.code}</code>} />
            <Field
              label="指标类型"
              value={detailTarget.metricType ? `${detailTarget.metricType}（${detailTarget.metricType === "atomic" ? "原子" : "派生"}）` : undefined}
            />
            <Field label="业务域" value={detailTarget.domain} />
            <Field label="业务定义" value={detailTarget.definition} />
            <Field label="统计口径" value={detailTarget.formula} />
            <Field label="计算公式" value={detailTarget.calcFormula} />
            <Field label="默认聚合" value={detailTarget.defaultAgg} />
            <Field label="派生公式" value={<code className="text-xs break-all">{detailTarget.derivedFormula}</code>} />
            <Field label="数据源ID" value={<code className="text-xs">{detailTarget.sourceId}</code>} />
            <Field label="关联数据源" value={detailTarget.relatedSources?.join("、")} />
            <Field
              label="关联数据表"
              value={
                <code className="text-xs break-all">
                  {detailTarget.relatedTables?.length ? detailTarget.relatedTables.join("、") : detailTarget.mainTable}
                </code>
              }
            />
            <Field label="度量表达式" value={<code className="text-xs break-all">{detailTarget.measureExpr}</code>} />
            <Field label="小数位数" value={String(detailTarget.decimals)} />
            <Field label="度量单位" value={detailTarget.unit} />
            <Field label="支持维度" value={detailTarget.dimensions} />
            <Field label="统计对象" value={detailTarget.statObject} />
            <Field label="统计粒度" value={detailTarget.statGranularity} />
            <Field label="数据更新频率" value={detailTarget.updateFrequency} />
            <Field label="同义词（选填）" value={detailTarget.synonyms} />
            <Field label="描述（选填）" value={detailTarget.description} />
          </div>
        )}
      </Drawer>

      {/* 新增/编辑指标抽屉：业务域下拉选择、关联数据表多选 */}
      <Drawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={formEditing ? "编辑指标" : "新增指标"}
        width={560}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleFormSave}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="指标中文名称"
            required
            value={form.nameCn}
            onChange={(e) => setField("nameCn", e.target.value)}
            placeholder="例如：单箱综合能耗"
            error={formErrors.nameCn}
          />
          <Input
            label="指标编码"
            required
            value={form.code}
            onChange={(e) => setField("code", e.target.value)}
            placeholder="例如：I_ENG_002"
            error={formErrors.code}
          />
          <Input
            label="同义词（选填）"
            value={form.synonyms}
            onChange={(e) => setField("synonyms", e.target.value)}
            placeholder="多个同义词用顿号分隔"
          />
          <Input
            label="度量单位"
            value={form.unit}
            onChange={(e) => setField("unit", e.target.value)}
            placeholder="例如：公斤标煤/箱"
          />
          {/* 业务域：下拉选择（字典来自业务域管理） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              业务域<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              value={form.domain}
              onChange={(e) => setField("domain", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-all duration-200 ${
                formErrors.domain ? "border-red-400 focus:ring-red-400" : "border-gray-300"
              }`}
            >
              <option value="">请选择业务域</option>
              {BUSINESS_DOMAINS_SEED.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            {formErrors.domain && <p className="mt-1 text-xs text-red-500">{formErrors.domain}</p>}
          </div>
          <TextAreaField
            label="业务定义"
            value={form.definition}
            onChange={(v) => setField("definition", v)}
            rows={3}
            placeholder="指标的业务含义与用途说明"
          />
          <TextAreaField
            label="统计口径"
            value={form.formula}
            onChange={(v) => setField("formula", v)}
            rows={2}
            placeholder="例如：综合能耗（公斤标煤） ÷ 产量（箱）"
          />
          <Input
            label="计算公式"
            value={form.calcFormula}
            onChange={(e) => setField("calcFormula", e.target.value)}
            placeholder="例如：std_coal_total / output_box"
          />
          <SourceTableSelector
            selectedSources={form.sources}
            selectedTables={form.tables}
            onToggleSource={toggleSource}
            onToggleTable={toggleTable}
          />
        </div>
      </Drawer>

      {/* 删除二次确认 */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除指标"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          确定要删除指标「{deleteTarget?.nameCn}」吗？删除后不可恢复。
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="danger" onClick={confirmDelete}>确认删除</Button>
        </div>
      </Modal>
    </div>
  );
}
