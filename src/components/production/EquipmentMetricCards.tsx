"use client";

import { EFFICIENCY_CARDS, type EfficiencyCard } from "@/lib/mock-data/equipment-efficiency";

// 涨跌文案：↑ / ↓ + 数值（去掉尾零的百分比）
const pctText = (v: number) => `${v > 0 ? "↑" : v < 0 ? "↓" : ""}${Math.abs(parseFloat(v.toFixed(1)))}%`;

// 着色：效率类（产出口径）↓ 橙 / ↑ 绿
const arrowCls = (v: number) => {
  if (v === 0) return "text-gray-400";
  return v > 0 ? "text-green-600" : "text-orange-500";
};

// 数值格式：千分位 + 指定位数
const fmtNum = (v: number, decimals: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// 目标值/历史均值对比行：「目标值：1,100（↓9.1%）」，仅括号内百分比着色，其余黑色
// 括号百分比 =（实际值 − 对比值）÷ 对比值
function CompareLine({ label, base, card }: { label: string; base: number; card: EfficiencyCard }) {
  const pct = ((card.value - base) / base) * 100;
  return (
    <div className="text-xs font-medium text-gray-900">
      {label}：{fmtNum(base, card.decimals)}（<span className={arrowCls(pct)}>{pctText(pct)}</span>）
    </div>
  );
}

// 顶部 4 张指标卡：白底，当前值突出显示，昨日口径（效率类 ↓ 橙 / ↑ 绿）
export function EquipmentMetricCards() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {EFFICIENCY_CARDS.map((c) => (
        <div
          key={c.key}
          className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <div className="mb-1 flex items-center justify-between gap-1">
            <span className="truncate text-xs text-gray-500">{c.label}</span>
          </div>
          <div className="mb-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{fmtNum(c.value, c.decimals)}</span>
            <span className="text-sm text-gray-400">{c.unit}</span>
            <span className="text-[10px] text-gray-300">昨日</span>
          </div>
          {c.target !== undefined && <CompareLine label="目标值" base={c.target} card={c} />}
          {c.avg !== undefined && <CompareLine label="历史均值" base={c.avg} card={c} />}
          <div className="mt-0.5 flex items-center gap-1.5 text-xs">
            <span className="text-gray-900">
              同比 <span className={arrowCls(c.yoy)}>{pctText(c.yoy)}</span>
            </span>
            <span className="text-gray-900">
              环比 <span className={arrowCls(c.mom)}>{pctText(c.mom)}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
