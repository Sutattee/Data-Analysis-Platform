"use client";

import { OverviewCards } from "@/components/forecast/OverviewCards";
import { TargetAchievementChart } from "@/components/forecast/TargetAchievementChart";
import { TrendForecastCard } from "@/components/forecast/TrendForecastCard";
import { getOverviewCards, DATA_END } from "@/lib/mock-data/forecast-overview";
import { AiAssistant } from "@/components/energy-overview/AiAssistant";

// 预测总览：自动展示最新预测结果（顶部指标卡 + 核心图表）
export default function ForecastOverviewPage() {
  return (
    /* AI 助手包裹仪表盘：打开对话时右侧推出面板，左侧自适应收窄 */
    <AiAssistant>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">预测总览</h1>
          <p className="mt-1 text-sm text-gray-500">最新预测结果自动展示｜数据截止 {DATA_END}</p>
        </div>

        {/* 顶部预测指标卡 */}
        <OverviewCards cards={getOverviewCards()} />

        {/* 核心图表 */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <TargetAchievementChart />
          <TrendForecastCard metric="packPower" />
          <TrendForecastCard metric="steam" />
          <TrendForecastCard metric="gas" />
        </div>
      </div>
    </AiAssistant>
  );
}
