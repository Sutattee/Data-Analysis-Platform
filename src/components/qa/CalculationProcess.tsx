"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { TraceTopology } from "@/components/trace/TraceTopology";
import { TraceDetail } from "@/components/trace/TraceDetail";
import { traceMetrics, traceHistory, type TraceMetric, type ViewMode } from "@/lib/mock-data/metric-trace";

// 涉及指标 = 回答内容命中的溯源指标；未命中回退到最近一次溯源分析记录（与指标溯源「历史记录」同源）
function resolveInvolved(text: string): { metric: TraceMetric; value?: string }[] {
  const hits = traceMetrics.filter((m) => text.includes(m.name));
  if (hits.length > 0) return hits.map((m) => ({ metric: m }));
  return traceHistory[0].involvedMetrics.flatMap((im) => {
    const m = traceMetrics.find((t) => t.name === im.name);
    return m ? [{ metric: m, value: im.value }] : [];
  });
}

// 计算过程弹窗：复用指标溯源（历史结果溯源）能力 —— 业务/技术视角切换 + 左拓扑图 + 右详细解释。
// 通过 Portal 挂载到 body（避免 AI 助手抽屉 transform 使 fixed 定位相对抽屉偏移）。
export function CalculationProcess({
  open,
  onClose,
  text,
}: {
  open: boolean;
  onClose: () => void;
  /** 回答文本：用于匹配本次分析涉及的指标 */
  text: string;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("business");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const involved = useMemo(() => resolveInvolved(text), [text]);

  // 切换回答（text 变化）时重置选中指标
  useEffect(() => {
    setSelectedId(involved[0]?.metric.id ?? null);
  }, [involved]);

  // 打开时锁定背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  const metric = traceMetrics.find((m) => m.id === selectedId) ?? involved[0]?.metric;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[92vw] h-[86vh] flex flex-col overflow-hidden z-10">
        {/* 顶部：标题 + 查看模式 + 关闭 */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-5">
            <h3 className="font-semibold text-gray-800">计算过程</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">查看模式：</span>
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                {(["business", "technical"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      viewMode === v ? "bg-white text-primary-700 font-medium shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {v === "business" ? "业务视角" : "技术视角"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xl"
            title="关闭"
          >
            ✕
          </button>
        </div>

        {/* 本次分析涉及指标（可点击切换） */}
        {involved.length > 0 && (
          <div className="px-6 py-2.5 border-b border-gray-100 flex-shrink-0">
            <div className="text-xs text-gray-500 mb-1.5">本次分析涉及指标：</div>
            <div className="flex flex-wrap gap-1.5">
              {involved.map(({ metric: m, value }) => {
                const isActive = selectedId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      isActive
                        ? "bg-primary-600 text-white font-medium"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    📊 {m.name} {value}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 主体：左拓扑图 + 右详细解释 */}
        <div className="flex-1 flex min-h-0">
          {metric ? (
            <>
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <TraceTopology metric={metric} viewMode={viewMode} showValues />
              </div>
              <div className="w-[380px] flex-shrink-0 border-l border-gray-100 overflow-hidden bg-white">
                <TraceDetail metric={metric} viewMode={viewMode} showValues />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              未检测到可溯源指标，无法生成计算过程。
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
