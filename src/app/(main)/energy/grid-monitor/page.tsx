"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { GridMonitorCards } from "@/components/grid-monitor/GridMonitorCards";
import { DeptTabs } from "@/components/grid-monitor/DeptTabs";
import { GridMonitorTable } from "@/components/grid-monitor/GridMonitorTable";
import { DeviceDrawer } from "@/components/grid-monitor/DeviceDrawer";
import { AiAssistant } from "@/components/energy-overview/AiAssistant";
import {
  getMonitorData,
  getGridDevices,
  LATEST_ISO,
  MIN_ISO,
  type GridRow,
} from "@/lib/mock-data/grid-monitor";

const dateCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

// 重点网格监测：概览卡 + 统计日期筛选 + 部门页签 + 网格监测表 + 关联设备抽屉
export default function GridMonitorPage() {
  const router = useRouter();
  const [dateIso, setDateIso] = useState(LATEST_ISO);
  const [dept, setDept] = useState(""); // 空串 = 默认第一个（异常最多）部门
  const [deviceRow, setDeviceRow] = useState<GridRow | null>(null);

  // 切换统计日期后全量重算（指标卡 / 部门页签 / 表格）
  const { stats, depts } = useMemo(() => getMonitorData(dateIso), [dateIso]);
  const activeDept = depts.find((d) => d.name === dept) ?? depts[0];
  const devices = useMemo(
    () => (deviceRow ? getGridDevices(deviceRow.gridId, dateIso) : []),
    [deviceRow, dateIso]
  );

  function handleRecords(row: GridRow) {
    router.push(
      `/alert/records?object=${encodeURIComponent(row.name)}&domain=${encodeURIComponent("能源消耗")}&from=${encodeURIComponent("grid-monitor")}`
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题区 + 统计日期筛选 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">重点网格监测</h1>
          <p className="mt-0.5 text-sm text-gray-500">数据更新频率：每日｜最新统计日期：{LATEST_ISO}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500">
          统计日期
          <input
            type="date"
            className={dateCls}
            value={dateIso}
            min={MIN_ISO}
            max={LATEST_ISO}
            onChange={(e) => setDateIso(e.target.value || LATEST_ISO)}
          />
        </label>
      </div>

      {/* 概览指标卡 */}
      <GridMonitorCards stats={stats} />

      {/* 部门页签 + 网格监测表 */}
      <Card>
        <div className="mb-4">
          <DeptTabs depts={depts} active={activeDept.name} onChange={setDept} />
        </div>
        <GridMonitorTable rows={activeDept.grids} onDevices={setDeviceRow} onRecords={handleRecords} />
      </Card>

      {/* 关联设备详情抽屉 */}
      <DeviceDrawer
        open={deviceRow !== null}
        onClose={() => setDeviceRow(null)}
        row={deviceRow}
        devices={devices}
        dateIso={dateIso}
      />

      {/* AI 助手（右下角悬浮球 + 侧滑问数窗口） */}
      <AiAssistant />
    </div>
  );
}
