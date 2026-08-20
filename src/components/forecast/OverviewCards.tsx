"use client";

import { useState } from "react";
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

// 单张指标卡：主值突出 + 判断标签 + 辅助行 + 微型图；
// 带 wanZhi 变体的卡片支持「万支｜箱」单位切换（选中蓝色，数值与单位同步换算）
function OverviewCardItem({ c }: { c: OverviewCardData }) {
  const [unit, setUnit] = useState<"箱" | "万支">("箱");
  const wz = unit === "万支" ? c.wanZhi : undefined;
  const title = wz ? wz.title : c.title;
  const main = wz ? wz.main : c.main;
  const rows = wz ? wz.rows : c.rows;
  // 微型图：万支口径使用换算后的数值
  const spark =
    c.spark && wz?.sparkPoints
      ? { ...c.spark, points: c.spark.points.map((p, i) => ({ ...p, value: wz.sparkPoints![i] ?? p.value })) }
      : c.spark;

  return (
    <Card>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              {title}
              {c.wanZhi && (
                <span className="flex items-center text-xs leading-none">
                  <button
                    type="button"
                    onClick={() => setUnit("万支")}
                    className={unit === "万支" ? "font-medium text-primary-600" : "text-gray-400 hover:text-gray-600"}
                  >
                    万支
                  </button>
                  <span className="mx-0.5 text-gray-300">｜</span>
                  <button
                    type="button"
                    onClick={() => setUnit("箱")}
                    className={unit === "箱" ? "font-medium text-primary-600" : "text-gray-400 hover:text-gray-600"}
                  >
                    箱
                  </button>
                </span>
              )}
            </span>
            {c.tag && (
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${TAG_CLS[c.tag.tone]}`}
              >
                {c.tag.text}
              </span>
            )}
          </div>
          <div className="mt-2.5 text-2xl font-bold text-gray-900">{main.value}</div>
          <div className="text-xs text-gray-400">{main.label}</div>
          <div className="mt-3 space-y-1.5 border-t border-gray-50 pt-2.5">
            {rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="whitespace-nowrap text-gray-500">{r.label}</span>
                <span className={`text-right ${r.tone ? ROW_CLS[r.tone] : "text-gray-800"}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
        {spark && <Spark spark={spark} />}
      </div>
    </Card>
  );
}

// 顶部预测指标卡
export function OverviewCards({ cards }: { cards: OverviewCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {cards.map((c) => (
        <OverviewCardItem key={c.key} c={c} />
      ))}
    </div>
  );
}
