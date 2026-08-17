"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import type { AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import { AnomalyAiPanel } from "./AnomalyAiPanel";

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
  const { state } = useApp();
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";
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
  // 保存后的补录信息：补录人 / 补录时间 / 原因类型（AI生成、人工补录）
  const [savedMeta, setSavedMeta] = useState<
    { text: string; by: string; time: string; type: "AI生成" | "人工补录" } | undefined
  >(undefined);
  // AI 回填的原文（保存时与 draft 对比：未修改则原因类型=AI生成，修改过=人工补录）
  const [aiFilledText, setAiFilledText] = useState<string | undefined>(undefined);
  // AI 辅助对话面板
  const [aiOpen, setAiOpen] = useState(false);

  // detail 引用变化（点击新异常 / 关闭重开）时重置编辑态；保存只改 savedMeta，不触发重置
  useEffect(() => {
    setEditing(false);
    setDraft("");
    setSavedMeta(undefined);
    setAiFilledText(undefined);
    setAiOpen(false);
  }, [detail]);

  const baseCause = detail?.cause ?? rec?.causeSummary;
  const effectiveCause = savedMeta?.text ?? baseCause;
  const hasCause = !!effectiveCause?.trim();
  // 原因类型：本次会话保存后展示补录信息；否则取页面构造的 causeType / 告警记录的 causeType
  const causeTypeLabel = savedMeta
    ? `（${savedMeta.type}）`
    : detail?.causeType
      ? `（${detail.causeType}）`
      : detail?.cause
        ? "（AI生成）"
        : rec?.causeType
          ? `（${rec.causeType}）`
          : undefined;

  function formatNow(): string {
    const d = new Date();
    const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function startEdit() {
    setDraft(effectiveCause ?? "");
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft("");
    setAiFilledText(undefined);
  }
  function handleSave() {
    if (!draft.trim()) return;
    // 原因类型：AI 回填后未修改 → AI生成；否则人工补录
    const type = aiFilledText !== undefined && draft.trim() === aiFilledText ? "AI生成" : "人工补录";
    setSavedMeta({ text: draft.trim(), by: currentUser, time: formatNow(), type });
    setEditing(false);
    setDraft("");
    setAiFilledText(undefined);
    toast("异常原因已保存，并关联至本次预警记录", "success");
  }

  // AI 采纳并回填：结论填入异常原因输入框，用户可继续编辑
  function handleAiAdopt(causeText: string) {
    setDraft(causeText);
    setAiFilledText(causeText);
    setEditing(true);
    setAiOpen(false);
    toast("AI分析结论已回填至异常原因，请确认后可保存", "success");
  }

  return (
    <>
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
            {detail?.dept && <Field label="对象" value={detail.dept} />}
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
                {causeTypeLabel && <p className="text-xs text-gray-400">（原因类型）：{causeTypeLabel}</p>}
                {savedMeta && (
                  <p className="text-xs text-gray-400">
                    补录人：{savedMeta.by}｜补录时间：{savedMeta.time}
                  </p>
                )}
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
                    {/* AI 辅助入口：右侧滑出对话面板，分析结论可采纳回填 */}
                    <Button size="sm" variant="secondary" onClick={() => setAiOpen(true)}>AI辅助</Button>
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

    {/* AI 辅助异常原因补录面板（覆盖在异常详情抽屉之上；关闭面板不自动修改异常原因） */}
    <AnomalyAiPanel
      open={open && aiOpen}
      onClose={() => setAiOpen(false)}
      detail={detail}
      onAdopt={handleAiAdopt}
    />
    </>
  );
}
