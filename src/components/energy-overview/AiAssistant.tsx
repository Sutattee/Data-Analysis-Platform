"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/qa/ChatPanel";
import { AnalystAvatar } from "@/components/qa/AnalystAvatar";
import { useApp } from "@/lib/store/AppContext";
import { formatDate } from "@/lib/utils";

/**
 * 页面级 AI 助手（右侧推出式面板，非模态）：
 * - 右下角悬浮球点击后，对话窗口从页面右侧推出，无遮罩层；
 * - 左侧仪表盘自适应收窄（flex 布局 + 图表 ResponsiveContainer 自动重排）；
 * - 对话期间左侧仪表盘仍可正常操作、滚动（面板 sticky 固定在视口右侧）；
 * - 面板首次打开后保持挂载，收起再展开不丢失当前会话；
 * - 「历史记录 / 收藏」为面板内覆盖视图（不再是模态滑出窗），点击左上角标题即可返回对话。
 * 对话窗口复用智能问数页 ChatPanel（数据模型/知识库/技能/大模型切换/多轮对话）。
 */
// 能耗场景统一欢迎语（能耗总览 / 网格监控 / 预测总览三页共用）
const WELCOME_TEXT =
  "您好，我是智能问数助手。只需告诉我你的业务问题，我就能实时查数、生成图表，助你高效决策。";

// 标题栏小按钮样式（active 用于历史记录/收藏打开态）
const headerBtnCls = (active?: boolean) =>
  `flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs transition-colors ${
    active ? "bg-primary-50 font-medium text-primary-600" : "text-gray-500 hover:bg-primary-50 hover:text-primary-600"
  }`;

