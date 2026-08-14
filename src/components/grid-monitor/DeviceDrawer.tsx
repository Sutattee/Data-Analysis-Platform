"use client";

import type { DeviceRow, GridRow } from "@/lib/mock-data/grid-monitor";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { MonitorStatusBadge } from "@/components/alert/alertBadges";

interface DeviceDrawerProps {
  open: boolean;
  onClose: () => void;
  row: GridRow | null; // 当前网格（提供上下文信息）
  devices: DeviceRow[]; // 关联设备明细
  dateIso: string; // 统计日期
}

// 关联设备详情抽屉：右侧滑出，展示网格下设备读数 / 偏差 / 监测状态
export function DeviceDrawer({ open, onClose, row, devices, dateIso }: DeviceDrawerProps) {
  const fmtDev = (v: number | null) => (v === null ? "--" : v.toFixed(4));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="关联设备详情"
      width={720}
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      {/* 网格上下文 */}
      {row && (
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-xs">
          <div>
            <span className="text-gray-400">网格名称：</span>
            <span className="font-medium text-gray-800">{row.name}</span>
          </div>
          <div>
            <span className="text-gray-400">所属车间 / 系统：</span>
            <span className="text-gray-700">
              {row.dept} · {row.system}
            </span>
          </div>
          <div>
            <span className="text-gray-400">统计日期：</span>
            <span className="text-gray-700">{dateIso}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">网格监测状态：</span>
            <MonitorStatusBadge status={row.status} />
          </div>
        </div>
      )}

      {/* 设备表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-medium text-gray-500">
              <th className="px-3 py-2.5 text-left">设备编码</th>
              <th className="px-3 py-2.5 text-left">设备名称</th>
              <th className="px-3 py-2.5 text-right">当前读数(kWh)</th>
              <th className="px-3 py-2.5 text-right">历史均值(kWh)</th>
              <th className="px-3 py-2.5 text-right">偏差率</th>
              <th className="px-3 py-2.5 text-left">监测状态</th>
              <th className="px-3 py-2.5 text-left">检测时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {devices.map((d) => (
              <tr key={d.code} className="hover:bg-gray-50">
                <td className="px-3 py-2.5 font-mono text-gray-600">{d.code}</td>
                <td className="px-3 py-2.5 text-gray-800">
                  {d.name}
                  {d.note && <p className="text-[10px] text-red-500">{d.note}</p>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                  {d.reading === null ? <span className="text-gray-400">--</span> : d.reading.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{d.avg.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{fmtDev(d.deviation)}</td>
                <td className="px-3 py-2.5">
                  <MonitorStatusBadge status={d.status} />
                </td>
                <td className="px-3 py-2.5 text-gray-500">{d.time ?? <span className="text-gray-400">--</span>}</td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-gray-400">
                  暂无关联设备数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        设备读数为当日累计电耗；设备离线、未上报或数据缺失将作为网格异常状态的具体原因展示。
      </p>
    </Drawer>
  );
}
