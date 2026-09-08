"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { Card } from "@/components/ui/Card";
import { UNIT_COMPLETION, unitCompletionByShift } from "@/lib/mock-data/equipment-efficiency";

// 机台日计划产量完成率：16 台机组全量横向条形图（按完成率降序，实际值蓝色，昨日口径）；
// 点击机组横条下钻至该机组早/中/晚班完成率（条侧直接标注数值）
export function CompletionRateChart() {
  const [drillUnit, setDrillUnit] = useState<string | null>(null);

  const data = useMemo(
    () => (drillUnit ? unitCompletionByShift(drillUnit) : [...UNIT_COMPLETION].sort((a, b) => b.rate - a.rate)),
    [drillUnit]
  );

  return (
    <Card
      title={drillUnit ? `机台日计划产量完成率（%）· ${drillUnit}` : "机台日计划产量完成率（%）"}
      headerRight={
        drillUnit ? (
          <button
            type="button"
            onClick={() => setDrillUnit(null)}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            ← 返回全部机组
          </button>
        ) : (
          <span className="text-xs text-gray-400">点击机组横条可下钻查看班次完成率</span>
        )
      }
    >
      <ResponsiveContainer width="100%" height={drillUnit ? 200 : 440}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, left: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" domain={[0, 120]} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={drillUnit ? 64 : 104} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [`${v}%`, n]}
          />
          <Legend wrapperStyle={{ fontSize: 11, textAlign: "center" }} />
          <Bar
            dataKey="rate"
            name="实际值"
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
            barSize={12}
            cursor="pointer"
            // 主视图点击机组横条 → 下钻班次；班次视图不响应
            onClick={(entry: any) => {
              if (!drillUnit && entry?.payload?.name) setDrillUnit(entry.payload.name);
            }}
          >
            {/* 班次下钻视图：条形右侧直接标注完成率数值 */}
            {drillUnit && (
              <LabelList dataKey="rate" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fill: "#6b7280" }} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