// questions / inputPlaceholder / welcomeText：页面级定制推荐问题、输入框提示与欢迎语（透传 ChatPanel）；
// insightCommand：传入门牌「✦ 智能解读」按钮（面板头部高亮入口，点击以新会话自动发送该指令）
export function AiAssistant({
  children,
  questions,
  inputPlaceholder,
  welcomeText,
  insightCommand,
}: {
  children: React.ReactNode;
  questions?: string[];
  inputPlaceholder?: string;
  welcomeText?: string;
  insightCommand?: string;
}) {
  const { state, toggleFavorite } = useApp();
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false); // 首次打开后面板常驻挂载（收起不销毁会话）
  const [chatKey, setChatKey] = useState(0); // 递增以重挂 ChatPanel（新建会话/继续历史）
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null); // 收藏卡片展开态

  function handleOpen() {
    setOpen(true);
    setEverOpened(true);
  }

  // 新建会话：清空当前对话重新开始
  function handleNewSession() {
    setChatInitialQuery(undefined);
    setChatKey((k) => k + 1);
    setHistoryOpen(false);
    setFavoritesOpen(false);
  }

  // 点击标题返回对话（收起历史记录 / 收藏视图）
  function handleBackToChat() {
    setHistoryOpen(false);
    setFavoritesOpen(false);
  }

  // 点击历史提问继续对话：返回对话视图，重挂 ChatPanel 并自动发送该问题
  function handleContinueHistory(content: string) {
    setChatInitialQuery(content);
    setChatKey((k) => k + 1);
    setHistoryOpen(false);
  }

  // 历史提问列表（全局记录中的用户消息，新在前）
  const historyQuestions = state.history.filter((m) => m.role === "user");
  const favorites = state.favorites;
  const chatHidden = historyOpen || favoritesOpen;

  return (
    <div className="flex items-start gap-4">
      {/* ===== 左侧仪表盘内容（面板打开时自适应收窄） ===== */}
      <div className="min-w-0 flex-1">{children}</div>

      {/* 右下角悬浮球（面板打开时隐藏） */}
      {!open && (
        <button
          onClick={handleOpen}
          title="AI 助手"
          aria-label="打开 AI 助手"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-xl ring-4 ring-white/70 transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <AnalystAvatar />
        </button>
      )}

      {/* ===== 右侧对话面板：sticky 撑满内容区高度，无遮罩无卡片，仅以左侧分界线（带左投影）分割，左侧可继续操作 ===== */}
      {everOpened && (
        <aside
          aria-label="智能问数助手"
          className={`sticky top-0 -mt-4 w-[26rem] shrink-0 flex-col border-l border-gray-200 bg-white shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.08)] md:-mt-6 ${
            open ? "flex h-[calc(100vh-3.5rem)]" : "hidden"
          }`}
        >
          {/* 标题栏：标题 + 智能解读（可选）+ 历史记录/收藏/新建会话 + 收起 */}
          <div className="flex flex-shrink-0 items-center justify-between gap-1 border-b border-gray-100 py-2.5 pl-4 pr-2">
            {/* 点击标题返回对话（收起历史记录 / 收藏视图） */}
            <h3
              onClick={handleBackToChat}
              className="shrink-0 cursor-pointer text-sm font-semibold text-gray-800 transition-colors hover:text-primary-600"
              title="返回对话"
            >
              智能问数助手
            </h3>
            <div className="flex items-center gap-0.5">
              {insightCommand && (
                <button
                  type="button"
                  onClick={() => handleContinueHistory(insightCommand)}
                  className="mr-1 flex h-8 shrink-0 items-center gap-1 rounded-lg bg-primary-50 px-2.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-100"
                  title="自动发送指令，一键生成本页解读报告"
                >
                  ✦ 智能解读
                </button>
              )}
              <button
                className={headerBtnCls(historyOpen)}
                onClick={() => {
                  setFavoritesOpen(false);
                  setHistoryOpen((v) => !v);
                }}
              >
                🕐 历史记录
              </button>
              <button
                className={headerBtnCls(favoritesOpen)}
                onClick={() => {
                  setHistoryOpen(false);
                  setFavoritesOpen((v) => !v);
                }}
              >
                ⭐ 收藏
              </button>
              <button className={headerBtnCls(false)} onClick={handleNewSession}>
                ✚ 新建会话
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="收起面板"
              title="收起面板"
            >
              ✕
            </button>
          </div>

          {/* 内容区：对话（常驻挂载保留会话）+ 历史/收藏覆盖视图 */}
          <div className="relative min-h-0 flex-1">
            <div className={chatHidden ? "hidden" : "flex h-full flex-col"}>
              <ChatPanel
                key={chatKey}
                compact
                welcomeText={welcomeText ?? WELCOME_TEXT}
                initialQuery={chatInitialQuery}
                questions={questions}
                inputPlaceholder={inputPlaceholder}
              />
            </div>

            {/* 历史问数记录（面板内视图，点击提问可继续对话） */}
            {historyOpen && (
              <div className="absolute inset-0 flex flex-col bg-white">
                <div className="flex-1 overflow-auto p-4">
                  {historyQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <span className="mb-3 text-4xl">🕐</span>
                      <p className="text-sm">暂无历史记录</p>
                      <p className="mt-1 text-xs">开始提问后，历史问题会显示在这里</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">点击任意提问可继续对话（共 {historyQuestions.length} 条）</p>
                      {historyQuestions.map((msg) => (
                        <button
                          key={msg.id}
                          onClick={() => handleContinueHistory(msg.content)}
                          className="block w-full rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-left transition-colors hover:border-primary-200 hover:bg-primary-50/50"
                        >
                          <p className="text-xs text-gray-400">{formatDate(msg.timestamp)}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-800">{msg.content}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 我的收藏（面板内视图：问答对卡片，可展开/取消收藏） */}
            {favoritesOpen && (
              <div className="absolute inset-0 flex flex-col bg-white">
                <div className="flex-1 overflow-auto p-4">
                  {favorites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <span className="mb-3 text-4xl">⭐</span>
                      <p className="text-sm">暂无收藏内容</p>
                      <p className="mt-1 text-xs">在对话中点击「收藏」按钮即可添加到此处</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {favorites.map((msg) => {
                        // 所有卡片默认截断展示，点击「查看」展开全文
                        const expanded = expandedId === msg.id;
                        return (
                          <div
                            key={msg.id}
                            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs text-gray-400">{formatDate(msg.timestamp)}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                                  className="rounded border border-gray-200 px-2 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                                >
                                  {expanded ? "收起" : "查看"}
                                </button>
                                <button
                                  onClick={() => {
                                    toggleFavorite(msg);
                                    if (expandedId === msg.id) setExpandedId(null);
                                  }}
                                  className="text-xs text-yellow-500 hover:text-yellow-600"
                                >
                                  ⭐ 取消收藏
                                </button>
                              </div>
                            </div>
                            {/* 问题 + 回答：点击「查看」统一展开全文；未展开时整体截断 4 行 */}
                            <div
                              className={
                                "cursor-pointer " +
                                (expanded ? "" : "line-clamp-4")
                              }
                              onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                              title={expanded ? "点击收起" : "点击展开全文"}
                            >
                              {msg.question && (
                                <div className="mb-2 border-b border-gray-50 pb-2 text-sm text-gray-800">
                                  <span className="text-gray-400">问题：</span>
                                  {msg.question}
                                </div>
                              )}
                              <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
