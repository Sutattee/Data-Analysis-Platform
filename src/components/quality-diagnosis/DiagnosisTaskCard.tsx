"use client";

import { Button } from "@/components/ui/Button";
import {
  defectRateOf,
  gradeLabelOf,
  isDiagnosed,
  primaryActionOf,
  summaryOf,
  type DiagTask,
} from "@/lib/mock-data/defect-diagnosis-flow";

// 处理状态徽章（两档，按是否完成智能诊断划分）：待诊断（未诊断/诊断中）琥珀，已诊断（待判定/已判定）绿
export function judgeBadgeOf(t: DiagTask) {
  return isDiagnosed(t) ? (
    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">已诊断</span>
  ) : (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">待诊断</span>
  );
}

const num = (n: number) => n.toLocaleString("en-US");

// 任务卡片（紧凑）：标题+处理状态 → 对象/批次、牌号/班组/时间（灰色小字）→ 异常表现（黑色常规）
// → 诊断摘要（一行截断）→ 单主按钮；卡片其他区域无跳转
export function DiagnosisTaskCard({ task, onOpen }: { task: DiagTask; onOpen: (t: DiagTask) => void }) {
  const rate = defectRateOf(task);
  const action = primaryActionOf(task);
  const isStorage = !!task.storage;
  const summary = summaryOf(task);

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      {/* 标题行：名称 + 缺陷类别标签 + 处理状态 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold text-gray-900" title={task.occurrence.name}>
            {task.occurrence.name}
          </h3>
          <span className="shrink-0 whitespace-nowrap rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
            {gradeLabelOf(task)}
          </span>
        </div>
        {judgeBadgeOf(task)}
      </div>

      {/* 对象信息：灰色小字两行 */}
      <div className="text-xs leading-5 text-gray-400">
        <div className="truncate">
          {isStorage ? `${task.storage!.object}（${task.storage!.objectCode}）` : task.occurrence.machine}
          {" · 批次 "}
          {isStorage ? task.storage!.batch : task.occurrence.batch}
        </div>
        <div className="truncate">
          {task.occurrence.brand} · {task.occurrence.shift} · {task.occurrence.date} {task.occurrence.time}
        </div>
      </div>

      {/* 异常表现：黑色常规字号一行 */}
      <div className="text-sm text-gray-900">
        {isStorage
          ? `储存时长 ${task.storage!.stored} ｜ 上限 ${task.storage!.limit} ｜ 超限 ${task.storage!.over}`
          : `缺陷数 ${num(task.occurrence.count)} ｜ 抽检数 ${num(task.occurrence.sampled)} ｜ 缺陷率 ${
              rate === null ? "—" : `${rate.toFixed(2)}%`
            }`}
      </div>

      {/* 诊断摘要：一行截断 */}
      <p className="truncate text-xs text-gray-500" title={`诊断摘要：${summary}`}>
        诊断摘要：{summary}
      </p>

      {/* 主按钮（唯一操作入口） */}
      <div className="mt-auto flex justify-end border-t border-gray-50 pt-2.5">
        <Button size="sm" onClick={() => onOpen(task)}>
          {action.label}
        </Button>
      </div>
    </div>
  );
}
