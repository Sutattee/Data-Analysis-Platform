"use client";

import { ALERT_LEVEL_COLOR } from "@/lib/mock-data/grid-forecast";
import type { AlertLevel } from "@/types";

// 异常点等级图例（五级），颜色与趋势图 ReferenceDot 一致：
// 提示蓝灰 / 关注黄 / 预警橙 / 告警红 / 危险深红
// labels 可覆盖显示文案（如辅料页将「关注」显示为「一般」，颜色不变）
export function AnomalyLevelLegend({ labels }: { labels?: Partial<Record<AlertLevel, string>> }) {
  return (
    <>
      {(["提示", "关注", "预警", "告警", "危险"] as const).map((lv) => (
        <span key={lv} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: ALERT_LEVEL_COLOR[lv] }} /> {labels?.[lv] ?? lv}
        </span>
      ))}
    </>
  );
}
