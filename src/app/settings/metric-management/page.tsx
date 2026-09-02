"use client";

// 指标管理列表：搜索 + 导入 + 列表（操作：查看 / 目标值管理 / 达标反推设置）
// 「目标值管理」进入独立页面（指标管理/目标值管理）；「达标反推设置」右侧滑出窗口配置。
// 仅 单箱综合能耗（m7）/ 单位产量碳排放量（m1）支持上述两项，且固定排在前两项。
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { ReverseSettingsDrawer } from "@/components/settings/ReverseSettingsDrawer";
import { metricList } from "@/lib/mock-data/metric-management";
import { isTargetSupported } from "@/lib/mock-data/metric-targets";
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

export default function MetricManagementPage() {
  const toast = useToast();
  const router = useRouter();
  const [metrics, setMetrics] = useState<MetricManage[]>(() =>
    sortMetrics(metricList.map((m) => ({ ...m })))
  );

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

  // 详情 / 删除
  const [detailTarget, setDetailTarget] = useState<MetricManage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MetricManage | null>(null);
  // 达标反推设置（列表操作入口 → 右侧滑出窗口）
  const [reverseMetric, setReverseMetric] = useState<MetricManage | null>(null);

  function confirmDelete() {
    if (!deleteTarget) return;
    setMetrics((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    toast("已删除", "success");
    setDeleteTarget(null);
  }

  const filtered = useMemo(() => {
    const kw = applied.trim().toLowerCase();
    if (!kw) return metrics;
    return metrics.filter(
      (m) => m.nameCn.toLowerCase().includes(kw) || m.code.toLowerCase().includes(kw)
    );
  }, [metrics, applied]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSearch() { setApplied(keyword); setPage(1); }
  function handleReset() { setKeyword(""); setApplied(""); setPage(1); }

  // 达标反推内容更新（滑出窗保存后同步列表数据）
  function updateReverseItems(metricId: string, next: string[]) {
    setMetrics((prev) => prev.map((m) => (m.id === metricId ? { ...m, reverseItems: next } : m)));
  }

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
            placeholder="搜索指标中文名称/指标编码"
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
                <th className={th}>指标编码</th>
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
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{m.code}</td>
                  <td className="px-4 py-3 text-gray-600">{m.domain}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px]"><div className="truncate" title={m.synonyms}>{m.synonyms || "—"}</div></td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px]"><div className="truncate" title={m.description}>{m.description}</div></td>
                  <td className="px-4 py-3 text-gray-600">{m.owner}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{m.createdAt}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setDetailTarget(m)}>查看</Button>
                      {/* 仅 单箱综合能耗 / 单位产量碳排放量 支持目标值管理与达标反推设置 */}
                      {isTargetSupported(m.id) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                            onClick={() => router.push(`/settings/metric-management/${m.id}/targets`)}
                          >
                            目标值管理
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                            onClick={() => setReverseMetric(m)}
                          >
                            达标反推设置
                          </Button>
                        </>
                      )}
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

      {/* 指标详情抽屉（仅基础信息；目标值管理 / 达标反推设置已移至列表操作） */}
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
            <Field label="业务域" value={detailTarget.domain} />
            <Field label="业务定义" value={detailTarget.definition} />
            <Field label="统计口径" value={detailTarget.formula} />
            <Field label="计算公式" value={detailTarget.calcFormula} />
            <Field label="默认聚合" value={detailTarget.defaultAgg} />
            <Field label="派生公式" value={<code className="text-xs break-all">{detailTarget.derivedFormula}</code>} />
            <Field label="数据源ID" value={<code className="text-xs">{detailTarget.sourceId}</code>} />
            <Field label="主表" value={<code className="text-xs">{detailTarget.mainTable}</code>} />
            <Field label="度量表达式" value={<code className="text-xs break-all">{detailTarget.measureExpr}</code>} />
            <Field label="小数位数" value={String(detailTarget.decimals)} />
            <Field label="度量单位" value={detailTarget.unit} />
            <Field label="支持维度" value={detailTarget.dimensions} />
            <Field label="统计对象" value={detailTarget.statObject} />
            <Field label="统计粒度" value={detailTarget.statGranularity} />
            <Field label="数据更新频率" value={detailTarget.updateFrequency} />
            <Field label="同义词（选填）" value={detailTarget.synonyms} />
            <Field label="负责人" value={detailTarget.owner} />
            <Field label="描述（选填）" value={detailTarget.description} />
          </div>
        )}
      </Drawer>

      {/* 达标反推设置（列表操作入口 → 右侧滑出窗口） */}
      <ReverseSettingsDrawer
        open={reverseMetric !== null}
        onClose={() => setReverseMetric(null)}
        metric={reverseMetric}
        onUpdate={(next) => {
          if (reverseMetric) updateReverseItems(reverseMetric.id, next);
        }}
      />

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
