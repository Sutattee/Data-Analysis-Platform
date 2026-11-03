"use client";

// 智能解读悬浮按钮 + 浮层（480px 非模态，Escape 关闭后焦点回按钮，行为照素材 components.html）
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { COCKPIT_INSIGHT } from "@/lib/mock-data/cockpit";

export function InsightLayer() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Escape 关闭浮层并让焦点回到按钮（键盘可达）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="insight-trigger secondary"
        aria-expanded={open}
        aria-controls="cockpit-insight"
        onClick={() => setOpen((v) => !v)}
      >
        <Sparkles size={18} aria-hidden /> 智能解读
      </button>
      <section
        id="cockpit-insight"
        className="insight-panel"
        role="dialog"
        aria-labelledby="cockpit-insight-title"
        aria-modal={false}
        hidden={!open}
      >
        <div className="insight-heading">
          <h3 id="cockpit-insight-title">智能解读</h3>
          <button
            type="button"
            className="insight-close"
            aria-label="关闭智能解读"
            onClick={() => {
              setOpen(false);
              btnRef.current?.focus();
            }}
          >
            ×
          </button>
        </div>
        <div className="insight-copy">
          {COCKPIT_INSIGHT.map((text, i) => (
            <p key={i} style={i > 0 ? { marginTop: 10 } : undefined}>
              {text}
            </p>
          ))}
        </div>
      </section>
    </>
  );
}
