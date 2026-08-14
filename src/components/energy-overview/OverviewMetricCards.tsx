"use client";

import { carbonBreakdown, overviewCards } from "@/lib/mock-data/energy-overview";

// 带左侧色条的卡片外壳
function CardShell({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: color }} />
      <div className="pl-2">{children}</div>
    </div>
  );
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// 涨跌语义色：与「好方向」一致为绿、相反为橙（能耗类下降为好 → 下降绿、上升橙）
function trendCls(v: number, goodDirection: "down" | "up") {
  const good = goodDirection === "down" ? v <= 0 : v >= 0;
  return good ? "text-green-600" : "text-orange-500";
}

// 顶部 9 张指标卡：8 张单指标卡 + 1 张碳排放分类卡
export function OverviewMetricCards() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {overviewCards.map((c) => {
        return (
          <CardShell key={c.key} color="#3b82f6">
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="truncate text-xs text-gray-500">{c.label}</span>
            </div>
            <div className="mb-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">
                {c.value.toLocaleString(undefined, { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals })}
              </span>
              <span className="text-sm text-gray-400">{c.unit}</span>
              <span className="text-[10px] text-gray-300">{c.period}</span>
            </div>
            {c.compare && (
              <div className={`text-xs font-medium ${c.compare.good ? "text-green-600" : "text-orange-500"}`}>
                {c.compare.text}
              </div>
            )}
            {(c.yoy !== undefined || c.mom !== undefined) && (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                {c.yoy !== undefined && (
                  <span className={trendCls(c.yoy, c.goodDirection)}>同比 {sign(c.yoy)}%</span>
                )}
                {c.mom !== undefined && (
                  <span className={trendCls(c.mom, c.goodDirection)}>环比 {sign(c.mom)}%</span>
                )}
              </div>
            )}
          </CardShell>
        );
      })}

      {/* 碳排放分类卡（按月展示一 / 二 / 三类碳排放，跨两列） */}
      <div className="col-span-2">
        <CardShell color="#8b5cf6">
          <div className="mb-1.5 text-xs text-gray-500">碳排放（{carbonBreakdown.period}）</div>
          <div className="space-y-1.5">
            {carbonBreakdown.items.map((it) => (
              <div key={it.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{it.label}</span>
                <span className="text-sm font-medium text-gray-800">
                  {it.value.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-gray-400">{carbonBreakdown.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </CardShell>
      </div>
    </div>
  );
}
