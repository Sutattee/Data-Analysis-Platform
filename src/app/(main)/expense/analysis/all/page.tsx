"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { expenseNodeOf, expenseDataOf, trendInterpretation } from "@/lib/mock-data/expense-overview";
import {
  EXPENSE_INDICATORS, indicatorsUnderSubject, deptDataOf, indicatorDataOf, rateSeries, deptInterpretation, DEPT_STATS,
} from "@/lib/mock-data/expense-indicators";
import {
  expenseDevRuleOf, worstAbnormalRow, expenseAlertRecordFor,
} from "@/lib/mock-data/expense-alerts";
import { AnalysisCatalog, type CatalogTab } from "@/components/expense-analysis/AnalysisCatalog";
import { IndicatorFieldGrid, type IndicatorFieldTone } from "@/components/expense-analysis/IndicatorFieldGrid";
import { MonthlyBarsChart } from "@/components/expense-analysis/MonthlyBarsChart";
import { ExecutionRateLines } from "@/components/expense-analysis/ExecutionRateLines";
import { InterpretationBlock } from "@/components/expense-analysis/InterpretationBlock";
import { DeptIndicatorCards, IndicatorTable } from "@/components/expense-analysis/DeptIndicatorCards";
import { ExpenseStatusBadge } from "@/components/expense-analysis/ExpenseStatusBadge";
import { Card } from "@/components/ui/Card";

// 异常状态「查看告警详情」：蓝色文字链接（仅异常时展示）
function AlertDetailButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
      onClick={onClick}
    >
      查看告警详情
    </button>
  );
}

// 费用分析 - 全部费用：左侧目录（费用科目树/部门 + 搜索 + 计数徽标）+ 右侧内容（字段 + 双图 + 解读 + 部门折叠卡片/指标列表）
// tab/科目/部门 选择同步 URL query（从告警记录详情「返回」时完整还原）；异常状态展示「查看告警详情」入口
export default function ExpenseAllPage() {
  // useSearchParams（tab/subject/dept 初始化）需 Suspense 边界
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
  const [tab, setTab] = useState<CatalogTab>(
    searchParams.get("tab") === "dept" ? "dept" : "subject"
  );
  const [subjectId, setSubjectId] = useState(searchParams.get("subject") || "all");
  const [dept, setDept] = useState<string | null>(searchParams.get("dept"));

  // 状态变更同步 URL（replace 不产生历史记录，返回时 query 仍在）
  function syncUrl(next: { tab?: CatalogTab; subject?: string; dept?: string | null }) {
    const q = new URLSearchParams();
    const t = next.tab ?? tab;
    const s = next.subject ?? subjectId;
    const d = next.dept !== undefined ? next.dept : dept;
    q.set("tab", t);
    if (t === "subject" && s !== "all") q.set("subject", s);
    if (t === "dept" && d) q.set("dept", d);
    router.replace(`/expense/analysis/all?${q.toString()}`, { scroll: false });
  }

  function handleTabChange(t: CatalogTab) {
    const nextDept = t === "dept" && dept === null ? DEPT_STATS[0].dept : dept; // 切到部门 TAB 默认选中第一个部门
    setTab(t);
    if (t === "dept" && dept === null) setDept(nextDept);
    syncUrl({ tab: t, dept: nextDept });
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

  // 部门视图
  const dd = dept !== null ? deptDataOf(dept) : null;
  const deptDeviation = dd ? Math.round((dd.rate - dd.planProgress) * 10) / 10 : 0;
  const deptAbnormal = dd ? expenseDevRuleOf(deptDeviation) !== null : false;

  return (
    <div className="flex items-start gap-4">
      <AnalysisCatalog
        tab={tab}
        onTabChange={handleTabChange}
        subjectId={subjectId}
        onSubjectChange={(id) => { setSubjectId(id); syncUrl({ subject: id }); }}
        dept={dept}
        onDeptChange={(d) => { setDept(d); syncUrl({ dept: d }); }}
      />

      <div className="min-w-0 flex-1 space-y-4">
        {tab === "subject" ? (
          <>
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
                      `/expense/analysis/all?tab=subject${subjectId !== "all" ? `&subject=${subjectId}` : ""}`
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
                returnTo={`/expense/analysis/all?tab=subject&subject=${subjectId}`}
              />
            )}
          </>
        ) : dd ? (
          <>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{dd.dept}</h1>
            </div>
            <IndicatorFieldGrid
              fields={[
                { label: "预算指标数", value: `${dd.indicators.length} 个指标` },
                { label: "合计执行率", value: `${dd.rate}%` },
                { label: "资金计划应执行", value: `${dd.planProgress}%` },
                {
                  label: "执行进度偏差",
                  value: `${deptDeviation > 0 ? "+" : ""}${deptDeviation} pct`,
                  tone: (deptAbnormal ? "danger" : "default") as IndicatorFieldTone,
                },
                // 状态：告警中心定时检测口径（五级告警标签，正常绿色）
                { label: "状态", value: "", content: <ExpenseStatusBadge deviation={deptDeviation} /> },
              ]}
              action={deptAbnormal ? (
                <AlertDetailButton
                  onClick={() => jumpToAlert(dd.indicators, `/expense/analysis/all?tab=dept&dept=${encodeURIComponent(dd.dept)}`)}
                />
              ) : undefined}
            />
            <div className="grid gap-4 xl:grid-cols-2">
              <MonthlyBarsChart monthly={dd.monthly} />
              <ExecutionRateLines series={rateSeries(dd.monthly, dd.budget)} />
            </div>
            <InterpretationBlock text={deptInterpretation(dd)} />
            <Card title={`${dd.dept}｜预算指标列表`} padding={false}>
              <IndicatorTable
                indicators={dd.indicators}
                returnTo={`/expense/analysis/all?tab=dept&dept=${encodeURIComponent(dd.dept)}`}
              />
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
