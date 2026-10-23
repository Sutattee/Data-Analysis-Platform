"use client";

import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { ExpenseMonth } from "@/lib/mock-data/expense-overview";

interface MonthlyBarsChartProps {
  monthly: ExpenseMonth[];
}

// Tooltip：预算计划 / 实际执行（悬停查看柱子数值）
function BarsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ExpenseMonth;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-gray-800">{label}</p>
      <p className="text-gray-500">预算计划：{d.plan.toLocaleString()} 万元</p>
      <p className="text-gray-500">实际执行：{d.actual !== null ? `${d.actual.toLocaleString()} 万元` : "—"}</p>
    </div>
  );
}

// 月度执行趋势：预算计划（天蓝）/ 实际执行（深蓝）分组柱形图，底部图例，悬停查看数值
export function MonthlyBarsChart({ monthly }: MonthlyBarsChartProps) {
  return (
    <Card title="月度执行趋势（万元）">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={monthly} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={56} />
          <Tooltip content={<BarsTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.06)" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar isAnimationActive animationDuration={900} animationEasing="ease-out" dataKey="plan" name="预算计划" fill="#7dd3fc" radius={[3, 3, 0, 0]} barSize={16}>
            {/* 柱顶展示数值 */}
            <LabelList dataKey="plan" position="top" formatter={(v: any) => Number(v).toLocaleString()} style={{ fontSize: 9, fill: "#0284c7" }} />
          </Bar>
          <Bar isAnimationActive animationDuration={900} animationEasing="ease-out" dataKey="actual" name="实际执行" fill="#1d4ed8" radius={[3, 3, 0, 0]} barSize={16}>
            <LabelList dataKey="actual" position="top" formatter={(v: any) => (v === null ? "" : Number(v).toLocaleString())} style={{ fontSize: 9, fill: "#1d4ed8" }} />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
