"use client";

import { useState } from "react";
import { CoreMetricCards, EnergyTypeCards } from "@/components/grid-forecast/MetricCards";
import { TrendForecastChart } from "@/components/grid-forecast/TrendForecastChart";
import { HierarchyCompareChart } from "@/components/grid-forecast/HierarchyCompareChart";
import { EnergyTopRanking } from "@/components/grid-forecast/EnergyTopRanking";
import { EnergyTypeTrendCharts } from "@/components/grid-forecast/EnergyTypeTrendCharts";
import { EnergyStructureChart } from "@/components/grid-forecast/EnergyStructureChart";
import { EnergyThreeStateChart } from "@/components/grid-forecast/EnergyThreeStateChart";
import { AnomalyRanking } from "@/components/grid-forecast/AnomalyRanking";
import { AnomalyDrawer } from "@/components/grid-forecast/AnomalyDrawer";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

export default function GridForecastPage() {
  // 全局异常详情抽屉（供各图表点击异常复用）
  const [drawer, setDrawer] = useState<AnomalyDetail | null>(null);
  const onAnomaly = (d: AnomalyDetail) => setDrawer(d);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">能耗预测与运行分析</h1>
      </div>

      {/* 顶部 5 个核心指标卡 */}
      <CoreMetricCards />

      {/* 能源分类 4 个指标卡 */}
      <EnergyTypeCards />

      {/* 综合能耗趋势与预测 */}
      <TrendForecastChart onAnomaly={onAnomaly} />

      {/* 分层实际能耗对比 + 全厂能耗 Top 排名 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HierarchyCompareChart />
        <EnergyTopRanking />
      </div>

      {/* 分类能源趋势 + 能源结构 */}
      <EnergyTypeTrendCharts onAnomaly={onAnomaly} />

      {/* 能源结构 + 能耗三态构成 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EnergyStructureChart />
        <EnergyThreeStateChart />
      </div>

      {/* 当前异常分布与定位（可下钻） */}
      <AnomalyRanking />

      {/* 异常详情抽屉 */}
      <AnomalyDrawer open={drawer !== null} onClose={() => setDrawer(null)} detail={drawer} />
    </div>
  );
}
