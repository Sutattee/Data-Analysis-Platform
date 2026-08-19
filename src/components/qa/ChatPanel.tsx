"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { QaMessage, VisitBoard } from "@/types";
import { mockAiResponse, getWelcomeMessage } from "@/lib/ai/mock-ai";
import { generateId } from "@/lib/utils";
import { useApp } from "@/lib/store/AppContext";
import { dataModels } from "@/lib/mock-data/data-assets";
import { mockKnowledgeDocs, mockAiSkills } from "@/lib/mock-data/settings";
import { MessageBubble } from "./MessageBubble";
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
  .filter((s) => s.enabled && s.name !== "异常检测" && s.name !== "报告生成")
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
export function ChatPanel({
  initialQuery,
  compact = false,
  welcomeText,
  suppressHistory = false,
}: {
  initialQuery?: string;
  compact?: boolean;
  welcomeText?: string;
  suppressHistory?: boolean;
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

  // ----- 弹窗 -----
  const [showModelModal, setShowModelModal] = useState(false);
  const [showKbModal, setShowKbModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showModelSwitch, setShowModelSwitch] = useState(false);

  // ----- Toast -----
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);


  const isFresh = messages.length === 1 && messages[0].id === "welcome";
  const MAX_CHARS = 500;

  // ----- 滚动 -----
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg: QaMessage = { id: generateId(), role: "user", content: text, timestamp: Date.now() };
      // 进入对话后移除欢迎语气泡
      setMessages((prev) => [...prev.filter((m) => m.id !== "welcome"), userMsg]);
      setInput("");
      setLoading(true);
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
    [loading, addHistory, suppressHistory, addRecentVisit, state.user]
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

  // ----- 技能搜索 -----
  const [skillSearch, setSkillSearch] = useState("");
  const filteredSkills = skillSearch
    ? skillList.filter(
        (s) =>
          s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
          s.description.toLowerCase().includes(skillSearch.toLowerCase())
      )
    : skillList;

  // ========== 选择弹窗渲染 ==========
  const renderCheckboxModal = (
    open: boolean,
    onClose: () => void,
    title: string,
    items: { id: string; name: string; subtitle?: string }[],
    selected: string[],
    setSelected: (ids: string[]) => void,
    selectAllLabel = "全部"
  ) => {
    const allSelected = selected.length === items.length;
    return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-2 max-h-80 overflow-auto">
        <label
          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer"
        >
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
            <div>
              <div className="text-sm text-gray-800">{item.name}</div>
              {item.subtitle && <div className="text-xs text-gray-400">{item.subtitle}</div>}
            </div>
          </label>
        ))}
      </div>
    </Modal>
    );
  };

  // ========== 选择器条 ==========
  const SelectorBar = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => setShowModelModal(true)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-colors ${
          selectedModels.length > 0
            ? "bg-primary-50 text-primary-600 border-primary-200"
            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 active:scale-95"
        }`}
      >
        {QA_TOOLBAR_ICONS.model} {modelLabel} ▾
      </button>
      <button
        onClick={() => setShowKbModal(true)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-colors ${
          selectedKbs.length > 0
            ? "bg-blue-50 text-blue-600 border-blue-200"
            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 active:scale-95"
        }`}
      >
        {QA_TOOLBAR_ICONS.knowledge} {kbLabel} ▾
      </button>
    </div>
  );

  // ========== 底部工具条：技能 + 模型 ==========
  const ToolBar = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => { setShowSkillModal(true); setSkillSearch(""); }}
        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-colors ${
          selectedSkillTag
            ? "bg-green-50 text-green-600 border-green-200"
            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 active:scale-95"
        }`}
      >
        {QA_TOOLBAR_ICONS.skill} {selectedSkillTag ? "技能" : "选择技能"}
      </button>
      <button
        onClick={() => setShowModelSwitch(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border bg-white text-gray-500 border-gray-200 hover:border-gray-300 active:scale-95 transition-colors"
      >
        {QA_TOOLBAR_ICONS.modelSwitch} {currentModelName} ▾
      </button>
    </div>
  );

  // ========== 输入区域 ==========
  const InputArea = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SelectorBar />
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
            placeholder="请输入您的问题，例如：今天产量是多少？"
            disabled={loading}
            rows={6}
            className="w-full pl-4 pr-12 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 resize-none transition-all duration-200"
            style={selectedSkillTag ? { paddingLeft: "100px" } : undefined}
          />
          {/* 技能标签放在输入框内部左上角（与首行文字对齐） */}
          {selectedSkillTag && (
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full">
              {QA_TOOLBAR_ICONS.skill} {selectedSkillTag.name}
              <button
                onClick={() => setSelectedSkillTag(null)}
                className="ml-0.5 text-green-500 hover:text-green-700 font-bold leading-none"
                title="移除技能"
              >
                ×
              </button>
            </div>
          )}
          {/* 圆形发送按钮（输入框内右下角） */}
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="absolute right-2 bottom-2 w-9 h-9 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            title="发送"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <ToolBar />
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

      {/* 弹窗 */}
      {renderCheckboxModal(
        showModelModal,
        () => setShowModelModal(false),
        "选择数据范围",
        [
          { id: "__demo_preset__", name: "卷烟厂案例数据", subtitle: "Demo 案例数据（含卷接工单/包装工单/制丝批次3张表）" },
          ...allTables.map((t) => ({ id: t.id, name: t.name, subtitle: t.domain })),
        ],
        [...selectedModels, ...(selectedModels.some((m) => demoTables.every((d) => selectedModels.includes(d))) ? ["__demo_preset__"] : [])],
        (ids) => {
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
        },
        "全部"
      )}
      {renderCheckboxModal(
        showKbModal,
        () => setShowKbModal(false),
        "选择业务知识库",
        knowledgeBases.map((k) => ({ id: k.id, name: k.name, subtitle: k.category })),
        selectedKbs,
        setSelectedKbs,
        "全部"
      )}

      {/* 技能弹窗：单选 + 搜索 */}
      <Modal open={showSkillModal} onClose={() => setShowSkillModal(false)} title="选择AI技能" size="md">
        <div className="space-y-3">
          {/* 搜索 */}
          <input
            type="text"
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            placeholder="搜索技能关键词..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="space-y-1 max-h-72 overflow-auto">
            {filteredSkills.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">无匹配技能</p>
            ) : (
              filteredSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => {
                    setSelectedSkillTag({ id: skill.id, name: skill.name });
                    setShowSkillModal(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    selectedSkillTag?.id === skill.id
                      ? "border-green-400 bg-green-50"
                      : "border-gray-100 hover:border-gray-300 active:scale-[0.99]"
                  }`}
                >
                  <div className="text-sm font-medium text-gray-800">{skill.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{skill.description}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

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

              {/* 推荐问题 */}
              <p className="text-sm font-medium text-gray-600 mb-3">推荐问题</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {RECOMMENDED_QUESTIONS.map((q) => (
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
            </div>
          )}
        </div>
      </div>

      {/* ===== 底部固定输入区：不论是否发送，位置恒定 ===== */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 pt-3 pb-4">
        <div className="max-w-3xl mx-auto w-full">
          <InputArea />
        </div>
      </div>
    </div>
  );
}
