"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart, Line, Area, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/energy-overview/SegmentedControl";
import { getTrendSeries, type TrendMetric, type TrendPoint } from "@/lib/mock-data/forecast-overview";

type RangeOpt = "7" | "15" | "30";

// 自定义悬停：实际 / 预测 / 区间 / 历史均值 / 差异比例
function TrendTip({ active, payload, label }: { active?: boolean; payload?: { payload: TrendPoint }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  const diff = pt.predict !== undefined && pt.histAvg ? ((pt.predict - pt.histAvg) / pt.histAvg) * 100 : undefined;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-gray-700">{label}</p>
      {pt.actual !== undefined && <p className="text-gray-600">实际值：{pt.actual}</p>}
      {pt.predict !== undefined && (
        <>
          <p className="text-primary-600">预测值：{pt.predict}</p>
          <p className="text-gray-500">预测区间：{pt.lower} ～ {pt.upper}</p>
        </>
      )}
      {pt.histAvg !== undefined && <p className="text-gray-400">历史均值：{pt.histAvg}</p>}
      {diff !== undefined && (
        <p className={diff > 0 ? "text-orange-600" : "text-green-600"}>
          差异比例：{diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

// 通用趋势预测图：过去30日实际 + 未来预测 + 历史均值线；蒸汽含峰值菱形标记（点击查看详情）
export function TrendForecastCard({ metric }: { metric: TrendMetric }) {
  const [range, setRange] = useState<RangeOpt>("7");
  const days = Number(range) as 7 | 15 | 30;
  const series = useMemo(() => getTrendSeries(metric, days), [metric, days]);
  // 点击峰值标记后展示的详情（蒸汽）
  const [peakDetail, setPeakDetail] = useState<string | null>(null);

  const isSteam = metric === "steam";
  const footer = isSteam
    ? peakDetail ?? "橙色菱形为预测峰值：46.5 t · 预计 8月13日出现（点击峰值标记查看区间详情）"
    : "蓝色实线为实际值、蓝色虚线为预测值、灰色虚线为同工况历史均值；数据每日更新。";

  return (
    <Card
      title={series.title}
      headerRight={
        <SegmentedControl
          options={[
            { value: "7", label: "未来7日" },
            { value: "15", label: "未来15日" },
            { value: "30", label: "未来30日" },
          ]}
          value={range}
          onChange={setRange}
        />
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={series.points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={7} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={48} domain={["auto", "auto"]} />
          <Tooltip content={<TrendTip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="upper" stroke="none" fill="#bfdbfe" fillOpacity={0.5} name="预测区间上界" />
          <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} legendType="none" />
          <Line type="monotone" dataKey="histAvg" stroke="#9ca3af" strokeDasharray="4 4" dot={false} name="同工况历史均值" />
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
          {isSteam && (
            <Scatter
              dataKey="peak"
              shape="diamond"
              fill="#f97316"
              legendType="diamond"
              name="预测峰值"
              isAnimationActive={false}
              onClick={() =>
                series.peakInfo &&
                setPeakDetail(
                  `峰值详情（${series.peakInfo.date}）：预测 ${series.peakInfo.value} ${series.unit}，区间 ${series.peakInfo.lower}～${series.peakInfo.upper} ${series.unit}`
                )
              }
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-gray-400">{footer}</p>
    </Card>
  );
}
