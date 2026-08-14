"use client";

import { TabbedSeriesChart } from "./TabbedSeriesChart";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

// 天然气消耗分析：单耗 / 锅炉总能耗 / 制丝总能耗，按天展示
export function GasConsumptionChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  return (
    <TabbedSeriesChart
      title="🔥 天然气消耗分析（按天）"
      tabs={[
        { key: "gasUnit", label: "天然气单耗" },
        { key: "gasBoiler", label: "锅炉天然气总能耗" },
        { key: "gasSilk", label: "制丝天然气总能耗" },
      ]}
      onAnomaly={onAnomaly}
    />
  );
}
