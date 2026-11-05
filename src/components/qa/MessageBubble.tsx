"use client";

import { useState, useMemo, ReactNode } from "react";
import { QaMessage, DISLIKE_REASONS, ExecutionNode, ReportOutline } from "@/types";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { ChartRenderer } from "./ChartRenderer";
import { ResultTable } from "./ResultTable";
import { CalculationProcess } from "./CalculationProcess";
import { OutlineCard } from "./OutlineCard";
import { ReportCard } from "./ReportCard";
import { FillCard } from "./FillCard";
import { QA_BUBBLE_ICONS } from "@/components/layout/NavIcon";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { collectMessageTables, exportTablesToExcel } from "@/lib/qa/export-excel";

// 图表类型 → emoji
const CHART_ICONS: Record<string, string> = {
  bar: "📊",
  line: "📈",
  pie: "🥧",
  area: "📉",
  scatter: "🔵",
  table: "📋",
};

const CHART_LABELS: Record<string, string> = {
  bar: "柱状图",
  line: "折线图",
  pie: "饼图",
  area: "面积图",
  scatter: "散点图",
  table: "表格",
};

// 执行节点状态图标
function nodeIcon(status: string): string {
  switch (status) {
    case "running":   return "⏳";
    case "completed": return "✅";
    case "failed":    return "❌";
    default:          return "○";
  }
}

