"use client";

// 填表抽屉（右侧滑出，复用 ui/Drawer）：
// 生成中 = 流式填充页（顶部状态条：当前阶段 + 后台运行提示；表格区按填充进度逐行展示，
//          工作表页签可切换；底部「正在生成...」+ 停止生成）；
// 完成 = 报表预览页（统计周期 + 工作表页签 + 完整表格；表格为 Excel 网格样式、保留模板版式；
//        顶部：执行过程 / 下载 / 分享）；执行过程页（Agent 各步骤状态、耗时及处理结果，可切回预览）；
// 已停止 = 已填充部分内容保留预览 + 「已停止」标记 + 重新生成；失败 = 失败原因 + 重新生成。
// 下载 → 内嵌「导出报表」弹窗（文件名可改，格式 Excel(.xlsx)）；分享 → 浮出分享卡片复制链接。
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { SheetGrid } from "@/components/shared/ExcelPreview";
import type { ExcelSheetPreview, FillCardData, FillTable } from "@/types";

// ---------- 导出报表弹窗（叠加于抽屉之上）：修改文件名，格式固定 Excel(.xlsx) ----------
function ExportXlsxModal({
  open,
  defaultName,
  onClose,
  onExport,
}: {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onExport: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-label="导出报表" className="relative w-[440px] max-w-full bg-white rounded-xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800">导出报表</h4>
          <button onClick={onClose} aria-label="关闭" className="text-gray-400 hover:text-gray-600 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">✕</button>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">文件名</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            placeholder="请输入文件名"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">导出格式</label>
          <div className="mt-1.5 grid grid-cols-1 gap-2">
            <button
              type="button"
              aria-pressed={true}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-primary-400 bg-primary-50 text-primary-700 text-sm"
            >
              <span>📗</span> Excel表格(.xlsx)
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">导出文件保留全部工作表、完整数据、格式及公式，不受预览范围影响。</p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          <button
            onClick={() => onExport(name.trim() || defaultName)}
            className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            导出
          </button>
        </div>
      </div>
    </div>
  );
}

// 按跨表累计进度计算每张表的已填充行数
function filledRowsOf(tables: FillTable[], progress: number): number[] {
  let remain = Math.max(0, progress);
  return tables.map((tb) => {
    const take = Math.min(tb.rows.length, remain);
    remain -= tb.rows.length;
    return take;
  });
}

// 数字单元格：整数/小数/千分位/百分比（Excel 中数字与百分比均右对齐）
const NUM_CELL_RE = /^-?[\d,]+(\.\d+)?%?$/;

// FillTable → Excel 工作表结构（复用 SheetGrid 渲染，与模板预览同款观感）：
// 表头行作灰底表头区；多数值为数字的列自动右对齐（tabular-nums）
function tableToSheet(tb: FillTable, filled: number): ExcelSheetPreview {
  const numericCols = tb.headers
    .map((_, c) => c)
    .filter((c) => {
      const vals = tb.rows.slice(0, Math.max(1, filled)).map((r) => (r[c] ?? "").trim()).filter(Boolean);
      return vals.length > 0 && vals.filter((v) => NUM_CELL_RE.test(v)).length >= vals.length / 2;
    });
  return {
    name: tb.title,
    cells: [tb.headers, ...tb.rows.slice(0, filled)],
    headerRows: 1,
    numericCols,
    merges: [],
  };
}

// ---------- 报表表格（Excel 网格样式，保留模板版式；生成中按进度截断 / 完整展示；横向纵向滚动） ----------
function SheetTable({ table, filled }: { table: FillTable; filled: number }) {
  return (
    <div className="overflow-auto border border-gray-200 rounded-lg max-h-[52vh]">
      <div className="p-2 bg-white">
        <SheetGrid sheet={tableToSheet(table, filled)} />
      </div>
    </div>
  );
}

