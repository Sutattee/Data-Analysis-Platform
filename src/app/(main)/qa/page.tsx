"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatPanel } from "@/components/qa/ChatPanel";
import { QaSidebar } from "@/components/qa/QaSidebar";
import { historySessions, HistorySession } from "@/lib/mock-data/history";

function nowClock() {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function QaPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") || undefined;

  const [sessions, setSessions] = useState<HistorySession[]>(() =>
    JSON.parse(JSON.stringify(historySessions))
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(historySessions[0]?.id ?? null);
  const [chatKey, setChatKey] = useState(0); // 递增以重置 ChatPanel（新建/继续）
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(initialQuery);
  const [railCollapsed, setRailCollapsed] = useState(false);

  // 新建会话：清空当前对话、生成新会话、进入空白态
  function handleNewSession() {
    const id = "s-" + Date.now().toString(36);
    const s: HistorySession = {
      id, topic: "新会话", turnCount: 0, daysAgo: 0, clock: nowClock(), tables: [], lastQuery: "", favorited: false,
    };
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(id);
    setChatInitialQuery(undefined);
    setChatKey((k) => k + 1);
  }

  // 继续讨论：加载该会话（模拟：重挂载 ChatPanel + 自动发末轮提问）
  function handleContinue(s: HistorySession) {
    setActiveSessionId(s.id);
    setChatInitialQuery(s.lastQuery || undefined);
    setChatKey((k) => k + 1);
  }

  return (
    <div className="relative flex gap-3 h-[calc(100vh-80px)]">
      {!railCollapsed && (
        <QaSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onToggleCollapse={() => setRailCollapsed(true)}
          onNewSession={handleNewSession}
          onContinue={handleContinue}
          onRename={(id, topic) => setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, topic } : s)))}
          onDelete={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
          onToggleFavorite={(id) =>
            setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, favorited: !s.favorited } : s)))
          }
          onBatchDelete={(ids) => setSessions((prev) => prev.filter((s) => !ids.includes(s.id)))}
        />
      )}

      <div className="flex-1 min-w-0">
        <ChatPanel key={chatKey} initialQuery={chatInitialQuery} />
      </div>

      {/* 折叠后：展开按钮固定在左上角（与折叠按钮同位置） */}
      {railCollapsed && (
        <button
          onClick={() => setRailCollapsed(false)}
          className="absolute top-2 left-2 z-10 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-primary-600 transition-colors"
          title="展开"
        >
          🗂️
        </button>
      )}
    </div>
  );
}
