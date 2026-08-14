"use client";

import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell } from "recharts";
import { Card } from "@/components/ui/Card";
import type { OverviewCardData, CardTone } from "@/lib/mock-data/forecast-overview";

const TAG_CLS: Record<CardTone, string> = {
  good: "bg-green-100 text-green-700",
  warn: "bg-orange-100 text-orange-700",
  danger: "bg-red-100 text-red-700",
  muted: "bg-slate-100 text-slate-600",
};
const ROW_CLS = {
  orange: "text-orange-600",
  green: "text-green-600",
  danger: "text-red-600",
  muted: "text-gray-500",
} as const;

// 微型图：7 日趋势折线 / 柱线组合（峰值橙色标记）
function Spark({ spark }: { spark: NonNullable<OverviewCardData["spark"]> }) {
  return (
    <div className="w-32 flex-shrink-0 pt-1">
      <ResponsiveContainer width="100%" height={56}>
        {spark.kind === "line" ? (
          <LineChart data={spark.points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={spark.points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {spark.points.map((pt, i) => (
                <Cell key={i} fill={pt.peak ? "#f97316" : "#93c5fd"} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
      <p className="mt-0.5 text-center text-[10px] text-gray-400">未来7日预测</p>
    </div>
  );
}

// 顶部预测指标卡：主值突出 + 判断标签 + 辅助行 + 微型图
export function OverviewCards({ cards }: { cards: OverviewCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {cards.map((c) => (
        <Card key={c.key}>
          <div className="flex gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700">{c.title}</span>
                {c.tag && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${TAG_CLS[c.tag.tone]}`}
                  >
                    {c.tag.text}
                  </span>
                )}
              </div>
              <div className="mt-2.5 text-2xl font-bold text-gray-900">{c.main.value}</div>
              <div className="text-xs text-gray-400">{c.main.label}</div>
              <div className="mt-3 space-y-1.5 border-t border-gray-50 pt-2.5">
                {c.rows.map((r) => (
                  <div key={r.label} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="whitespace-nowrap text-gray-500">{r.label}</span>
                    <span className={`text-right ${r.tone ? ROW_CLS[r.tone] : "text-gray-800"}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {c.spark && <Spark spark={c.spark} />}
          </div>
        </Card>
      ))}
    </div>
  );
}
