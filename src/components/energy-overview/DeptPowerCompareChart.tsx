"use client";

import { useMemo } from "react";
import { BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/Card";
import { DEPT_POWER } from "@/lib/mock-data/energy-overview";

// 区域电耗对比：当期实际（横向条形图，按实际值从高到低降序，按天口径）；
// 柱末标注当前实际值与占总电量百分比；名称去掉「电耗/总电耗」后缀
export function DeptPowerCompareChart() {
  const data = useMemo(() => {
    const total = DEPT_POWER.reduce((s, d) => s + d.actual, 0);
    return [...DEPT_POWER]
      .sort((a, b) => b.actual - a.actual)
      .map((d) => ({
        actual: d.actual,
        name: d.name.replace(/(总)?电耗$/, ""),
        labelText: `${d.actual.toLocaleString()}（${((d.actual / total) * 100).toFixed(1)}%）`,
      }));
  }, []);

  return (
    <Card title="🏢 区域电耗对比（kWh）">
      <p className="mb-1 text-right text-xs text-gray-400">更新时间：2026-08-19 12:00</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 108, left: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={86} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [Number(v).toLocaleString(), n]}
          />
          <Legend wrapperStyle={{ fontSize: 11, textAlign: "center" }} />
          <Bar dataKey="actual" name="当期实际" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12}>
            {/* 柱末标签：实际值 + 占总电量百分比 */}
            <LabelList dataKey="labelText" position="right" fontSize={10} fill="#374151" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
