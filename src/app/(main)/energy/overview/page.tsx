"use client";

import { useEffect, useState } from "react";
import { OverviewMetricCards } from "@/components/energy-overview/OverviewMetricCards";
import { ComprehensiveEnergyChart } from "@/components/energy-overview/ComprehensiveEnergyChart";
import { ElectricityTrendChart } from "@/components/energy-overview/ElectricityTrendChart";
import { WorkshopElectricityChart } from "@/components/energy-overview/WorkshopElectricityChart";
import { DeptPowerCompareChart } from "@/components/energy-overview/DeptPowerCompareChart";
import { SteamConsumptionChart } from "@/components/energy-overview/SteamConsumptionChart";
import { GasConsumptionChart } from "@/components/energy-overview/GasConsumptionChart";
import { CarbonEmissionTrendChart } from "@/components/energy-overview/CarbonEmissionTrendChart";
import { AiAssistant } from "@/components/energy-overview/AiAssistant";
import { AnomalyDrawer } from "@/components/grid-forecast/AnomalyDrawer";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

export default function EnergyOverviewPage() {
  // 全局异常详情抽屉（供各图表点击异常点复用）
  const [drawer, setDrawer] = useState<AnomalyDetail | null>(null);
  const onAnomaly = (d: AnomalyDetail) => setDrawer(d);

  // 从告警记录详情「返回异常详情」时，恢复跳转前的抽屉快照
  useEffect(() => {
    const raw = sessionStorage.getItem("anomaly-drawer-return");
    if (raw) {
      sessionStorage.removeItem("anomaly-drawer-return");
      try {
        setDrawer(JSON.parse(raw) as AnomalyDetail);
      } catch {
        /* 忽略非法快照 */
      }
    }
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">能源总览</h1>
      </div>

      {/* 顶部 9 张指标卡 */}
      <OverviewMetricCards />

      {/* 单箱综合能耗趋势（周 / 月 / 年） */}
      <ComprehensiveEnergyChart onAnomaly={onAnomaly} />

      {/* 单箱电耗趋势（日 / 月） */}
      <ElectricityTrendChart onAnomaly={onAnomaly} />

      {/* 车间单位电耗 + 部门电耗对比 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WorkshopElectricityChart onAnomaly={onAnomaly} />
        <DeptPowerCompareChart />
      </div>

      {/* 蒸汽 + 天然气消耗分析 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SteamConsumptionChart onAnomaly={onAnomaly} />
        <GasConsumptionChart onAnomaly={onAnomaly} />
      </div>

      {/* 单位产值碳排放趋势 */}
      <CarbonEmissionTrendChart onAnomaly={onAnomaly} />

      {/* 异常详情抽屉 */}
      <AnomalyDrawer open={drawer !== null} onClose={() => setDrawer(null)} detail={drawer} />

      {/* AI 助手（右下角悬浮球 + 侧滑问数窗口） */}
      <AiAssistant />
    </div>
  );
}
