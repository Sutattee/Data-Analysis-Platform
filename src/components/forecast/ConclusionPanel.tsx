"use client";

import type { ConclusionSection } from "@/lib/mock-data/forecast";

// 结构化分析结论：三段式（预测结论 / 预测逻辑 / 策略建议）
export function ConclusionPanel({ sections }: { sections: ConclusionSection[] }) {
  return (
    <div className="space-y-4 rounded-lg bg-gray-50 p-4">
      {sections.map((s) => (
        <div key={s.title}>
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
            {s.icon && <span aria-hidden>{s.icon}</span>}
            <span>{s.title}</span>
          </div>
          <div className="space-y-1.5">
            {s.lines.map((line, i) => (
              <p key={i} className="text-sm leading-relaxed text-gray-600">
                · {line}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
