"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";

// Tooltip：横轴维度（检验批次 / 检验日期）/ 缺陷条数 / 缺陷总数 / 占比
function TrendTooltip({ active, payload, total, unit }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as { label: string; count: number };
  const pct = total > 0 ? ((d.count / total) * 100).toFixed(2) : "0.00";
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="text-gray-500">
        {unit === "批次" ? "检验批次" : "检验日期"}：{d.label}
      </p>
      <p className="text-gray-800">缺陷条数：{d.count}条</p>
      <p className="text-gray-500">缺陷总数：{total}条</p>
      <p className="text-gray-500">占比：{pct}%</p>
    </div>
  );
}

// 缺陷趋势折线（x=统计周期粒度，y=缺陷条数）：
// 时间口径按日聚合（横轴为日期 MM-DD），批次口径按批次聚合（横轴为批次号）；无记录的点补 0 保持连续
export function DefectTrendChart({
  points,
  unit,
  total,
}: {
  points: { label: string; count: number }[];
  unit: "批次" | "日";
  total: number;
}) {
  return (
    <Card title="缺陷趋势">
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" minTickGap={28} />
            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" allowDecimals={false} />
            <Tooltip content={<TrendTooltip total={total} unit={unit} />} />
            <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
              type="monotone"
              dataKey="count"
              name="缺陷条数"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#3b82f6" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
