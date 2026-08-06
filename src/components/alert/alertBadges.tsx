import type { AlertLevel, AlertType, AlertStatus } from "@/types";

const TAG_BASE = "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap";

// 等级 → 样式
const LEVEL_STYLE: Record<AlertLevel, string> = {
  提示: "bg-slate-100 text-slate-600",   // 蓝灰色普通标签
  关注: "bg-yellow-100 text-yellow-700", // 黄色
  预警: "bg-orange-100 text-orange-700", // 橙色
  告警: "bg-red-100 text-red-700",       // 红色
  危险: "bg-red-700 text-white",         // 深红 + 危险图标
};

// 等级标签（危险档附带危险图标）
export function AlertLevelBadge({ level }: { level: AlertLevel }) {
  return (
    <span className={`${TAG_BASE} ${LEVEL_STYLE[level]}`}>
      {level === "危险" && <span aria-hidden>⚠️</span>}
      {level}
    </span>
  );
}

// 预警类型标签：常规黑色普通标签（不使用醒目颜色）
export function AlertTypeBadge({ type }: { type: AlertType }) {
  return <span className={`${TAG_BASE} bg-gray-100 text-gray-700`}>{type}</span>;
}

// 处理状态：已处理绿色字体 / 未处理灰色字体（纯文字，无背景）
export function AlertStatusText({ status }: { status: AlertStatus }) {
  return (
    <span className={`text-xs font-medium ${status === "已处理" ? "text-green-600" : "text-gray-400"}`}>
      {status}
    </span>
  );
}
