"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { Card } from "@/components/ui/Card";
import { UNIT_COMPLETION, unitCompletionByShift, type UnitCompletion } from "@/lib/mock-data/equipment-efficiency";

// 数值格式：千分位
const fmt = (v: number) => v.toLocaleString("en-US");

// Tooltip：计划产量 / 完成产量（/ 完成率）
function CompletionTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as UnitCompletion;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-gray-800">{d.name}</p>
      <p className="text-gray-500">计划产量：{fmt(d.plan)} 箱</p>
      <p className="text-gray-500">完成产量：{fmt(d.actual)} 箱</p>
      <p className="mt-0.5 border-t border-gray-100 pt-0.5 text-gray-400">完成率：{d.rate}%</p>
    </div>
  );
}

// 机台日计划产量完成率：16 台机组全量横向条形图（按完成率降序，条长=完成率，条侧直接标注完成率数值，昨日口径）；
// 点击机组横条下钻至该机组早/中/晚班完成率；移入展示计划产量 / 完成产量
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
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 48, left: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" domain={[0, 120]} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={drillUnit ? 64 : 104} />
          <Tooltip content={<CompletionTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.06)" }} />
          <Bar
            dataKey="rate"
            name="完成率"
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
            barSize={12}
            cursor="pointer"
            // 主视图点击机组横条 → 下钻班次；班次视图不响应
            onClick={(entry: any) => {
              if (!drillUnit && entry?.payload?.name) setDrillUnit(entry.payload.name);
            }}
          >
            {/* 条形右侧直接标注完成率（全部视图） */}
            <LabelList dataKey="rate" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fill: "#6b7280" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
