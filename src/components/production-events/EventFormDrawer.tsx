"use client";

// 重大事件（生产） - 新增/编辑表单抽屉
// 新增 = 人工补录（保存后默认已确认）；编辑 AI 识别事件 → 形成方式自动变「AI识别·人工修订」并保留修订记录
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { SearchMultiSelect } from "@/components/alert/SearchMultiSelect";
import { ConfirmStatusBadge, FormationBadge } from "@/components/yearbook/eventBadges";
import { EVENT_TYPES } from "@/lib/mock-data/major-events";
import { nextEventId, upsertEvent } from "@/lib/mock-data/production-events";
import { metricList } from "@/lib/mock-data/metric-management";
import { ALERT_RECORDS, PRODUCTION_MATERIAL_METRICS } from "@/lib/mock-data/alerts";
import { EQUIPMENT_UNITS } from "@/lib/mock-data/equipment-efficiency";
import { listObjects } from "@/lib/mock-data/objects";
import type { MajorEvent, MajorEventType } from "@/types";

// 表单态（datetime-local 用 "YYYY-MM-DDTHH:mm"）
interface EventFormState {
  title: string;
  type: MajorEventType;
  startTime: string;
  endTime: string; // ongoing 时忽略
  ongoing: boolean;
  objects: string[];
  metrics: string[];
  process: string;
  impactSummary: string;
  alertIds: string[];
}

const EMPTY: EventFormState = {
  title: "",
  type: EVENT_TYPES[0],
  startTime: "",
  endTime: "",
  ongoing: false,
  objects: [],
  metrics: [],
  process: "",
  impactSummary: "",
  alertIds: [],
};

// "YYYY-MM-DD HH:mm" → datetime-local 值
function toLocal(t: string | null): string {
  return t ? t.replace(" ", "T") : "";
}

function toFormState(e: MajorEvent | null): EventFormState {
  if (!e) return { ...EMPTY };
  return {
    title: e.title,
    type: e.type,
    startTime: toLocal(e.startTime),
    endTime: toLocal(e.endTime),
    ongoing: !e.endTime,
    objects: [...e.objects],
    metrics: [...e.metrics],
    process: e.process,
    impactSummary: e.impactSummary,
    alertIds: [...e.alertIds],
  };
}

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 影响指标选项（全厂指标池）
const METRIC_OPTIONS = metricList.map((m) => ({ value: m.nameCn, label: m.nameCn, hint: m.code }));
// 关联预警选项：生产管理辅料指标告警记录（SC 前缀）
const ALERT_OPTIONS = ALERT_RECORDS.filter((r) => PRODUCTION_MATERIAL_METRICS.includes(r.metricName)).map((r) => ({
  value: r.id,
  label: `${r.title}（${r.objectName}）`,
  hint: `${r.triggerTime}｜${r.level}`,
}));

// 影响对象选项（生产车间 / 16 台卷接包机组 / 关键设备 / 对象管理对象 合并去重，支持搜索对象名称）
const KEY_EQUIPMENTS = ["ZB45包装机", "PROTOS70卷接机", "嘴棒成型机", "商标纸输送系统", "空压机"];
const OBJECT_OPTIONS = Array.from(
  new Set([
    "卷包车间",
    "制丝车间",
    "动力车间",
    ...EQUIPMENT_UNITS,
    ...KEY_EQUIPMENTS,
    ...listObjects().map((o) => o.name),
  ])
).map((n) => ({ value: n, label: n }));

const labelCls = "text-sm font-medium text-gray-700 mb-1";
const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
const textareaCls = `${inputCls} resize-none`;

