"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { QaMessage, VisitBoard, ReportCardData, ReportOutline, ReportTemplateItem, FillCardData, ExecutionNode } from "@/types";
import { mockAiResponse, getWelcomeMessage } from "@/lib/ai/mock-ai";
import { generateId } from "@/lib/utils";
import { useApp } from "@/lib/store/AppContext";
import { dataModels } from "@/lib/mock-data/data-assets";
import { mockKnowledgeDocs, mockAiSkills } from "@/lib/mock-data/settings";
import {
  classifyReportRequest,
  generateOutline,
  generateReportContent,
  matchTemplateByKeyword,
  outlineFromTemplate,
  applyReportEdit,
  isReportEditIntent,
  reportThinkingNodes,
  outlineThinkingNodes,
  progressReportNodes,
  reportFlowLength,
  type ReportGenMode,
} from "@/lib/mock-data/report-gen";
import {
  FILL_STAGES,
  FILL_FLOW_LENGTH,
  matchFillTemplate,
  listFillTemplateNames,
  defaultPeriodOf,
  generateFillTables,
  fillThinkingNodes,
  progressFillNodes,
  isFillEditIntent,
  applyFillEdit,
} from "@/lib/mock-data/fill-form";
import { exportTablesToExcel } from "@/lib/qa/export-excel";
import { MessageBubble } from "./MessageBubble";
import { TemplatePickerModal } from "./TemplatePickerModal";
import { ReportDrawer } from "./ReportDrawer";
import { FillDrawer } from "./FillDrawer";
import { QA_TOOLBAR_ICONS } from "@/components/layout/NavIcon";
import { AnalystAvatar } from "./AnalystAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";

// ---------- 数据准备 ----------
const allTables = dataModels.flatMap((dm) =>
  (dm.children || []).map((c) => ({ id: c.id, name: c.name, domain: dm.name }))
);
const demoTables = allTables.slice(0, 3).map((t) => t.id);
const knowledgeBases = mockKnowledgeDocs.map((d) => ({ id: d.id, name: d.title, category: d.category }));
const skillList = mockAiSkills
  .filter((s) => s.enabled && s.name !== "异常检测")
  .map((s) => ({ id: s.id, name: s.name, description: s.description }));

const RECOMMENDED_QUESTIONS = [
  "各机台设备运行效率如何？",
  "分析单箱耗烟叶量情况",
  "各工序优质品率怎么样？",
  "单箱综合能耗如何？",
  "今日生产效率如何？",
  "卷接工艺车速控制范围？",
];

const MODELS = [
  { id: "deepseek", name: "DeepSeek-V4", desc: "通用大模型" },
  { id: "fable", name: "Claude Fable 5", desc: "深度推理" },
  { id: "qwen", name: "通义千问", desc: "国产大模型" },
];

// 板块推断：用于首页最近访问「智能问数对话」的所属板块标注
const BOARD_KEYWORDS: [VisitBoard, string[]][] = [
  ["能源消耗", ["能耗", "电耗", "能源", "碳排", "天然气", "蒸汽", "用水"]],
  ["生产管理", ["产量", "生产", "计划", "效率", "达成", "牌号", "库存", "机台"]],
  ["工艺质量", ["质量", "水分", "优质品", "废品", "工艺", "偏差", "合格"]],
];
function detectVisitBoard(text: string): VisitBoard {
  for (const [board, keywords] of BOARD_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) return board;
  }
  return "生产管理";
}

