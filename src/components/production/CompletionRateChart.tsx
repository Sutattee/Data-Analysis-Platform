"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { Card } from "@/components/ui/Card";
import { UNIT_COMPLETION, type UnitCompletion } from "@/lib/mock-data/equipment-efficiency";

// Tooltip：未完成日期 / 完成率
function CompletionTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as UnitCompletion;
  return (
    <div className="max-w-[280px] rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-gray-800">{d.name}</p>
      <p className="text-gray-500">未完成日期：{d.missedDays.length ? d.missedDays.join("、") : "—"}</p>
      <p className="mt-0.5 border-t border-gray-100 pt-0.5 text-gray-400">完成率：{d.rate}%</p>
    </div>
  );
}

// 月度机台日计划产量完成率：16 台机组全量横向条形图（按完成率降序，条侧直接标注完成率）；
// 移入展示该机组当月未完成日期 / 月度完成率
export function CompletionRateChart() {
  const data = useMemo(() => [...UNIT_COMPLETION].sort((a, b) => b.rate - a.rate), []);

  return (
    <Card
      title="月度机台日计划产量完成率（%）"
      headerRight={<span className="text-xs text-gray-400">统计范围：本月</span>}
    >
      <ResponsiveContainer width="100%" height={440}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 48, left: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" domain={[0, 120]} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={104} />
          <Tooltip content={<CompletionTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.06)" }} />
          <Bar isAnimationActive animationDuration={900} animationEasing="ease-out" dataKey="rate" name="完成率" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12}>
            {/* 条形右侧直接标注完成率（如 96%） */}
            <LabelList dataKey="rate" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fill: "#6b7280" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
