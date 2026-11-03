"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExpenseHeader } from "@/components/expense-overview/ExpenseHeader";
import { ExpenseOverviewCards, type MetricCardKey } from "@/components/expense-overview/ExpenseOverviewCards";
import { MonthlyTrendChart } from "@/components/expense-overview/MonthlyTrendChart";
import {
  HealthTrendChart, RateTrendChart, DeviationTrendChart, OperatingCostTrendChart, PerBoxTrendChart,
} from "@/components/expense-overview/MetricTrendCharts";
import { AbnormalSubjectsPanel } from "@/components/expense-overview/AbnormalSubjectsPanel";
import { AiAssistant } from "@/components/energy-overview/AiAssistant";

// 费用总览：标题区（搜索 + 科目筛选）→ 核心指标卡（点击切换下方趋势图）→ 趋势图 + 进度异常科目
// 趋势图联动口径：健康度/累计执行/执行率/偏差 4 图随科目筛选切换；运营成本/单箱可控费用 2 图全口径固定
// 外层 AiAssistant：右下角悬浮球 + 右侧滑出对话面板（同能耗总览页）
// 深链：?metric=<MetricCardKey> 预选指标卡（管理驾驶舱预算执行率卡跳转 ?metric=rate），无参默认健康度
const METRIC_KEYS: MetricCardKey[] = ["health", "executed", "rate", "deviation", "operating", "perbox"];

function ExpenseOverviewContent() {
  // 费用科目筛选状态（"all" = 全部费用），搜索框与下拉共用
  const [subjectId, setSubjectId] = useState("all");
  // 深链预选指标卡（?metric=rate 等），非法值回退健康度
  const metricParam = useSearchParams().get("metric");
  const initialCard = METRIC_KEYS.includes(metricParam as MetricCardKey)
    ? (metricParam as MetricCardKey)
    : "health";
  // 选中指标卡（默认健康度趋势图；点击「累计执行金额」卡展示月度执行趋势图）
  const [activeCard, setActiveCard] = useState<MetricCardKey>(initialCard);

  return (
    <AiAssistant>
      <div className="space-y-4">
        <ExpenseHeader subjectId={subjectId} onSubjectChange={setSubjectId} />
        <ExpenseOverviewCards subjectId={subjectId} active={activeCard} onSelect={setActiveCard} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {/* 趋势图占宽 3/5（随选中指标卡切换），进度异常科目占 2/5 */}
          <div className="xl:col-span-3">
            {activeCard === "executed" ? (
              <MonthlyTrendChart subjectId={subjectId} />
            ) : activeCard === "rate" ? (
              <RateTrendChart subjectId={subjectId} />
            ) : activeCard === "deviation" ? (
              <DeviationTrendChart subjectId={subjectId} />
            ) : activeCard === "operating" ? (
              <OperatingCostTrendChart />
            ) : activeCard === "perbox" ? (
              <PerBoxTrendChart />
            ) : (
              <HealthTrendChart subjectId={subjectId} />
            )}
          </div>
          <div className="xl:col-span-2">
            <AbnormalSubjectsPanel subjectId={subjectId} />
          </div>
        </div>
      </div>
    </AiAssistant>
  );
}

export default function ExpenseOverviewPage() {
  return (
    <Suspense fallback={null}>
      <ExpenseOverviewContent />
    </Suspense>
  );
}
