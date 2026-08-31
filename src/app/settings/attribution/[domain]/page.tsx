"use client";

import { useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import {
  DOMAIN_LABEL_MAP,
  ATTRIBUTION_RELATIONS,
  ATTRIBUTION_MAPPINGS,
  type AttributionDomainKey,
  type AttributionRelation,
  type AttributionMapping,
} from "@/lib/mock-data/attribution";

type TabKey = "relation" | "mapping";

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

function isValidDomain(d: string): d is AttributionDomainKey {
  return d === "energy" || d === "production" || d === "quality";
}

export default function AttributionPage({ params }: { params: { domain: string } }) {
  if (!isValidDomain(params.domain)) notFound();
  const domain: AttributionDomainKey = params.domain;
  const domainLabel = DOMAIN_LABEL_MAP[domain];

  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("relation");
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importOpen, setImportOpen] = useState(false);
  // 查看详情目标（归因关系 / 数据映射 共用，按当前 tab 渲染对应字段）
  const [detailTarget, setDetailTarget] = useState<AttributionRelation | AttributionMapping | null>(null);
  // 删除：二次确认目标 + 会话级已删除 id（两类数据 id 全局唯一，共用一份）
  const [deleteTarget, setDeleteTarget] = useState<AttributionRelation | AttributionMapping | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  function confirmDelete() {
    if (!deleteTarget) return;
    setDeletedIds((prev) => [...prev, deleteTarget.id]);
    toast("已删除", "success");
    setDeleteTarget(null);
  }

  // 当前 tab 的数据（按指标中文名称/指标编码搜索，排除已删除项）
  const source = useMemo(() => {
    const all = tab === "relation" ? ATTRIBUTION_RELATIONS[domain] : ATTRIBUTION_MAPPINGS[domain];
    const kw = applied.trim().toLowerCase();
    return all.filter(
      (r) =>
        !deletedIds.includes(r.id) &&
        (!kw || (r.metricCn + r.metricCode).toLowerCase().includes(kw))
    );
  }, [tab, domain, applied, deletedIds]);

  const total = source.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = source.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSearch() { setApplied(keyword); setPage(1); }
  function handleReset() { setKeyword(""); setApplied(""); setPage(1); }
  function switchTab(t: TabKey) {
    setTab(t);
    setKeyword(""); setApplied(""); setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <h1 className="text-xl font-bold text-gray-900">{domainLabel}</h1>

      {/* tab 页签 */}
      <div className="flex gap-6 border-b border-gray-200">
        {(["relation", "mapping"] as TabKey[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`pb-2 -mb-px border-b-2 text-sm transition-colors ${
                active
                  ? "border-primary-600 text-primary-700 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "relation" ? "归因关系" : "数据映射"}
            </button>
          );
        })}
      </div>

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
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
          <Button className="ml-auto" onClick={() => setImportOpen(true)}>批量导入</Button>
        </div>
      </Card>

      {/* 列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {tab === "relation" ? (
                  <>
                    <th className={th}>指标中文名称</th>
                    <th className={th}>指标编码</th>
                    <th className={th}>候选因素</th>
                    <th className={th}>影响方向</th>
                    <th className={th}>影响机制</th>
                    <th className={th}>因素属性</th>
                    <th className={th}>特殊说明</th>
                    <th className={`${th} text-right`}>操作</th>
                  </>
                ) : (
                  <>
                    <th className={th}>指标中文名称</th>
                    <th className={th}>指标编码</th>
                    <th className={th}>候选因素</th>
                    <th className={th}>关联数据资产</th>
                    <th className={th}>来源数据库</th>
                    <th className={th}>来源表</th>
                    <th className={`${th} text-right`}>操作</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={tab === "relation" ? 8 : 7} className="py-16 text-center text-sm text-gray-400">暂无数据</td>
                </tr>
              ) : tab === "relation" ? (
                (paged as AttributionRelation[]).map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
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
              ) : (
                (paged as AttributionMapping[]).map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.metricCn}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.metricCode}</td>
                    <td className="px-4 py-3 text-gray-700">{r.factor}</td>
                    <td className="px-4 py-3 text-gray-600">{r.dataAsset}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.sourceDb}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.sourceTable}</td>
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
          kind={tab}
          onClose={() => setImportOpen(false)}
          onImported={(msg) => { toast(msg, "success"); setImportOpen(false); }}
        />
      )}

      {/* 删除二次确认（归因关系 / 数据映射 共用） */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={tab === "relation" ? "删除归因关系" : "删除数据映射"}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          确定要删除「{deleteTarget?.metricCn}｜{deleteTarget?.factor}」这条{tab === "relation" ? "归因关系" : "数据映射"}吗？删除后不可恢复。
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
        {detailTarget && tab === "relation" ? (
          <div className="space-y-4">
            <Field label="指标中文名称" value={detailTarget.metricCn} />
            <Field label="指标编码" value={<code className="text-xs">{detailTarget.metricCode}</code>} />
            <Field label="候选因素" value={detailTarget.factor} />
            <Field label="影响方向" value={(detailTarget as AttributionRelation).influenceDir} />
            <Field label="影响机制" value={(detailTarget as AttributionRelation).mechanism} />
            <Field label="因素属性" value={(detailTarget as AttributionRelation).factorAttr} />
            <Field label="特殊说明" value={(detailTarget as AttributionRelation).remark} />
          </div>
        ) : detailTarget ? (
          <div className="space-y-4">
            <Field label="指标中文名称" value={detailTarget.metricCn} />
            <Field label="指标编码" value={<code className="text-xs">{detailTarget.metricCode}</code>} />
            <Field label="候选因素" value={detailTarget.factor} />
            <Field label="关联数据资产" value={(detailTarget as AttributionMapping).dataAsset} />
            <Field label="来源数据库" value={(detailTarget as AttributionMapping).sourceDb} />
            <Field label="来源表" value={(detailTarget as AttributionMapping).sourceTable} />
            <Field label="来源字段中文名称" value={(detailTarget as AttributionMapping).sourceFieldCn} />
            <Field label="来源字段英文名称" value={<code className="text-xs">{(detailTarget as AttributionMapping).sourceFieldEn}</code>} />
            <Field label="取值口径" value={(detailTarget as AttributionMapping).caliber} />
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

// 批量导入弹窗（归因关系 / 数据映射 共用，仅模板内容不同）
function ImportModal({
  kind, onClose, onImported,
}: { kind: TabKey; onClose: () => void; onImported: (msg: string) => void }) {
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
    let header: string; let sample: string; let filename: string;
    if (kind === "relation") {
      header = "指标中文名称,指标编码,候选因素,影响方向,影响机制,因素属性,特殊说明(选填)\n";
      sample = "制丝车间每公斤电耗,I_ING_001,制丝车间产量,负向,产量下降时固定负荷占比上升单位电耗升高,正常业务驱动,对应制丝除尘纯水系统等重点网格\n";
      filename = "归因关系模板.xlsx";
    } else {
      header = "指标中文名称,指标编码,候选因素,关联数据资产,来源数据库,来源表,来源字段中文名称,来源字段英文名称,取值口径\n";
      sample = "制丝车间每公斤电耗,I_ING_001,制丝车间产量,能耗计量表,ods_energy,t_meter_daily,制丝车间产量,silk_workshop_output,按制丝工序一日一值汇总取当日产量与电耗\n";
      filename = "数据映射模板.xlsx";
    }
    const blob = new Blob(["﻿" + header + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleConfirm() {
    if (!file) { setError("上传文件不能为空"); return; }
    onImported(`已导入${kind === "relation" ? "归因关系" : "数据映射"}文件`);
    setFile(null);
    setError("");
  }

  const tmplBtnLabel = kind === "relation" ? "下载归因关系模板.xlsx" : "下载数据映射模板.xlsx";

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
            <button onClick={downloadTemplate} className="text-sm text-primary-600 hover:text-primary-700">{tmplBtnLabel}</button>
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
