"use client";

import { materialCards, type MaterialCard } from "@/lib/mock-data/material-consumption";

// 涨跌方向符号：上升 ↑ / 下降 ↓ / 持平 0
const sign = (n: number) => (n > 0 ? `↑${n}` : n < 0 ? `↓${Math.abs(n)}` : `${n}`);

// 辅料页着色规则（与能源总览不同，按箭头方向字面映射）：↓ 绿 / ↑ 橙
const arrowCls = (v: number) => (v < 0 ? "text-green-600" : v > 0 ? "text-orange-500" : "text-gray-400");

// 目标值/历史均值对比行：仅括号内「↑/↓百分比」着色，其余文字（含括号）黑色
function renderCompareText(text: string, good: boolean) {
  const m = text.match(/^(.*?)[（(]([↑↓][^）)]*)[）)](.*)$/);
  if (!m) return <span className="text-gray-900">{text}</span>;
  return (
    <span className="text-gray-900">
      {m[1]}（<span className={good ? "text-green-600" : "text-orange-500"}>{m[2]}</span>）{m[3]}
    </span>
  );
}

// 顶部 4 张辅料指标卡：白底，当前值突出显示，昨日口径
export function MaterialMetricCards() {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {materialCards.map((c: MaterialCard) => (
        <div
          key={c.key}
          className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <div className="mb-1 truncate text-xs text-gray-500">{c.label}</div>
          <div className="mb-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">
              {c.value.toLocaleString(undefined, {
                minimumFractionDigits: c.decimals,
                maximumFractionDigits: c.decimals,
              })}
            </span>
            <span className="text-sm text-gray-400">{c.unit}</span>
            <span className="text-[10px] text-gray-300">昨日</span>
          </div>
          {c.compare && (
            <div className="text-xs font-medium">{renderCompareText(c.compare.text, c.compare.good)}</div>
          )}
          {c.compare2 && (
            <div className="text-xs font-medium">{renderCompareText(c.compare2.text, c.compare2.good)}</div>
          )}
          <div className="mt-0.5 flex items-center gap-1.5 text-xs">
            <span className="text-gray-900">
              同比 <span className={arrowCls(c.yoy)}>{sign(c.yoy)}%</span>
            </span>
            <span className="text-gray-900">
              环比 <span className={arrowCls(c.mom)}>{sign(c.mom)}%</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
