"use client";

import { useState } from "react";
import { carbonBreakdown, overviewCards, type OverviewCard } from "@/lib/mock-data/energy-overview";

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

// 是否支持「万支｜箱」单位切换
function hasUnitToggle(c: OverviewCard): boolean {
  if (!c.unitToggle) return false;
  return c.unit.endsWith("/箱") || c.unit.endsWith("/万支");
}

// 顶部 7 张指标卡：6 张单指标卡 + 1 张碳排放分类卡
export function OverviewMetricCards() {
  // 记录处于「切换态」的卡片 key（默认 = false 即主单位）
  const [toggled, setToggled] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {overviewCards.map((c) => {
        const isAlt = toggled.has(c.key);
        const ut = c.unitToggle;
        const displayUnit = isAlt && ut ? ut.altUnit : c.unit;
        const displayValue =
          isAlt && ut ? c.value * ut.convertFactor : c.value;
        const displayDecimals =
          isAlt && ut && ut.altDecimals !== undefined ? ut.altDecimals : c.decimals;
        const displayCompare =
          isAlt && ut && ut.altCompare ? ut.altCompare : c.compare;
        const toggleable = hasUnitToggle(c);
        // 当前选中的单位口径：默认单位为「箱」时切换态 = 万支；默认「万支」时切换态 = 箱
        const wanZhiActive = toggleable && (c.unit.endsWith("/万支") ? !isAlt : isAlt);
        // 万支口径下名称同步变化：单箱卷烟综合能耗 → 万支卷烟综合能耗 等
        const displayLabel = wanZhiActive ? c.label.replace("单箱", "万支") : c.label;

        return (
          <CardShell key={c.key} color="#3b82f6">
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="truncate text-xs text-gray-500">{displayLabel}</span>
              {toggleable && (
                <span className="flex shrink-0 items-center text-[11px] leading-none">
                  <button
                    type="button"
                    title="按万支展示"
                    onClick={() => !wanZhiActive && toggle(c.key)}
                    className={wanZhiActive ? "font-medium text-primary-600" : "text-gray-400 hover:text-gray-600"}
                  >
                    万支
                  </button>
                  <span className="mx-0.5 text-gray-300">｜</span>
                  <button
                    type="button"
                    title="按箱展示"
                    onClick={() => wanZhiActive && toggle(c.key)}
                    className={!wanZhiActive ? "font-medium text-primary-600" : "text-gray-400 hover:text-gray-600"}
                  >
                    箱
                  </button>
                </span>
              )}
            </div>
            <div className="mb-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">
                {displayValue.toLocaleString(undefined, {
                  minimumFractionDigits: displayDecimals,
                  maximumFractionDigits: displayDecimals,
                })}
              </span>
              <span className="text-sm text-gray-400">{displayUnit}</span>
              <span className="text-[10px] text-gray-300">{c.period}</span>
            </div>
            {displayCompare && (
              <div className={`text-xs font-medium ${displayCompare.good ? "text-green-600" : "text-orange-500"}`}>
                {displayCompare.text}
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

      {/* 碳排放分类卡（按月展示一 / 二 / 三 / 四类碳排放，跨两列） */}
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
