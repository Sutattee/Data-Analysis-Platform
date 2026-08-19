"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/Card";
import { DEPT_POWER } from "@/lib/mock-data/energy-overview";

// 区域电耗对比：当期实际 vs 历史均值（横向条形图，按实际值降序，按天口径）
export function DeptPowerCompareChart() {
  const data = useMemo(() => [...DEPT_POWER].sort((a, b) => b.actual - a.actual), []);

  return (
    <Card title="🏢 区域电耗对比（更新时间：2026-08-19  12:00，kWh）">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={86} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [Number(v).toLocaleString(), n]}
          />
          <Legend wrapperStyle={{ fontSize: 11, textAlign: "center" }} />
          <Bar dataKey="avg" name="历史均值" fill="#93c5fd" radius={[0, 4, 4, 0]} barSize={12} />
          <Bar dataKey="actual" name="当期实际" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
