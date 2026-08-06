"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";
import { getCarbonSource } from "@/lib/mock-data/carbon-eval";

const selectCls =
  "px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";

const tipFmt = (_v: any, _n: any, entry: any) => {
  const d = entry?.payload;
  return [`${d?.value} tCO₂e（占比 ${d?.pct}%）`, d?.name];
};

export function CarbonSourceChart() {
  const [range, setRange] = useState<"本月累计" | "本季度累计">("本季度累计");
  const data = getCarbonSource(range);

  return (
    <Card
      title={`🍩 碳排放来源构成（总量 ${data.total.toLocaleString()} tCO₂e）　${range}`}
      headerRight={
        <select className={selectCls} value={range} onChange={(e) => setRange(e.target.value as "本月累计" | "本季度累计")}>
          <option value="本季度累计">本季度累计</option>
          <option value="本月累计">本月累计</option>
        </select>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 左：直接 / 间接碳排放 */}
        <div>
          <div className="mb-1 text-center text-xs text-gray-500">直接 / 间接碳排放</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.inner} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={90} paddingAngle={3}
                label={(e: any) => `${e.name} ${Math.round((e.percent ?? 0) * 100)}%`}>
                {data.inner.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={tipFmt} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* 右：排放来源细分 */}
        <div>
          <div className="mb-1 text-center text-xs text-gray-500">排放来源细分</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.outer} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={90} paddingAngle={3}
                label={(e: any) => `${e.name} ${Math.round((e.percent ?? 0) * 100)}%`}>
                {data.outer.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={tipFmt} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        左图：直接碳排放(Scope1)/间接碳排放(Scope2)；右图：天然气锅炉、工艺直燃、外购电力、外购蒸汽。悬停查看排放量与占比。
      </p>
    </Card>
  );
}
