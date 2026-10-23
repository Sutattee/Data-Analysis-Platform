"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { dailyTrend, type DefectRecord } from "@/lib/mock-data/quality-defect";

// ISO → 9/25 展示
function md(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

// Tooltip：检验日期 / 缺陷条数 / 缺陷总数 / 占比
function TrendTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as { date: string; count: number };
  const pct = total > 0 ? ((d.count / total) * 100).toFixed(2) : "0.00";
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="text-gray-500">检验日期：{md(d.date)}</p>
      <p className="text-gray-800">缺陷条数：{d.count}条</p>
      <p className="text-gray-500">缺陷总数：{total}条</p>
      <p className="text-gray-500">占比：{pct}%</p>
    </div>
  );
}

// 缺陷趋势：统计周期内逐日缺陷数量折线（x=日期，y=缺陷条数，日粒度）
export function DefectTrendChart({
  records,
  from,
  to,
  total,
}: {
  records: DefectRecord[];
  from: string;
  to: string;
  total: number;
}) {
  const data = useMemo(() => dailyTrend(records, from, to), [records, from, to]);

  return (
    <Card title="缺陷趋势">
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={md}
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
              minTickGap={28}
            />
            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" allowDecimals={false} />
            <Tooltip content={<TrendTooltip total={total} />} />
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
