"use client";

import { useState, useRef, useEffect } from "react";
import { QaMessage } from "@/types";
import { mockStreamResponse } from "@/lib/ai/mock-ai";
import { generateId } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

const QUICK_QUESTIONS = [
  "今日产量多少？",
  "综合能耗情况如何？",
  "各产线OEE效率？",
  "良品率怎么样？",
];

export function DashboardAssistant() {
  const [messages, setMessages] = useState<QaMessage[]>([
    {
      id: "welcome-d",
      role: "assistant",
      content: "👋 您好！我是仪表盘AI助手，可以帮您快速了解当前生产状况。请点击下方快捷问题或直接输入您的疑问。",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: QaMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantId = generateId();
    const assistantMsg: QaMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    const stream = mockStreamResponse(text);
    let content = "";
    for await (const chunk of stream) {
      content += chunk;
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content } : m))
      );
    }

    setStreaming(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="flex items-center gap-2 px-1 py-2 border-b border-gray-100 flex-shrink-0">
        <span className="text-base">🤖</span>
        <span className="font-semibold text-gray-800 text-sm">仪表盘助手</span>
      </div>

      {/* 消息区域 — 占满剩余空间 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto space-y-3 py-3 min-h-0"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.content ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <Spinner size="sm" />
                  <span className="text-xs">思考中...</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 快捷问题 */}
      <div className="flex flex-wrap gap-1.5 mb-2 flex-shrink-0">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            disabled={streaming}
            className="px-2.5 py-1 text-xs bg-primary-50 text-primary-600 rounded-full hover:bg-primary-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 输入框 — 固定在底部 */}
      <div className="flex gap-2 flex-shrink-0 pt-2 border-t border-gray-100">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="输入问题..."
          disabled={streaming}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-all duration-200"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={streaming || !input.trim()}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 active:scale-95 active:bg-primary-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          发送
        </button>
      </div>
    </div>
  );
}
