"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import type { CorrectionEvent, AnomalyDetail } from "@/lib/mock-data/grid-forecast";

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="break-words text-sm text-gray-800">{value ?? "-"}</span>
    </div>
  );
}
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

interface CombinedDrawerProps {
  open: boolean;
  onClose: () => void;
  event: CorrectionEvent | null;
  anomaly: AnomalyDetail | null;
}

// 组合标记详情：Tab 切换「预测修正 / 异常告警」
export function CombinedDrawer({ open, onClose, event, anomaly }: CombinedDrawerProps) {
  const [tab, setTab] = useState<"correction" | "anomaly">("correction");
  if (!event && !anomaly) return <Drawer open={open} onClose={onClose} title="组合标记详情">{null}</Drawer>;

  return (
    <Drawer open={open} onClose={onClose} title="组合标记详情" width={520}>
      {/* Tab */}
      <div className="mb-4 flex gap-6 border-b border-gray-100">
        <button
          onClick={() => setTab("correction")}
          className={`-mb-px border-b-2 pb-2 text-sm ${
            tab === "correction" ? "border-primary-600 font-medium text-primary-700" : "border-transparent text-gray-500"
          }`}
        >
          预测修正
        </button>
        <button
          onClick={() => setTab("anomaly")}
          className={`-mb-px border-b-2 pb-2 text-sm ${
            tab === "anomaly" ? "border-primary-600 font-medium text-primary-700" : "border-transparent text-gray-500"
          }`}
        >
          异常告警
        </button>
      </div>

      {tab === "correction" && event ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="事件名称" value={event.name} />
          <Field label="事件生效时间" value={event.effectDate} />
          <Field label="修正前预测值" value={`${event.before}`} />
          <Field label="修正后预测值" value={`${event.after}`} />
          <Field label="修正量" value={sign(event.delta)} />
          <Field label="修正幅度" value={`${sign(event.rate)}%`} />
          <Field label="修正原因" value={event.reason} />
          <Field label="预测修正时间" value={event.correctTime} />
        </div>
      ) : null}

      {tab === "anomaly" && anomaly ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">{anomaly.title}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="指标名称" value={anomaly.metricName} />
            <Field label="基准 / 阈值" value={anomaly.baseline} />
            <Field label="当前值" value={anomaly.current} />
            <Field label="偏离程度" value={anomaly.deviation} />
            <Field label="发生时间" value={anomaly.triggerTime} />
            <Field label="持续时间" value={anomaly.duration} />
          </div>
          <Field label="原因摘要" value={anomaly.cause ?? "暂未识别到明确原因"} />
          <Field label="处置建议" value={anomaly.suggestion} />
        </div>
      ) : null}
    </Drawer>
  );
}
