"use client";

import type { MonitorStats } from "@/lib/mock-data/grid-monitor";

// 重点网格监测：3 张概览卡（数值随统计日期联动）
export function GridMonitorCards({ stats }: { stats: MonitorStats }) {
  // 较上一统计日：异常减少为好（绿），增加为差（红）
  const deltaGood = stats.deltaVsPrev < 0;
  const deltaZero = stats.deltaVsPrev === 0;
  const deltaCls = deltaZero
    ? "bg-gray-50 text-gray-500"
    : deltaGood
      ? "bg-green-50 text-green-600"
      : "bg-red-50 text-red-600";
  const deltaText = `${stats.deltaVsPrev > 0 ? "+" : ""}${stats.deltaVsPrev}`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* 重点网格总数 */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl" aria-hidden>
          📊
        </div>
        <div className="min-w-0">
          <div className="text-sm text-gray-500">重点网格总数</div>
          <div className="mt-1 text-2xl font-bold leading-none text-gray-900">
            {stats.totalGrids}
            <span className="ml-1 text-sm font-normal text-gray-400">个</span>
          </div>
        </div>
      </div>

      {/* 当前异常网格 */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-2xl" aria-hidden>
          🚨
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-gray-500">当前异常网格</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold leading-none text-red-600">
              {stats.abnormal}
              <span className="ml-1 text-sm font-normal text-gray-400">个</span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${deltaCls}`}>
              较上一统计日 {deltaText}
            </span>
          </div>
        </div>
      </div>

      {/* 今日新增异常网格 */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl" aria-hidden>
          ⚠️
        </div>
        <div className="min-w-0">
          <div className="text-sm text-gray-500">今日新增异常网格</div>
          <div className="mt-1 text-2xl font-bold leading-none text-orange-600">
            {stats.todayNew}
            <span className="ml-1 text-sm font-normal text-gray-400">个</span>
          </div>
        </div>
      </div>
    </div>
  );
}
