"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";
import { getEnergyThreeState } from "@/lib/mock-data/grid-forecast";

const selectCls =
  "px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";

export function EnergyThreeStateChart() {
  const [range, setRange] = useState<"本月累计" | "今年累计">("本月累计");
  const data = getEnergyThreeState(range);

  return (
    <Card
      title={`🍩 能耗三态构成（tce）　${range}`}
      headerRight={
        <select className={selectCls} value={range} onChange={(e) => setRange(e.target.value as "本月累计" | "今年累计")}>
          <option value="本月累计">本月累计</option>
          <option value="今年累计">今年累计</option>
        </select>
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={3}
            label={(e: any) => `${e.name} ${Math.round((e.percent ?? 0) * 100)}%`}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(_v: any, _n: any, entry: any) => {
              const d = entry?.payload;
              return [`${d?.value} tce（占比 ${d?.pct}%）`, d?.name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-gray-400">
        总能耗三态划分：基础能耗（非生产照明/空调/办公）、正常生产能耗、高负荷能耗；鼠标悬停查看折标量与占比。
      </p>
    </Card>
  );
}
