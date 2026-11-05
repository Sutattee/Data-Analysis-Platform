"use client";

// 填表抽屉（右侧滑出，复用 ui/Drawer）：
// 生成中 = 进度页（任务名｜思考中... → 阶段状态轮换 + 后台执行提示 + AI填表中.../停止生成）；
// 完成 = 预览页（统计周期 + 按模板结构填好的表；右上角：智能填表执行过程 / 下载 XLSX）；
//        思考页（思考已完成 + Agent 执行过程，可切回）；
// 失败 = 失败原因 + 重新生成。
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Spinner } from "@/components/ui/Spinner";
import type { FillCardData } from "@/types";

export function FillDrawer({
  open,
  onClose,
  data,
  fillId,
  onStop,
  onRetry,
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  data: FillCardData | null;
  fillId: string;
  onStop: () => void;
  onRetry: () => void;
  onDownload: () => void; // 导出 XLSX（由 ChatPanel 调 exportTablesToExcel）
}) {
  const task = data;
  const [view, setView] = useState<"preview" | "thinking">("preview");

  // 打开/切换填表任务时复位视图
  useEffect(() => {
    if (open) setView("preview");
  }, [open, fillId]);

  const drawerTitle = !task
    ? "智能填表"
    : task.status === "generating"
      ? `${task.title} ｜ 思考中...`
      : view === "thinking"
        ? `${task.title} ｜ 思考已完成`
        : task.title;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={drawerTitle}
      width={720}
      padding={false}
      headerExtra={
        task?.status === "done" ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView(view === "thinking" ? "preview" : "thinking")}
              className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-primary-600 hover:border-primary-300 transition-colors"
              title={view === "thinking" ? "切回报表预览" : "查看智能填表执行过程"}
            >
              {view === "thinking" ? "📊 报表预览" : "🧠 智能填表执行过程"}
            </button>
            <button onClick={onDownload} className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-primary-600 hover:border-primary-300 transition-colors" title="下载 XLSX 报表">⬇ 下载 XLSX</button>
          </div>
        ) : undefined
      }
      footer={
        task?.status === "generating" ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-gray-500"><Spinner size="sm" /> AI填表中...</span>
            <button
              onClick={onStop}
              className="px-3.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-500 transition-colors"
              title="停止生成"
            >
              ⏹ 停止生成
            </button>
          </div>
        ) : undefined
      }
    >
      {/* ===== 进度页（生成中） ===== */}
      {task?.status === "generating" && (
        <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
          <Spinner size="lg" />
          <p className="text-base font-medium text-gray-800" aria-label="当前生成状态">{task.stage ?? "正在启动任务..."}</p>
          <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
            执行过程可能较长，您可以暂时离开，稍后回来查看，后台继续运行
          </p>
        </div>
      )}

      {/* ===== 失败页 ===== */}
      {task?.status === "failed" && (
        <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm text-red-500">填表失败：{task.failReason ?? "任务执行异常"}</p>
          <button onClick={onRetry} className="px-4 py-1.5 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
            重新生成
          </button>
        </div>
      )}

      {/* ===== 执行过程页 ===== */}
      {task?.status === "done" && view === "thinking" && (
        <div className="p-6">
          <p className="text-xs text-gray-400 mb-4">智能填表执行过程（执行步骤与数据来源，不含模型内部推理）</p>
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gray-200" />
            {(task.thinking ?? []).map((node) => (
              <div key={node.id} className="relative">
                <span className="absolute -left-[17px] top-0.5 text-xs">✅</span>
                <div className="text-sm font-medium text-gray-700">{node.label}</div>
                {node.detail && (
                  <div className="mt-1 text-xs text-gray-500 leading-relaxed bg-gray-50 rounded p-2.5 border border-gray-100">{node.detail}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 报表预览页 ===== */}
      {task?.status === "done" && view === "preview" && (
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-0.5 bg-primary-50 text-primary-700 border border-primary-100 rounded">统计周期：{task.period ?? "—"}</span>
            {task.edited && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded">已按对话修改</span>
            )}
          </div>
          {(task.tables ?? []).map((tb, ti) => (
            <div key={ti}>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">{tb.title}</h4>
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {tb.headers.map((h, i) => (
                        <th key={i} className="text-left py-1.5 px-3 font-medium text-gray-600 whitespace-nowrap border border-gray-100">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tb.rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-gray-50 last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className={`py-1.5 px-3 whitespace-nowrap border border-gray-100 ${ci === 0 ? "text-gray-800 font-medium" : "text-gray-700"}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400">已按模板原有结构回填数据并更新相关公式，点击右上角「下载 XLSX」导出报表。</p>
        </div>
      )}
    </Drawer>
  );
}
