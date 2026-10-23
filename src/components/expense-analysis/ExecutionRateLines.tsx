"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { RatePoint } from "@/lib/mock-data/expense-indicators";

interface ExecutionRateLinesProps {
  series: RatePoint[];
}

// Tooltip：预算执行率 / 资金计划应执行
function RateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as RatePoint;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-gray-800">{label}</p>
      <p className="text-gray-500">预算执行率：{d.execRate !== null ? `${d.execRate}%` : "—"}</p>
      <p className="text-gray-500">资金计划应执行：{d.planRate}%</p>
    </div>
  );
}

// 数据标签：两线任意点都按“值大者在上、值小者在下”外侧展示，交叉处也不会重叠
// （execRate 仅 1-8 月有值，为 null 时该点不渲染）
function makeSideLabel(
  series: RatePoint[],
  key: "execRate" | "planRate",
  color: string
) {
  const SideLabel = (props: any) => {
    const { x, y, index } = props;
    const point = series[index];
    if (!point) return null;
    const v = point[key];
    if (v === null || v === undefined) return null;
    const other = key === "execRate" ? point.planRate : point.execRate;
    // 本线值 ≥ 另一线值 → 标签在点上方，否则下方（两标签始终分居两线外侧）
    const above = other === null || other === undefined || v >= other;
    return (
      <text
        x={x}
        y={above ? y - 10 : y + 16}
        textAnchor="middle"
        fontSize={9}
        fill={color}
      >
        {`${v}%`}
      </text>
    );
  };
  SideLabel.displayName = "SideLabel";
  return SideLabel;
}

// 预算执行率：执行率（蓝实线）+ 资金计划应执行（橙虚线）双折线，每个点上展示数值
export function ExecutionRateLines({ series }: ExecutionRateLinesProps) {
  return (
    <Card title="预算执行率（%）">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={series} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={44} domain={[0, 100]} unit="%" />
          <Tooltip content={<RateTooltip />} cursor={{ stroke: "#e5e7eb" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
            type="monotone" dataKey="execRate" name="预算执行率" stroke="#3b82f6" strokeWidth={2}
            dot={{ r: 3, fill: "#3b82f6" }} connectNulls
          >
            <LabelList dataKey="execRate" content={makeSideLabel(series, "execRate", "#3b82f6")} />
          </Line>
          <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
            type="monotone" dataKey="planRate" name="资金计划应执行" stroke="#f97316" strokeWidth={2}
            strokeDasharray="6 4" dot={{ r: 3, fill: "#f97316" }}
          >
            <LabelList dataKey="planRate" content={makeSideLabel(series, "planRate", "#f97316")} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
