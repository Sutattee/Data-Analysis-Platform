"use client";

import { useEffect, useState } from "react";
import { MaterialMetricCards } from "@/components/production/MaterialMetricCards";
import { MaterialTrendChart } from "@/components/production/MaterialTrendChart";
import { AiAssistant } from "@/components/energy-overview/AiAssistant";
import { AnomalyDrawer } from "@/components/grid-forecast/AnomalyDrawer";
import { LATEST_ISO, type MaterialKey } from "@/lib/mock-data/material-consumption";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

// 辅料消耗图表清单（2×2 网格）：盘纸 / 商标纸（小盒）/ 烟叶 / 嘴棒
const CHART_KEYS: MaterialKey[] = ["tipPaper", "boxLabel", "tobacco", "filterRod"];

export default function MaterialConsumptionPage() {
  // 全局异常详情抽屉（供各图表点击异常点复用）
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
          <h1 className="text-xl font-bold text-gray-900">辅料消耗</h1>
          <p className="mt-0.5 text-sm text-gray-500">数据更新频率：每日｜最新统计日期：{LATEST_ISO} 08:00</p>
        </div>

        {/* 顶部 4 张指标卡（昨日口径） */}
        <MaterialMetricCards />

        {/* 2×2 趋势图：单箱耗盘纸量 / 商标纸（小盒）/ 烟叶 / 嘴棒（日/月切换） */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {CHART_KEYS.map((key) => (
            <MaterialTrendChart key={key} seriesKey={key} onAnomaly={onAnomaly} />
          ))}
        </div>

        {/* 异常详情抽屉 */}
        <AnomalyDrawer open={drawer !== null} onClose={() => setDrawer(null)} detail={drawer} />
      </div>
    </AiAssistant>
  );
}
