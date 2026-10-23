"use client";

import { useRouter } from "next/navigation";
import { FileText, MessagesSquare, SlidersHorizontal } from "lucide-react";
import { WORKBENCH_RECOMMENDS } from "@/lib/mock-data/quality-workbench";

const ICONS = {
  sliders: SlidersHorizontal,
  messages: MessagesSquare,
  file: FileText,
} as const;

// 推荐开展：三个整行能力入口（不计待办、不显示完成状态，PRD §6.7）
export function RecommendPanel() {
  const router = useRouter();

  return (
    <section id="qw-recommendations" className="qw-panel" aria-labelledby="qw-recommendations-title">
      <div className="qw-panel-head">
        <div className="qw-panel-title">
          <div className="qw-title-left">
            <h2 id="qw-recommendations-title">推荐开展</h2>
          </div>
          <span className="qw-small">按需发起</span>
        </div>
      </div>
      <div className="qw-recommend-list">
        {WORKBENCH_RECOMMENDS.map((r) => {
          const Icon = ICONS[r.icon];
          return (
            <button key={r.title} className="qw-recommend" onClick={() => router.push(r.href)}>
              <span className="qw-recommend-icon">
                <Icon size={16} aria-hidden="true" />
              </span>
              <span>
                <span className="qw-recommend-name">{r.title}</span>
                <span className="qw-recommend-desc">{r.desc}</span>
              </span>
              <span className="qw-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
