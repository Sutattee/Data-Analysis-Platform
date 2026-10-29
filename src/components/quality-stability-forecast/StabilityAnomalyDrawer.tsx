"use client";

// 异常详情抽屉（稳定性预测页趋势图点击等级标记点滑出：升级点 / 触发等级的基准点）：布局对齐
// 能源消耗板块的异常详情抽屉（Section/Field 同构），数据取自告警记录（AlertRecord）——数值字段
// （等级/告警值/基准阈值/超出量/批次/班次/班组/牌号等）由视图按点击点位的实际数值覆写，与点位
// 保持一致；无数值字段不展示；预测风险型展示预测窗口，飘移类展示连续同向偏离；
// 异常原因 / 处置建议支持「修正」，AI 原因标注「原因由 AI 分析数据自动生成」；
// 底部「查看告警详情」跳告警记录详情页。
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { TYPE_DISPLAY } from "@/lib/mock-data/quality-alerts";
import type { AlertRecord } from "@/types";

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

export function StabilityAnomalyDrawer({
  record,
  onClose,
}: {
  record: AlertRecord | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { state } = useApp();
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";
  const isForecast = record?.type === "预测风险";

  // —— 异常原因编辑态（保存后原因类型 = 人工补录，记录补录人 / 补录时间） ——
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [savedCause, setSavedCause] = useState<string | undefined>(undefined);
  const [savedMeta, setSavedMeta] = useState<{ by: string; time: string } | undefined>(undefined);
  // —— 处置建议编辑态 ——
  const [suggestionEditing, setSuggestionEditing] = useState(false);
  const [suggestionDraft, setSuggestionDraft] = useState("");
  const [savedSuggestion, setSavedSuggestion] = useState<string | undefined>(undefined);

  // 记录切换（点击新异常点 / 关闭重开）时重置编辑态
  useEffect(() => {
    setEditing(false);
    setDraft("");
    setSavedCause(undefined);
    setSavedMeta(undefined);
    setSuggestionEditing(false);
    setSuggestionDraft("");
    setSavedSuggestion(undefined);
  }, [record]);

  function formatNow(): string {
    const d = new Date();
    const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  const baseCause = record?.causeSummary ?? "";
  const effectiveCause = savedCause ?? baseCause;
  const hasCause = !!effectiveCause.trim();

  function handleSaveCause() {
    if (!draft.trim()) return;
    setSavedCause(draft.trim());
    setSavedMeta({ by: currentUser, time: formatNow() });
    setEditing(false);
    setDraft("");
    toast("异常原因已保存", "success");
  }

  function handleSaveSuggestion() {
    setSavedSuggestion(suggestionDraft.trim());
    setSuggestionEditing(false);
    toast("处置建议已保存", "success");
  }

  return (
    <Drawer
      open={record !== null}
      onClose={onClose}
      title="异常详情"
      width={520}
      footer={
        record ? (
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/quality/alert/records/${record.id}`)}>查看告警详情</Button>
          </div>
        ) : undefined
      }
    >
      {record && (
        <div className="space-y-5">
          {/* 指标名称 */}
          <p className="text-sm text-gray-500">{record.metricName}</p>

          {/* 核心异常数据（无数值字段不展示：批次/班次/班组/牌号随指标周期与点位上下文而定） */}
          <Section title="核心异常数据">
            <Field label="告警等级" value={<AlertLevelBadge level={record.level} />} />
            <Field label="告警类型" value={TYPE_DISPLAY[record.type] ?? record.type} />
            <Field label="业务域" value={record.domain} />
            {record.batch && <Field label="批次" value={record.batch} />}
            {record.shiftLabel && <Field label="班次" value={record.shiftLabel} />}
            {record.shift && <Field label="班组" value={record.shift} />}
            {record.brand && <Field label="牌号" value={record.brand} />}
            {record.process && <Field label="工序" value={record.process} />}
            <Field label="告警触发时间" value={record.triggerTime} />
            <Field label="告警值" value={record.valueLabel} />
            <Field label="基准阈值" value={record.baselineLabel} />
            {/* 超出量：越出管控值边界的绝对差（% 指标以 pct 计，如 +0.35pct）；未越界 - */}
            <Field label="超出量" value={record.deviationValue} />
            {isForecast && <Field label="预测窗口" value={record.forecastWindow ?? "-"} />}
            {record.consecutiveShifts !== undefined && (
              <Field label="连续同向偏离" value={`${record.consecutiveShifts}个${record.batch?.includes("批") ? "批次" : "班次"}`} />
            )}
          </Section>

          {/* 异常原因（可修正；AI 原因标注生成方式，保存后转为人工补录并记录补录人/时间） */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-500">异常原因</h4>
              {!editing && hasCause && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDraft(effectiveCause);
                    setEditing(true);
                  }}
                >
                  修正
                </Button>
              )}
            </div>
            {!editing ? (
              <div className="space-y-2">
                {hasCause ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{effectiveCause}</p>
                ) : (
                  <p className="text-sm text-gray-400">当前数据不足，暂无法确定异常原因</p>
                )}
                {hasCause && !savedMeta && (
                  <p className="text-xs text-gray-400">原因由 AI 分析数据自动生成</p>
                )}
                {savedMeta && (
                  <p className="text-xs text-gray-400">
                    补录人：{savedMeta.by}｜补录时间：{savedMeta.time}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
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
                    <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSaveCause} disabled={!draft.trim()}>
                      保存
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 处置建议（可修正） */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">处置建议</span>
              {!suggestionEditing && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSuggestionDraft(savedSuggestion ?? record.suggestion ?? "");
                    setSuggestionEditing(true);
                  }}
                >
                  修正
                </Button>
              )}
            </div>
            {suggestionEditing ? (
              <div className="space-y-2">
                <textarea
                  value={suggestionDraft}
                  onChange={(e) => setSuggestionDraft(e.target.value.slice(0, 500))}
                  placeholder="请填写实际采取的措施和处置结果"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{suggestionDraft.length}/500</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setSuggestionEditing(false)}>
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSaveSuggestion}>
                      保存
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <span className="break-words text-sm text-gray-800">{savedSuggestion ?? record.suggestion ?? "-"}</span>
            )}
          </div>

          {/* 判定依据 */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500">判定依据</h4>
            <p className="break-words text-sm text-gray-800">{`${record.strategyName}｜${record.triggerCondition}`}</p>
          </div>
        </div>
      )}
    </Drawer>
  );
}
