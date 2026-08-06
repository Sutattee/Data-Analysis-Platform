"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendSeries } from "@/types";
import { Card } from "@/components/ui/Card";

interface TrendChartProps {
  series: TrendSeries[];
  title: string;
  height?: number;
}

export function TrendChart({ series, title, height = 280 }: TrendChartProps) {
  // 合并多系列数据
  const mergedData: Record<string, number | string>[] = [];
  const allDates = new Set<string>();
  series.forEach((s) => s.data.forEach((p) => allDates.add(p.date)));
  const sortedDates = Array.from(allDates).sort((a, b) => {
    const [am, ad] = a.split("/").map(Number);
    const [bm, bd] = b.split("/").map(Number);
    return am - bm || ad - bd;
  });

  for (const date of sortedDates) {
    const row: Record<string, number | string> = { date };
    series.forEach((s) => {
      const point = s.data.find((p) => p.date === date);
      row[s.name] = point ? point.value : 0;
    });
    mergedData.push(row);
  }

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={mergedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
          />
          {series.map((s) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
