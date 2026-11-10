"use client";

import { useState } from "react";
import {
  DEFECT_RATE_OPTIONS,
  FINISHED_PREMIUM,
  SILK_PREMIUM,
  STOPPAGE_RATE,
  PACKING_SCORE,
} from "@/lib/mock-data/quality";

// 缺陷率环比着色：缺陷率上升为劣化（↑ 橙 / ↓ 绿），与消耗类口径一致
const momCls = (v: number) => {
  if (v === 0) return "text-gray-400";
  return v > 0 ? "text-orange-500" : "text-green-600";
};

// 优质品率同/环比着色：率上升为改善（↑ 绿 / ↓ 橙），与缺陷率口径相反
const upCls = (v: number) => {
  if (v === 0) return "text-gray-400";
  return v > 0 ? "text-green-600" : "text-orange-500";
};

// 同比/环比箭头 + 绝对值（0 不带箭头，数值按数据原样展示）
const arrow = (v: number) => `${v > 0 ? "↑" : v < 0 ? "↓" : ""}${Math.abs(v)}`;

// 顶部 5 张指标卡（桌面端保持一行）：缺陷率（支持 A/B/C/D 等级切换）、百小时停机断料率、
// 成品/制丝优质品率、包装与卷制加权平均分；统计周期紧邻当前值右侧展示（不放右上角），
// 同比/环比展示在值下方
export function QualityOverviewCards() {
  const [grade, setGrade] = useState("all");
  const rate = DEFECT_RATE_OPTIONS.find((o) => o.key === grade) ?? DEFECT_RATE_OPTIONS[0];

  // 统计周期小字（紧邻当前值）
  const periodTag = "ml-0.5 text-[10px] text-gray-400";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {/* 缺陷率：右上角等级下拉切换，整卡联动；同比/环比按缺陷率口径着色（升为劣化） */}
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="truncate text-xs text-gray-500">{rate.label}</span>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            title="选择缺陷等级"
            className="max-w-[88px] shrink-0 truncate rounded-md border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] text-gray-600 outline-none focus:ring-1 focus:ring-primary-400"
          >
            <option value="all">全部</option>
            <option value="A">A类</option>
            <option value="B">B类</option>
            <option value="C">C类</option>
            <option value="D">D类</option>
          </select>
        </div>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{rate.value.toFixed(2)}</span>
          <span className="text-sm text-gray-400">%</span>
          <span className={periodTag}>本月</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">同比</span>
          <span className={momCls(rate.yoy)}>{arrow(rate.yoy)}</span>
          <span className="ml-1 text-gray-400">环比</span>
          <span className={momCls(rate.mom)}>{arrow(rate.mom)}</span>
        </div>
      </div>

      {/* 百小时停机断料率：设备效率类指标，率下降为改善（与缺陷率同口径：升橙 / 降绿） */}
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="mb-1 flex items-center">
          <span className="truncate text-xs text-gray-500">百小时停机断料率</span>
        </div>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{STOPPAGE_RATE.value.toFixed(1)}</span>
          <span className="text-sm text-gray-400">%</span>
          <span className={periodTag}>本月</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">同比</span>
          <span className={momCls(STOPPAGE_RATE.yoy)}>{arrow(STOPPAGE_RATE.yoy)}</span>
          <span className="ml-1 text-gray-400">环比</span>
          <span className={momCls(STOPPAGE_RATE.mom)}>{arrow(STOPPAGE_RATE.mom)}</span>
        </div>
      </div>

      {/* 成品优质品率 */}
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="mb-1 flex items-center">
          <span className="truncate text-xs text-gray-500">成品优质品率</span>
        </div>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{FINISHED_PREMIUM.value.toFixed(1)}</span>
          <span className="text-sm text-gray-400">%</span>
          <span className={periodTag}>当前批次</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">同比</span>
          <span className={upCls(FINISHED_PREMIUM.yoy)}>{arrow(FINISHED_PREMIUM.yoy)}</span>
          <span className="ml-1 text-gray-400">环比</span>
          <span className={upCls(FINISHED_PREMIUM.mom)}>{arrow(FINISHED_PREMIUM.mom)}</span>
        </div>
      </div>

      {/* 制丝优质品率 */}
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="mb-1 flex items-center">
          <span className="truncate text-xs text-gray-500">制丝优质品率</span>
        </div>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{SILK_PREMIUM.value.toFixed(1)}</span>
          <span className="text-sm text-gray-400">%</span>
          <span className={periodTag}>当前批次</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">同比</span>
          <span className={upCls(SILK_PREMIUM.yoy)}>{arrow(SILK_PREMIUM.yoy)}</span>
          <span className="ml-1 text-gray-400">环比</span>
          <span className={upCls(SILK_PREMIUM.mom)}>{arrow(SILK_PREMIUM.mom)}</span>
        </div>
      </div>

      {/* 包装与卷制质量检验加权平均值 */}
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="mb-1 flex items-center">
          <span className="truncate text-xs text-gray-500">包装与卷制质量检验加权平均值</span>
        </div>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{PACKING_SCORE.value.toFixed(1)}</span>
          <span className="text-sm text-gray-400">分</span>
          <span className={periodTag}>本月</span>
        </div>
        <div className="text-xs text-gray-400">
          近10批 {PACKING_SCORE.rangeLow.toFixed(1)} – {PACKING_SCORE.rangeHigh.toFixed(1)} 分
        </div>
      </div>
    </div>
  );
}
