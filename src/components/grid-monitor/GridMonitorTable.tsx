"use client";

import type { GridRow } from "@/lib/mock-data/grid-monitor";
import { MonitorStatusBadge } from "@/components/alert/alertBadges";

interface GridMonitorTableProps {
  rows: GridRow[];
  onDevices: (row: GridRow) => void; // 查看关联设备（右侧抽屉）
  onRecords: (row: GridRow) => void; // 预警记录（跳转告警记录页）
}

// 网格监测表：按 危险→告警→预警→关注→提示→正常 排序（排序在 mock 层完成）
export function GridMonitorTable({ rows, onDevices, onRecords }: GridMonitorTableProps) {
  const fmtDev = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
              <th className="px-4 py-3 text-left">网格名称</th>
              <th className="px-4 py-3 text-left">所属系统</th>
              <th className="px-4 py-3 text-right">实际值(kWh)</th>
              <th className="px-4 py-3 text-right">历史均值(kWh)</th>
              <th className="px-4 py-3 text-right">偏差率</th>
              <th className="px-4 py-3 text-right">未处理告警</th>
              <th className="px-4 py-3 text-left">监测状态</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr key={r.gridId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3 text-gray-600">{r.system}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{r.actual.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-500">{r.avg.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{fmtDev(r.deviation)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${r.pendingAlerts > 0 ? "font-medium text-red-600" : "text-gray-400"}`}>
                  {r.pendingAlerts}
                </td>
                <td className="px-4 py-3">
                  <MonitorStatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right text-xs">
                  <button className="text-primary-600 hover:underline" onClick={() => onDevices(r)}>
                    查看关联设备
                  </button>
                  <span className="mx-1.5 text-gray-300">|</span>
                  <button className="text-primary-600 hover:underline" onClick={() => onRecords(r)}>
                    预警记录
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                  该部门暂无监测网格
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        注：网格监测结果恢复正常后，所在车间异常网格数自动减少；告警状态需在告警记录中人工标记已处理后才会更新。
      </p>
    </div>
  );
}
