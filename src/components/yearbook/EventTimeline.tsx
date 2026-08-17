// 重大事件 — 竖向时间轴（左侧竖线 + 圆点，节点含阶段名 / 时间 / 描述）
import type { EventTimelineItem } from "@/types";

export function EventTimeline({ items }: { items: EventTimelineItem[] }) {
  if (!items.length) return null;
  return (
    <ol className="border-l border-gray-200 pl-5 space-y-5">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-primary-500 ring-4 ring-white" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">{it.label}</span>
            <span className="text-xs text-gray-400 font-mono">{it.time}</span>
          </div>
          {it.desc && <p className="mt-1 text-sm text-gray-600 leading-relaxed">{it.desc}</p>}
        </li>
      ))}
    </ol>
  );
}
