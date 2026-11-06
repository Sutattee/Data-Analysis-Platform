"use client";

// 对话内报告任务卡片：生成中（标题 + 标题下灰字「正在生成... · 阶段」）/ 已完成（标题下灰字「生成已完成」，
// hover 在标题行尾浮现下载/分享，高度不变）/ 失败（原因 + 重新生成）。作为会话记录的一部分常驻消息流。
import type { ReportCardData } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

export function ReportCard({
  data,
  onOpen,
  onDownload,
  onShare,
  onRetry,
}: {
  data: ReportCardData;
  onOpen: () => void;
  onDownload: () => void; // 打开导出文档弹窗
  onShare: () => void;    // 复制分享链接
  onRetry: () => void;    // 失败后重新生成
}) {
  const task = data.task!;
  return (
    <div
      className="group border border-gray-200 bg-white hover:border-primary-200 rounded-xl p-3.5 transition-colors min-w-0"
      aria-label="报告任务卡片"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-lg flex-shrink-0">{task.status === "failed" ? "⚠️" : "📄"}</span>
        <button
          onClick={onOpen}
          className="text-sm font-medium text-gray-800 hover:text-primary-600 truncate text-left"
          title={task.status === "done" ? "点击查看报告" : "点击查看生成进度"}
        >
          {task.title}
        </button>
        {/* 行尾组：模板徽章常显 + hover 浮现下载/分享（与标题同行，卡片高度不变） */}
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          {task.templateId && (
            <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">模板</span>
          )}
          {task.status === "done" && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onDownload(); }}
                className="hidden group-hover:block px-2 py-1 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg hover:text-primary-600 hover:border-primary-300 shadow-sm transition-colors"
                title="下载报告文档"
              >
                ⬇ 下载
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onShare(); }}
                className="hidden group-hover:block px-2 py-1 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg hover:text-primary-600 hover:border-primary-300 shadow-sm transition-colors"
                title="复制分享链接"
              >
                🔗 分享
              </button>
            </>
          )}
        </div>
      </div>

      {/* 状态：标题下灰色文字（生成中含当前阶段；完成含对话修改标记） */}
      {task.status === "generating" && (
        <p className="mt-1 pl-7 flex items-center gap-1.5 text-xs text-gray-400">
          <Spinner size="sm" /> 正在生成... {task.stage ? `· ${task.stage}` : ""}
        </p>
      )}
      {task.status === "done" && (
        <p className="mt-1 pl-7 text-xs text-gray-400">生成已完成{task.edited ? " ｜ 已按对话修改" : ""}</p>
      )}

      {task.status === "failed" && (
        <div className="mt-2 flex items-center gap-2 pl-7 text-xs">
          <span className="text-red-500">生成失败：{task.failReason ?? "任务执行异常"}</span>
          <button
            onClick={onRetry}
            className="px-2.5 py-1 text-xs text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
          >
            重新生成
          </button>
        </div>
      )}
    </div>
  );
}
