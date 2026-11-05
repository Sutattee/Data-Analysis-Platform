"use client";

// 报告抽屉（右侧滑出，复用 ui/Drawer）：
// 生成中 = 流式输出页（顶部阶段状态条 + 正文逐字增长 + 末尾闪烁光标；AI撰写中.../停止生成）；
// 完成 = 报告页（正文 markdown 渲染；左侧悬浮目录按钮 hover 展开点击定位；
//        右上角：下载 / 分享——思考过程在对话页消息卡片上方查看，抽屉内不再提供入口）；
// 失败 = 失败原因 + 重新生成。
import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { parseMarkdownTable } from "@/lib/qa/parse-table";
import { downloadDocFile, downloadPdfFile } from "@/lib/qa/export-doc";
import type { ReportCardData } from "@/types";

// ---------- 轻量 markdown 分块（正文渲染与目录锚点共用，保证序号一致） ----------
// 规则：连续表格行聚为一块；其余每个非空行单独成块；块序号 = 该行/表在正文中的顺序。
function splitMdBlocks(md: string): { lines: string[]; idx: number }[] {
  const blocks: { lines: string[]; idx: number }[] = [];
  let tableBuf: string[] = [];
  const flush = () => {
    if (tableBuf.length) {
      blocks.push({ lines: tableBuf, idx: blocks.length });
      tableBuf = [];
    }
  };
  md.split("\n").forEach((raw) => {
    const line = raw.trim();
    if (line.startsWith("|")) {
      tableBuf.push(line);
      return;
    }
    flush();
    if (line) blocks.push({ lines: [line], idx: blocks.length });
  });
  flush();
  return blocks;
}

function inlineHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// 单块渲染：表格块复用 parseMarkdownTable；单行块按标题/引用/有序列表/段落
function MdBlock({ lines, idx }: { lines: string[]; idx: number }) {
  const table = lines.length > 1 ? parseMarkdownTable(lines.join("\n")) : null;
  if (table) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {table.headers.map((h, i) => (
                <th key={i} className="text-left py-1.5 px-3 font-medium text-gray-600 whitespace-nowrap border border-gray-100">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-50 last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className={`py-1.5 px-3 whitespace-nowrap border border-gray-100 ${ci === 0 ? "text-gray-800 font-medium" : "text-gray-700"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const line = lines[0] ?? "";
  const h = line.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    const level = h[1].length;
    const cls = level === 1 ? "text-xl font-bold text-gray-900 mt-5 mb-2" : level === 2 ? "text-base font-semibold text-gray-800 mt-4 mb-2" : "text-sm font-semibold text-gray-700 mt-3 mb-1.5";
    return <div id={`rpt-h-${idx}`} className={cls} dangerouslySetInnerHTML={{ __html: inlineHtml(h[2]) }} />;
  }
  if (line.startsWith("> ")) return <blockquote className="my-2 pl-3 border-l-4 border-gray-200 text-xs text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineHtml(line.slice(2)) }} />;
  const ol = line.match(/^\d+\.\s+(.*)$/);
  if (ol) return <li className="ml-5 list-decimal text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineHtml(ol[1]) }} />;
  return <p className="text-sm text-gray-700 leading-relaxed my-1.5" dangerouslySetInnerHTML={{ __html: inlineHtml(line) }} />;
}

function MiniMarkdown({ md }: { md: string }) {
  const blocks = useMemo(() => splitMdBlocks(md), [md]);
  return (
    <div className="report-md">
      {blocks.map((b) => (
        <MdBlock key={b.idx} lines={b.lines} idx={b.idx} />
      ))}
    </div>
  );
}

// 目录：## / ### 标题块 → 锚点（与 MdBlock 的 id 同源，均用块序号）
function extractToc(md: string): { level: 2 | 3; text: string; anchor: string }[] {
  return splitMdBlocks(md).flatMap((b) => {
    const h = b.lines[0].match(/^(#{2,3})\s+(.*)$/);
    return h ? [{ level: h[1].length as 2 | 3, text: h[2].replace(/\*\*/g, ""), anchor: `rpt-h-${b.idx}` }] : [];
  });
}

// ---------- 导出文档弹窗（叠加于抽屉之上） ----------
function ExportDocModal({
  open,
  defaultName,
  content,
  onClose,
}: {
  open: boolean;
  defaultName: string;
  content: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(defaultName);
  const [format, setFormat] = useState<"docx" | "pdf">("docx");
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setFormat("docx");
    }
  }, [open, defaultName]);
  if (!open) return null;

  const handleExport = () => {
    const finalName = name.trim() || defaultName;
    if (format === "docx") {
      downloadDocFile(finalName, content);
      toast("Word文档导出成功", "success");
    } else {
      downloadPdfFile(finalName, content);
      toast("PDF文档导出成功", "success");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-label="导出文档" className="relative w-[440px] max-w-full bg-white rounded-xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800">导出文档</h4>
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
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {([["docx", "Word文档(.docx)", "📝"], ["pdf", "PDF文档(.pdf)", "📕"]] as const).map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setFormat(key)}
                aria-pressed={format === key}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  format === key ? "border-primary-400 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          <button onClick={handleExport} className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">导出</button>
        </div>
      </div>
    </div>
  );
}

// ---------- 报告抽屉主体 ----------
export function ReportDrawer({
  open,
  onClose,
  data,
  reportId,
  autoExport = false,
  onStop,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  data: ReportCardData | null;
  reportId: string;
  autoExport?: boolean; // 打开抽屉后直接弹出导出文档弹窗（对话卡片「下载」入口）
  onStop: () => void;
  onRetry: () => void;
}) {
  const toast = useToast();
  const task = data?.task ?? null;
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  // 流式输出正文区（生成中随内容增长自动滚动到底部）
  const streamRef = useRef<HTMLDivElement | null>(null);

  // 打开/切换报告时复位弹层状态
  useEffect(() => {
    if (open) {
      setShowShare(false);
      setTocOpen(false);
      if (autoExport) setShowExport(true);
    }
  }, [open, reportId, autoExport]);

  // 生成中正文流式增长时自动滚动到底部（跟随最新输出）
  useEffect(() => {
    if (task?.status === "generating" && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [task?.status, task?.content]);

  const shareUrl = `https://shifang.example.com/r/${reportId}`;
  const toc = useMemo(() => (task?.content ? extractToc(task.content) : []), [task?.content]);

  const drawerTitle = !task
    ? "报告"
    : task.status === "generating"
      ? `${task.title} ｜ 思考中...`
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
              <button onClick={() => setShowExport(true)} className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-primary-600 hover:border-primary-300 transition-colors" title="下载报告文档">⬇ 下载</button>
              <button
                onClick={() => setShowShare((v) => !v)}
                className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-primary-600 hover:border-primary-300 transition-colors"
                title="分享报告"
              >
                🔗 分享
              </button>
              {/* 分享小卡片：浮出于分享按钮下方 */}
              {showShare && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-3.5 z-10 text-left">
                  <p className="text-xs font-medium text-gray-700">复制分享链接</p>
                  <p className="mt-1.5 text-xs text-primary-600 bg-primary-50 rounded px-2 py-1.5 break-all select-all">{shareUrl}</p>
                  <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">所有获得链接的人都能阅读该文档，若对文档进行修改，其他人将看到修改后的版本</p>
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
              <span className="flex items-center gap-2 text-sm text-gray-500"><Spinner size="sm" /> AI撰写中...</span>
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
        {/* ===== 进度页（生成中）：顶部状态条 + 流式逐字输出的正文 ===== */}
        {task?.status === "generating" && (
          <div className="h-full flex flex-col">
            {/* 状态条：当前阶段 + 后台运行提示 */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 flex-shrink-0">
              <Spinner size="sm" />
              <span className="text-sm font-medium text-gray-800" aria-label="当前生成状态">{task.stage ?? "正在启动任务..."}</span>
              <span className="ml-auto text-xs text-gray-400">后台运行中，您可以暂时离开</span>
            </div>
            {/* 流式正文：随生成进度逐字增长，末尾光标闪烁；容器自动滚动跟随 */}
            <div ref={streamRef} className="flex-1 min-h-0 overflow-y-auto px-8 py-5">
              {task.content ? (
                <>
                  <MiniMarkdown md={task.content} />
                  <span className="inline-block w-2 h-4 -mb-0.5 bg-gray-600 animate-pulse" aria-hidden />
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center pt-10">正在准备报告内容...</p>
              )}
            </div>
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

        {/* ===== 报告内容页 ===== */}
        {task?.status === "done" && (
          <div className="relative h-full flex flex-col">
            {/* 正文区：markdown 渲染 */}
            <div className="flex-1 min-h-0 overflow-y-auto px-8 py-5">
              <MiniMarkdown md={task.content ?? ""} />
            </div>

            {/* 左侧悬浮目录按钮：hover 提示并自动展开，点击条目定位 */}
            <div
              className="absolute left-2 top-20 z-10"
              onMouseEnter={() => setTocOpen(true)}
              onMouseLeave={() => setTocOpen(false)}
            >
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-base hover:border-primary-300 transition-colors"
                  title="目录"
                  aria-label="目录"
                  onClick={() => setTocOpen((v) => !v)}
                >
                  📑
                </button>
                {tocOpen && (
                  <div className="absolute left-11 top-0 w-60 max-h-[60vh] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl p-3" aria-label="报告目录">
                    <p className="text-xs font-medium text-gray-500 mb-2 px-1">目录</p>
                    {toc.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          document.getElementById(t.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
                          setTocOpen(false);
                        }}
                        className={`block w-full text-left px-2 py-1 rounded text-xs hover:bg-primary-50 hover:text-primary-600 truncate ${t.level === 2 ? "text-gray-700 font-medium" : "text-gray-500 pl-5"}`}
                      >
                        {t.text}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
      </Drawer>

      {/* 导出内容取当前报告正文 */}
      <ExportDocModal open={showExport} defaultName={task?.title ?? "报告"} content={task?.content ?? ""} onClose={() => setShowExport(false)} />
    </>
  );
}
