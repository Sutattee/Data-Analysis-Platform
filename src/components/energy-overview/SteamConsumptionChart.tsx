"use client";

import { TabbedSeriesChart } from "./TabbedSeriesChart";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

// 蒸汽消耗分析：总量 / 制丝单位产量 / 空调每日，按天展示
export function SteamConsumptionChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  return (
    <TabbedSeriesChart
      title="♨️ 蒸汽消耗分析（按天）"
      tabs={[
        { key: "steamTotal", label: "蒸汽耗总量" },
        { key: "steamSilk", label: "制丝单位产量蒸汽耗" },
        { key: "steamHvac", label: "空调每日蒸汽耗" },
      ]}
      onAnomaly={onAnomaly}
    />
  );
}
