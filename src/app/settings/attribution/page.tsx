"use client";

// 归因配置：能源管理 / 生产管理 / 工艺质量三域归因关系合并展示（仅归因关系，无数据映射）
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import {
  DOMAIN_LABEL_MAP,
  ATTRIBUTION_RELATIONS,
  type AttributionDomainKey,
  type AttributionRelation,
} from "@/lib/mock-data/attribution";

const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

// 详情抽屉只读字段：label 在上、value 在下，单列排布，长文本可自然换行
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="text-sm text-gray-800 break-words">{value ?? "—"}</div>
    </div>
  );
}

// 三域归因关系打平（附 domain 用于业务域筛选与展示）
const DOMAINS = Object.keys(ATTRIBUTION_RELATIONS) as AttributionDomainKey[];
const ALL_RELATIONS: (AttributionRelation & { domain: AttributionDomainKey })[] = DOMAINS.flatMap((d) =>
  ATTRIBUTION_RELATIONS[d].map((r) => ({ ...r, domain: d }))
);

export default function AttributionPage() {
  const toast = useToast();
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [domain, setDomain] = useState<"" | AttributionDomainKey>(""); // "" = 全部业务域
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importOpen, setImportOpen] = useState(false);
  // 查看详情目标
  const [detailTarget, setDetailTarget] = useState<AttributionRelation | null>(null);
  // 删除：二次确认目标 + 会话级已删除 id
  const [deleteTarget, setDeleteTarget] = useState<AttributionRelation | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  function confirmDelete() {
    if (!deleteTarget) return;
    setDeletedIds((prev) => [...prev, deleteTarget.id]);
    toast("已删除", "success");
    setDeleteTarget(null);
  }

  // 归因关系数据（按指标中文名称/指标编码搜索 + 业务域筛选，排除已删除项）
  const source = useMemo(() => {
    const kw = applied.trim().toLowerCase();
    return ALL_RELATIONS.filter(
      (r) =>
        !deletedIds.includes(r.id) &&
        (!domain || r.domain === domain) &&
        (!kw || (r.metricCn + r.metricCode).toLowerCase().includes(kw))
    );
  }, [domain, applied, deletedIds]);

  const total = source.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = source.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSearch() { setApplied(keyword); setPage(1); }
  function handleReset() { setKeyword(""); setApplied(""); setDomain(""); setPage(1); }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <h1 className="text-xl font-bold text-gray-900">归因配置</h1>

      {/* 搜索栏 */}
      <Card padding>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="搜索指标中文名称/指标编码"
            className="flex-1 min-w-[260px] max-w-[420px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <select
            value={domain}
            onChange={(e) => { setDomain(e.target.value as "" | AttributionDomainKey); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          >
            <option value="">全部业务域</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>{DOMAIN_LABEL_MAP[d]}</option>
            ))}
          </select>
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
          <Button className="ml-auto" onClick={() => setImportOpen(true)}>批量导入</Button>
        </div>
      </Card>

      {/* 归因关系列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>业务域</th>
                <th className={th}>指标中文名称</th>
                <th className={th}>指标编码</th>
                <th className={th}>候选因素</th>
                <th className={th}>影响方向</th>
                <th className={th}>影响机制</th>
                <th className={th}>因素属性</th>
                <th className={th}>特殊说明</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-sm text-gray-400">暂无数据</td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{DOMAIN_LABEL_MAP[r.domain]}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.metricCn}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.metricCode}</td>
                    <td className="px-4 py-3 text-gray-700">{r.factor}</td>
                    <td className="px-4 py-3 text-gray-600">{r.influenceDir}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[220px]">
                      <div className="truncate" title={r.mechanism}>{r.mechanism}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.factorAttr}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px]">
                      <div className="truncate" title={r.remark}>{r.remark || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setDetailTarget(r)}>查看</Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(r)}>删除</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination
            total={total}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </Card>

      {/* 批量导入弹窗 */}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={(msg) => { toast(msg, "success"); setImportOpen(false); }}
        />
      )}

      {/* 删除二次确认 */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除归因关系"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          确定要删除「{deleteTarget?.metricCn}｜{deleteTarget?.factor}」这条归因关系吗？删除后不可恢复。
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="danger" onClick={confirmDelete}>确认删除</Button>
        </div>
      </Modal>

      {/* 查看详情抽屉 */}
      <Drawer
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        title="查看详情"
        width={520}
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setDetailTarget(null)}>关闭</Button>
          </div>
        }
      >
        {detailTarget && (
          <div className="space-y-4">
            <Field label="业务域" value={DOMAIN_LABEL_MAP[(detailTarget as AttributionRelation & { domain: AttributionDomainKey }).domain]} />
            <Field label="归因模板名称" value={detailTarget.templateName} />
            <Field label="指标中文名称" value={detailTarget.metricCn} />
            <Field label="指标编码" value={<code className="text-xs">{detailTarget.metricCode}</code>} />
            <Field label="候选因素" value={detailTarget.factor} />
            <Field label="影响方向" value={detailTarget.influenceDir} />
            <Field label="影响机制" value={detailTarget.mechanism} />
            <Field label="因素属性" value={detailTarget.factorAttr} />
            <Field label="特殊说明" value={detailTarget.remark} />
          </div>
        )}
      </Drawer>
    </div>
  );
}

// 批量导入弹窗（归因关系模板）
function ImportModal({
  onClose, onImported,
}: { onClose: () => void; onImported: (msg: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  function handleFileChange(f: File | null) {
    setError("");
    if (!f) { setFile(null); return; }
    if (!f.name.endsWith(".xlsx")) { setError("仅支持.xlsx格式"); return; }
    if (f.size > 50 * 1024 * 1024) { setError("文件大小不超过50MB"); return; }
    setFile(f);
  }

  // 下载模板（生成 csv 内容，模拟 xlsx 模板）
  function downloadTemplate() {
    const header = "指标中文名称,指标编码,候选因素,影响方向,影响机制,因素属性,特殊说明(选填)\n";
    const sample = "制丝车间每公斤电耗,I_ING_001,制丝车间产量,负向,产量下降时固定负荷占比上升单位电耗升高,正常业务驱动,对应制丝除尘纯水系统等重点网格\n";
    const blob = new Blob(["﻿" + header + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "归因关系模板.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleConfirm() {
    if (!file) { setError("上传文件不能为空"); return; }
    onImported("已导入归因关系文件");
    setFile(null);
    setError("");
  }

  return (
    <Modal open onClose={onClose} title="本地导入">
      <div className="space-y-4">
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
            <button onClick={downloadTemplate} className="text-sm text-primary-600 hover:text-primary-700">下载归因关系模板.xlsx</button>
          </div>
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleConfirm}>确认</Button>
        </div>
      </div>
    </Modal>
  );
}
