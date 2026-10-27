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
import { batchTrend, type DefectRecord } from "@/lib/mock-data/quality-defect";

// Tooltip：检验批次 / 缺陷条数 / 缺陷总数 / 占比
function TrendTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as { batch: string; count: number };
  const pct = total > 0 ? ((d.count / total) * 100).toFixed(2) : "0.00";
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="text-gray-500">检验批次：{d.batch}</p>
      <p className="text-gray-800">缺陷条数：{d.count}条</p>
      <p className="text-gray-500">缺陷总数：{total}条</p>
      <p className="text-gray-500">占比：{pct}%</p>
    </div>
  );
}

// 缺陷趋势：统计周期（近 N 个批次）内逐批次缺陷数量折线（x=批次，y=缺陷条数，批次粒度）
export function DefectTrendChart({
  records,
  batches,
  total,
}: {
  records: DefectRecord[];
  batches: string[];
  total: number;
}) {
  const data = useMemo(() => batchTrend(records, batches), [records, batches]);

  return (
    <Card title="缺陷趋势">
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="batch" tick={{ fontSize: 10 }} stroke="#9ca3af" minTickGap={28} />
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