// ---------- 报告抽屉主体 ----------
export function FillDrawer({
  open,
  onClose,
  data,
  fillId,
  exportSignal = 0,
  onStop,
  onRetry,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  data: FillCardData | null;
  fillId: string;
  exportSignal?: number; // 递增触发量：>0 时打开抽屉并直接弹出「导出报表」弹窗（对话卡片「下载」入口）
  onStop: () => void;
  onRetry: () => void;
  onExport: (name: string) => void; // 按自定义文件名导出 XLSX（由 ChatPanel 执行）
}) {
  const toast = useToast();
  const task = data;
  const [view, setView] = useState<"preview" | "thinking">("preview");
  const [activeSheet, setActiveSheet] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const tables = task?.tables ?? [];
  const progress = task?.progress ?? 0;
  const totalRows = tables.reduce((n, tb) => n + tb.rows.length, 0);

  // 打开/切换填表任务时复位视图
  useEffect(() => {
    if (open) {
      setView("preview");
      setActiveSheet(0);
      setShowShare(false);
    }
  }, [open, fillId]);

  // 「下载」触发量变化：直接弹出导出报表弹窗（信号每次递增，重复点击也能再次弹出）
  useEffect(() => {
    if (open && exportSignal > 0) setShowExport(true);
  }, [open, exportSignal]);

  const shareUrl = `https://shifang.example.com/f/${fillId}`;
  const drawerTitle = !task
    ? "智能填表"
    : task.status === "generating"
      ? `${task.title} ｜ 正在生成...`
      : task.status === "done" && view === "thinking"
        ? `${task.title} ｜ 执行过程`
        : task.title;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={drawerTitle}
        width={720}
        padding={false}
        headerExtra={
          task?.status === "done" ? (
            <div className="flex items-center gap-1 relative">
              <button
                onClick={() => setView(view === "thinking" ? "preview" : "thinking")}
                className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-primary-600 hover:border-primary-300 transition-colors"
                title={view === "thinking" ? "切回报表预览" : "查看执行过程"}
              >
                {view === "thinking" ? "📊 报表预览" : "🧠 执行过程"}
              </button>
              <button
                onClick={() => setShowExport(true)}
                className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-primary-600 hover:border-primary-300 transition-colors"
                title="下载报表"
              >
                ⬇ 下载
              </button>
              <button
                onClick={() => setShowShare((v) => !v)}
                className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-primary-600 hover:border-primary-300 transition-colors"
                title="分享报表"
              >
                🔗 分享
              </button>
              {/* 分享小卡片：浮出于分享按钮下方 */}
              {showShare && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-3.5 z-10 text-left">
                  <p className="text-xs font-medium text-gray-700">复制分享链接</p>
                  <p className="mt-1.5 text-xs text-primary-600 bg-primary-50 rounded px-2 py-1.5 break-all select-all">{shareUrl}</p>
                  <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">访问遵循系统权限控制，报表更新后链接展示最新保存版本</p>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => {
                        try { navigator.clipboard?.writeText(shareUrl); } catch { /* 剪贴板不可用时静默 */ }
                        toast("链接已复制", "success");
                      }}
                      className="px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      复制链接
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : undefined
        }
        footer={
          task?.status === "generating" ? (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-500"><Spinner size="sm" /> 正在生成...</span>
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
        {/* ===== 流式填充页（生成中）：状态条 + 逐行填充的表格 + 工作表页签 ===== */}
        {task?.status === "generating" && tables.length > 0 && (
          <div className="h-full flex flex-col">
            {/* 状态条：当前阶段 + 后台运行提示 */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 flex-shrink-0">
              <Spinner size="sm" />
              <span className="text-sm font-medium text-gray-800" aria-label="当前生成状态">{task.stage ?? "正在启动任务..."}</span>
              <span className="ml-auto text-xs text-gray-400">后台运行中，您可以暂时离开</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              {/* 工作表页签（生成中显示各表填充进度） */}
              <div className="flex items-center gap-1.5 mb-3" role="tablist" aria-label="工作表页签">
                {tables.map((tb, i) => {
                  const filled = filledRowsOf(tables, progress)[i];
                  const active = i === activeSheet;
                  return (
                    <button
                      key={tb.title}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveSheet(i)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        active ? "border-primary-400 bg-primary-50 text-primary-700 font-medium" : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {tb.title}（{filled}/{tb.rows.length}）
                    </button>
                  );
                })}
              </div>
              <SheetTable table={tables[activeSheet]} filled={filledRowsOf(tables, progress)[activeSheet]} />
              <p className="mt-2.5 text-xs text-gray-400">
                正在按模板取数规则填充数据，已填充 {progress}/{totalRows} 行；生成可能需要较长时间，您可以暂时离开，稍后回来查看。
              </p>
            </div>
          </div>
        )}

        {/* ===== 启动页（生成中但表结构尚未就绪） ===== */}
        {task?.status === "generating" && tables.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
            <Spinner size="lg" />
            <p className="text-base font-medium text-gray-800" aria-label="当前生成状态">{task.stage ?? "正在启动任务..."}</p>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">生成可能需要较长时间，您可以暂时离开，稍后回来查看。</p>
          </div>
        )}

        {/* ===== 已停止页：保留已填充部分预览 + 重新生成 ===== */}
        {task?.status === "stopped" && tables.length > 0 && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3.5 py-2.5">
              <p className="text-xs text-amber-700">已停止生成 ｜ 已填充 {progress}/{totalRows} 行数据保留预览，可重新生成完整报表</p>
              <button onClick={onRetry} className="flex-shrink-0 px-3 py-1 text-xs text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
                重新生成
              </button>
            </div>
            {tables.map((tb, i) => (
              <div key={tb.title}>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">{tb.title}</h4>
                <SheetTable table={tb} filled={filledRowsOf(tables, progress)[i]} />
              </div>
            ))}
          </div>
        )}

        {/* ===== 失败页 ===== */}
        {task?.status === "failed" && (
          <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-red-500">生成失败：{task.failReason ?? "任务执行异常"}</p>
            <button onClick={onRetry} className="px-4 py-1.5 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
              重新生成
            </button>
          </div>
        )}

        {/* ===== 执行过程页：各步骤状态、耗时及处理结果 ===== */}
        {task?.status === "done" && view === "thinking" && (
          <div className="p-6 overflow-y-auto h-full">
            <p className="text-xs text-gray-400 mb-4">执行过程（各步骤的状态、耗时及处理结果，不含模型内部推理）</p>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gray-200" />
              {(task.thinking ?? []).map((node) => (
                <div key={node.id} className="relative">
                  <span className="absolute -left-[17px] top-0.5 text-xs">✅</span>
                  <div className="flex items-baseline gap-2">
                    <div className="text-sm font-medium text-gray-700">{node.label}</div>
                    <span className="text-xs text-gray-400">{((node.duration ?? 0) / 1000).toFixed(1)}s</span>
                  </div>
                  {node.detail && (
                    <div className="mt-1 text-xs text-gray-500 leading-relaxed bg-gray-50 rounded p-2.5 border border-gray-100">{node.detail}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 报表预览页（完成）：统计周期 + 工作表页签 + 完整表格 ===== */}
        {task?.status === "done" && view === "preview" && (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 flex-shrink-0 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-primary-50 text-primary-700 border border-primary-100 rounded">统计周期：{task.period ?? "—"}</span>
              {task.edited && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded">已按对话修改</span>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              <div className="flex items-center gap-1.5 mb-3" role="tablist" aria-label="工作表页签">
                {tables.map((tb, i) => {
                  const active = i === activeSheet;
                  return (
                    <button
                      key={tb.title}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveSheet(i)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        active ? "border-primary-400 bg-primary-50 text-primary-700 font-medium" : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {tb.title}
                    </button>
                  );
                })}
              </div>
              {tables[activeSheet] && <SheetTable table={tables[activeSheet]} filled={tables[activeSheet].rows.length} />}
              <p className="mt-2.5 text-xs text-gray-400">已按模板原有结构回填数据并更新相关公式；点击右上角「下载」导出 Excel 报表。</p>
            </div>
          </div>
        )}
      </Drawer>

      {/* 导出内容取当前报表全部工作表（不受预览范围影响） */}
      <ExportXlsxModal
        open={showExport}
        defaultName={task?.title ?? "报表"}
        onClose={() => setShowExport(false)}
        onExport={(name) => {
          setShowExport(false);
          onExport(name);
        }}
      />
    </>
  );
}
