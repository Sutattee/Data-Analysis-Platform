"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { expenseNodeOf, expenseDataOf, trendInterpretation } from "@/lib/mock-data/expense-overview";
import {
  EXPENSE_INDICATORS, indicatorsUnderSubject, indicatorDataOf, rateSeries,
} from "@/lib/mock-data/expense-indicators";
import {
  expenseDevRuleOf, worstAbnormalRow, expenseAlertRecordFor,
} from "@/lib/mock-data/expense-alerts";
import { AnalysisCatalog } from "@/components/expense-analysis/AnalysisCatalog";
import { AlertDetailButton } from "@/components/expense-analysis/AlertDetailButton";
import { IndicatorFieldGrid, type IndicatorFieldTone } from "@/components/expense-analysis/IndicatorFieldGrid";
import { MonthlyBarsChart } from "@/components/expense-analysis/MonthlyBarsChart";
import { ExecutionRateLines } from "@/components/expense-analysis/ExecutionRateLines";
import { InterpretationBlock } from "@/components/expense-analysis/InterpretationBlock";
import { DeptIndicatorCards } from "@/components/expense-analysis/DeptIndicatorCards";
import { ExpenseStatusBadge } from "@/components/expense-analysis/ExpenseStatusBadge";

// 费用分析 - 费用科目：左侧目录（费用科目树 + 搜索 + 计数徽标）+ 右侧内容（字段 + 双图 + 解读 + 部门折叠卡片）
// 科目选择同步 URL query（从告警记录详情「返回」时完整还原）；异常状态展示「查看告警详情」入口
export default function ExpenseAllPage() {
  // useSearchParams（subject 初始化）需 Suspense 边界
  return (
    <Suspense fallback={null}>
      <ExpenseAllView />
    </Suspense>
  );
}

function ExpenseAllView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 初始状态从 URL 恢复（由本页写入，告警详情「返回」后还原视图）
  const [subjectId, setSubjectId] = useState(searchParams.get("subject") || "all");

  // 状态变更同步 URL（replace 不产生历史记录，返回时 query 仍在）
  function syncUrl(next: { subject?: string }) {
    const q = new URLSearchParams();
    const s = next.subject ?? subjectId;
    if (s !== "all") q.set("subject", s);
    router.replace(`/expense/analysis/all${q.toString() ? `?${q.toString()}` : ""}`, { scroll: false });
  }

  // 跳转该范围内等级最高异常指标的告警记录详情（from 记录来源页，详情页「返回」回此）
  function jumpToAlert(rows: { id: string; name: string; dept: string }[], from: string) {
    const worst = worstAbnormalRow(rows, (r) => indicatorDataOf(r.id).deviation);
    if (!worst) return;
    const rec = expenseAlertRecordFor(worst.name, worst.dept);
    if (!rec) return;
    router.push(`/expense/alert/records/${rec.id}?from=${encodeURIComponent(from)}`);
  }

  // 科目视图（含「全部费用」）
  const node = expenseNodeOf(subjectId);
  const summary = expenseDataOf(subjectId);
  const subjectAbnormal = expenseDevRuleOf(summary.deviation) !== null;
  const subjectRows = subjectId === "all" ? EXPENSE_INDICATORS : indicatorsUnderSubject(subjectId);
  const subjectFields = [
    { label: "预算批复", value: `¥${summary.budget.toLocaleString()} 万` },
    { label: "实际执行", value: `¥${summary.executed.toLocaleString()} 万` },
    { label: "剩余预算", value: `¥${(summary.budget - summary.executed).toLocaleString()} 万` },
    { label: "资金计划应执行", value: `${summary.planProgress}%` },
    { label: "预算执行率", value: `${summary.rate}%` },
    {
      label: "执行进度偏差",
      value: `${summary.deviation > 0 ? "+" : ""}${summary.deviation} pct`,
      tone: (subjectAbnormal ? "danger" : "default") as IndicatorFieldTone,
    },
    // 状态：告警中心定时检测口径（五级告警标签，正常绿色）
    { label: "状态", value: "", content: <ExpenseStatusBadge deviation={summary.deviation} /> },
  ];

  return (
    <div className="flex items-start gap-4">
      <AnalysisCatalog
        subjectId={subjectId}
        onSubjectChange={(id) => { setSubjectId(id); syncUrl({ subject: id }); }}
      />

      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{node.name}</h1>
        </div>
        <IndicatorFieldGrid
          fields={subjectFields}
          action={subjectAbnormal ? (
            <AlertDetailButton
              onClick={() =>
                jumpToAlert(
                  subjectRows,
                  `/expense/analysis/all${subjectId !== "all" ? `?subject=${subjectId}` : ""}`
                )
              }
            />
          ) : undefined}
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <MonthlyBarsChart monthly={summary.monthly} />
          <ExecutionRateLines series={rateSeries(summary.monthly, summary.budget)} />
        </div>
        <InterpretationBlock text={trendInterpretation(summary)} />
        {subjectId !== "all" && (
          <DeptIndicatorCards
            indicators={subjectRows}
            returnTo={`/expense/analysis/all?subject=${subjectId}`}
          />
        )}
      </div>
    </div>
  );
}
