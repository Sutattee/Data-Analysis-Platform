"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { DefectDiagnosisDrawer } from "@/components/quality-defect/DefectDiagnosisDrawer";
import {
  DIAG_CATALOG,
  causeSourceOf,
  causeTextOf,
  diagCatalogOf,
  listDiagnoses,
  occurrenceContextOf,
  periodRange,
  type DiagnosisItem,
} from "@/lib/mock-data/quality-defect";

// 缺陷诊断页主视图：围绕 3 个重点缺陷（成品水分不合格 / 烟支刺破 / 箱储存储时间超上限）的诊断明细管理；
// 筛选区（缺陷名称/检验日期）为草稿态，点「查询」提交生效
export function DefectDiagnosisView() {
  const searchParams = useSearchParams();
  const initCode = searchParams.get("code");
  const defaultRange = periodRange(1);
  const validInitCode = initCode && DIAG_CATALOG.some((c) => c.code === initCode) ? initCode : "all";
  // 草稿态（筛选区控件绑定）
  const [draftCode, setDraftCode] = useState(validInitCode);
  const [draftFrom, setDraftFrom] = useState(defaultRange.from);
  const [draftTo, setDraftTo] = useState(defaultRange.to);
  // 应用态（驱动诊断明细）
  const [code, setCode] = useState(validInitCode);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewing, setViewing] = useState<DiagnosisItem | null>(null); // 查看/判定 详情抽屉目标行
  const [rev, setRev] = useState(0); // 原因修正保存后刷新列表（会话级 store 版本号）
  const [causeSource, setCauseSource] = useState("all"); // 诊断明细「原因类型」表头筛选
  const [diagStatus, setDiagStatus] = useState("all"); // 诊断明细「诊断状态」表头筛选

  // 诊断明细：按 名称 + 原因类型 + 诊断状态 + 检验日期（关联发生记录的日期）过滤，倒序；
  // 诊断状态与原因类型同源：人工补录 = 已判定，AI生成 = 待判定
  const diagnoses = useMemo(() => {
    return listDiagnoses()
      .filter((d) => {
        const occDate = occurrenceContextOf(d.code, d.recordDate)?.date ?? d.recordDate;
        const judged = causeSourceOf(d) === "人工补录";
        return (
          (code === "all" || d.code === code) &&
          (causeSource === "all" || causeSourceOf(d) === causeSource) &&
          (diagStatus === "all" || (diagStatus === "judged" ? judged : !judged)) &&
          occDate >= from &&
          occDate <= to
        );
      })
      .sort((a, b) => b.recordDate.localeCompare(a.recordDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, causeSource, diagStatus, from, to, rev]);

  const totalPages = Math.max(1, Math.ceil(diagnoses.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = diagnoses.slice((safePage - 1) * pageSize, safePage * pageSize);

  // 查询：提交草稿态到应用态
  function handleSearch() {
    setCode(draftCode);
    setFrom(draftFrom);
    setTo(draftTo);
    setPage(1);
  }

  function handleReset() {
    setDraftCode("all");
    setDraftFrom(defaultRange.from);
    setDraftTo(defaultRange.to);
    setCode("all");
    setFrom(defaultRange.from);
    setTo(defaultRange.to);
    setPage(1);
  }

  const dateCls =
    "px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
  const selCls =
    "w-60 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";

  const th = "text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">缺陷诊断</h1>

      {/* 筛选区：缺陷名称（固定选项，不支持搜索）/ 检验日期 + 查询/重置（点查询后生效） */}
      <Card>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">缺陷名称</span>
            <select value={draftCode} onChange={(e) => setDraftCode(e.target.value)} className={selCls}>
              <option value="all">全部</option>
              {DIAG_CATALOG.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} {c.code}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">检验日期</span>
            <input type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} className={dateCls} />
            <span className="text-xs text-gray-400">至</span>
            <input type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} className={dateCls} />
          </label>
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>
            重置
          </Button>
        </div>
      </Card>

      {/* 诊断明细列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-100">
                <th className={th}>缺陷名称</th>
                <th className={th}>缺陷代码</th>
                <th className={th}>缺陷部位</th>
                <th className={th}>工序</th>
                <th className={th}>责任岗位</th>
                <th className={th}>缺陷原因</th>
                {/* 原因类型：表头内嵌筛选（全部/AI生成/人工补录） */}
                <th className={th}>
                  <div className="flex items-center">
                    原因类型
                    <select
                      value={causeSource}
                      onChange={(e) => {
                        setCauseSource(e.target.value);
                        setPage(1);
                      }}
                      className="ml-1 max-w-[104px] truncate rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs font-normal text-gray-600 outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="all">全部</option>
                      <option value="AI生成">AI生成</option>
                      <option value="人工补录">人工补录</option>
                    </select>
                  </div>
                </th>
                {/* 诊断状态：已判定（人工修正过）绿色，待判定灰色；表头内嵌筛选 */}
                <th className={th}>
                  <div className="flex items-center">
                    诊断状态
                    <select
                      value={diagStatus}
                      onChange={(e) => {
                        setDiagStatus(e.target.value);
                        setPage(1);
                      }}
                      className="ml-1 max-w-[96px] truncate rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs font-normal text-gray-600 outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="all">全部</option>
                      <option value="judged">已判定</option>
                      <option value="pending">待判定</option>
                    </select>
                  </div>
                </th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-sm text-gray-400">
                    所选条件下暂无诊断明细
                  </td>
                </tr>
              ) : (
                pageRows.map((d) => {
                  const judged = causeSourceOf(d) === "人工补录";
                  return (
                  <tr key={d.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{diagCatalogOf(d.code)?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-gray-700">{d.code}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{diagCatalogOf(d.code)?.part ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{d.process}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{d.post}</td>
                    <td className="max-w-[240px] truncate px-3 py-2.5 text-xs text-gray-600" title={causeTextOf(d)}>
                      {causeTextOf(d)}
                    </td>
                    {/* 原因类型：人工修正过 = 人工补录，否则 AI 生成 */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {judged ? (
                        <span className="font-medium text-primary-700">人工补录</span>
                      ) : (
                        <span className="text-gray-500">AI生成</span>
                      )}
                    </td>
                    {/* 诊断状态：已判定绿色 */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {judged ? (
                        <span className="font-medium text-green-600">已判定</span>
                      ) : (
                        <span className="text-gray-500">待判定</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:bg-primary-50" onClick={() => setViewing(d)}>
                        {judged ? "查看" : "判定"}
                      </Button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 px-4 py-3">
          <Pagination
            total={diagnoses.length}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {/* 查看缺陷诊断详情：原因展示与修正共用抽屉 */}
      <DefectDiagnosisDrawer
        item={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
        onSaved={() => setRev((n) => n + 1)}
      />
    </div>
  );
}
