"use client";

import { useState } from "react";
import { useApp } from "@/lib/store/AppContext";
import { traceMetrics, traceHistory, ViewMode } from "@/lib/mock-data/metric-trace";
import { TraceSidebar } from "@/components/trace/TraceSidebar";
import { TraceTopology } from "@/components/trace/TraceTopology";
import { TraceDetail } from "@/components/trace/TraceDetail";

export default function MetricTracePage() {
  const { state } = useApp();
  const defaultView: ViewMode = state.user?.role === "决策领导层" ? "business" : "technical";

  const [tab, setTab] = useState<"metrics" | "history">("metrics");
  const [activeMetricId, setActiveMetricId] = useState(traceMetrics[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [historySelectedMetricId, setHistorySelectedMetricId] = useState<string | null>(null);

  // 指标定义溯源（metrics 列表）默认不展示具体数值；历史结果溯源（history）展示数值
  const showValues = tab === "history";

  // 当前展示的指标
  const currentMetricId = tab === "metrics" ? activeMetricId : historySelectedMetricId;
  const currentMetric = traceMetrics.find((m) => m.id === currentMetricId) || null;
  const activeHistory = activeHistoryId ? traceHistory.find((h) => h.id === activeHistoryId) : null;

  // 该历史记录是否有可溯源指标
  const hasTraceable = activeHistory
    ? activeHistory.involvedMetrics.some((im) => traceMetrics.find((m) => m.name === im.name))
    : true;

  function selectMetric(id: string) {
    setActiveMetricId(id);
  }

  function selectHistory(id: string) {
    setActiveHistoryId(id);
    // 默认选中第一个可溯源指标
    const h = traceHistory.find((x) => x.id === id);
    if (h) {
      const match = h.involvedMetrics.find((im) => traceMetrics.find((m) => m.name === im.name));
      if (match) {
        const m = traceMetrics.find((m) => m.name === match.name);
        setHistorySelectedMetricId(m ? m.id : null);
      } else {
        setHistorySelectedMetricId(null);
      }
    }
  }

  // 是否展示「无可溯源」空状态
  const showNoTraceable = tab === "history" && activeHistory !== null && !hasTraceable;

  return (
    <div className="flex gap-3 h-[calc(100vh-80px)]">
      {/* 左：指标/历史列表 */}
      <TraceSidebar
        tab={tab}
        onTabChange={setTab}
        metrics={traceMetrics}
        history={traceHistory}
        activeMetricId={activeMetricId}
        activeHistoryId={activeHistoryId}
        onSelectMetric={selectMetric}
        onSelectHistory={selectHistory}
      />

      {/* 中：查看模式 + 涉及指标 + 拓扑图 */}
      <div className="flex-1 min-w-0 rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col bg-white">
        {/* 查看模式 */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
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

        {/* 历史模式：本次分析涉及指标 */}
        {tab === "history" && activeHistory && (
          <div className="px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
            <div className="text-xs text-gray-500 mb-1.5">本次分析涉及指标：</div>
            {hasTraceable ? (
              <div className="flex flex-wrap gap-1.5">
                {activeHistory.involvedMetrics.map((im) => {
                  const m = traceMetrics.find((tm) => tm.name === im.name);
                  const isActive = historySelectedMetricId === m?.id;
                  return (
                    <button
                      key={im.name}
                      onClick={() => m && setHistorySelectedMetricId(m.id)}
                      disabled={!m}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        isActive
                          ? "bg-primary-600 text-white font-medium"
                          : m
                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            : "bg-gray-50 text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      📊 {im.name} {im.value}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-1">无</div>
            )}
          </div>
        )}

        {/* 拓扑图 */}
        <div className="flex-1 min-h-0">
          {showNoTraceable ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400 px-4 text-center">
              未检测到可溯源指标，无法生成指标溯源链路。
            </div>
          ) : currentMetric ? (
            <TraceTopology metric={currentMetric} viewMode={viewMode} showValues={showValues} />
          ) : null}
        </div>
      </div>

      {/* 右：详细解释 */}
      <div className="w-[400px] flex-shrink-0 rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-white">
        {currentMetric ? <TraceDetail metric={currentMetric} viewMode={viewMode} showValues={showValues} /> : null}
      </div>
    </div>
  );
}
