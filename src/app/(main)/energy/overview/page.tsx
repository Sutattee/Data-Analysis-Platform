"use client";

import { useState } from "react";
import { OverviewMetricCards } from "@/components/energy-overview/OverviewMetricCards";
import { ComprehensiveEnergyChart } from "@/components/energy-overview/ComprehensiveEnergyChart";
import { ElectricityCombinedChart } from "@/components/energy-overview/ElectricityCombinedChart";
import { DeptPowerCompareChart } from "@/components/energy-overview/DeptPowerCompareChart";
import { SteamConsumptionChart } from "@/components/energy-overview/SteamConsumptionChart";
import { GasConsumptionChart } from "@/components/energy-overview/GasConsumptionChart";
import { CarbonEmissionTrendChart } from "@/components/energy-overview/CarbonEmissionTrendChart";
import { AiAssistant } from "@/components/energy-overview/AiAssistant";
import { AnomalyDrawer } from "@/components/grid-forecast/AnomalyDrawer";
import { ENERGY_INSIGHT_COMMAND } from "@/lib/mock-data/energy-overview";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

export default function EnergyOverviewPage() {
  // 全局异常详情抽屉（供各图表点击异常点复用）
  const [drawer, setDrawer] = useState<AnomalyDetail | null>(null);
  const onAnomaly = (d: AnomalyDetail) => setDrawer(d);

  return (
    /* AI 助手包裹仪表盘：打开对话时右侧推出面板，左侧自适应收窄；
       insightCommand：面板顶部「✦ 智能解读」按钮，点击自动发送指令生成仪表盘解读报告 */
    <AiAssistant insightCommand={ENERGY_INSIGHT_COMMAND}>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">仪表盘问数</h1>
        </div>

        {/* 顶部 9 张指标卡 */}
        <OverviewMetricCards />

        {/* 第一行：单箱综合能耗趋势 + 电耗趋势（三指标页签：全厂 / 制丝 / 卷包，日/月切换）+ 区域电耗对比 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ComprehensiveEnergyChart onAnomaly={onAnomaly} />
          <ElectricityCombinedChart onAnomaly={onAnomaly} />
          <DeptPowerCompareChart />
        </div>

        {/* 第二行：蒸汽消耗分析 + 天然气单耗分析 + 单位产量碳排放趋势（按月） */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SteamConsumptionChart onAnomaly={onAnomaly} />
          <GasConsumptionChart onAnomaly={onAnomaly} />
          <CarbonEmissionTrendChart onAnomaly={onAnomaly} />
        </div>

        {/* 异常详情抽屉 */}
        <AnomalyDrawer open={drawer !== null} onClose={() => setDrawer(null)} detail={drawer} />
      </div>
    </AiAssistant>
  );
}
