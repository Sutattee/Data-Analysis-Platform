"use client";

// 智能解读：右下角悬浮按钮 + 右侧滑出 AI 面板（与 AI 助手同壳、互斥展开，由 CockpitView 控制 open）。
// 每次打开/点「重新生成」都以新会话自动发送「驾驶舱智能解读」指令，Agent 立即执行：
// 思考中 → 可展开的执行过程 → 输出全厂KPI解读报告（报告文案见 mock-data/cockpit.ts）
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { ChatPanel } from "@/components/qa/ChatPanel";
import { COCKPIT_INSIGHT_COMMAND } from "@/lib/mock-data/cockpit";

export function InsightLayer({
  open,
  onOpen,
  onClose,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [everOpened, setEverOpened] = useState(false); // 首次打开后面板常驻挂载（收起不销毁）
  const [runKey, setRunKey] = useState(0); // 递增以重挂 ChatPanel（每次打开/重新生成即重新执行）

  // Escape 收起面板（不销毁会话）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleTrigger() {
    if (open) {
      onClose();
      return;
    }
    setEverOpened(true);
    setRunKey((k) => k + 1); // 新会话自动发送解读指令并执行
    onOpen();
  }

  return (
    <>
      {/* 右下角悬浮按钮（左位，AI 助手按钮在其右侧） */}
      <button
        type="button"
        className="insight-trigger secondary"
        aria-expanded={open}
        aria-controls="cockpit-insight"
        onClick={handleTrigger}
      >
        <Sparkles size={18} aria-hidden /> 智能解读
      </button>

      {everOpened && (
        <aside
          id="cockpit-insight"
          className="assistant-panel"
          aria-label="驾驶舱智能解读"
          hidden={!open}
        >
          <div className="assistant-head">
            <h3>智能解读</h3>
            <button type="button" className="assistant-btn" onClick={() => setRunKey((k) => k + 1)}>
              重新生成
            </button>
            <button type="button" className="assistant-close" onClick={onClose} aria-label="收起面板">
              ×
            </button>
          </div>
          {/* 浅色对话面：suppressHistory——自动指令与追问不计入业务问数历史 */}
          <div className="assistant-body">
            <ChatPanel
              key={runKey}
              compact
              suppressHistory
              initialQuery={COCKPIT_INSIGHT_COMMAND}
              inputPlaceholder="继续追问驾驶舱数据"
            />
          </div>
        </aside>
      )}
    </>
  );
}