export function EventFormDrawer({
  open,
  onClose,
  initial, // null = 新增（人工补录）
  user,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial: MajorEvent | null;
  user: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<EventFormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(initial));
      setErrors({});
    }
  }, [open, initial]);

  function set<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((errs) => {
      const next = { ...errs };
      delete next[key as string];
      return next;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "请输入事件标题";
    else if (form.title.length > 100) errs.title = "事件标题不能超过 100 字";
    if (!form.startTime) errs.startTime = "请选择事件开始时间";
    if (!form.ongoing && !form.endTime) errs.endTime = "请选择结束时间或勾选「进行中」";
    if (
      !form.ongoing &&
      form.startTime &&
      form.endTime &&
      form.endTime < form.startTime // 字符串比较对同格式时间成立
    )
      errs.endTime = "结束时间不能早于开始时间";
    if (!form.objects.length) errs.objects = "请选择影响对象";
    if (!form.process.trim()) errs.process = "请输入事件经过";
    else if (form.process.length > 2000) errs.process = "事件经过不能超过 2000 字";
    if (form.impactSummary.length > 500) errs.impactSummary = "影响摘要不能超过 500 字";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // 轻量 diff：找出被修改的字段中文名（用于修订记录）
  function diffFields(a: MajorEvent): string[] {
    const names: string[] = [];
    const newStart = form.startTime.replace("T", " ");
    const newEnd = form.ongoing ? null : form.endTime.replace("T", " ");
    if (a.title !== form.title.trim()) names.push("事件标题");
    if (a.startTime !== newStart || (a.endTime ?? null) !== newEnd) names.push("事件时间");
    if (a.objects.join("｜") !== form.objects.join("｜")) names.push("影响对象");
    if (a.metrics.join("｜") !== form.metrics.join("｜")) names.push("影响指标");
    if (a.impactSummary !== form.impactSummary.trim()) names.push("影响摘要");
    if (a.process !== form.process.trim()) names.push("事件经过");
    if (a.alertIds.join("｜") !== form.alertIds.join("｜")) names.push("关联预警");
    return names;
  }

  function handleSave(alsoConfirm: boolean) {
    if (!validate()) return;
    setSaving(true);
    const now = formatNow();
    const startTime = form.startTime.replace("T", " ");
    const endTime = form.ongoing ? null : form.endTime.replace("T", " ");

    if (!initial) {
      // 新增 = 人工补录，保存后默认已确认
      upsertEvent({
        id: nextEventId(startTime),
        title: form.title.trim(),
        type: form.type,
        startTime,
        endTime,
        objects: form.objects,
        metrics: form.metrics,
        impactSummary: form.impactSummary.trim(),
        process: form.process.trim(),
        timeline: [], // 人工补录暂无时间轴（详情中显示「暂无完整事件经过」提示）
        alertIds: form.alertIds,
        formation: "人工补录",
        status: "已确认",
        createdBy: user,
        createdAt: now,
        revisions: [],
      });
      toast("重大事件已保存（人工补录，默认已确认）", "success");
    } else {
      const changed = diffFields(initial);
      const revisions = [...initial.revisions];
      if (changed.length) revisions.push({ time: now, user, summary: `修改了${changed.join("、")}，原始内容已保留` });
      upsertEvent({
        ...initial,
        title: form.title.trim(),
        type: form.type,
        startTime,
        endTime,
        objects: form.objects,
        metrics: form.metrics,
        impactSummary: form.impactSummary.trim(),
        process: form.process.trim(),
        alertIds: form.alertIds,
        // AI 识别事件被人工修改后，形成方式自动变更
        formation: initial.formation === "AI识别" ? "AI识别·人工修订" : initial.formation,
        status: alsoConfirm ? "已确认" : initial.status,
        updatedBy: user,
        updatedAt: now,
        revisions,
      });
      toast(alsoConfirm ? "事件已保存并确认" : "事件已保存", "success");
    }
    setSaving(false);
    onClose();
    onSaved();
  }

  // 「保存并确认」仅对 AI 识别的待确认事件开放
  const showConfirmBtn = !!initial && initial.formation !== "人工补录" && initial.status === "待确认";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={initial ? `编辑重大事件（${initial.id}）` : "新增重大事件（人工补录）"}
      width={640}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={() => handleSave(false)} disabled={saving}>
            保存
          </Button>
          {showConfirmBtn && (
            <Button onClick={() => handleSave(true)} disabled={saving}>
              保存并确认
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* 事件标题 */}
        <div>
          <label className={labelCls}>
            事件标题 <span className="text-red-500">*</span>
          </label>
          <Input
            maxLength={100}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="请输入事件标题，如：3#卷接包机组包装机故障停机"
            error={errors.title}
          />
          <p className="mt-1 text-right text-xs text-gray-400">{form.title.length}/100</p>
        </div>

        {/* 事件时间 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              开始时间 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              className={inputCls}
              value={form.startTime}
              onChange={(e) => set("startTime", e.target.value)}
            />
            {errors.startTime && <p className="mt-1 text-xs text-red-500">{errors.startTime}</p>}
          </div>
          <div>
            <label className={labelCls}>结束时间</label>
            <input
              type="datetime-local"
              className={`${inputCls} disabled:bg-gray-100 disabled:text-gray-400`}
              value={form.ongoing ? "" : form.endTime}
              disabled={form.ongoing}
              onChange={(e) => set("endTime", e.target.value)}
            />
            {errors.endTime ? (
              <p className="mt-1 text-xs text-red-500">{errors.endTime}</p>
            ) : (
              <label className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={form.ongoing}
                  onChange={(e) => set("ongoing", e.target.checked)}
                />
                进行中（事件尚未结束）
              </label>
            )}
          </div>
        </div>

        {/* 影响对象（下拉多选，支持搜索对象名称） */}
        <div>
          <label className={labelCls}>
            影响对象 <span className="text-red-500">*</span>
          </label>
          <SearchMultiSelect
            options={OBJECT_OPTIONS}
            value={form.objects}
            onChange={(v) => set("objects", v)}
            placeholder="搜索并选择影响对象（可多选）"
            error={errors.objects}
          />
        </div>

        {/* 影响指标 */}
        <div>
          <label className={labelCls}>影响指标</label>
          <SearchMultiSelect
            options={METRIC_OPTIONS}
            value={form.metrics}
            onChange={(v) => set("metrics", v)}
            placeholder="搜索并选择受影响的指标"
          />
        </div>

        {/* 事件经过 */}
        <div>
          <label className={labelCls}>
            事件经过 <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={5}
            maxLength={2000}
            className={`${textareaCls} ${errors.process ? "border-red-400 focus:ring-red-400" : ""}`}
            value={form.process}
            onChange={(e) => set("process", e.target.value)}
            placeholder="描述事件的发生、发展、处置与恢复过程"
          />
          <div className="mt-1 flex justify-between">
            {errors.process ? (
              <p className="text-xs text-red-500">{errors.process}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">{form.process.length}/2000</span>
          </div>
        </div>

        {/* 影响摘要 */}
        <div>
          <label className={labelCls}>影响摘要</label>
          <textarea
            rows={3}
            maxLength={500}
            className={`${textareaCls} ${errors.impactSummary ? "border-red-400 focus:ring-red-400" : ""}`}
            value={form.impactSummary}
            onChange={(e) => set("impactSummary", e.target.value)}
            placeholder="填写有数据依据的主要影响结果"
          />
          <div className="mt-1 flex justify-between">
            {errors.impactSummary ? (
              <p className="text-xs text-red-500">{errors.impactSummary}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">{form.impactSummary.length}/500</span>
          </div>
        </div>

        {/* 关联预警 */}
        <div>
          <label className={labelCls}>关联预警</label>
          <SearchMultiSelect
            options={ALERT_OPTIONS}
            value={form.alertIds}
            onChange={(v) => set("alertIds", v)}
            placeholder="搜索并关联相关告警记录（选填）"
          />
        </div>

        {/* 形成方式 / 确认状态（只读） */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">形成方式（系统维护，只读）</span>
            {initial ? (
              <FormationBadge formation={initial.formation} />
            ) : (
              <span className="text-sm text-gray-500">人工补录</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">确认状态（只读）</span>
            {initial ? (
              <ConfirmStatusBadge status={initial.status} />
            ) : (
              <span className="text-sm text-gray-500">已确认（人工补录保存后默认）</span>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
