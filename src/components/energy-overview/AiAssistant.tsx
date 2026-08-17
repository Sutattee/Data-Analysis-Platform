"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { ChatPanel } from "@/components/qa/ChatPanel";
import { AnalystAvatar } from "@/components/qa/AnalystAvatar";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { formatDate } from "@/lib/utils";

/**
 * 页面右下角 AI 助手：插画风格「大数据分析专家」悬浮球 → 右侧滑出智能问数窗口。
 * 对话窗口复用智能问数页 ChatPanel（数据模型/知识库/技能/大模型切换/多轮对话）。
 * 标题栏右侧提供「历史记录 / 收藏 / 新建会话」入口：
 * - 历史记录：查看全局历史提问，点击可继续对话（重挂 ChatPanel 自动发送）
 * - 收藏：滑出窗查看收藏的问答对，可展开全文 / 取消收藏
 * - 新建会话：清空当前对话重新开始
 */
// 能耗场景统一欢迎语（能耗总览 / 网格监控 / 预测总览三页共用）
const WELCOME_TEXT =
  "您好，我是智能问数助手。只需告诉我你的业务问题，我就能实时查数、生成图表，助你高效决策。";

// 标题栏小按钮样式
const headerBtnCls =
  "flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors";

export function AiAssistant() {
  const { state, toggleFavorite } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0); // 递增以重挂 ChatPanel（新建会话/继续历史）
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null); // 收藏卡片展开态

  // 新建会话：清空当前对话重新开始
  function handleNewSession() {
    setChatInitialQuery(undefined);
    setChatKey((k) => k + 1);
    setHistoryOpen(false);
    setFavoritesOpen(false);
    toast("已创建新会话", "success");
  }

  // 点击历史提问继续对话：关闭历史窗，重挂 ChatPanel 并自动发送该问题
  function handleContinueHistory(content: string) {
    setChatInitialQuery(content);
    setChatKey((k) => k + 1);
    setHistoryOpen(false);
  }

  // 历史提问列表（全局记录中的用户消息，新在前）
  const historyQuestions = state.history.filter((m) => m.role === "user");
  const favorites = state.favorites;

  return (
    <>
      {/* 右下角悬浮球 */}
      <button
        onClick={() => setOpen(true)}
        title="AI 助手"
        aria-label="打开 AI 助手"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-xl ring-4 ring-white/70 transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <AnalystAvatar />
      </button>

      {/* 智能问数侧滑窗：完整问数能力（compact 模式）+ 标题栏操作入口 */}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="智能问数助手"
        width={560}
        padding={false}
        headerExtra={
          <div className="flex items-center gap-0.5">
            <button
              className={headerBtnCls}
              onClick={() => {
                setFavoritesOpen(false);
                setHistoryOpen(true);
              }}
            >
              🕐 历史记录
            </button>
            <button
              className={headerBtnCls}
              onClick={() => {
                setHistoryOpen(false);
                setFavoritesOpen(true);
              }}
            >
              ⭐ 收藏
            </button>
            <button className={headerBtnCls} onClick={handleNewSession}>
              ✚ 新建会话
            </button>
          </div>
        }
      >
        <div className="flex h-full flex-col">
          <ChatPanel key={chatKey} compact welcomeText={WELCOME_TEXT} initialQuery={chatInitialQuery} />
        </div>
      </Drawer>

      {/* 历史问数记录滑出窗（覆盖在助手窗之上） */}
      <Drawer
        open={open && historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="历史问数记录"
        width={400}
        footer={
          <div className="flex justify-end">
            <button
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setHistoryOpen(false)}
            >
              关闭
            </button>
          </div>
        }
      >
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
      </Drawer>

      {/* 收藏滑出窗：查看收藏的问题和回答 */}
      <Drawer
        open={open && favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        title="我的收藏"
        width={480}
        footer={
          <div className="flex justify-end">
            <button
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setFavoritesOpen(false)}
            >
              关闭
            </button>
          </div>
        }
      >
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
                      {/* 查看：每个收藏卡片均可展开/收起全文 */}
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
      </Drawer>
    </>
  );
}
