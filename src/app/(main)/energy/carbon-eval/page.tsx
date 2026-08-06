"use client";

import { useState } from "react";
import { CarbonMetricCards } from "@/components/carbon-eval/CarbonMetricCards";
import { CarbonTrendChart } from "@/components/carbon-eval/CarbonTrendChart";
import { ComplianceTrendCharts } from "@/components/carbon-eval/ComplianceTrendCharts";
import { CarbonSourceChart } from "@/components/carbon-eval/CarbonSourceChart";
import { CarbonHierarchyChart } from "@/components/carbon-eval/CarbonHierarchyChart";
import { CarbonTopRanking } from "@/components/carbon-eval/CarbonTopRanking";
import { ReductionPotentialChart } from "@/components/carbon-eval/ReductionPotentialChart";
import { CarbonAnomalyRanking } from "@/components/carbon-eval/CarbonAnomalyRanking";
import { AnomalyDrawer } from "@/components/grid-forecast/AnomalyDrawer";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

export default function CarbonEvalPage() {
  // 全局异常详情抽屉（趋势异常点复用）
  const [drawer, setDrawer] = useState<AnomalyDetail | null>(null);
  const onAnomaly = (d: AnomalyDetail) => setDrawer(d);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">碳排放与环保合规评价</h1>
      </div>

      {/* 顶部指标卡 */}
      <CarbonMetricCards />

      {/* 碳排放趋势与预测 */}
      <CarbonTrendChart onAnomaly={onAnomaly} />

      {/* 环保合规指标趋势 */}
      <ComplianceTrendCharts onAnomaly={onAnomaly} />

      {/* 碳排放来源构成 */}
      <CarbonSourceChart />

      {/* 实际碳排放分层对比 + 全厂碳排放 Top 排名 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CarbonHierarchyChart />
        <CarbonTopRanking />
      </div>

      {/* 减排潜力分析 */}
      <ReductionPotentialChart />

      {/* 当前异常对象排名 */}
      <CarbonAnomalyRanking />

      {/* 异常详情抽屉 */}
      <AnomalyDrawer open={drawer !== null} onClose={() => setDrawer(null)} detail={drawer} />
    </div>
  );
}
