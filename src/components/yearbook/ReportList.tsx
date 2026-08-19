"use client";

// 年鉴报告 - 报告列表（列表/卡片双视图 + 筛选 + 生成/导出/删除）
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { listReports, removeReport } from "@/lib/mock-data/major-events";
import { exportReportPdf, exportReportWord } from "@/lib/export-report";
import { GenerateReportModal } from "./GenerateReportModal";
import { YEARBOOK_REPORT_ICON } from "@/components/layout/NavIcon";
import type { YearbookReport } from "@/types";

type ViewMode = "list" | "card";
type Phase = "loading" | "success";

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

export function ReportList() {
  const router = useRouter();
  const toast = useToast();
  const { state } = useApp();
  const isAdmin = state.user?.role === "管理员";
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";

  const [reports, setReports] = useState<YearbookReport[]>(() => listReports());
  const [view, setView] = useState<ViewMode>("list");
  const [year, setYear] = useState("");
  // 报告名称：搜索框草稿值 + 点击「查询」后生效的关键词
  const [keyword, setKeyword] = useState("");
  const [keywordApplied, setKeywordApplied] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<YearbookReport | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runLoad() {
    setPhase("loading");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPhase("success"), 400);
  }

  useEffect(() => {
    runLoad();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 年度倒序 + 更新时间（无则生成时间）倒序
  const sorted = useMemo(() => {
    const k = keywordApplied.trim().toLowerCase();
    return reports
      .filter((r) => (!year || String(r.year) === year) && (!k || r.name.toLowerCase().includes(k)))
      .sort(
        (a, b) =>
          b.year - a.year ||
          (b.updatedAt ?? b.generatedAt).localeCompare(a.updatedAt ?? a.generatedAt)
      );
  }, [reports, year, keywordApplied]);

  // 查询：按输入关键词筛选报告名称（回车同样触发）
  function searchReport() {
    setKeywordApplied(keyword.trim());
  }

  // 重置：清空输入框与已生效的关键词
  function resetSearch() {
    setKeyword("");
    setKeywordApplied("");
  }

  const yearOptions = useMemo(
    () => Array.from(new Set(reports.map((r) => r.year))).sort((a, b) => b - a),
    [reports]
  );

  function reload() {
    setReports(listReports());
    runLoad();
  }

  function handleDelete() {
    if (!deleteTarget) return;
    removeReport(deleteTarget.id);
    setDeleteTarget(null);
    reload();
    toast("报告已删除", "success");
  }

  const th = "text-left px-4 py-3";

  return (
    <div className="space-y-4">
      {/* ===== 工具行：视图切换 + 筛选 ===== */}
      <Card padding>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">报告年度</span>
              <select className={selectCls} value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">全部</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
              </select>
            </div>
            {/* 报告名称：关键词搜索框 + 查询 / 重置按钮 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">报告名称</span>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                placeholder="搜索报告名称"
                className="w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              />
              <Button size="sm" onClick={searchReport}>查询</Button>
              <Button size="sm" variant="secondary" onClick={resetSearch}>重置</Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 列表/卡片视图切换 */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-sm">
              {(["list", "card"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 transition-colors ${
                    view === v ? "bg-primary-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {v === "list" ? "▤ 列表" : "▦ 卡片"}
                </button>
              ))}
            </div>
            {isAdmin && (
              <Button onClick={() => setReportOpen(true)}>生成年度报告</Button>
            )}
          </div>
        </div>
      </Card>

      {/* ===== 报告列表 ===== */}
      {phase === "loading" && (
        <Card padding={false}>
          <div className="flex flex-col items-center justify-center py-24">
            <Spinner />
            <p className="text-sm text-gray-400 mt-3">加载中…</p>
          </div>
        </Card>
      )}

      {phase === "success" && sorted.length === 0 && (
        <Card padding={false}>
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-4xl mb-3">{keywordApplied || year ? "🔍" : "📚"}</span>
            <p className="text-sm text-gray-500">{keywordApplied || year ? "无筛选结果" : "暂无年度报告"}</p>
            {isAdmin && !keywordApplied && !year && (
              <Button className="mt-3" onClick={() => setReportOpen(true)}>生成年度报告</Button>
            )}
          </div>
        </Card>
      )}

      {phase === "success" && sorted.length > 0 && view === "list" && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                  <th className={th}>报告年度</th>
                  <th className={th}>报告名称</th>
                  <th className={th}>报告周期</th>
                  <th className={th}>纳入事件</th>
                  <th className={th}>生成信息</th>
                  <th className={th}>更新时间</th>
                  <th className={`${th} text-right`}>操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.year}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/energy/yearbook/reports/${r.id}`)}
                        className="text-gray-900 hover:text-gray-600 hover:underline"
                      >
                        {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.periodStart} 至 {r.periodEnd}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.includedEvents.length} 件</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.generatedAt}｜{r.generatedBy}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.updatedAt ? `${r.updatedAt}｜${r.updatedBy}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                          onClick={() => router.push(`/energy/yearbook/reports/${r.id}`)}
                        >
                          查看
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                            onClick={() => router.push(`/energy/yearbook/reports/${r.id}/edit`)}
                          >
                            编辑
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          onClick={() => exportReportWord(r)}
                        >
                          导出Word
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          onClick={() => exportReportPdf(r)}
                        >
                          导出PDF
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget(r)}
                          >
                            删除
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {phase === "success" && sorted.length > 0 && view === "card" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((r) => (
            <Card key={r.id} padding>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl font-bold text-primary-600">{r.year}</span>
                  <span className="text-xs text-gray-400 ml-1">年度</span>
                </div>
                {YEARBOOK_REPORT_ICON}
              </div>
              <h3 className="font-medium text-gray-900 mt-2 truncate" title={r.name}>{r.name}</h3>
              <p className="text-xs text-gray-400 mt-1">
                {r.periodStart} 至 {r.periodEnd}
              </p>
              <div className="text-xs text-gray-500 mt-3 space-y-1">
                <p>纳入事件 <span className="font-medium text-gray-700">{r.includedEvents.length}</span> 件</p>
                <p>生成：{r.generatedAt}｜{r.generatedBy}</p>
                <p>{r.updatedAt ? `更新：${r.updatedAt}｜${r.updatedBy}` : "未编辑"}</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                <Button size="sm" onClick={() => router.push(`/energy/yearbook/reports/${r.id}`)}>查看</Button>
                {isAdmin && (
                  <Button size="sm" variant="secondary" onClick={() => router.push(`/energy/yearbook/reports/${r.id}/edit`)}>
                    编辑
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => exportReportWord(r)}>导出Word</Button>
                <Button size="sm" variant="secondary" onClick={() => exportReportPdf(r)}>导出PDF</Button>
                {isAdmin && (
                  <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => setDeleteTarget(r)}>
                    删除
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ===== 删除二次确认 ===== */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="删除报告">
        <p className="text-sm text-gray-600 leading-relaxed">
          确认删除报告「{deleteTarget?.name}」（{deleteTarget?.year} 年度，纳入 {deleteTarget?.includedEvents.length} 件事件）？
          删除后不可恢复。
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="danger" onClick={handleDelete}>确认删除</Button>
        </div>
      </Modal>

      {/* ===== 生成年度报告 ===== */}
      <GenerateReportModal
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          reload(); // 关闭时刷新（可能已生成新报告）
        }}
        user={currentUser}
        onCreated={(id) => {
          setReportOpen(false);
          router.push(`/energy/yearbook/reports/${id}`);
        }}
      />
    </div>
  );
}