// 思考过程折叠面板（普通回答 / 大纲卡片 / 报告卡片共用）：Agent 执行流程时间线，
// 生成中标题「思考中...」，其余「已完成思考」；节点状态图标 running⏳/completed✅/failed❌/pending○。
function ThinkingPanel({ nodes, running }: { nodes: ExecutionNode[]; running?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setShow(!show)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-700 flex items-center gap-1">{QA_BUBBLE_ICONS.thinking} {running ? "思考中..." : "已完成思考"}</span>
        <span
          className={`text-gray-400 transition-transform text-xs ${
            show ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>
      {show && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100">
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gray-200" />
            <div className="space-y-2">
              {nodes.map((node) => (
                <div key={node.id} className="relative">
                  <span className="absolute -left-[17px] top-0.5 text-xs">
                    {nodeIcon(node.status)}
                  </span>
                  <div
                    className={`text-xs font-medium ${
                      node.status === "failed"
                        ? "text-red-600"
                        : node.status === "completed"
                          ? "text-gray-700"
                          : "text-gray-400"
                    }`}
                  >
                    {node.label}
                  </div>
                  {node.detail && (
                    <div className="mt-0.5 text-xs text-gray-500 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded p-2 border border-gray-100">
                      {node.detail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: QaMessage;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onFeedback?: (msgId: string, feedback: "like" | "dislike", reasons?: string[], note?: string) => void;
  onFollowUpClick?: (question: string) => void;
  onChartTypeChange?: (newType: string) => void;
  // 报告卡片（大纲/任务）事件：由 ChatPanel 统一处理状态机
  onReportOutlineConfirm?: (msgId: string, outline: ReportOutline) => void;
  onReportOutlineRegenerate?: (msgId: string) => void;
  onOpenReport?: (msgId: string) => void;
  onDownloadReport?: (msgId: string) => void;
  onShareReport?: (msgId: string) => void;
  onRetryReport?: (msgId: string) => void;
  // 填表卡片事件：由 ChatPanel 统一处理状态机
  onOpenFill?: (msgId: string) => void;
  onDownloadFill?: (msgId: string) => void;
  onRetryFill?: (msgId: string) => void;
}

export function MessageBubble({
  message,
  isFavorited,
  onToggleFavorite,
  onFeedback,
  onFollowUpClick,
  onChartTypeChange,
  onReportOutlineConfirm,
  onReportOutlineRegenerate,
  onOpenReport,
  onDownloadReport,
  onShareReport,
  onRetryReport,
  onOpenFill,
  onDownloadFill,
  onRetryFill,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isWelcome = message.id === "welcome";
  const hasThinking = message.executionNodes && message.executionNodes.length > 0;

  // 导出 Excel：仅包含数据结果表的回答展示入口（每张表一个 Sheet，全量导出）
  const exportTables = useMemo(() => (isUser || isWelcome ? [] : collectMessageTables(message)), [message, isUser, isWelcome]);
  const canExport = exportTables.length > 0;
  const [exporting, setExporting] = useState(false);
  const toast = useToast();
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportTablesToExcel(exportTables, message.chartMeta?.title);
    } catch {
      toast("导出失败，请重试", "danger");
    } finally {
      setExporting(false);
    }
  };

  // 计算过程（指标溯源）功能暂时隐藏：按钮与弹窗代码保留，置 true 可恢复展示
  const SHOW_CALC_PROCESS = false;
  // 计算过程弹窗（指标溯源：拓扑图 + 详细解释）
  const [calcOpen, setCalcOpen] = useState(false);
  // 用于匹配涉及指标的回答文本（结构化回答时并入查询结果与解读）
  const calcText = [
    message.content,
    message.smartAnswer?.queryResult,
    message.smartAnswer?.interpretation,
  ]
    .filter(Boolean)
    .join("\n");

  // 点踩弹窗
  const [showDislikeModal, setShowDislikeModal] = useState(false);
  const [dislikeSelected, setDislikeSelected] = useState<string[]>([]);
  const [dislikeNote, setDislikeNote] = useState("");
  const [showDislikeNoteInput, setShowDislikeNoteInput] = useState(false);

  // ========== 评价互斥逻辑 ==========
  const handleLike = () => {
    if (message.feedback === "like") {
      // 取消点赞
      onFeedback?.(message.id, "like");
    } else {
      // 点赞（覆盖点踩）
      onFeedback?.(message.id, "like", [], "");
    }
  };

  const handleDislikeToggle = () => {
    if (message.feedback === "dislike") {
      // 取消点踩
      onFeedback?.(message.id, "like");
    } else {
      // 打开点踩弹窗
      setDislikeSelected([]);
      setDislikeNote("");
      setShowDislikeNoteInput(false);
      setShowDislikeModal(true);
    }
  };

  // 点踩提交
  const handleDislikeSubmit = () => {
    const reasons = dislikeSelected.filter((r) => r !== "other");
    if (dislikeSelected.includes("other")) reasons.push("other");
    onFeedback?.(message.id, "dislike", reasons, dislikeSelected.includes("other") ? dislikeNote : undefined);
    setShowDislikeModal(false);
    setDislikeSelected([]);
    setDislikeNote("");
    setShowDislikeNoteInput(false);
  };

  const toggleDislikeReason = (id: string) => {
    setDislikeSelected((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((r) => r !== id);
        if (id === "other") setShowDislikeNoteInput(false);
        return next;
      }
      if (id === "other") setShowDislikeNoteInput(true);
      return [...prev, id];
    });
  };

  const canSubmitDislike =
    dislikeSelected.length > 0 &&
    (!dislikeSelected.includes("other") || dislikeNote.trim().length > 0);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {/* 大纲确认卡片铺满中间内容区；报告任务卡片加宽到 90%（普通气泡仍 78%） */}
      <div className={`${message.reportCard?.kind === "outline" ? "w-full" : message.reportCard ? "max-w-[90%]" : "max-w-[78%]"} min-w-0 ${isUser ? "order-1" : ""}`}>
        {/* 头像（无时间戳） */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              isUser ? "bg-primary-100 text-primary-600" : "bg-gray-200 text-gray-600"
            }`}
          >
            {isUser ? "我" : "AI"}
          </span>
        </div>

        {/* ===== 报告卡片消息（大纲确认 / 报告任务）：不套普通气泡与操作栏 ===== */}
        {!isUser && message.reportCard && (
          <div className="space-y-1.5">
            {/* Agent 执行流程：大纲/报告卡片上方同样展示思考过程（报告生成中标题为「思考中...」，节点实时推进） */}
            {message.executionNodes?.length ? (
              <ThinkingPanel
                nodes={message.executionNodes}
                running={message.reportCard.kind === "report" && message.reportCard.task?.status === "generating"}
              />
            ) : null}
            {message.reportCard.kind === "outline" ? (
              <OutlineCard
                data={message.reportCard}
                locked={!!message.reportCard.outlineLocked}
                onConfirm={(outline) => onReportOutlineConfirm?.(message.id, outline)}
                onRegenerate={() => onReportOutlineRegenerate?.(message.id)}
              />
            ) : (
              <ReportCard
                data={message.reportCard}
                onOpen={() => onOpenReport?.(message.id)}
                onDownload={() => onDownloadReport?.(message.id)}
                onShare={() => onShareReport?.(message.id)}
                onRetry={() => onRetryReport?.(message.id)}
              />
            )}
          </div>
        )}

        {/* ===== 填表卡片消息：不套普通气泡与操作栏 ===== */}
        {!isUser && message.fillCard && (
          <FillCard
            data={message.fillCard}
            onOpen={() => onOpenFill?.(message.id)}
            onDownload={() => onDownloadFill?.(message.id)}
            onRetry={() => onRetryFill?.(message.id)}
          />
        )}

        {/* ===== AI 回答区 ===== */}
        {!isUser && !isWelcome && !message.reportCard && !message.fillCard && (
          <div className="space-y-3">
            {/* 思考过程：可折叠（与大纲/报告卡片共用 ThinkingPanel） */}
            {hasThinking && <ThinkingPanel nodes={message.executionNodes!} />}

            {/* 回答内容 / 结构化回答 */}
            {message.smartAnswer ? (
              <SmartAnswerView message={message} onChartTypeChange={onChartTypeChange} />
            ) : (
              <>
                <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-lg rounded-bl-sm text-sm leading-relaxed prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>

                {/* 可视化图表 */}
                {message.chartMeta && message.answerType !== "knowledge" && (
                  <ChartRenderer content={message.content} chartType={message.chartMeta.currentType} />
                )}

                {/* 图表类型切换（图表下方，展示当前类型） */}
                {message.chartMeta && onChartTypeChange && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-gray-500">当前：<span className="font-medium text-gray-700">{CHART_ICONS[message.chartMeta.currentType]} {CHART_LABELS[message.chartMeta.currentType]}</span></span>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs text-gray-400">切换为：</span>
                    {message.chartMeta.availableTypes.map((t) => (
                      <button
                        key={t}
                        onClick={() => onChartTypeChange(t)}
                        className="px-2 py-0.5 text-xs rounded border border-gray-200 bg-white text-gray-500 hover:text-primary-600 hover:border-primary-300 transition-colors"
                        title={CHART_LABELS[t] || t}
                      >
                        {CHART_ICONS[t] || t} {CHART_LABELS[t] || t}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 知识来源（知识问答类） */}
            {message.answerType === "knowledge" && message.knowledgeSources && (
              <div className="border border-blue-100 bg-blue-50/50 rounded-lg px-3 py-2.5">
                <p className="text-xs font-medium text-blue-700 mb-1.5 flex items-center gap-1">{QA_BUBBLE_ICONS.knowledge} 知识来源</p>
                <div className="space-y-1">
                  {message.knowledgeSources.map((src, i) => (
                    <div key={i} className="text-xs text-blue-600 flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>
                        知识库：<strong>{src.kbName}</strong> | 文档：{src.docName}
                        {src.chapter && ` | 章节：${src.chapter}`}
                        {src.version && ` | 版本：${src.version}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 评价 + 收藏 */}
            <div className="flex items-center gap-3">
              {/* 收藏 */}
              <button
                onClick={onToggleFavorite}
                className={`flex items-center gap-1 text-xs ${
                  isFavorited
                    ? "text-yellow-500"
                    : "text-gray-400 hover:text-yellow-500 active:scale-90"
                } transition-all duration-200`}
                title={isFavorited ? "取消收藏" : "收藏"}
              >
                {isFavorited ? QA_BUBBLE_ICONS.favorite : QA_BUBBLE_ICONS.unfavorite}
                {isFavorited ? "已收藏" : "收藏"}
              </button>

              <span className="text-gray-200">|</span>

              {/* 点赞（互斥） */}
              <button
                onClick={handleLike}
                className={`inline-flex items-center gap-1 text-xs transition-colors ${
                  message.feedback === "like"
                    ? "text-primary-600"
                    : "text-gray-400 hover:text-primary-600 active:scale-90"
                }`}
              >
                <ThumbsUp size={14} />
                {message.feedback === "like" && "有帮助"}
              </button>

              {/* 点踩（互斥） */}
              <button
                onClick={handleDislikeToggle}
                className={`inline-flex items-center gap-1 text-xs transition-colors ${
                  message.feedback === "dislike"
                    ? "text-red-500"
                    : "text-gray-400 hover:text-red-500 active:scale-90"
                }`}
              >
                <ThumbsDown size={14} />
                {message.feedback === "dislike" && "已反馈"}
              </button>

              {/* 导出 Excel：操作栏最右侧，仅含数据结果表的回答显示；
                  生成中展示加载状态，失败提示后可重试 */}
              {canExport && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 active:scale-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  title="将该回答的全部结果表导出为 Excel 文件（每张表一个 Sheet）"
                >
                  {exporting ? <Spinner size="sm" /> : "📥"}
                  {exporting ? "导出中..." : "导出Excel"}
                </button>
              )}

              {/* 计算过程（指标溯源）：右对齐，与文本区域右边缘对齐。
                  功能暂时隐藏（按钮与弹窗代码保留，置 true 可恢复展示） */}
              {SHOW_CALC_PROCESS && (
                <button
                  onClick={() => setCalcOpen(true)}
                  className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 active:scale-90 transition-all duration-200"
                  title="查看指标计算过程（溯源链路与详细解释）"
                >
                  {QA_BUBBLE_ICONS.calculation} 计算过程
                </button>
              )}
            </div>

            {/* 点踩原因弹窗 */}
            {showDislikeModal && (
              <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm space-y-3">
                <p className="text-xs text-gray-500 font-medium">请选择不满意的原因（可多选）：</p>
                <div className="flex flex-wrap gap-1.5">
                  {DISLIKE_REASONS.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => toggleDislikeReason(reason.id)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                        dislikeSelected.includes(reason.id)
                          ? "bg-red-50 text-red-600 border-red-300"
                          : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
                      }`}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
                {showDislikeNoteInput && (
                  <textarea
                    value={dislikeNote}
                    onChange={(e) => setDislikeNote(e.target.value)}
                    placeholder="请描述具体原因..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    autoFocus
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleDislikeSubmit}
                    disabled={!canSubmitDislike}
                    className="px-4 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    提交
                  </button>
                  <button
                    onClick={() => {
                      setShowDislikeModal(false);
                      setDislikeSelected([]);
                      setDislikeNote("");
                      setShowDislikeNoteInput(false);
                    }}
                    className="px-4 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {/* 推荐追问 */}
            {message.followUpQuestions && message.followUpQuestions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400 flex items-center gap-1">{QA_BUBBLE_ICONS.followUp} 您还可以继续探索：</p>
                <div className="flex flex-wrap gap-1.5">
                  {message.followUpQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onFollowUpClick?.(q)}
                      className="px-2.5 py-1 text-xs bg-primary-50 text-primary-600 rounded-full hover:bg-primary-100 active:scale-95 border border-primary-100 transition-all duration-200"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 欢迎消息（简化展示）===== */}
        {!isUser && isWelcome && (
          <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-lg rounded-bl-sm text-sm leading-relaxed">
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        )}

        {/* ===== 用户消息 ===== */}
        {isUser && (
          <div className="bg-primary-600 text-white px-4 py-3 rounded-lg rounded-br-sm text-sm leading-relaxed">
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        )}

        {/* 计算过程弹窗（指标溯源：拓扑图 + 详细解释）——随入口按钮一并隐藏 */}
        {SHOW_CALC_PROCESS && !isUser && !isWelcome && (
          <CalculationProcess open={calcOpen} onClose={() => setCalcOpen(false)} text={calcText} />
        )}
      </div>
    </div>
  );
}

// ========== 智能问数 4 段结构化回答视图 ==========

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function SmartAnswerView({
  message,
  onChartTypeChange,
}: {
  message: QaMessage;
  onChartTypeChange?: (newType: string) => void;
}) {
  const sa = message.smartAnswer!;
  const chartType = message.chartMeta?.currentType;

  return (
    <div className="bg-gray-100 text-gray-800 px-4 py-3.5 rounded-lg rounded-bl-sm space-y-4 min-w-0 overflow-hidden">
      {/* 1. 查询结果 */}
      <Section icon={QA_BUBBLE_ICONS.queryResult} title="查询结果">
        <ResultTable markdown={sa.queryResult} />
      </Section>

      {/* 2. 基础数据解读 */}
      <Section icon={QA_BUBBLE_ICONS.dataInterpret} title="基础数据解读">
        <p className="text-sm text-gray-700 leading-relaxed">{sa.interpretation}</p>
      </Section>

      {/* 3. 推荐图表 */}
      {message.chartMeta && chartType && (
        <Section icon={QA_BUBBLE_ICONS.chartRecommend} title="推荐图表">
          {sa.chartReason && (
            <p className="text-xs text-gray-500 leading-relaxed">{sa.chartReason}</p>
          )}
          <ChartRenderer content={sa.queryResult} chartType={chartType} />
          {onChartTypeChange && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-500">切换图表：</span>
              {message.chartMeta.availableTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => onChartTypeChange(t)}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    t === chartType
                      ? "border-primary-400 bg-primary-50 text-primary-600"
                      : "border-gray-200 bg-white text-gray-500 hover:text-primary-600 hover:border-primary-300"
                  }`}
                  title={CHART_LABELS[t] || t}
                >
                  {CHART_ICONS[t] || t} {CHART_LABELS[t] || t}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 4. 数据说明 */}
      <Section icon="ℹ️" title="数据说明">
        <p className="text-xs text-gray-500 leading-relaxed">{sa.dataNotes}</p>
      </Section>

    </div>
  );
}
