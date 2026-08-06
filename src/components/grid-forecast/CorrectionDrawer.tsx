"use client";

import { Drawer } from "@/components/ui/Drawer";
import type { CorrectionEvent } from "@/lib/mock-data/grid-forecast";

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="break-words text-sm text-gray-800">{value ?? "-"}</span>
    </div>
  );
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function CorrectionDrawer({
  open,
  onClose,
  event,
}: {
  open: boolean;
  onClose: () => void;
  event: CorrectionEvent | null;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="预测修正详情" width={480}>
      {event && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📌</span>
            <h2 className="text-base font-bold text-gray-900">{event.name}</h2>
          </div>
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
          <p className="text-xs text-gray-400">
            修正幅度 =（修正后预测值 − 修正前预测值）÷ 修正前预测值 × 100%；正值表示预测上调，负值表示下调。
          </p>
        </div>
      )}
    </Drawer>
  );
}
