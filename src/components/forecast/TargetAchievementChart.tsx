"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/energy-overview/SegmentedControl";
import { getTargetSeries, type TargetPoint } from "@/lib/mock-data/forecast-overview";

// 自定义悬停：实际值 / 预测值 / 区间 / 目标值 / 预计差距
function TargetTip({ active, payload, label }: { active?: boolean; payload?: { payload: TargetPoint }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  const gap = pt.predict !== undefined ? pt.predict - (pt.target ?? 0) : undefined;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-gray-700">{label}</p>
      {pt.actual !== undefined && <p className="text-gray-600">实际值：{pt.actual} kgce/箱</p>}
      {pt.predict !== undefined && (
        <>
          <p className="text-primary-600">预测值：{pt.predict} kgce/箱</p>
          <p className="text-gray-500">预测区间：{pt.lower} ～ {pt.upper} kgce/箱</p>
        </>
      )}
      <p className="text-orange-600">目标值：≤ {pt.target} kgce/箱</p>
      {gap !== undefined && (
        <p className={gap > 0 ? "text-red-600" : "text-green-600"}>
          预计差距：{gap >= 0 ? "高出" : "低于"} {Math.abs(gap).toFixed(1)} kgce/箱
        </p>
      )}
    </div>
  );
}

// 单箱综合能耗目标达成预测：实际（周更新）+ 预测 + 区间 + 目标线
export function TargetAchievementChart() {
  const [period, setPeriod] = useState<"本月" | "本年度">("本年度");
  const { points, summary } = useMemo(() => getTargetSeries(period), [period]);

  return (
    <Card
      title="单箱综合能耗目标达成预测"
      headerRight={
        <SegmentedControl
          options={[
            { value: "本月", label: "本月" },
            { value: "本年度", label: "本年度" },
          ]}
          value={period}
          onChange={setPeriod}
        />
      }
    >
      {summary && (
        <p className="mb-2 rounded-lg bg-primary-50 px-3 py-2 text-xs leading-relaxed text-gray-700">{summary}</p>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={points.length > 20 ? 4 : 0} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={48} domain={["auto", "auto"]} />
          <Tooltip content={<TargetTip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="upper" stroke="none" fill="#bfdbfe" fillOpacity={0.5} name="预测区间上界" />
          <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} legendType="none" />
          <Line type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="4 4" dot={false} name="目标值" />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls name="实际值" />
          <Line
            type="monotone"
            dataKey="predict"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls
            name="预测值"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-gray-400">实际数据按周更新；预测区间为 90% 置信水平。</p>
    </Card>
  );
}
