"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "./SegmentedControl";
import { GRADE_STYLE, type AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import { DAILY_SERIES, SERIES_META, buildOverviewAnomaly, lastDays, type SeriesKey } from "@/lib/mock-data/energy-overview";

type DailyKey = Exclude<SeriesKey, "comprehensive" | "electricity" | "carbon">;

const NAME_MAP: Record<string, string> = { actual: "实际值", avg: "历史均值" };

// 通用「指标页签 + 按天折线（实际 / 历史均值 + 异常点）」图表，渲染近 90 天
export function TabbedSeriesChart({
  title,
  tabs,
  onAnomaly,
  hint,
}: {
  title: string;
  tabs: { key: DailyKey; label: string }[];
  onAnomaly: (d: AnomalyDetail) => void;
  hint?: string;
}) {
  const [active, setActive] = useState<DailyKey>(tabs[0].key);
  const meta = SERIES_META[active];

  const data = useMemo(() => lastDays(DAILY_SERIES[active], 90), [active]);

  function handleClick(e: any) {
    if (!e?.activeLabel) return;
    const pt = data.find((d) => d.date === e.activeLabel);
    if (pt?.anomaly) onAnomaly(buildOverviewAnomaly(active, pt));
  }

  return (
    <Card
      title={title}
      headerRight={
        <SegmentedControl
          options={tabs.map((t) => ({ value: t.key, label: t.label }))}
          value={active}
          onChange={setActive}
        />
      }
    >
      <div className="mb-1 text-xs text-gray-500">
        <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "#3b82f6" }} />
        {meta.label}（{meta.unit}）
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={14} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={52} domain={["auto", "auto"]} />
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
      <p className="mt-2 text-xs text-gray-400">
        {hint ?? "蓝色实线为实际值、蓝色虚线为历史均值；黄 / 橙 / 红异常点（一般 / 预警 / 危险）可点击查看详情。展示近 90 天。"}
      </p>
    </Card>
  );
}
