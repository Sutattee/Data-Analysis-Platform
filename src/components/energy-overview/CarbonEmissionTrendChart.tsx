"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { Card } from "@/components/ui/Card";
import { GRADE_STYLE, type AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import { CARBON_MONTHLY, buildOverviewAnomaly } from "@/lib/mock-data/energy-overview";

const NAME_MAP: Record<string, string> = { actual: "实际值", target: "目标值" };

// 单位产值碳排放趋势：按月展示实际值与目标值，实际值高于目标值标记异常点（2024 年起）
export function CarbonEmissionTrendChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  const data = CARBON_MONTHLY;

  function handleClick(e: any) {
    if (!e?.activeLabel) return;
    const pt = data.find((d) => d.date === e.activeLabel);
    if (pt?.anomaly) onAnomaly(buildOverviewAnomaly("carbon", pt));
  }

  return (
    <Card title="🌱 单位产值碳排放趋势（tCO₂e/万元，按月）">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={2} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={52} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [v, NAME_MAP[n as string] ?? n]}
          />
          <Line type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="4 4" dot={false} name="目标值" />
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
      <p className="mt-2 text-xs text-gray-400">
        蓝色实线为实际值、橙色线为目标值（≤0.035）；实际值高于目标值的异常点以黄 / 橙标记，可点击查看详情。数据自 2024 年起。
      </p>
    </Card>
  );
}
