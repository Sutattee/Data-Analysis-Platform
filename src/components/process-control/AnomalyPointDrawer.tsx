"use client";

// 异常详情抽屉（点击趋势图异常点滑出）：布局与修正功能对齐能源消耗板块的异常详情
// 抽屉（grid-forecast/AnomalyDrawer）。核心异常数据展示监测记录与管控判定口径；
// 异常原因 / 处置建议支持「修正」（保存后原因类型变为人工补录并记录补录人/时间）；
// 底部「查看告警记录」跳转工艺质量告警记录详情（按指标名匹配最新一条实测异常，
// 无匹配时跳告警记录列表）。
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";
import { causeOfDetail, processOfDetail, suggestionOfDetail, type MonitorRecord, type ProcessDetailMetric } from "@/lib/mock-data/process-control-detail";

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
      <h4 className="mb-2 text-xs font-bold text-gray-900">{title}</h4>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function AnomalyPointDrawer({
  metric,
  record,
  onClose,
}: {
  metric: ProcessDetailMetric;
  record: MonitorRecord | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { state } = useApp();
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";

  const fmt = (v: number) => `${v.toFixed(metric.decimals)}${metric.unit}`;
  // 来源工序（结果类指标 QC-10/11 无 → 不展示）
  const process = processOfDetail(metric);

  // 基准 / 阈值与偏离口径：越出侧边界 = 管控值（与记录等级判定同源）
  const { upper, lower } = metric.control;
  const baselineText =
    upper !== undefined && lower !== undefined
      ? `上限 ${upper.toFixed(metric.decimals)}${metric.unit}｜下限 ${lower.toFixed(metric.decimals)}${metric.unit}`
      : upper !== undefined
        ? `上限 ${upper.toFixed(metric.decimals)}${metric.unit}`
        : lower !== undefined
          ? `下限 ${lower.toFixed(metric.decimals)}${metric.unit}`
          : metric.control.text;
  let deviation: number | null = null;
  if (record) {
    if (upper !== undefined && record.value > upper) deviation = record.value - upper;
    else if (lower !== undefined && record.value < lower) deviation = record.value - lower;
  }
  const deviationText =
    deviation === null
      ? "-"
      : `${deviation >= 0 ? "+" : "-"}${Math.abs(deviation).toFixed(metric.decimals)}${metric.unit}`;

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

  const baseCause = record ? causeOfDetail(metric.id) : "";
  const effectiveCause = savedCause ?? baseCause;

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

  // 查看告警记录：按指标名匹配工艺质量域最新一条实测异常记录，跳告警详情页；无匹配跳列表
  function gotoAlertRecord() {
    const rec = ALERT_RECORDS.find(
      (r) => r.domain === "工艺质量" && r.metricName === metric.name && r.type === "当前异常"
    );
    router.push(rec ? `/quality/alert/records/${rec.id}` : "/quality/alert/records");
  }

  return (
    <Drawer open={record !== null} onClose={onClose} title="异常详情" width={520}
      footer={
        <div className="flex justify-end">
          <Button onClick={gotoAlertRecord}>查看告警详情</Button>
        </div>
      }
    >
      {record && (
        <div className="space-y-5">
          {/* 指标名称 */}
          <p className="text-sm text-gray-500">{metric.name}</p>

          {/* 核心异常数据 */}
          <Section title="核心异常数据">
            <Field label="告警等级" value={record.level ? <AlertLevelBadge level={record.level} /> : "-"} />
            <Field label="告警类型" value="实测异常" />
            <Field label="业务域" value="工艺质量" />
            <Field label="批次" value={record.batch} />
            <Field label="机台" value={record.machine} />
            <Field label="班次" value={record.shiftType ? record.label : "-"} />
            <Field label="班组" value={record.shiftGroup ?? "-"} />
            <Field label="牌号" value={record.brand} />
            {process && <Field label="工序" value={process} />}
            <Field label="告警触发时间" value={record.time} />
            <Field label="告警值" value={`当前值 ${fmt(record.value)}`} />
            <Field label="基准 / 阈值" value={baselineText} />
            <Field label="偏离值" value={deviationText} />
            <Field label="偏离率" value={record.overPct} />
          </Section>

          {/* 异常原因（可修正；保存后原因类型 = 人工补录） */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-900">异常原因</h4>
              {!editing && (
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
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{effectiveCause}</p>
                <p className="text-xs text-gray-400">原因类型：{savedMeta ? "人工补录" : "AI识别"}</p>
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
              <span className="text-xs font-bold text-gray-900">处置建议</span>
              {!suggestionEditing && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSuggestionDraft(savedSuggestion ?? suggestionOfDetail(metric.id));
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
              <span className="break-words text-sm text-gray-800">
                {savedSuggestion ?? suggestionOfDetail(metric.id)}
              </span>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
