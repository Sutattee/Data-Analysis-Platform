"use client";

import { useState } from "react";
import { TraceMetric, TraceHistoryRecord, TRACE_THEMES } from "@/lib/mock-data/metric-trace";

interface Props {
  tab: "metrics" | "history";
  onTabChange: (t: "metrics" | "history") => void;
  metrics: TraceMetric[];
  history: TraceHistoryRecord[];
  activeMetricId: string;
  activeHistoryId: string | null;
  onSelectMetric: (id: string) => void;
  onSelectHistory: (id: string) => void;
}

export function TraceSidebar({
  tab, onTabChange, metrics, history, activeMetricId, activeHistoryId, onSelectMetric, onSelectHistory,
}: Props) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set([TRACE_THEMES[0]]));

  const kw = search.trim().toLowerCase();
  const filteredMetrics = metrics.filter((m) => !kw || m.name.toLowerCase().includes(kw));
  const filteredHistory = history.filter((h) => !kw || h.question.toLowerCase().includes(kw));

  function toggleGroup(theme: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(theme)) n.delete(theme);
      else n.add(theme);
      return n;
    });
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-white overflow-hidden">
      {/* Tab */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {([["metrics", "指标列表"], ["history", "历史记录"]] as ["metrics" | "history", string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => { onTabChange(k); setSearch(""); }}
            className={`flex-1 py-2.5 text-sm -mb-px border-b-2 transition-colors ${
              tab === k ? "border-primary-600 text-primary-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索问题"
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-auto px-2 py-2 min-h-0">
        {tab === "metrics" ? (
          TRACE_THEMES.map((theme) => {
            const items = filteredMetrics.filter((m) => m.theme === theme);
            if (items.length === 0) return null;
            const isOpen = expanded.has(theme);
            return (
              <div key={theme} className="mb-1">
                <button
                  onClick={() => toggleGroup(theme)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-50 text-xs font-medium text-gray-700"
                >
                  <span className={`text-[10px] text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                  <span>{theme}</span>
                  <span className="text-gray-400">({items.length})</span>
                </button>
                {isOpen && (
                  <div className="ml-3 border-l border-gray-100 pl-2 space-y-0.5 mt-0.5">
                    {items.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onSelectMetric(m.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                          activeMetricId === m.id ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span className="truncate">{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : filteredHistory.length === 0 ? (
          <div className="py-10 text-center text-xs text-gray-400">暂无记录</div>
        ) : (
          <div className="space-y-1">
            {filteredHistory.map((h) => (
              <button
                key={h.id}
                onClick={() => onSelectHistory(h.id)}
                className={`w-full text-left px-2.5 py-2 rounded-md transition-colors ${
                  activeHistoryId === h.id ? "bg-primary-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="text-xs font-medium text-gray-700 line-clamp-2 leading-snug">{h.question}</div>
                <div className="text-[10px] text-gray-400 mt-1">{h.time}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {h.involvedMetrics.map((im) => (
                    <span key={im.name} className="px-1 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">{im.name}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
