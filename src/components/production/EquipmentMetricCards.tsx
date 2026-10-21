"use client";

import { useState } from "react";
import {
  EFFICIENCY_CARDS,
  EQUIPMENT_UNITS,
  PACK_MACHINES,
  ROLL_MACHINES,
  hourlyCardOf,
  netCardOf,
  packCardOf,
  rollCardOf,
  type EfficiencyCard,
} from "@/lib/mock-data/equipment-efficiency";

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

// 卡片右上角单机筛选下拉（机组 / 包装机 / 卷接机共用样式）
function MachineSelect({
  value,
  onChange,
  options,
  title,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  title: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={title}
      className="max-w-[92px] shrink-0 truncate rounded-md border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] text-gray-600 outline-none focus:ring-1 focus:ring-primary-400"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// 顶部 4 张指标卡：白底，当前值突出显示，昨日口径（效率类 ↓ 橙 / ↑ 绿）
// 台时产量卡支持机组筛选（默认 1#卷接包装机组）；包装 / 卷接 / 净效率卡支持单机筛选
// （默认 1#包装机 / ZJ17-01），净效率选项为包装机 + 卷接机分组；切换后展示该机台实际值 / 历史均值 / 同比环比
export function EquipmentMetricCards() {
  const [unit, setUnit] = useState(EQUIPMENT_UNITS[0]);
  const [packM, setPackM] = useState(PACK_MACHINES[0]);
  const [rollM, setRollM] = useState(ROLL_MACHINES[0]);
  const [netM, setNetM] = useState(PACK_MACHINES[0]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {EFFICIENCY_CARDS.map((raw) => {
        const c: EfficiencyCard =
          raw.key === "hourly"
            ? { ...raw, ...hourlyCardOf(unit) }
            : raw.key === "pack"
              ? { ...raw, ...packCardOf(packM) }
              : raw.key === "roll"
                ? { ...raw, ...rollCardOf(rollM) }
                : raw.key === "net"
                  ? { ...raw, ...netCardOf(netM) }
                  : raw;
        return (
          <div
            key={c.key}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="truncate text-xs text-gray-500">{c.label}</span>
              {raw.key === "hourly" && (
                <MachineSelect value={unit} onChange={setUnit} options={EQUIPMENT_UNITS} title="选择机组" />
              )}
              {raw.key === "pack" && (
                <MachineSelect value={packM} onChange={setPackM} options={PACK_MACHINES} title="选择包装机" />
              )}
              {raw.key === "roll" && (
                <MachineSelect value={rollM} onChange={setRollM} options={ROLL_MACHINES} title="选择卷接机" />
              )}
              {raw.key === "net" && (
                <select
                  value={netM}
                  onChange={(e) => setNetM(e.target.value)}
                  title="选择包装机 / 卷接机"
                  className="max-w-[92px] shrink-0 truncate rounded-md border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] text-gray-600 outline-none focus:ring-1 focus:ring-primary-400"
                >
                  <optgroup label="包装机">
                    {PACK_MACHINES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </optgroup>
                  <optgroup label="卷接机">
                    {ROLL_MACHINES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </optgroup>
                </select>
              )}
            </div>
            <div className="mb-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{fmtNum(c.value, c.decimals)}</span>
              <span className="text-sm text-gray-400">{c.unit}</span>
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
        );
      })}
    </div>
  );
}
