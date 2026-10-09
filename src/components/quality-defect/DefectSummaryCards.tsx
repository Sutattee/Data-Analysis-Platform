"use client";

import type { DefectSummary } from "@/lib/mock-data/quality-defect";

// 缺陷相关数值劣化时 ↑ 橙 / ↓ 绿
const badUpCls = (v: number) => {
  if (v === 0) return "text-gray-400";
  return v > 0 ? "text-orange-500" : "text-green-600";
};

// 缺陷分析指标横条：五项指标一行展示（随筛选联动）——
// 缺陷总数 / 缺陷率 / 基准值 / 偏差 / 环比上期
export function DefectSummaryCards({ summary }: { summary: DefectSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
      <span className="whitespace-nowrap text-sm text-gray-500">
        缺陷总数：
        <span className="text-lg font-bold text-gray-900">{summary.total}</span> 条
      </span>

      <span className="whitespace-nowrap text-sm text-gray-500">
        缺陷率：
        <span className="text-lg font-bold text-gray-900">{summary.rate.toFixed(2)}</span>%{" "}
        <span className="text-xs text-gray-400">抽检 {summary.sampled.toLocaleString()}</span>
      </span>

      <span className="whitespace-nowrap text-sm text-gray-500">
        基准值：
        <span className="text-lg font-bold text-gray-900">≤{summary.base.toFixed(1)}</span>%
      </span>

      <span className="whitespace-nowrap text-sm text-gray-500">
        偏差：
        <span className={`text-lg font-bold ${badUpCls(summary.deviation)}`}>
          {summary.deviation > 0 ? "+" : ""}
          {summary.deviation.toFixed(2)}
        </span>{" "}
        <span className="text-xs text-gray-400">pct</span>
      </span>

      <span className="whitespace-nowrap text-sm text-gray-500">
        环比上期：
        <span className={`text-lg font-bold ${badUpCls(summary.momCount)}`}>
          {summary.momCount > 0 ? "+" : ""}
          {summary.momCount}
        </span>{" "}
        <span className={`text-xs ${badUpCls(summary.momRate)}`}>
          {summary.momRate > 0 ? "↑" : summary.momRate < 0 ? "↓" : ""}
          {Math.abs(summary.momRate).toFixed(1)}%
        </span>
      </span>
    </div>
  );
}
