"use client";

// 异常原因 AI 辅助面板：右侧滑出对话面板（覆盖在异常详情抽屉之上）
// 自动关联当前异常上下文；多轮对话持续补充信息、修正分析方向；
// 分析结论支持「采纳并回填」至异常原因输入框；关闭面板不自动修改异常原因。
// 会话按「用户 + 异常记录」隔离持久化，不纳入智能问数历史记录。
import { useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Spinner } from "@/components/ui/Spinner";
import { useApp } from "@/lib/store/AppContext";
import {
  anomalyKeyOf,
  contextSummaryOf,
  generateAnomalyReply,
  loadChat,
  saveChat,
  type AnomalyAiMessage,
} from "@/lib/mock-data/anomaly-ai";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import { AnalystAvatar } from "@/components/qa/AnalystAvatar";

const GUIDE_TEXT =
  "请补充您掌握的异常现象、设备状态、操作变化或相关事件，我将结合当前异常信息分析并总结可能原因。";

function formatNowClock(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AnomalyAiPanel({
  open,
  onClose,
  detail,
  onAdopt, // 采纳并回填：将分析结论填入异常原因输入框
}: {
  open: boolean;
  onClose: () => void;
  detail: AnomalyDetail | null;
  onAdopt: (causeText: string) => void;
}) {
  const { state } = useApp();
  const userKey = state.user?.username ?? "anonymous";
  const [messages, setMessages] = useState<AnomalyAiMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const seqRef = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const anomalyKey = detail ? anomalyKeyOf(detail) : "";

  // 打开面板：恢复该「用户 + 异常记录」的历史对话；无历史时保持为空（不自动生成初步分析）
  useEffect(() => {
    if (!open || !detail) return;
    setMessages(loadChat(userKey, anomalyKey));
    setInput("");
    setThinking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anomalyKey]);

  // 清空当前异常记录的历史对话（清空后保持空白，等待用户补充信息）
  function handleClear() {
    setMessages([]);
    saveChat(userKey, anomalyKey, []);
    setInput("");
  }

  // 新消息后滚动到底部
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, thinking]);

  function handleSend() {
    if (!detail || !input.trim() || thinking) return;
    const userMsg: AnomalyAiMessage = {
      id: `m-${seqRef.current++}`,
      role: "user",
      content: input.trim(),
      time: formatNowClock(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setThinking(true);
    // 模拟 Agent 调用归因分析 Skill 的分析耗时
    setTimeout(() => {
      const reply = generateAnomalyReply(detail, userMsg.content, next);
      const aiMsg: AnomalyAiMessage = {
        id: `m-${seqRef.current++}`,
        role: "ai",
        content: reply.content,
        time: formatNowClock(),
        adoptable: reply.adoptable,
        causeText: reply.causeText,
      };
      const final = [...next, aiMsg];
      setMessages(final);
      saveChat(userKey, anomalyKey, final);
      setThinking(false);
    }, 900);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="AI辅助原因分析"
      width={440}
      padding={false}
    >
      {detail && (
        <div className="flex h-full flex-col">
          {/* AI 头像 + 引导语 + 异常上下文（自动关联） */}
          <div className="flex-shrink-0 border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-primary-100">
                <AnalystAvatar />
              </div>
              <p className="flex-1 text-xs leading-relaxed text-gray-600">{GUIDE_TEXT}</p>
            </div>
            <div className="mt-3 flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-gray-400">已关联当前异常信息</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                  {contextSummaryOf(detail)}
                </p>
              </div>
              {/* 清空当前异常记录的历史对话 */}
              <button
                onClick={handleClear}
                className="flex-shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-500 transition-colors hover:text-red-500 hover:border-red-200"
                title="清空该异常记录的历史对话"
              >
                🗑 清空对话
              </button>
            </div>
          </div>

          {/* 对话消息列表 */}
          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && !thinking && (
              <p className="py-8 text-center text-xs text-gray-300">
                暂无对话记录，请补充异常现象、设备状态、操作变化或相关事件
              </p>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-primary-600 px-3 py-2 text-sm text-white">
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className="mt-0.5 text-right text-[10px] text-primary-100">{m.time}</p>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[90%] rounded-lg rounded-tl-sm border border-gray-100 bg-white px-3 py-2 shadow-sm">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
                      {m.content}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-gray-300">{m.time}</span>
                      {m.adoptable && m.causeText && (
                        <button
                          onClick={() => onAdopt(m.causeText ?? m.content)}
                          className="rounded-md border border-primary-200 px-2 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                        >
                          采纳并回填
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
            {thinking && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Spinner />
                <span>正在结合异常上下文与归因知识分析原因…</span>
              </div>
            )}
          </div>

          {/* 底部输入区 */}
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend();
                }}
                placeholder="补充异常现象、设备状态、操作变化…"
                disabled={thinking}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || thinking}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                发送
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
              仅用于当前异常记录的原因分析；分析结果经「采纳并回填」填入异常原因后，仍需在异常详情页保存才正式生效。
            </p>
          </div>
        </div>
      )}
    </Drawer>
  );
}
