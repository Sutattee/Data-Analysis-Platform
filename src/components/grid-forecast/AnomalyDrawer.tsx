"use client";

import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="break-words text-sm text-gray-800">{value ?? "-"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold text-gray-500">{title}</h4>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function AnomalyDrawer({
  open,
  onClose,
  detail,
}: {
  open: boolean;
  onClose: () => void;
  detail: AnomalyDetail | null;
}) {
  const router = useRouter();
  const rec = detail?.recordId ? ALERT_RECORDS.find((r) => r.id === detail.recordId) : undefined;

  const metricName = detail?.metricName ?? rec?.metricName ?? "-";
  const baseline = detail?.baseline ?? rec?.baselineLabel;
  const current = detail?.current ?? rec?.valueLabel;
  const deviation = detail?.deviation ?? rec?.deviation;
  const triggerTime = detail?.triggerTime ?? rec?.triggerTime;
  const duration = detail?.duration ?? rec?.duration;
  const cause = detail?.cause ?? rec?.causeSummary;
  const suggestion = detail?.suggestion ?? rec?.suggestion;
  const level = detail?.level ?? rec?.level;
  const isForecast = !!detail?.forecastValue;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="异常详情"
      width={520}
      footer={
        rec ? (
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/alert/records/${rec.id}`)}>查看预警记录详情</Button>
          </div>
        ) : undefined
      }
    >
      {detail && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">{detail.title}</h2>
          </div>

          <Section title="核心异常数据">
            <Field label="预警等级" value={level ? <AlertLevelBadge level={level} /> : "-"} />
            <Field label="指标名称" value={metricName} />
            <Field label="基准 / 阈值" value={baseline} />
            {isForecast ? (
              <>
                <Field label="预测值" value={detail?.forecastValue} />
                <Field label="置信区间" value={detail?.confidenceRange} />
                <Field label="偏离程度" value={deviation} />
                <Field label="预计越界时间" value={detail?.forecastTime} />
              </>
            ) : (
              <>
                <Field label="当前值" value={current} />
                <Field label="偏离程度" value={deviation} />
                <Field label="发生时间" value={triggerTime} />
                <Field label="持续时间" value={duration} />
              </>
            )}
          </Section>

          <Section title="原因与处置建议">
            <Field label="原因摘要" value={cause ?? "暂未识别到明确原因"} />
            <Field label="处置建议" value={suggestion} />
          </Section>

          <Field
            label="判定依据"
            value={rec ? `${rec.strategyName}｜${rec.triggerCondition}` : "指标值超出评价阈值（基于历史趋势与目标值判定）"}
          />
        </div>
      )}
    </Drawer>
  );
}
