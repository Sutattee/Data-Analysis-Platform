"use client";

import { MetricForecastCard } from "@/components/forecast/TrendForecastCard";
import { getOverviewCards } from "@/lib/mock-data/forecast-overview";
import { AiAssistant } from "@/components/energy-overview/AiAssistant";

// 预测总览：四张指标预测卡横向单列四行平铺，每张卡内左侧为指标信息、右侧为对应趋势预测图（未来7/15/30日切换）；
// lg 起锁定一屏高度不滚动，四行等分（可用高度 = 100vh − 顶栏 56 − 上下内边距 48）
export default function ForecastOverviewPage() {
  const cards = getOverviewCards();

  return (
    /* AI 助手包裹仪表盘：打开对话时右侧推出面板，左侧自适应收窄 */
    <AiAssistant>
      <div className="flex flex-col gap-3 lg:h-[calc(100vh-104px)]">
        <h1 className="text-xl font-bold text-gray-900">预测总览</h1>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-rows-4">
          {cards.map((c) => (
            <MetricForecastCard key={c.key} card={c} />
          ))}
        </div>
      </div>
    </AiAssistant>
  );
}
