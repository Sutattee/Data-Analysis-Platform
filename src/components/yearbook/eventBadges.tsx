// 重大事件 — 徽章组件（事件类型 / 形成方式 / 确认状态）
import type { EventConfirmStatus, EventFormation, MajorEventType } from "@/types";

// 事件类型：中性灰
export function EventTypeBadge({ type }: { type: MajorEventType }) {
  return (
    <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
      {type}
    </span>
  );
}

// 形成方式：AI识别=蓝 / AI识别·人工修订=靛 / 人工补录=绿
const FORMATION_STYLE: Record<EventFormation, string> = {
  "AI识别": "bg-blue-50 text-blue-600",
  "AI识别·人工修订": "bg-indigo-50 text-indigo-600",
  "人工补录": "bg-green-50 text-green-600",
};

export function FormationBadge({ formation }: { formation: EventFormation }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${FORMATION_STYLE[formation]}`}>
      {formation}
    </span>
  );
}

// 确认状态：待确认=黄 / 已确认=绿 / 已排除=灰
const STATUS_STYLE: Record<EventConfirmStatus, string> = {
  "待确认": "bg-yellow-50 text-yellow-600",
  "已确认": "bg-green-50 text-green-600",
  "已排除": "bg-gray-100 text-gray-400",
};

export function ConfirmStatusBadge({ status }: { status: EventConfirmStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {status === "待确认" && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />}
      {status}
    </span>
  );
}
