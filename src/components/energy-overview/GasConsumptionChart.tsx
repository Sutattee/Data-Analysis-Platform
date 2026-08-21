"use client";

import { TabbedSeriesChart } from "./TabbedSeriesChart";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

// 天然气单耗分析：按天展示（单指标，无页签；单位在标题中展示）
export function GasConsumptionChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  return (
    <TabbedSeriesChart
      title="🔥 天然气单耗分析（按天 Nm³/箱）"
      tabs={[
        { key: "gasUnit", label: "天然气单耗" },
      ]}
      hideTabs
      hideLabel
      onAnomaly={onAnomaly}
    />
  );
}
