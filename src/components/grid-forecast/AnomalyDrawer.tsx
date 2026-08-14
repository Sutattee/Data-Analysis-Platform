"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
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
  const toast = useToast();
  const rec = detail?.recordId ? ALERT_RECORDS.find((r) => r.id === detail.recordId) : undefined;

  const metricName = detail?.metricName ?? rec?.metricName ?? "-";
  const baseline = detail?.baseline ?? rec?.baselineLabel;
  const current = detail?.current ?? rec?.valueLabel;
  const deviation = detail?.deviation ?? rec?.deviation;
  const triggerTime = detail?.triggerTime ?? rec?.triggerTime;
  const duration = detail?.duration ?? rec?.duration;
  const suggestion = detail?.suggestion ?? rec?.suggestion;
  const level = detail?.level ?? rec?.level;
  const isForecast = !!detail?.forecastValue;

  // —— 异常原因编辑态 ——
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [savedCause, setSavedCause] = useState<string | undefined>(undefined);

  // detail 引用变化（点击新异常 / 关闭重开）时重置编辑态；保存只改 savedCause，不触发重置
  useEffect(() => {
    setEditing(false);
    setDraft("");
    setSavedCause(undefined);
  }, [detail]);

  const baseCause = detail?.cause ?? rec?.causeSummary;
  const effectiveCause = savedCause ?? baseCause;
  const hasCause = !!effectiveCause?.trim();

  function startEdit() {
    setDraft(effectiveCause ?? "");
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft("");
  }
  function handleSave() {
    if (!draft.trim()) return;
    setSavedCause(draft.trim());
    setEditing(false);
    setDraft("");
    toast("异常原因已保存，并关联至本次预警记录", "success");
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="异常详情"
      width={520}
      footer={
        rec ? (
          <div className="flex justify-end">
            <Button
              onClick={() => {
                // 记录抽屉快照，返回总览页时一键恢复异常详情
                sessionStorage.setItem("anomaly-drawer-return", JSON.stringify(detail));
                router.push(`/alert/records/${rec.id}`);
              }}
            >
              查看告警记录详情
            </Button>
          </div>
        ) : undefined
      }
    >
      {detail && (
        <div className="space-y-5">
          {/* 副标题：对象 · 指标异常 */}
          <p className="text-sm text-gray-500">{detail.title}</p>

          {/* 核心异常数据 */}
          <Section title="核心异常数据">
            <Field label="告警等级" value={level ? <AlertLevelBadge level={level} /> : "-"} />
            {detail?.dept && <Field label="部门" value={detail.dept} />}
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

          {/* 异常原因（AI 综合分析，可补充 / 修正） */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500">异常原因</h4>
            {hasCause && !editing ? (
              <div className="space-y-2">
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{effectiveCause}</p>
                <div>
                  <Button size="sm" variant="secondary" onClick={startEdit}>修正异常原因</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {!hasCause && (
                  <p className="text-sm text-gray-400">当前数据不足，暂无法确定异常原因</p>
                )}
                <textarea
                  rows={5}
                  maxLength={500}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="请输入异常原因"
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{draft.length}/500</span>
                  <div className="flex gap-2">
                    {hasCause && (
                      <Button size="sm" variant="secondary" onClick={cancelEdit}>取消</Button>
                    )}
                    <Button size="sm" onClick={handleSave} disabled={!draft.trim()}>保存</Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 处置建议 */}
          <Field label="处置建议" value={suggestion} />

          {/* 判定依据 */}
          <Field
            label="判定依据"
            value={rec ? `${rec.strategyName}｜${rec.triggerCondition}` : "指标值超出评价阈值（基于历史趋势与目标值判定）"}
          />
        </div>
      )}
    </Drawer>
  );
}