// ========== 组件 ==========
// compact：嵌入侧滑窗等窄容器时使用（压缩欢迎模式排版，交互能力不变）
// welcomeText：自定义欢迎语（如能耗三页 AI 助手传入业务化开场白，仅欢迎模式展示）
// suppressHistory：案例演示模式（不计入业务问数历史、热门问题统计）
// questions：页面级 AI 助手传入的定制推荐问题（由本页数据情况生成，默认用全局推荐）
// inputPlaceholder：定制输入框提示文字（如「问一句本页数据」）
export function ChatPanel({
  initialQuery,
  compact = false,
  welcomeText,
  suppressHistory = false,
  questions,
  inputPlaceholder,
}: {
  initialQuery?: string;
  compact?: boolean;
  welcomeText?: string;
  suppressHistory?: boolean;
  questions?: string[];
  inputPlaceholder?: string;
}) {
  const { toggleFavorite, addHistory, isFavorited, addRecentVisit, state } = useApp();

  // ----- 消息 & 输入 -----
  const [messages, setMessages] = useState<QaMessage[]>([getWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialQuerySent = useRef(false);
  const sendMessageRef = useRef<(text: string) => Promise<void>>(async () => {});

  // ----- 选择器 -----
  const [selectedModels, setSelectedModels] = useState<string[]>(demoTables);
  const [selectedKbs, setSelectedKbs] = useState<string[]>(knowledgeBases.map((k) => k.id));
  const [selectedSkillTag, setSelectedSkillTag] = useState<{ id: string; name: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState("deepseek");

  // ----- 弹窗 / 下拉菜单 -----
  // 选择器下拉菜单（无遮罩层）：null 关闭；"model" 数据范围；"kb" 知识库；"skill" 技能
  const [openMenu, setOpenMenu] = useState<"model" | "kb" | "skill" | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showModelSwitch, setShowModelSwitch] = useState(false);

  // ----- Toast -----
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ----- 报告生成状态机 -----
  // 已选模板（方式一）/ 模板选择弹窗 / 大纲生成中 / 报告抽屉（autoExport=打开后直接弹导出）
  const [reportTemplate, setReportTemplate] = useState<ReportTemplateItem | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [outlineBusy, setOutlineBusy] = useState(false);
  const [reportDrawer, setReportDrawer] = useState<{ open: boolean; msgId: string | null; autoExport: boolean }>({ open: false, msgId: null, autoExport: false });
  // 报告任务计时器（阶段轮换）与大纲生成计时器；报告大纲上下文（含生成方式，供失败重试重跑）
  const reportTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const outlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportFlows = useRef<Record<string, { outline: ReportOutline; turnCount: number; mode: ReportGenMode }>>({});
  // 智能填表任务计时器与填表上下文（模板+周期+原始要求，供失败重试与对话式修改重跑）
  const fillTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fillFlows = useRef<Record<string, { template: ReportTemplateItem; period: string; text: string }>>({});

  // 卸载时清理计时器
  useEffect(() => {
    return () => {
      reportTimers.current.forEach(clearTimeout);
      fillTimers.current.forEach(clearTimeout);
      if (outlineTimer.current) clearTimeout(outlineTimer.current);
    };
  }, []);

  // 报告技能是否选中（placeholder 与生成方式判定共用）
  const reportSkillOn = selectedSkillTag?.name === "报告生成";
  // 智能填表技能是否选中（placeholder 与填表分支判定共用）
  const fillSkillOn = selectedSkillTag?.name === "智能填表";
  // 会话已有对话轮数（报告上下文复用说明用）
  const countUserTurns = useCallback(() => messages.filter((m) => m.role === "user").length, [messages]);

  // 更新某条消息上的报告任务
  const updateReportTask = useCallback((msgId: string, patch: Partial<NonNullable<ReportCardData["task"]>>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.reportCard?.task
          ? { ...m, reportCard: { ...m.reportCard, task: { ...m.reportCard.task, ...patch } } }
          : m
      )
    );
  }, []);

  // 更新某条消息的思考节点（对话页报告卡片上方的 Agent 执行流程随生成进度实时推进）
  const setMsgThinking = useCallback((msgId: string, nodes: ExecutionNode[]) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, executionNodes: nodes } : m)));
  }, []);

  // 报告生成：阶段轮换（正在查询数据 → 正在生成第N章… → 正在整合报告）→ 流式逐字快速输出正文 → done。
  // mode 对应报告生成方式（template 按模板/outline 按要求+大纲/conversation 按对话），决定思考节点的执行流程文案；
  // 思考节点随进度推进：前 STAGE_NODES 步在阶段轮换期点亮，其余随流式输出比例点亮，完成后全部置为已完成。
  const runReportStages = useCallback((reportMsgId: string, outline: ReportOutline, turnCount: number, mode: ReportGenMode) => {
    const flowLen = reportFlowLength(mode);
    const STAGE_NODES = 9; // 阶段轮换期推进的节点数（「生成正文」起归流式输出期）
    const stages = [
      "正在查询数据",
      ...outline.sections.map((s, i) => `正在生成第${i + 1}章：${s.title}`),
      "正在整合报告",
    ];
    let step = 0;
    const tick = () => {
      if (step < stages.length) {
        updateReportTask(reportMsgId, { stage: stages[step] });
        setMsgThinking(
          reportMsgId,
          progressReportNodes(outline, mode, Math.min(STAGE_NODES, Math.round(((step + 1) / stages.length) * STAGE_NODES)))
        );
        step += 1;
        const t = setTimeout(tick, 500);
        reportTimers.current.push(t);
      } else {
        // 阶段轮换完成 → 流式逐字输出标题与正文：预生成全文，16ms/跳按片推进（全文约 2.5s 输出完）
        const full = generateReportContent(outline, { turnCount });
        const chunk = Math.max(4, Math.ceil(full.length / 160));
        let pos = 0;
        updateReportTask(reportMsgId, { stage: "正在生成正文" });
        const stream = () => {
          pos = Math.min(full.length, pos + chunk);
          updateReportTask(reportMsgId, { content: full.slice(0, pos) });
          if (pos >= full.length) {
            // 输出完成：报告任务收尾 + 思考节点全绿
            updateReportTask(reportMsgId, {
              status: "done",
              stage: undefined,
              thinking: reportThinkingNodes(outline, mode),
            });
            setMsgThinking(reportMsgId, progressReportNodes(outline, mode, flowLen));
            return;
          }
          setMsgThinking(
            reportMsgId,
            progressReportNodes(outline, mode, STAGE_NODES + Math.round((pos / full.length) * (flowLen - STAGE_NODES)))
          );
          const t = setTimeout(stream, 16);
          reportTimers.current.push(t);
        };
        stream();
      }
    };
    tick();
  }, [updateReportTask, setMsgThinking]);

  // 启动报告生成：push 报告任务卡片（含 Agent 执行流程节点，随进度推进）+ 自动打开抽屉 + 阶段轮换与流式输出
  const startReportFlow = useCallback((outline: ReportOutline, opts: { templateId?: string; turnCount: number; mode?: ReportGenMode }) => {
    const reportMsgId = generateId();
    const mode = opts.mode ?? "outline";
    reportFlows.current[reportMsgId] = { outline, turnCount: opts.turnCount, mode };
    setMessages((prev) => [
      ...prev,
      {
        id: reportMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        executionNodes: progressReportNodes(outline, mode, 0),
        reportCard: {
          kind: "report",
          task: { title: outline.title, status: "generating", stage: "正在查询数据", templateId: opts.templateId },
        },
      },
    ]);
    setReportDrawer({ open: true, msgId: reportMsgId, autoExport: false });
    runReportStages(reportMsgId, outline, opts.turnCount, mode);
  }, [runReportStages]);

  // 停止生成：清全部阶段计时器，标记当前生成中的任务为失败
  const stopReportGeneration = useCallback(() => {
    reportTimers.current.forEach(clearTimeout);
    reportTimers.current = [];
    setMessages((prev) =>
      prev.map((m) =>
        m.reportCard?.task?.status === "generating"
          ? { ...m, reportCard: { ...m.reportCard, task: { ...m.reportCard.task!, status: "failed", failReason: "已手动停止生成" } } }
          : m
      )
    );
  }, []);

  // 失败后重新生成：按原大纲重跑
  const retryReportGeneration = useCallback((msgId: string) => {
    const rec = reportFlows.current[msgId];
    if (!rec) {
      showToast("未找到生成上下文，请重新发起报告生成");
      return;
    }
    // 重置正文与思考节点（从第 1 步重新开始）后重跑
    updateReportTask(msgId, { status: "generating", failReason: undefined, stage: "正在查询数据", content: "" });
    setMsgThinking(msgId, progressReportNodes(rec.outline, rec.mode, 0));
    setReportDrawer({ open: true, msgId, autoExport: false });
    runReportStages(msgId, rec.outline, rec.turnCount, rec.mode);
  }, [runReportStages, showToast, updateReportTask, setMsgThinking]);

  // 大纲确认：锁定大纲消息 → 启动报告生成
  const handleOutlineConfirm = useCallback((msgId: string, outline: ReportOutline) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.reportCard
          ? { ...m, reportCard: { ...m.reportCard, outlineLocked: true } }
          : m
      )
    );
    startReportFlow(outline, { turnCount: countUserTurns(), mode: "outline" });
  }, [countUserTurns, startReportFlow]);

  // 大纲重新生成：按原始要求重拟大纲（换消息 id 令卡片重挂载、丢弃未保存的编辑）
  const handleOutlineRegenerate = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.reportCard?.outline) return m;
        const text = m.reportCard.outline.requirement.split("\n")[0];
        return {
          ...m,
          id: generateId(),
          reportCard: { kind: "outline", outline: generateOutline(text, { turnCount: countUserTurns() }) },
        };
      })
    );
  }, [countUserTurns]);

  // 大纲生成停止：清计时器 + 提示消息
  const stopOutlineGeneration = useCallback(() => {
    if (outlineTimer.current) {
      clearTimeout(outlineTimer.current);
      outlineTimer.current = null;
    }
    setOutlineBusy(false);
    setMessages((prev) => [...prev, { id: generateId(), role: "assistant", content: "已停止生成", timestamp: Date.now() }]);
  }, []);

  // ----- 智能填表状态机（流式：表格逐行填充、阶段随进度切换、思考节点按比例推进） -----
  // 填表抽屉（计时器与上下文 ref 见上方状态声明区）；exportSignal 递增触发导出弹窗
  const [fillDrawer, setFillDrawer] = useState<{ open: boolean; msgId: string | null; exportSignal: number }>({ open: false, msgId: null, exportSignal: 0 });

  // 更新某条消息上的填表任务
  const updateFillCard = useCallback((msgId: string, patch: Partial<FillCardData>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.fillCard ? { ...m, fillCard: { ...m.fillCard, ...patch } } : m))
    );
  }, []);

  // 重置填表任务为生成中初始态（重试/对话修改共用）：挂全量表结构 + 初始思考节点
  const beginFillRun = useCallback((msgId: string, template: ReportTemplateItem, period: string, text: string) => {
    const tables = generateFillTables(template);
    updateFillCard(msgId, {
      status: "generating",
      stage: FILL_STAGES[0],
      failReason: undefined,
      progress: 0,
      tables,
      thinking: progressFillNodes(template, period, text, tables, 0),
    });
  }, [updateFillCard]);

  // 流式填充：progress 为已填充行数（跨表累计），300ms 推进一行；
  // 阶段按进度区间切换（解析模板 → 查询数据 → 填充工作表 → 尾行校验），节点按比例推进，完成后全绿
  const runFillStages = useCallback((fillMsgId: string, template: ReportTemplateItem, period: string, text: string) => {
    const tables = generateFillTables(template);
    const total = tables.reduce((n, tb) => n + tb.rows.length, 0);
    let progress = 0;
    const tick = () => {
      if (progress < total) {
        progress += 1;
        const stage =
          progress === 1
            ? FILL_STAGES[0]
            : progress <= Math.max(2, Math.round(total * 0.3))
              ? FILL_STAGES[1]
              : progress < total
                ? FILL_STAGES[2]
                : FILL_STAGES[3];
        const doneCount = Math.min(FILL_FLOW_LENGTH - 1, Math.floor((FILL_FLOW_LENGTH - 1) * (progress / total)));
        updateFillCard(fillMsgId, {
          progress,
          stage,
          thinking: progressFillNodes(template, period, text, tables, doneCount),
        });
        const t = setTimeout(tick, 300);
        fillTimers.current.push(t);
      } else {
        updateFillCard(fillMsgId, {
          status: "done",
          stage: undefined,
          thinking: fillThinkingNodes(template, period, text, tables),
        });
      }
    };
    tick();
  }, [updateFillCard]);

  // 启动智能填表：push 填表任务卡片（预挂全量表结构，progress 从 0 流式推进）+ 自动打开抽屉
  const startFillFlow = useCallback((template: ReportTemplateItem, text: string) => {
    const period = defaultPeriodOf(text);
    const tables = generateFillTables(template);
    const fillMsgId = generateId();
    fillFlows.current[fillMsgId] = { template, period, text };
    setMessages((prev) => [
      ...prev,
      {
        id: fillMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        fillCard: {
          title: template.name,
          status: "generating",
          stage: FILL_STAGES[0],
          templateId: template.id,
          period,
          progress: 0,
          tables,
          thinking: progressFillNodes(template, period, text, tables, 0),
        },
      },
    ]);
    setFillDrawer({ open: true, msgId: fillMsgId, exportSignal: 0 });
    runFillStages(fillMsgId, template, period, text);
  }, [runFillStages]);

  // 停止填表：清计时器，冻结进度保留已填充部分（标记已停止，可重新生成）
  const stopFillGeneration = useCallback(() => {
    fillTimers.current.forEach(clearTimeout);
    fillTimers.current = [];
    setMessages((prev) =>
      prev.map((m) =>
        m.fillCard?.status === "generating"
          ? { ...m, fillCard: { ...m.fillCard, status: "stopped", stage: undefined } }
          : m
      )
    );
  }, []);

  // 停止/失败后重新生成：重置为初始态重跑
  const retryFillGeneration = useCallback((msgId: string) => {
    const rec = fillFlows.current[msgId];
    if (!rec) {
      showToast("未找到填报上下文，请重新发起智能填表");
      return;
    }
    beginFillRun(msgId, rec.template, rec.period, rec.text);
    setFillDrawer({ open: true, msgId, exportSignal: 0 });
    runFillStages(msgId, rec.template, rec.period, rec.text);
  }, [beginFillRun, runFillStages, showToast]);

  // 卡片「下载」：打开抽屉并直接弹出「导出报表」弹窗（xlsx，文件名可改）
  const downloadFill = useCallback((msgId: string) => {
    const card = messages.find((m) => m.id === msgId)?.fillCard;
    if (!card || card.status !== "done") {
      showToast("报表尚未生成完成");
      return;
    }
    setFillDrawer((prev) => ({ open: true, msgId, exportSignal: prev.exportSignal + 1 }));
  }, [messages, showToast]);

  // 导出报表弹窗确认：按自定义文件名导出全部工作表（保留完整数据与格式）
  const exportFill = useCallback(async (msgId: string, name: string) => {
    const card = messages.find((m) => m.id === msgId)?.fillCard;
    if (!card?.tables?.length) {
      showToast("报表尚未生成完成");
      return;
    }
    try {
      await exportTablesToExcel(card.tables, undefined, name);
      showToast("Excel报表导出成功");
    } catch {
      showToast("导出失败，请重试");
    }
  }, [messages, showToast]);

  // 卡片「分享」：复制报表链接（访问遵循权限控制，更新后展示最新保存版本）
  const shareFill = useCallback((msgId: string) => {
    try { navigator.clipboard?.writeText(`https://shifang.example.com/f/${msgId}`); } catch { /* 剪贴板不可用时静默 */ }
    showToast("链接已复制，报表更新后链接展示最新保存版本");
  }, [showToast]);


  const isFresh = messages.length === 1 && messages[0].id === "welcome";
  const MAX_CHARS = 500;

  // ----- 滚动 -----
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ----- 下拉菜单：点击按钮与菜单以外的区域时关闭 -----
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      const el = menuRefs.current[openMenu];
      if (el && !el.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  // ----- 拖拽事件 -----
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const first = files[0];
        if (first.type.startsWith("image/")) {
          showToast("暂不支持处理图片内容");
        } else {
          showToast("暂不支持处理文件内容");
        }
      }
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("drop", onDrop);
    };
  }, [showToast, isFresh]);

  // ----- 输入处理（含字数限制）-----
  const handleInputChange = useCallback(
    (val: string) => {
      if (val.length > MAX_CHARS) {
        showToast("最多支持输入500个字符");
        return;
      }
      setInput(val);
    },
    [showToast]
  );

  // ----- 反馈处理 -----
  const handleFeedback = useCallback(
    (msgId: string, feedback: "like" | "dislike", reasons?: string[], note?: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, feedback, dislikeReasons: reasons || [], dislikeNote: note || "" }
            : m
        )
      );
    },
    []
  );

  // ----- 图表类型切换 -----
  const handleChartTypeChange = useCallback(
    (msgId: string, newType: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.chartMeta
            ? { ...m, chartMeta: { ...m.chartMeta, currentType: newType as "bar" } }
            : m
        )
      );
    },
    []
  );

  // ----- 发送消息 -----
  // 用户消息入列（普通问答与报告生成分支共用）
  const postUserMessage = useCallback(
    (text: string) => {
      const userMsg: QaMessage = { id: generateId(), role: "user", content: text, timestamp: Date.now() };
      // 进入对话后移除欢迎语气泡
      setMessages((prev) => [...prev.filter((m) => m.id !== "welcome"), userMsg]);
      setInput("");
      // 案例演示模式不计入业务问数历史与热门问题统计
      if (!suppressHistory) {
        addHistory(userMsg);
        // 记录最近访问（首页「智能问数对话」条目；同一问题重复提问仅更新时间）
        addRecentVisit({
          id: `rv-qa-${text.slice(0, 40)}`,
          title: text,
          board: detectVisitBoard(text),
          contentType: "智能问数对话",
          creator: state.user?.nickname || state.user?.username || "当前用户",
          editable: false,
          route: `/qa?query=${encodeURIComponent(text)}`,
        });
      }
    },
    [addHistory, suppressHistory, addRecentVisit, state.user]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      if (outlineBusy) {
        showToast("正在整理大纲，请稍候");
        return;
      }
      // 智能填表后台执行中：提示可离开或停止（输入框发送按钮此时为停止态）
      if (messages.some((m) => m.fillCard?.status === "generating")) {
        showToast("智能填表生成可能需要较长时间，您可以暂时离开，稍后回来查看");
        return;
      }

      // ===== 智能填表分支（技能选中时优先于报告与普通问答）=====
      // 补充/修改已有报表 > 匹配模板新生成 > 引导补充模板名称
      if (fillSkillOn) {
        const doneFill = [...messages].reverse().find((m) => m.fillCard?.status === "done");
        const fillTpl = matchFillTemplate(text);
        if (doneFill?.fillCard && isFillEditIntent(text) && (!fillTpl || fillTpl.id === doneFill.fillCard.templateId)) {
          // 对话式修改：识别周期调整/补充要求，重跑该卡片并标记已按对话修改
          postUserMessage(text);
          const rec = fillFlows.current[doneFill.id];
          if (!rec) {
            showToast("未找到填报上下文，请重新发起智能填表");
            return;
          }
          const { period: nextPeriod, note } = applyFillEdit(rec.period, text);
          fillFlows.current[doneFill.id] = { ...rec, period: nextPeriod, text };
          beginFillRun(doneFill.id, rec.template, nextPeriod, text);
          updateFillCard(doneFill.id, { period: nextPeriod, edited: true });
          setFillDrawer({ open: true, msgId: doneFill.id, exportSignal: 0 });
          runFillStages(doneFill.id, rec.template, nextPeriod, text);
          showToast(note);
          return;
        }
        if (fillTpl) {
          postUserMessage(text);
          startFillFlow(fillTpl, text);
          return;
        }
        // 未命中模板：给出可用模板清单引导补充
        postUserMessage(text);
        const names = listFillTemplateNames();
        const guide = [
          "未识别到匹配的报表模板。当前可用的报表模板：",
          ...names.map((t, i) => `${i + 1}. ${t.name}（${t.category}）`),
          "",
          "请补充报表名称（附统计周期、统计范围及填报要求更佳），我将按模板原有结构自动填表并生成 XLSX 报表。",
        ].join("\n");
        setMessages((prev) => [...prev, { id: generateId(), role: "assistant", content: guide, timestamp: Date.now() }]);
        return;
      }

      // ===== 报告生成分支：编辑已有报告 > 模板（方式一）> 对话引用（方式三）> 技能大纲（方式二）=====
      const doneReport = [...messages].reverse().find((m) => m.reportCard?.task?.status === "done");
      if (doneReport?.reportCard?.task && isReportEditIntent(text)) {
        postUserMessage(text);
        const task = doneReport.reportCard.task;
        const { content, note } = applyReportEdit(task.content ?? "", text);
        updateReportTask(doneReport.id, { content, edited: true });
        setReportDrawer({ open: true, msgId: doneReport.id, autoExport: false });
        showToast(note);
        return;
      }
      const mode = classifyReportRequest(text, { skillOn: reportSkillOn, template: reportTemplate });
      if (mode) {
        const turnCount = countUserTurns();
        postUserMessage(text);
        if (mode === "template") {
          // 方式一：按模板固定大纲直接生成，无大纲确认
          const tpl = reportTemplate ?? matchTemplateByKeyword(text)!;
          startReportFlow(outlineFromTemplate(tpl, text), { templateId: tpl.id, turnCount, mode: "template" });
        } else if (mode === "conversation") {
          // 方式三：整理当前对话分析结果，系统内部规划大纲后直接生成
          startReportFlow(generateOutline(text, { turnCount }), { turnCount, mode: "conversation" });
        } else {
          // 方式二：先出大纲确认卡片（正在整理数据...，可停止）；卡片上方展示大纲阶段的 Agent 执行流程
          setOutlineBusy(true);
          outlineTimer.current = setTimeout(() => {
            outlineTimer.current = null;
            setOutlineBusy(false);
            const outline = generateOutline(text, { turnCount });
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: "assistant",
                content: "",
                timestamp: Date.now(),
                executionNodes: outlineThinkingNodes(outline),
                reportCard: { kind: "outline", outline },
              },
            ]);
          }, 1800);
        }
        return;
      }

      // ===== 普通问答 =====
      postUserMessage(text);
      setLoading(true);
      try {
        const reply = await mockAiResponse(text);
        setMessages((prev) => [...prev, reply]);
        if (!suppressHistory) addHistory(reply);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: "抱歉，服务暂时不可用，请稍后再试。",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, outlineBusy, messages, fillSkillOn, startFillFlow, updateFillCard, beginFillRun, runFillStages, reportSkillOn, reportTemplate, postUserMessage, countUserTurns, startReportFlow, updateReportTask, showToast, addHistory, suppressHistory]
  );

  sendMessageRef.current = sendMessage;
  useEffect(() => {
    if (initialQuery && !initialQuerySent.current) {
      initialQuerySent.current = true;
      sendMessageRef.current(initialQuery);
    }
  }, [initialQuery]);

  // ----- 标签文本 -----
  const modelLabel =
    selectedModels.length === 0
      ? "选择数据范围"
      : selectedModels.length === allTables.length
        ? "全部"
        : selectedModels.length === demoTables.length &&
          selectedModels.every((m) => demoTables.includes(m))
          ? "卷烟厂案例数据"
          : `已选 ${selectedModels.length} 个`;
  const kbLabel =
    selectedKbs.length === 0
      ? "选择知识库"
      : selectedKbs.length === knowledgeBases.length
        ? "全部知识库"
        : `已选 ${selectedKbs.length} 个`;
  const currentModelName = MODELS.find((m) => m.id === selectedModel)?.name || "DeepSeek-V4";


  // ========== 下拉菜单内容渲染（多选列表：全部 + 各选项） ==========
  const renderCheckboxList = (
    items: { id: string; name: string; subtitle?: string }[],
    selected: string[],
    setSelected: (ids: string[]) => void
  ) => {
    const allSelected = selected.length === items.length;
    return (
      <>
        <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => {
              if (allSelected) setSelected([]);
              else setSelected(items.map((i) => i.id));
            }}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span className="text-sm text-gray-800">全部</span>
        </label>
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={(e) => {
                if (e.target.checked) setSelected([...selected, item.id]);
                else setSelected(selected.filter((s) => s !== item.id));
              }}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <div className="min-w-0">
              <div className="text-sm text-gray-800">{item.name}</div>
              {item.subtitle && <div className="text-xs text-gray-400">{item.subtitle}</div>}
            </div>
          </label>
        ))}
      </>
    );
  };

  // 数据范围菜单选项（含案例数据预设项）与勾选联动逻辑
  const modelMenuItems = [
    { id: "__demo_preset__", name: "卷烟厂案例数据", subtitle: "Demo 案例数据（含卷接工单/包装工单/制丝批次3张表）" },
    ...allTables.map((t) => ({ id: t.id, name: t.name, subtitle: t.domain })),
  ];
  const modelMenuSelected = demoTables.every((d) => selectedModels.includes(d))
    ? [...selectedModels, "__demo_preset__"]
    : selectedModels;
  const handleModelMenuChange = (ids: string[]) => {
    // 处理案例数据预设：勾选则连带勾选3张 demo 表，取消则连带取消
    const hasDemo = ids.includes("__demo_preset__");
    let next = ids.filter((id) => id !== "__demo_preset__");
    if (hasDemo) {
      const missing = demoTables.filter((d) => !next.includes(d));
      next = [...next, ...missing];
    } else {
      next = next.filter((id) => !demoTables.includes(id));
    }
    setSelectedModels(next);
  };

  // ========== 选择器条（数据范围 / 知识库：下拉菜单在按钮上方弹出，无遮罩层） ==========
  // 注意：SelectorBar/ToolBar/InputArea 是渲染函数（非组件），调用处必须写 {Xxx()} 而非 <Xxx />：
  // 组件写法下每次 re-render 函数引用都变，React 会卸载重挂整个子树，导致输入框每敲一个字丢一次焦点。
  const SelectorBar = () => (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 选择数据范围 */}
      <div className="relative" ref={(el) => { menuRefs.current.model = el; }}>
        <button
          onClick={() => setOpenMenu(openMenu === "model" ? null : "model")}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-colors ${
            selectedModels.length > 0
              ? "bg-primary-50 text-primary-600 border-primary-200"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 active:scale-95"
          }`}
        >
          {QA_TOOLBAR_ICONS.model} {modelLabel} ▾
        </button>
        {openMenu === "model" && (
          <div className="absolute bottom-full left-0 z-30 mb-2 w-80 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
            <div className="border-b border-gray-50 px-3 py-1.5 text-xs font-medium text-gray-400">选择数据范围</div>
            <div className="mt-1 max-h-64 space-y-0.5 overflow-auto">
              {renderCheckboxList(modelMenuItems, modelMenuSelected, handleModelMenuChange)}
            </div>
          </div>
        )}
      </div>
      {/* 选择知识库 */}
      <div className="relative" ref={(el) => { menuRefs.current.kb = el; }}>
        <button
          onClick={() => setOpenMenu(openMenu === "kb" ? null : "kb")}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-colors ${
            selectedKbs.length > 0
              ? "bg-blue-50 text-blue-600 border-blue-200"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 active:scale-95"
          }`}
        >
          {QA_TOOLBAR_ICONS.knowledge} {kbLabel} ▾
        </button>
        {openMenu === "kb" && (
          <div className="absolute bottom-full left-0 z-30 mb-2 w-80 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
            <div className="border-b border-gray-50 px-3 py-1.5 text-xs font-medium text-gray-400">选择业务知识库</div>
            <div className="mt-1 max-h-64 space-y-0.5 overflow-auto">
              {renderCheckboxList(
                knowledgeBases.map((k) => ({ id: k.id, name: k.name, subtitle: k.category })),
                selectedKbs,
                setSelectedKbs
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ========== 底部工具条：技能（下拉菜单在按钮下方弹出，无遮罩层） + 模型 ==========
  const ToolBar = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative" ref={(el) => { menuRefs.current.skill = el; }}>
        {selectedSkillTag ? (
          /* 已选技能：标签展示在「选择技能」按钮位置（技能名 + × 移除，主体不可点，与模板标签同构） */
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border bg-green-50 text-green-600 border-green-200"
            title={`已选技能：${selectedSkillTag.name}`}
          >
            {QA_TOOLBAR_ICONS.skill} {selectedSkillTag.name}
            <button
              onClick={() => setSelectedSkillTag(null)}
              className="ml-0.5 text-green-500 hover:text-green-700 font-bold leading-none"
              title="移除技能"
            >
              ×
            </button>
          </span>
        ) : (
          <button
            onClick={() => setOpenMenu(openMenu === "skill" ? null : "skill")}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border bg-white text-gray-500 border-gray-200 hover:border-gray-300 active:scale-95 transition-colors"
          >
            {QA_TOOLBAR_ICONS.skill} 选择技能
          </button>
        )}
        {openMenu === "skill" && (
          <div className="absolute left-0 bottom-full z-30 mb-2 w-80 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
            <div className="max-h-64 space-y-1 overflow-auto">
              {skillList.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">暂无可用技能</p>
              ) : (
                skillList.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => {
                      setSelectedSkillTag({ id: skill.id, name: skill.name });
                      setOpenMenu(null);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      selectedSkillTag?.id === skill.id
                        ? "border-green-400 bg-green-50"
                        : "border-gray-100 hover:border-gray-300 active:scale-[0.99]"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-800">{skill.name}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {/* 选择模板：位于选择技能与切换大模型之间；选中后展示模板名标签，可取消 */}
      {reportTemplate ? (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border bg-primary-50 text-primary-600 border-primary-200"
          title={`已选模板：${reportTemplate.name}`}
        >
          📋 {reportTemplate.name}
          <button
            onClick={() => setReportTemplate(null)}
            className="ml-0.5 text-primary-400 hover:text-primary-600 font-bold leading-none"
            title="取消模板"
          >
            ×
          </button>
        </span>
      ) : (
        <button
          onClick={() => setShowTemplateModal(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border bg-white text-gray-500 border-gray-200 hover:border-gray-300 active:scale-95 transition-colors"
          title="选择报告模板"
        >
          📋 选择模板
        </button>
      )}
      <button
        onClick={() => setShowModelSwitch(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border bg-white text-gray-500 border-gray-200 hover:border-gray-300 active:scale-95 transition-colors"
      >
        {QA_TOOLBAR_ICONS.modelSwitch} {currentModelName} ▾
      </button>
    </div>
  );

  // ========== 输入区域 ==========
  // 智能填表后台执行中：输入框发送按钮切换为停止态（点击停止填表任务）
  const fillGenerating = messages.some((m) => m.fillCard?.status === "generating");
  const InputArea = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {SelectorBar()}
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={fillSkillOn ? "请输入报表名称、统计周期、统计范围及填报要求" : reportSkillOn ? "请输入报告主题、统计范围及生成要求" : inputPlaceholder ?? "请输入您的问题，例如：今天产量是多少？"}
            disabled={loading}
            rows={6}
            className="w-full pl-4 pr-12 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 resize-none transition-all duration-200"
          />
          {/* 圆形发送按钮（输入框内右下角）：大纲/填表生成中变为停止按钮（点击停止任务），其余为发送 */}
          <button
            onClick={() => (outlineBusy ? stopOutlineGeneration() : fillGenerating ? stopFillGeneration() : sendMessage(input))}
            disabled={!outlineBusy && !fillGenerating && (loading || !input.trim())}
            className={`absolute right-2 bottom-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm ${
              outlineBusy || fillGenerating
                ? "bg-gray-700 text-white hover:bg-gray-800"
                : "bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
            title={outlineBusy || fillGenerating ? "停止生成" : "发送"}
          >
            {outlineBusy || fillGenerating ? (
              <span className="block w-2.5 h-2.5 bg-white rounded-[2px]" aria-hidden />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            )}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {ToolBar()}
        <span
          className={`text-xs ${
            input.length > MAX_CHARS * 0.9 ? "text-red-400" : "text-gray-400"
          }`}
        >
          {input.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  );

  // ========== 渲染 ==========
  return (
    <div className="flex flex-col h-full">
      {/* Toast 通知 */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      {/* 模型切换弹窗 */}
      <Modal
        open={showModelSwitch}
        onClose={() => setShowModelSwitch(false)}
        title="切换大模型"
      >
        <div className="space-y-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedModel(m.id);
                setShowModelSwitch(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selectedModel === m.id
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-100 hover:border-gray-300 active:scale-95"
              }`}
            >
              <div className="text-sm font-medium text-gray-800">{m.name}</div>
              <div className="text-xs text-gray-500">{m.desc}</div>
            </button>
          ))}
        </div>
      </Modal>

      {/* 选择模板弹窗 */}
      <TemplatePickerModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={(t) => {
          setReportTemplate(t);
          setShowTemplateModal(false);
        }}
      />

      {/* 报告抽屉（进度/报告内容/思考过程/导出/分享） */}
      <ReportDrawer
        open={reportDrawer.open}
        onClose={() => setReportDrawer({ open: false, msgId: null, autoExport: false })}
        data={messages.find((m) => m.id === reportDrawer.msgId)?.reportCard ?? null}
        reportId={reportDrawer.msgId ?? "report"}
        autoExport={reportDrawer.autoExport}
        onStop={stopReportGeneration}
        onRetry={() => reportDrawer.msgId && retryReportGeneration(reportDrawer.msgId)}
      />

      {/* 填表抽屉（流式填充/报表预览/执行过程/导出弹窗/分享） */}
      <FillDrawer
        open={fillDrawer.open}
        onClose={() => setFillDrawer({ open: false, msgId: null, exportSignal: 0 })}
        data={messages.find((m) => m.id === fillDrawer.msgId)?.fillCard ?? null}
        fillId={fillDrawer.msgId ?? "fill"}
        exportSignal={fillDrawer.exportSignal}
        onStop={stopFillGeneration}
        onRetry={() => fillDrawer.msgId && retryFillGeneration(fillDrawer.msgId)}
        onExport={(name) => fillDrawer.msgId && exportFill(fillDrawer.msgId, name)}
      />

      {/* ===== 内容区（唯一滚动区）：欢迎模式 / 消息列表 ===== */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className={`max-w-3xl mx-auto w-full px-4 ${compact ? "pt-6" : "pt-8"}`}>
          {isFresh ? (
            <>
              {/* 欢迎语 */}
              <div className="mb-6">
                {compact && welcomeText ? (
                  /* 自定义欢迎语：数字人头像 + 开场白 */
                  <div className="flex items-start gap-3">
                    <span className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-primary-100">
                      <AnalystAvatar />
                    </span>
                    <p className="pt-1 text-sm leading-relaxed text-gray-700">{welcomeText}</p>
                  </div>
                ) : compact ? (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">AI，让数据会说话</h2>
                    <p className="text-sm text-gray-500 leading-relaxed mt-2">
                      连接企业数据，智能分析业务，辅助科学决策。
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="flex items-baseline gap-1.5 text-3xl font-bold text-gray-900 tracking-tight">
                      <span className="text-5xl font-extrabold leading-none bg-gradient-to-r from-primary-600 to-blue-500 bg-clip-text text-transparent">
                        AI
                      </span>
                      <span>，让数据会说话</span>
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed mt-3">
                      连接企业数据，智能分析业务，辅助科学决策。
                    </p>
                  </>
                )}
              </div>

              {/* 推荐问题（页面级定制优先） */}
              <p className="text-sm font-medium text-gray-600 mb-3">推荐问题</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {(questions ?? RECOMMENDED_QUESTIONS).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-primary-50 hover:text-primary-600 active:scale-95 transition-all duration-200"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* 消息列表 */
            <div className="space-y-4 pb-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isFavorited={isFavorited(msg.id)}
                  onToggleFavorite={() => {
                    const idx = messages.findIndex((m) => m.id === msg.id);
                    let question = "";
                    for (let i = idx - 1; i >= 0; i--) {
                      if (messages[i].role === "user") { question = messages[i].content; break; }
                    }
                    toggleFavorite(msg, question);
                  }}
                  onFeedback={handleFeedback}
                  onFollowUpClick={(q) => sendMessage(q)}
                  onChartTypeChange={(t) => handleChartTypeChange(msg.id, t)}
                  onReportOutlineConfirm={handleOutlineConfirm}
                  onReportOutlineRegenerate={handleOutlineRegenerate}
                  onOpenReport={(id) => setReportDrawer({ open: true, msgId: id, autoExport: false })}
                  onDownloadReport={(id) => setReportDrawer({ open: true, msgId: id, autoExport: true })}
                  onShareReport={(id) => {
                    try { navigator.clipboard?.writeText(`https://shifang.example.com/r/${id}`); } catch { /* 剪贴板不可用时静默 */ }
                    showToast("链接已复制");
                  }}
                  onRetryReport={retryReportGeneration}
                  onOpenFill={(id) => setFillDrawer({ open: true, msgId: id, exportSignal: 0 })}
                  onDownloadFill={downloadFill}
                  onShareFill={shareFill}
                  onRetryFill={retryFillGeneration}
                />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Spinner size="sm" />
                      思考中...
                    </div>
                  </div>
                </div>
              )}
              {/* 大纲生成中：正在整理数据...（暂停走输入框右下角的停止按钮） */}
              {outlineBusy && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-lg flex items-center gap-2">
                    <span className="flex items-center gap-2 text-gray-500 text-sm">
                      <Spinner size="sm" />
                      正在整理数据...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== 底部固定输入区：不论是否发送，位置恒定 ===== */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 pt-3 pb-4">
        <div className="max-w-3xl mx-auto w-full">
          {InputArea()}
        </div>
      </div>
    </div>
  );
}
