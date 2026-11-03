"use client";

// 驾驶舱 AI 助手：右下角悬浮按钮 + 右侧滑出深色壳对话窗（浅色对话面复用 ChatPanel）。
// 受控组件：open/onOpen/onClose 由 CockpitView 管理，与「智能解读」滑出面板互斥展开。
// 会话管理照 energy-overview/AiAssistant.tsx：首次打开后面板常驻挂载（收起不销毁会话）、
// chatKey 重挂（新建会话/继续历史）、面板内历史记录/收藏覆盖视图；Escape 收起面板。
import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { ChatPanel } from "@/components/qa/ChatPanel";
import { useApp } from "@/lib/store/AppContext";
import { formatDate } from "@/lib/utils";
import { COCKPIT_AI_QUESTIONS } from "@/lib/mock-data/cockpit";

// 驾驶舱场景欢迎语（深色壳 + 浅色对话面）
const WELCOME_TEXT =
  "您好，我是管理驾驶舱AI助手。可直接询问本月全厂产质耗KPI、重点异常与预算执行情况。";

export function CockpitAssistant({
  open,
  onOpen,
  onClose,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { state, toggleFavorite } = useApp();
  const [everOpened, setEverOpened] = useState(false); // 首次打开后面板常驻挂载（收起不销毁会话）
  const [chatKey, setChatKey] = useState(0); // 递增以重挂 ChatPanel（新建会话/继续历史）
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null); // 收藏卡片展开态

  // Escape 收起面板（不销毁会话）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleOpen() {
    setEverOpened(true);
    onOpen();
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

  const historyQuestions = state.history.filter((m) => m.role === "user");
  const favorites = state.favorites;
  const chatHidden = historyOpen || favoritesOpen;

  return (
    <>
      {/* 右下角悬浮按钮（最右位，智能解读按钮在其左侧） */}
      <button
        type="button"
        className="insight-trigger"
        aria-expanded={open}
        aria-controls="cockpit-assistant"
        onClick={handleOpen}
      >
        <Bot size={18} aria-hidden /> AI 助手
      </button>

      {everOpened && (
        <aside
          id="cockpit-assistant"
          className="assistant-panel"
          aria-label="驾驶舱AI助手"
          hidden={!open}
        >
          {/* 深色标题栏：标题 + 历史/收藏/新建会话 + 收起 */}
          <div className="assistant-head">
            <h3 onClick={handleBackToChat} style={{ cursor: "pointer" }} title="返回对话">
              智能问数助手
            </h3>
            <button
              type="button"
              className="assistant-btn"
              aria-pressed={historyOpen}
              onClick={() => {
                setFavoritesOpen(false);
                setHistoryOpen((v) => !v);
              }}
            >
              历史记录
            </button>
            <button
              type="button"
              className="assistant-btn"
              aria-pressed={favoritesOpen}
              onClick={() => {
                setHistoryOpen(false);
                setFavoritesOpen((v) => !v);
              }}
            >
              收藏
            </button>
            <button type="button" className="assistant-btn" onClick={handleNewSession}>
              新建会话
            </button>
            <button type="button" className="assistant-close" onClick={onClose} aria-label="收起面板">
              ×
            </button>
          </div>

          {/* 浅色对话面：对话（常驻挂载保留会话）+ 历史/收藏覆盖视图 */}
          <div className="assistant-body">
            <div className={chatHidden ? "hidden" : "flex h-full flex-col"}>
              <ChatPanel
                key={chatKey}
                compact
                welcomeText={WELCOME_TEXT}
                initialQuery={chatInitialQuery}
                questions={COCKPIT_AI_QUESTIONS}
                inputPlaceholder="问一句本月全厂KPI"
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
                        const expanded = expandedId === msg.id;
                        return (
                          <div key={msg.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
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
                            <div
                              className={"cursor-pointer " + (expanded ? "" : "line-clamp-4")}
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
    </>
  );
}
