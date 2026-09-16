"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DEPT_STATS, deptDataOf, deptInterpretation, indicatorDataOf, rateSeries,
} from "@/lib/mock-data/expense-indicators";
import {
  expenseDevRuleOf, worstAbnormalRow, expenseAlertRecordFor,
} from "@/lib/mock-data/expense-alerts";
import { DeptCatalog } from "@/components/expense-analysis/DeptCatalog";
import { AlertDetailButton } from "@/components/expense-analysis/AlertDetailButton";
import { IndicatorFieldGrid, type IndicatorFieldTone } from "@/components/expense-analysis/IndicatorFieldGrid";
import { MonthlyBarsChart } from "@/components/expense-analysis/MonthlyBarsChart";
import { ExecutionRateLines } from "@/components/expense-analysis/ExecutionRateLines";
import { InterpretationBlock } from "@/components/expense-analysis/InterpretationBlock";
import { IndicatorTable } from "@/components/expense-analysis/DeptIndicatorCards";
import { ExpenseStatusBadge } from "@/components/expense-analysis/ExpenseStatusBadge";
import { Card } from "@/components/ui/Card";

// 费用分析 - 部门费用：左侧目录（部门平铺 + 搜索 + 计数徽标）+ 右侧内容（部门字段 + 双图 + 解读 + 预算指标列表）
// 部门选择同步 URL query（从告警记录详情「返回」时完整还原）；异常状态展示「查看告警详情」入口
export default function OperatingCostPage() {
  // useSearchParams（dept 初始化）需 Suspense 边界
  return (
    <Suspense fallback={null}>
      <DeptExpenseView />
    </Suspense>
  );
}

function DeptExpenseView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 初始状态从 URL 恢复（由本页写入，告警详情「返回」后还原视图）；默认选中第一个部门
  const [dept, setDept] = useState(searchParams.get("dept") || DEPT_STATS[0].dept);

  // 状态变更同步 URL（replace 不产生历史记录，返回时 query 仍在）
  function syncUrl(next: string) {
    router.replace(`/expense/analysis/operating-cost?dept=${encodeURIComponent(next)}`, { scroll: false });
  }

  // 部门视图
  const dd = deptDataOf(dept);
  const deptDeviation = Math.round((dd.rate - dd.planProgress) * 10) / 10;
  const deptAbnormal = expenseDevRuleOf(deptDeviation) !== null;

  // 跳转该部门内等级最高异常指标的告警记录详情（from 记录来源页，详情页「返回」回此）
  function jumpToAlert() {
    const worst = worstAbnormalRow(dd.indicators, (r) => indicatorDataOf(r.id).deviation);
    if (!worst) return;
    const rec = expenseAlertRecordFor(worst.name, worst.dept);
    if (!rec) return;
    router.push(`/expense/alert/records/${rec.id}?from=${encodeURIComponent(`/expense/analysis/operating-cost?dept=${encodeURIComponent(dept)}`)}`);
  }

  return (
    <div className="flex items-start gap-4">
      <DeptCatalog
        dept={dept}
        onDeptChange={(d) => { setDept(d); syncUrl(d); }}
      />

      <div className="min-w-0 flex-1 space-y-4">
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
          action={deptAbnormal ? <AlertDetailButton onClick={jumpToAlert} /> : undefined}
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <MonthlyBarsChart monthly={dd.monthly} />
          <ExecutionRateLines series={rateSeries(dd.monthly, dd.budget)} />
        </div>
        <InterpretationBlock text={deptInterpretation(dd)} />
        <Card title={`${dd.dept}｜预算指标列表`} padding={false}>
          <IndicatorTable
            indicators={dd.indicators}
            returnTo={`/expense/analysis/operating-cost?dept=${encodeURIComponent(dept)}`}
          />
        </Card>
      </div>
    </div>
  );
}
