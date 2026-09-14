"use client";

import { useParams, useRouter } from "next/navigation";
import { rateSeries } from "@/lib/mock-data/expense-indicators";
import { controllableRowOf, controllableInterpretation, summarizeControllable, CONTROLLABLE_ROWS, type ControllableRow } from "@/lib/mock-data/controllable-cost";
import { expenseDevRuleOf, expenseAlertRecordFor } from "@/lib/mock-data/expense-alerts";
import { IndicatorFieldGrid, type IndicatorFieldTone } from "@/components/expense-analysis/IndicatorFieldGrid";
import { MonthlyBarsChart } from "@/components/expense-analysis/MonthlyBarsChart";
import { ExecutionRateLines } from "@/components/expense-analysis/ExecutionRateLines";
import { InterpretationBlock } from "@/components/expense-analysis/InterpretationBlock";
import { ExpenseStatusBadge } from "@/components/expense-analysis/ExpenseStatusBadge";

// 可控费用 - 预算指标详情：返回按钮 + 7 字段（含状态）+ 双图 + 数据解读；
// 异常状态（告警中心阈值口径）展示「查看告警详情」入口（from 记录来源，详情页「返回」回此）
export default function ControllableIndicatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ind: ControllableRow | undefined = CONTROLLABLE_ROWS.find((r) => r.id === id);

  if (!ind) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
        <span className="text-4xl">🔍</span>
        <p className="mt-3 text-sm font-medium text-gray-600">未找到该预算指标</p>
        <button
          type="button"
          className="mt-3 text-sm text-primary-600 hover:text-primary-700 hover:underline"
          onClick={() => router.back()}
        >
          ← 返回可控费用
        </button>
      </div>
    );
  }

  const d = controllableRowOf(ind.id);
  const abnormal = expenseDevRuleOf(d.deviation) !== null;
  const fields = [
    { label: "预算批复", value: `¥${d.budget.toLocaleString()} 万` },
    { label: "实际执行", value: `¥${d.executed.toLocaleString()} 万` },
    { label: "剩余预算", value: `¥${d.remaining.toLocaleString()} 万` },
    { label: "资金计划应执行", value: `${d.planProgress}%` },
    { label: "预算执行率", value: `${d.rate}%` },
    {
      label: "执行进度偏差",
      value: `${d.deviation > 0 ? "+" : ""}${d.deviation} pct`,
      tone: (abnormal ? "danger" : "default") as IndicatorFieldTone,
    },
    // 状态：告警中心定时检测口径（五级告警标签，正常绿色）
    { label: "状态", value: "", content: <ExpenseStatusBadge deviation={d.deviation} /> },
  ];

  // 跳转该指标的告警记录详情（按需生成，from 记录来源页）
  const jumpToAlert = () => {
    const rec = expenseAlertRecordFor(ind.name, ind.dept);
    if (!rec) return;
    router.push(`/expense/alert/records/${rec.id}?from=${encodeURIComponent(`/expense/analysis/per-box-cost/indicator/${ind.id}`)}`);
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
        onClick={() => router.back()}
      >
        ← 返回可控费用
      </button>
      <div>
        <h1 className="text-xl font-bold text-gray-900">{ind.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {ind.dept}｜{ind.subjects.join("、")}｜指标编码 {ind.code}
        </p>
      </div>
      <IndicatorFieldGrid
        fields={fields}
        action={abnormal ? (
          <button
            type="button"
            className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
            onClick={jumpToAlert}
          >
            查看告警详情
          </button>
        ) : undefined}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <MonthlyBarsChart monthly={d.monthly} />
        <ExecutionRateLines series={rateSeries(d.monthly, d.budget)} />
      </div>
      <InterpretationBlock text={controllableInterpretation(ind.name, [ind], summarizeControllable([ind]))} />
    </div>
  );
}
