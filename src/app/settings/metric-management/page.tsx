"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { metricList } from "@/lib/mock-data/metric-management";
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

export default function MetricManagementPage() {
  const toast = useToast();
  const [metrics, setMetrics] = useState<MetricManage[]>(() => metricList.map((m) => ({ ...m })));

  // 搜索
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // 导入
  const [importOpen, setImportOpen] = useState(false);
  const [dupMode, setDupMode] = useState<"skip" | "overwrite">("skip");
  const [file, setFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");

  // 详情 / 编辑 / 删除
  const [detailTarget, setDetailTarget] = useState<MetricManage | null>(null);
  const [editTarget, setEditTarget] = useState<MetricManage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MetricManage | null>(null);

  const filtered = useMemo(() => {
    const kw = applied.trim().toLowerCase();
    if (!kw) return metrics;
    return metrics.filter(
      (m) => m.nameCn.toLowerCase().includes(kw) || m.nameEn.toLowerCase().includes(kw)
    );
  }, [metrics, applied]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSearch() { setApplied(keyword); setPage(1); }
  function handleReset() { setKeyword(""); setApplied(""); setPage(1); }

  // 下载模板（生成 csv 内容，模拟 xlsx 模板）
  function downloadTemplate() {
    const header = "指标中文名称,指标英文名称,业务域,业务定义,计算口径,小数位数,度量单位,同义词(选填),负责人,描述(选填)\n";
    const sample = "总利润,sum_total_profit,产品销售,,,2,元,,Frank,\n";
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

  // 编辑保存
  function handleEditSave(updated: MetricManage) {
    setMetrics((prev) => prev.map((m) => (m.id === updated.id ? { ...updated, updatedAt: nowStr() } : m)));
    setEditTarget(null);
    toast("保存成功", "success");
  }

  // 删除
  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setMetrics((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    toast("已删除", "success");
    setDeleteTarget(null);
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">指标管理</h1>
      </div>

      {/* 搜索 + 导入 */}
      <Card padding>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="搜索指标中文名称/英文名称"
            className="flex-1 min-w-[260px] max-w-[360px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
          <Button className="ml-auto" onClick={() => { setImportOpen(true); setFile(null); setImportError(""); }}>导入指标</Button>
        </div>
      </Card>

      {/* 指标列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>指标中文名称</th>
                <th className={th}>指标英文名称</th>
                <th className={th}>业务域</th>
                <th className={th}>同义词</th>
                <th className={th}>描述</th>
                <th className={th}>负责人</th>
                <th className={th}>创建时间</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-sm text-gray-400">暂无数据</td></tr>
              ) : paged.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.nameCn}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{m.nameEn}</td>
                  <td className="px-4 py-3 text-gray-600">{m.domain}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px]"><div className="truncate" title={m.synonyms}>{m.synonyms || "—"}</div></td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px]"><div className="truncate" title={m.description}>{m.description}</div></td>
                  <td className="px-4 py-3 text-gray-600">{m.owner}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{m.createdAt}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setDetailTarget(m)}>查看</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditTarget(m)}>编辑</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(m)}>删除</Button>
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

      {/* 指标详情抽屉 */}
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
            <Field label="中文名称" value={detailTarget.nameCn} />
            <Field label="英文名称" value={<code className="text-xs">{detailTarget.nameEn}</code>} />
            <Field label="指标编码" value={detailTarget.code} />
            <Field label="业务域" value={detailTarget.domain} />
            <Field label="业务定义" value={detailTarget.definition} />
            <Field label="计算口径" value={detailTarget.formula} />
            <Field label="小数位数" value={String(detailTarget.decimals)} />
            <Field label="度量单位" value={detailTarget.unit} />
            <Field label="同义词" value={detailTarget.synonyms} />
            <Field label="描述" value={detailTarget.description} />
            <Field label="负责人" value={detailTarget.owner} />
            <Field label="创建时间" value={detailTarget.createdAt} />
            <Field label="更新时间" value={detailTarget.updatedAt} />
          </div>
        )}
      </Drawer>

      {/* 指标编辑抽屉 */}
      {editTarget && (
        <MetricEditDrawer
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
        />
      )}

      {/* 删除确认 */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="删除指标" size="sm">
        <p className="text-sm text-gray-600">是否确认删除指标「{deleteTarget?.nameCn}」？</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>确定</Button>
        </div>
      </Modal>
    </div>
  );
}

function nowStr() {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 指标编辑抽屉
function MetricEditDrawer({
  target, onClose, onSave,
}: { target: MetricManage; onClose: () => void; onSave: (m: MetricManage) => void }) {
  const [form, setForm] = useState<MetricManage>({ ...target });
  function set<K extends keyof MetricManage>(k: K, v: MetricManage[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }
  const labelCls = "block text-xs text-gray-500 mb-1";
  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

  return (
    <Drawer open onClose={onClose} title="编辑指标" width={560}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>指标中文名称</label>
            <input className={inputCls} value={form.nameCn} onChange={(e) => set("nameCn", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>指标英文名称</label>
            <input className={inputCls} value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>指标编码</label>
            <input className={inputCls} value={form.code} onChange={(e) => set("code", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>业务域</label>
            <select className={inputCls} value={form.domain} onChange={(e) => set("domain", e.target.value)}>
              {["生产管理", "质量管理", "能源管理", "物耗管理", "设备管理", "工艺质量", "成本管理"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>小数位数</label>
            <input type="number" min={0} max={6} className={inputCls} value={form.decimals} onChange={(e) => set("decimals", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>度量单位</label>
            <input className={inputCls} value={form.unit} onChange={(e) => set("unit", e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>业务定义</label>
          <textarea rows={2} className={`${inputCls} resize-none`} value={form.definition} onChange={(e) => set("definition", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>计算口径</label>
          <textarea rows={2} className={`${inputCls} resize-none`} value={form.formula} onChange={(e) => set("formula", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>负责人</label>
          <input className={inputCls} value={form.owner} onChange={(e) => set("owner", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>同义词（选填）</label>
          <input className={inputCls} value={form.synonyms ?? ""} onChange={(e) => set("synonyms", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>描述（选填）</label>
          <textarea rows={3} className={`${inputCls} resize-none`} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button onClick={() => onSave(form)}>保存</Button>
      </div>
    </Drawer>
  );
}
