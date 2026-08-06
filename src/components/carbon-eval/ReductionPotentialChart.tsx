"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/Card";
import { getReductionPotential } from "@/lib/mock-data/carbon-eval";

const COLORS = ["#3b82f6", "#3b82f6", "#8b5cf6", "#8b5cf6", "#14b8a6", "#14b8a6"];

export function ReductionPotentialChart() {
  const data = getReductionPotential();

  return (
    <Card title="💡 减排潜力分析（预计年度减排量 tCO₂e）">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={96} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(_v: any, _n: any, entry: any) => {
              const d = entry?.payload;
              return [`${d?.reduction} tCO₂e（减排率 ${d?.rate}%）｜投资 ${d?.invest}｜回收期 ${d?.payback}`, d?.name];
            }}
          />
          <Bar dataKey="reduction" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-gray-400">
        按预计减排量降序排列，突出 Top 措施；悬停查看减排量、减排率、预计投资、回收期及计算依据（{`计算依据：${data[0]?.basis}`} 等）。
      </p>
    </Card>
  );
}
