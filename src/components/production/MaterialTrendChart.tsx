"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/energy-overview/SegmentedControl";
import { AnomalyLevelLegend } from "@/components/energy-overview/AnomalyLevelLegend";
import { ALERT_LEVEL_COLOR, GRADE_TO_LEVEL, type AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import {
  MATERIAL_META,
  MATERIAL_MONTHLY,
  buildMaterialAnomaly,
  materialDailyView,
  type MaterialKey,
} from "@/lib/mock-data/material-consumption";

type Range = "日" | "月";

const NAME_MAP: Record<string, string> = { actual: "实际值", avg: "历史均值", target: "目标值" };

// 辅料消耗趋势图（单指标）：实际值（蓝实线）/ 历史均值（蓝虚线）/ 目标值（橙虚线），支持日 / 月切换；
// 异常偏差点仅日档展示（五色），点击弹出异常详情抽屉
export function MaterialTrendChart({
  seriesKey,
  onAnomaly,
}: {
  seriesKey: MaterialKey;
  onAnomaly: (d: AnomalyDetail) => void;
}) {
  const [range, setRange] = useState<Range>("日");
  const meta = MATERIAL_META[seriesKey];
  const hasTarget = MATERIAL_MONTHLY[seriesKey].some((p) => p.target !== undefined);

  const data = useMemo(
    () => (range === "日" ? materialDailyView(seriesKey) : MATERIAL_MONTHLY[seriesKey]),
    [seriesKey, range]
  );

  function handleClick(e: any) {
    if (!e?.activeLabel) return;
    const pt = data.find((d) => d.date === e.activeLabel);
    // 异常点仅日档展示，点击查看异常详情也仅日档生效
    if (range === "日" && pt?.anomaly) onAnomaly(buildMaterialAnomaly(seriesKey, pt));
  }

  return (
    <Card
      title={`${meta.label}趋势（${meta.unit}）`}
      headerRight={
        // 统计粒度切换：标题右侧，与标题高度对齐
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
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={range === "日" ? 14 : 2} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={56} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [v, NAME_MAP[n as string] ?? n]}
          />
          {hasTarget && (
            <Line type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="4 4" dot={false} name="目标值" />
          )}
          <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeDasharray="5 4" strokeWidth={1.5} dot={false} name="历史均值" />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="实际值" />
          {/* 异常偏差点仅日档展示（月档聚合粒度不展示） */}
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
        {hasTarget && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-orange-500" /> 目标值
          </span>
        )}
        {range === "日" && <AnomalyLevelLegend labels={{ 关注: "一般" }} />}
      </div>
    </Card>
  );
}
