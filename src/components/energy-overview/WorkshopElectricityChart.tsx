"use client";

import { TabbedSeriesChart } from "./TabbedSeriesChart";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

// 车间单位电耗趋势：制丝每公斤电耗 / 卷包单箱电耗（支持万支口径切换），按天展示
export function WorkshopElectricityChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  return (
    <TabbedSeriesChart
      title="🏭 车间单位电耗趋势（按天）"
      tabs={[
        { key: "silkPower", label: "制丝车间" },
        { key: "packPower", label: "卷包车间" },
      ]}
      onAnomaly={onAnomaly}
      hint="两项指标单位不同（制丝 kWh/kg、卷包 kWh/箱），不在同一坐标轴直接比较；黄 / 橙 / 红异常点可点击查看详情。展示近 90 天。"
    />
  );
}
