"use client";

import { Card } from "@/components/ui/Card";
import { QUALITY_INSIGHT } from "@/lib/mock-data/quality";

// 智能解读摘要条：AI 基于本页数据生成的 3 条核心结论（横排，窄屏堆叠）
export function QualityInsightBar() {
  return (
    <Card>
      <div className="mb-2.5 flex items-center gap-1.5">
        <span>🤖</span>
        <h3 className="text-sm font-semibold text-gray-800">智能解读</h3>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-3">
        {QUALITY_INSIGHT.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] font-semibold text-primary-700">
              {i + 1}
            </span>
            <p className="text-xs leading-relaxed text-gray-600">{p}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
