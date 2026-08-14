"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { ChatPanel } from "@/components/qa/ChatPanel";
import { AnalystAvatar } from "@/components/qa/AnalystAvatar";

/**
 * 页面右下角 AI 助手：插画风格「大数据分析专家」悬浮球 → 右侧滑出智能问数窗口。
 * 对话窗口复用智能问数页 ChatPanel（数据模型/知识库/技能/大模型切换/多轮对话）。
 */
export function AiAssistant() {
  const [open, setOpen] = useState(false);

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

      {/* 智能问数侧滑窗：完整问数能力（compact 模式） */}
      <Drawer open={open} onClose={() => setOpen(false)} title="智能问数助手" width={560} padding={false}>
        <div className="flex h-full flex-col">
          <ChatPanel compact />
        </div>
      </Drawer>
    </>
  );
}
