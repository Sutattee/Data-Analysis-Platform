"use client";

import type { MonitorStats } from "@/lib/mock-data/grid-monitor";

// 重点网格监测：4 张概览卡（数值随统计日期联动）
export function GridMonitorCards({ stats }: { stats: MonitorStats }) {
  // 较上一统计日：异常减少为好（绿），增加为差（红）
  const deltaCls = stats.deltaVsPrev < 0 ? "text-green-600" : stats.deltaVsPrev > 0 ? "text-red-600" : "text-gray-400";
  const deltaText = `${stats.deltaVsPrev > 0 ? "+" : ""}${stats.deltaVsPrev}`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* 重点网格总数 */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span aria-hidden>📊</span>重点网格总数
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">
          {stats.totalGrids}
          <span className="ml-1 text-sm font-normal text-gray-400">个</span>
        </div>
        <p className="mt-1 text-xs text-gray-400">覆盖 {stats.totalDepts} 个车间 / 部门（权限范围内有效监测网格）</p>
      </div>

      {/* 当前异常网格 */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span aria-hidden>🚨</span>当前异常网格
        </div>
        <div className="mt-2 text-2xl font-bold text-red-600">
          {stats.abnormal}
          <span className="ml-1 text-sm font-normal text-gray-400">个</span>
        </div>
        <p className={`mt-1 text-xs ${deltaCls}`}>较上一统计日 {deltaText}（按网格去重）</p>
      </div>

      {/* 今日新增异常 */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span aria-hidden>⚠️</span>今日新增异常
        </div>
        <div className="mt-2 text-2xl font-bold text-orange-600">
          {stats.todayNew}
          <span className="ml-1 text-sm font-normal text-gray-400">个</span>
        </div>
        <p className="mt-1 text-xs text-gray-400">最新统计日首次触发，不含持续异常</p>
      </div>

      {/* 告警 / 危险网格 */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span aria-hidden>🔴</span>告警 / 危险网格
        </div>
        <div className="mt-2 flex items-baseline gap-3 text-2xl font-bold">
          <span className="text-red-600">
            {stats.alarmCount}
            <span className="ml-1 text-xs font-normal text-gray-400">告警</span>
          </span>
          <span className="text-red-800">
            {stats.dangerCount}
            <span className="ml-1 text-xs font-normal text-gray-400">危险</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-400">按网格最高预警等级统计</p>
      </div>
    </div>
  );
}
