"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "./SegmentedControl";
import { AnomalyLevelLegend } from "./AnomalyLevelLegend";
import { ALERT_LEVEL_COLOR, GRADE_TO_LEVEL, type AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import {
  COMPREHENSIVE_DAILY_VIEW,
  COMPREHENSIVE_MONTHLY,
  COMPREHENSIVE_WEEKLY,
  buildOverviewAnomaly,
  byYear,
  type HistPoint,
} from "@/lib/mock-data/energy-overview";

type Range = "日" | "周" | "月" | "年";

const NAME_MAP: Record<string, string> = { actual: "实际值", avg: "历史均值", target: "目标值" };

// 单箱综合能耗趋势：实际值（蓝实线）/ 历史均值（蓝虚线）/ 目标值（橙水平线），支持日 / 周 / 月 / 年切换
export function ComprehensiveEnergyChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  const [range, setRange] = useState<Range>("月");

  const data = useMemo<HistPoint[]>(() => {
    if (range === "日") return COMPREHENSIVE_DAILY_VIEW; // 近 90 天
    if (range === "周") return COMPREHENSIVE_WEEKLY; // 近 12 周聚合
    if (range === "月") return COMPREHENSIVE_MONTHLY; // 2024-01 起全量
    return byYear(COMPREHENSIVE_MONTHLY); // 按年均值
  }, [range]);

  function handleClick(e: any) {
    if (!e?.activeLabel) return;
    const pt = data.find((d) => d.date === e.activeLabel);
    // 异常点仅日粒度展示，点击查看异常详情也仅日粒度生效
    if (range === "日" && pt?.anomaly) onAnomaly(buildOverviewAnomaly("comprehensive", pt));
  }

  return (
    <Card
      title="📈 单箱综合能耗趋势（kgce/箱）"
      headerRight={
        <SegmentedControl
          options={[
            { value: "日", label: "日" },
            { value: "周", label: "周" },
            { value: "月", label: "月" },
            { value: "年", label: "年" },
          ]}
          value={range}
          onChange={setRange}
        />
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={range === "月" ? 2 : range === "日" ? 5 : 0} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={44} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [v, NAME_MAP[n as string] ?? n]}
          />
          <Line type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="4 4" dot={false} name="目标值" />
          <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeDasharray="5 4" strokeWidth={1.5} dot={false} name="历史均值" />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="实际值" />
          {/* 异常偏差点仅日粒度展示（周 / 月 / 年聚合粒度不展示） */}
          {range === "日" &&
            data
              .filter((d) => d.anomaly)
              .map((d) => (
                <ReferenceDot
                  key={d.iso}
                  x={d.date}
                  y={d.actual}
                  r={5}
                  fill={ALERT_LEVEL_COLOR[GRADE_TO_LEVEL[d.anomaly!]]}
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
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-orange-500" /> 目标值
        </span>
        {range === "日" && <AnomalyLevelLegend />}
      </div>
    </Card>
  );
}
