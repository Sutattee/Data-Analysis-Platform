"use client";

// 对话内填表任务卡片：生成中（标题+正在填表...）/ 已完成（统计周期，点击开抽屉，hover 下载，
// 对话修改过显示徽标）/ 失败（原因+重新生成）。作为会话记录的一部分常驻消息流。
import type { FillCardData } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

export function FillCard({
  data,
  onOpen,
  onDownload,
  onRetry,
}: {
  data: FillCardData;
  onOpen: () => void;
  onDownload: () => void; // 导出 XLSX
  onRetry: () => void;    // 失败后重新生成
}) {
  const task = data;
  return (
    <div
      className="group relative border border-gray-200 bg-white hover:border-primary-200 rounded-xl p-3.5 transition-colors min-w-0"
      aria-label="填表任务卡片"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-lg flex-shrink-0">{task.status === "failed" ? "⚠️" : "📊"}</span>
        <button
          onClick={onOpen}
          className="text-sm font-medium text-gray-800 hover:text-primary-600 truncate text-left"
          title={task.status === "done" ? "点击预览报表" : "点击查看填表进度"}
        >
          {task.title}
        </button>
        {task.status === "generating" && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
            <Spinner size="sm" /> 正在填表...
          </span>
        )}
        {task.status === "done" && (
          <span className="flex-shrink-0 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">填表已完成</span>
        )}
        {task.status === "done" && task.edited && (
          <span className="flex-shrink-0 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">已按对话修改</span>
        )}
        {task.status === "done" && task.period && (
          <span className="ml-auto flex-shrink-0 text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">{task.period}</span>
        )}
      </div>

      {task.status === "generating" && task.stage && (
        <p className="mt-1.5 text-xs text-gray-400 pl-8 truncate">{task.stage}</p>
      )}

      {task.status === "failed" && (
        <div className="mt-2 flex items-center gap-2 pl-8 text-xs">
          <span className="text-red-500">填表失败：{task.failReason ?? "任务执行异常"}</span>
          <button
            onClick={onRetry}
            className="px-2.5 py-1 text-xs text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
          >
            重新生成
          </button>
        </div>
      )}

      {/* 已完成：hover 浮现下载 XLSX */}
      {task.status === "done" && (
        <div className="absolute top-2.5 right-2.5 hidden group-hover:flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="px-2 py-1 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg hover:text-primary-600 hover:border-primary-300 shadow-sm transition-colors"
            title="下载 XLSX 报表"
          >
            ⬇ 下载
          </button>
        </div>
      )}
    </div>
  );
}
