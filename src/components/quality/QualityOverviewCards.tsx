"use client";

import { useState } from "react";
import {
  DEFECT_RATE_OPTIONS,
  FINISHED_PREMIUM,
  SILK_PREMIUM,
  PACKING_SCORE,
} from "@/lib/mock-data/quality";

// 缺陷率环比着色：缺陷率上升为劣化（↑ 橙 / ↓ 绿），与消耗类口径一致
const momCls = (v: number) => {
  if (v === 0) return "text-gray-400";
  return v > 0 ? "text-orange-500" : "text-green-600";
};

// 顶部 4 张指标卡：缺陷率（支持 A/B/C/D 等级切换）、成品/制丝优质品率、包装与卷制加权平均分
export function QualityOverviewCards() {
  const [grade, setGrade] = useState("all");
  const rate = DEFECT_RATE_OPTIONS.find((o) => o.key === grade) ?? DEFECT_RATE_OPTIONS[0];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {/* 缺陷率：右上角等级下拉，切换后整卡联动 */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
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
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">本月</span>
          <span className="text-gray-900">
            环比 <span className={momCls(rate.mom)}>{rate.mom > 0 ? "↑" : rate.mom < 0 ? "↓" : ""}{Math.abs(rate.mom)}</span>
          </span>
        </div>
      </div>

      {/* 成品优质品率 */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="truncate text-xs text-gray-500">成品优质品率</span>
          <span className="shrink-0 text-[10px] text-gray-400">当前批次</span>
        </div>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{FINISHED_PREMIUM.value.toFixed(1)}</span>
          <span className="text-sm text-gray-400">%</span>
        </div>
        <div className="text-xs text-gray-400">
          近10批 {FINISHED_PREMIUM.rangeLow.toFixed(1)} – {FINISHED_PREMIUM.rangeHigh.toFixed(1)} %
        </div>
      </div>

      {/* 制丝优质品率 */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="truncate text-xs text-gray-500">制丝优质品率</span>
          <span className="shrink-0 text-[10px] text-gray-400">当前批次</span>
        </div>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{SILK_PREMIUM.value.toFixed(1)}</span>
          <span className="text-sm text-gray-400">%</span>
        </div>
        <div className="text-xs text-gray-400">
          近10批 {SILK_PREMIUM.rangeLow.toFixed(1)} – {SILK_PREMIUM.rangeHigh.toFixed(1)} %
        </div>
      </div>

      {/* 包装与卷制质量检验加权平均值 */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="truncate text-xs text-gray-500">包装与卷制质量检验加权平均值</span>
          <span className="shrink-0 text-[10px] text-gray-400">本月</span>
        </div>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{PACKING_SCORE.value.toFixed(1)}</span>
          <span className="text-sm text-gray-400">分</span>
        </div>
        <div className="text-xs text-gray-400">
          近10批 {PACKING_SCORE.rangeLow.toFixed(1)} – {PACKING_SCORE.rangeHigh.toFixed(1)} 分
        </div>
      </div>
    </div>
  );
}
