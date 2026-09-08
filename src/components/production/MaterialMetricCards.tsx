"use client";

import { useState } from "react";
import { materialCards, MATERIAL_BRANDS, type MaterialCard } from "@/lib/mock-data/material-consumption";

// 涨跌文案：↑ / ↓ + 数值（去掉尾零的百分比）
const pctText = (v: number) => `${v > 0 ? "↑" : v < 0 ? "↓" : ""}${Math.abs(parseFloat(v.toFixed(1)))}%`;

// 着色：downGreen 卡 ↓ 绿 / ↑ 橙（单耗类）；其余 ↓ 橙 / ↑ 绿（生产率类）
const arrowCls = (v: number, downGreen: boolean) => {
  const down = v < 0;
  const green = downGreen ? down : v > 0;
  if (v === 0) return "text-gray-400";
  return green ? "text-green-600" : "text-orange-500";
};

// 数值格式：千分位 + 指定位数
const fmtNum = (v: number, decimals: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// 目标值/历史均值对比行：「目标值：2,480（↑0.8%）」，仅括号内百分比着色，其余黑色
function CompareLine({
  label,
  base,
  card,
}: {
  label: string;
  base: number;
  card: MaterialCard;
}) {
  const pct = ((card.value - base) / card.value) * 100;
  return (
    <div className="text-xs font-medium text-gray-900">
      {label}：{fmtNum(base, card.decimals)}（<span className={arrowCls(pct, card.downGreen)}>{pctText(pct)}</span>）
    </div>
  );
}

// 顶部 5 张指标卡：白底，当前值突出显示，昨日口径；
// 盘纸卡右上角为牌号单选下拉（默认「全部」），选择牌号后整卡切换为该牌号口径（实际值/历史均值/同比/环比）
export function MaterialMetricCards() {
  const [brand, setBrand] = useState<string>("全部"); // 盘纸卡牌号选择

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {materialCards.map((c) => {
        const drillable = !!c.brandDetails; // 仅盘纸卡支持牌号下钻
        const idx = drillable ? MATERIAL_BRANDS.indexOf(brand) : -1;
        const detail = drillable && idx >= 0 && c.brandDetails ? c.brandDetails[idx] : undefined;
        // 卡片展示口径：选择牌号后取该牌号明细，否则全口径
        const shown: MaterialCard = detail
          ? { ...c, value: detail.value, avg: detail.avg, yoy: detail.yoy, mom: detail.mom }
          : c;
        return (
          <div
            key={c.key}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="truncate text-xs text-gray-500">
                {c.label}
                {detail ? ` · ${brand}` : ""}
              </span>
              {drillable && (
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  title="选择牌号查看明细"
                  className="flex-shrink-0 max-w-[76px] rounded-md border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] text-gray-600 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="全部">全部</option>
                  {MATERIAL_BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="mb-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{fmtNum(shown.value, c.decimals)}</span>
              <span className="text-sm text-gray-400">{c.unit}</span>
              <span className="text-[10px] text-gray-300">昨日</span>
            </div>
            {shown.target !== undefined && <CompareLine label="目标值" base={shown.target} card={shown} />}
            {shown.avg !== undefined && <CompareLine label="历史均值" base={shown.avg} card={shown} />}
            <div className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span className="text-gray-900">
                同比 <span className={arrowCls(shown.yoy, c.downGreen)}>{pctText(shown.yoy)}</span>
              </span>
              <span className="text-gray-900">
                环比 <span className={arrowCls(shown.mom, c.downGreen)}>{pctText(shown.mom)}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
