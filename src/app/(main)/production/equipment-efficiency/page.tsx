"use client";

import { useEffect, useState } from "react";
import { EquipmentMetricCards } from "@/components/production/EquipmentMetricCards";
import { HourlyOutputTrendChart } from "@/components/production/HourlyOutputTrendChart";
import { CompletionRateChart } from "@/components/production/CompletionRateChart";
import { AiAssistant } from "@/components/energy-overview/AiAssistant";
import { AnomalyDrawer } from "@/components/grid-forecast/AnomalyDrawer";
import { EFFICIENCY_LATEST_ISO } from "@/lib/mock-data/equipment-efficiency";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

// 设备运行效率：4 张效率指标卡 + 台时产量趋势（16 机组 TAB / 班次下钻 / 日周月异常点）+ 机台日计划完成率
export default function EquipmentEfficiencyPage() {
  // 全局异常详情抽屉（供趋势图点击异常点复用）
  const [drawer, setDrawer] = useState<AnomalyDetail | null>(null);
  const onAnomaly = (d: AnomalyDetail) => setDrawer(d);

  // 从告警记录详情「返回异常详情」时，恢复跳转前的抽屉快照
  useEffect(() => {
    const raw = sessionStorage.getItem("anomaly-drawer-return");
    if (raw) {
      sessionStorage.removeItem("anomaly-drawer-return");
      try {
        setDrawer(JSON.parse(raw) as AnomalyDetail);
      } catch {
        /* 忽略非法快照 */
      }
    }
  }, []);

  return (
    /* AI 助手包裹仪表盘：打开对话时右侧推出面板，左侧自适应收窄 */
    <AiAssistant>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">设备运行效率</h1>
          <p className="mt-0.5 text-sm text-gray-500">数据更新频率：每日｜最新统计日期：{EFFICIENCY_LATEST_ISO} 08:00</p>
        </div>

        {/* 顶部 4 张指标卡（昨日口径） */}
        <EquipmentMetricCards />

        {/* 核心图表：台时产量趋势 / 机台日计划产量完成率 */}
        <div className="grid grid-cols-1 gap-4">
          <HourlyOutputTrendChart onAnomaly={onAnomaly} />
          <CompletionRateChart />
        </div>

        {/* 异常详情抽屉 */}
        <AnomalyDrawer open={drawer !== null} onClose={() => setDrawer(null)} detail={drawer} />
      </div>
    </AiAssistant>
  );
}
