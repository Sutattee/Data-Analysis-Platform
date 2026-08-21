"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "./SegmentedControl";
import { GRADE_STYLE, type AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import { ELECTRICITY_DAILY, ELECTRICITY_MONTHLY, buildOverviewAnomaly, lastDays, type HistPoint } from "@/lib/mock-data/energy-overview";

type Range = "日" | "月";

const NAME_MAP: Record<string, string> = { actual: "实际值", avg: "历史均值" };

// 单箱电耗趋势：实际值 vs 历史均值，支持日（近 90 天）/ 月（2024 年起）切换
export function ElectricityTrendChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  const [range, setRange] = useState<Range>("日");

  const data = useMemo<HistPoint[]>(
    () => (range === "日" ? lastDays(ELECTRICITY_DAILY, 90) : ELECTRICITY_MONTHLY),
    [range]
  );

  function handleClick(e: any) {
    if (!e?.activeLabel) return;
    const pt = data.find((d) => d.date === e.activeLabel);
    if (pt?.anomaly) onAnomaly(buildOverviewAnomaly("electricity", pt));
  }

  return (
    <Card
      title="⚡ 单箱电耗趋势（kWh/箱）"
      headerRight={
        <SegmentedControl
          options={[
            { value: "日", label: "日" },
            { value: "月", label: "月" },
          ]}
          value={range}
          onChange={setRange}
        />
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={range === "日" ? 14 : 2} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={44} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [v, NAME_MAP[n as string] ?? n]}
          />
          <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeDasharray="5 4" strokeWidth={1.5} dot={false} name="历史均值" />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="实际值" />
          {data
            .filter((d) => d.anomaly)
            .map((d) => (
              <ReferenceDot
                key={d.iso}
                x={d.date}
                y={d.actual}
                r={5}
                fill={GRADE_STYLE[d.anomaly!].color}
                stroke="#fff"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                className="cursor-pointer"
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-blue-500" /> 实际值
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-blue-500" /> 历史均值
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" /> 关注
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-orange-500" /> 告警
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" /> 危险
        </span>
      </div>
    </Card>
  );
}
