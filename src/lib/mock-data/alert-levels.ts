// 告警等级基础常量 — 零依赖小模块（仅依赖 types）
// 独立成文件以避免 mock-data 循环依赖：
// expense-overview → grid-forecast → alerts → expense-alerts → expense-indicators → expense-overview
import type { AlertLevel } from "@/types";

// 告警等级五色（趋势图异常点与图例统一使用）：提示蓝灰 / 关注黄 / 预警橙 / 告警红 / 危险深红
export const ALERT_LEVEL_COLOR: Record<AlertLevel, string> = {
  提示: "#64748b",
  关注: "#eab308",
  预警: "#f97316",
  告警: "#ef4444",
  危险: "#b91c1c",
};

// 等级优先级（用于异常排序）
export const LEVEL_RANK: Record<AlertLevel, number> = { 提示: 1, 关注: 2, 预警: 3, 告警: 4, 危险: 5 };
