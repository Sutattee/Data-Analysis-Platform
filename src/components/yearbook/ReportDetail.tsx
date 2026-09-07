"use client";

// 年鉴报告 - 报告详情（三章正文 + 纳入事件快照清单 + 生成与编辑记录）
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppContext";
import { getReport } from "@/lib/mock-data/major-events";
import { exportReportPdf, exportReportWord } from "@/lib/export-report";
import { ReportContent } from "./ReportContent";
import type { YearbookReport } from "@/types";

export function ReportDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const version = searchParams.get("v"); // 编辑保存后带新版本参数触发重新读取
  const { state, addRecentVisit } = useApp();
  const isAdmin = state.user?.role === "管理员";
  const [report, setReport] = useState<YearbookReport | undefined>(() => getReport(params.id));

  useEffect(() => {
    setReport(getReport(params.id));
  }, [params.id, version]);

  // 记录最近访问（首页「年鉴报告」条目；本人创建且具备编辑权限时可继续编辑）
  useEffect(() => {
    const r = getReport(params.id);
    if (!r) return;
    addRecentVisit({
      id: `rv-yearbook-${r.id}`,
      title: r.name,
      board: "能源消耗",
      contentType: "年鉴报告",
      creator: r.generatedBy,
      editable: isAdmin || r.generatedBy === (state.user?.nickname || state.user?.username),
      route: `/energy/yearbook/reports/${r.id}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, version]);

  if (!report) {
    return (
      <div className="space-y-6">
        <Link href="/energy/yearbook/reports" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
          ← 年鉴报告
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-xl border border-gray-100">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-sm text-gray-500">报告不存在或已被删除</p>
        </div>
      </div>
    );
  }

  const th = "text-left px-4 py-3";

  return (
    <div className="space-y-4">
      {/* ===== 面包屑 + 标题 + 操作 ===== */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
          <Link href="/energy/yearbook/reports" className="hover:text-primary-600">年鉴报告</Link>
          <span>/</span>
          <span className="text-gray-600">报告详情</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{report.name}</h1>
            <p className="text-xs text-gray-400">
              {report.year} 年度｜{report.periodStart} 至 {report.periodEnd}｜纳入事件 {report.includedEvents.length} 件｜数据截止 {report.dataCutoff}
            </p>
            <p className="text-xs text-gray-400">
              生成：{report.generatedAt}（{report.generatedBy}）
              {report.updatedAt && `｜最近更新：${report.updatedAt}（${report.updatedBy}）`}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isAdmin && (
              <Button onClick={() => router.push(`/energy/yearbook/reports/${report.id}/edit`)}>编辑</Button>
            )}
            <Button variant="secondary" onClick={() => exportReportWord(report)}>导出 Word</Button>
            <Button variant="secondary" onClick={() => exportReportPdf(report)}>导出 PDF</Button>
            <Button variant="ghost" onClick={() => router.push("/energy/yearbook/reports")}>返回列表</Button>
          </div>
        </div>
      </div>

      {/* ===== 三章正文 ===== */}
      <Card padding>
        <ReportContent report={report} />
      </Card>

      {/* ===== 附录：纳入事件清单（生成时快照，不随事件变化） ===== */}
      <Card padding={false}>
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-gray-800">附录：纳入事件清单（生成时快照）</h3>
          <p className="text-xs text-gray-400 mt-1">
            以下为生成报告时点的事件快照，事件后续修改不改变本报告内容；点击编号可查看事件当前状态。
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                <th className={th}>事件编号</th>
                <th className={th}>事件标题</th>
                <th className={th}>发生时间</th>
                <th className={th}>持续时长</th>
                <th className={th}>生成时版本</th>
                <th className={th}>影响摘要</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {report.includedEvents.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/energy/yearbook/events?id=${e.id}`}
                      className="font-mono text-xs text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      {e.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900 max-w-[220px] truncate" title={e.title}>{e.title}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[220px] truncate" title={e.timeLabel}>{e.timeLabel}</td>
                  <td className="px-4 py-3 text-gray-600">{e.duration}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{e.version}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate" title={e.impact}>{e.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ===== 生成与编辑记录 ===== */}
      <Card padding>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">生成与编辑记录</h3>
        <p className="text-xs text-gray-500">
          生成：{report.generatedAt}｜{report.generatedBy}（报告周期 {report.periodStart} 至 {report.periodEnd}）
        </p>
        {report.editLog.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {report.editLog.map((log, i) => (
              <div key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <span className="text-gray-400 font-mono mr-2">{log.time}</span>
                <span className="font-medium text-gray-700 mr-2">{log.user}</span>
                {log.note}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-2">暂无人工编辑记录</p>
        )}
      </Card>
    </div>
  );
}
