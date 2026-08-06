"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";
import { getEnergyStructure } from "@/lib/mock-data/grid-forecast";

const OBJECTS = ["全厂", "动力车间", "制丝车间", "卷包车间"];
const selectCls =
  "px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";

export function EnergyStructureChart() {
  const [object, setObject] = useState("全厂");
  const [range, setRange] = useState<"本月累计" | "今年累计">("本月累计");
  const data = getEnergyStructure(object, range);

  return (
    <Card
      title={`🥧 能源结构分析（折标煤 tce）　${range}`}
      headerRight={
        <div className="flex items-center gap-2">
          <select className={selectCls} value={range} onChange={(e) => setRange(e.target.value as "本月累计" | "今年累计")}>
            <option value="本月累计">本月累计</option>
            <option value="今年累计">今年累计</option>
          </select>
          <select className={selectCls} value={object} onChange={(e) => setObject(e.target.value)}>
            {OBJECTS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
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
              return [`${d?.value} tce｜原始 ${d?.original.toLocaleString()} ${d?.unit}（占比 ${d?.pct}%）`, d?.name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-gray-400">电、天然气、蒸汽、水折标煤占比；鼠标悬停查看折标量、原始用量与占比。</p>
    </Card>
  );
}
