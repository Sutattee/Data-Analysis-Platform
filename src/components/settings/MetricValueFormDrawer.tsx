"use client";

// 指标值维护 - 新增/编辑表单抽屉
// 规则：单位随指标自动带出（只读）；「当期值」锁定单月（结束月份跟随起始月份并禁用）；
// 「累计值」对应连续月份范围；相同指标+对象+周期+类型判重；保存二次确认并记录操作人/时间
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { STAT_OBJECTS, isMetricValueDuplicated, monthLabel, saveMetricValue } from "@/lib/mock-data/metric-values";
import { metricList } from "@/lib/mock-data/metric-management";
import type { MetricValueRecord } from "@/types";

type DataType = MetricValueRecord["dataType"];
const DATA_TYPES: DataType[] = ["当期值", "累计值"];

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface FormState {
  metricId: string;
  statObject: string;
  dataType: DataType;
  periodStart: string; // YYYY-MM
  periodEnd: string; // YYYY-MM（当期值 = periodStart）
  value: string; // 输入态，保存时转数值
  source: string;
  remark: string;
}

const EMPTY: FormState = {
  metricId: "",
  statObject: "",
  dataType: "当期值",
  periodStart: "",
  periodEnd: "",
  value: "",
  source: "",
  remark: "",
};

function toFormState(r: MetricValueRecord | null): FormState {
  if (!r) return { ...EMPTY };
  return {
    metricId: r.metricId,
    statObject: r.statObject,
    dataType: r.dataType,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    value: String(r.value),
    source: r.source ?? "",
    remark: r.remark ?? "",
  };
}

const labelCls = "text-sm font-medium text-gray-700 mb-1";
const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

export function MetricValueFormDrawer({
  open,
  onClose,
  baseRecord, // null = 新增
  user,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  baseRecord: MetricValueRecord | null;
  user: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false); // 保存二次确认
  const [summary, setSummary] = useState<string[]>([]); // 变更摘要（确认弹窗展示）

  useEffect(() => {
    if (open) {
      setForm(toFormState(baseRecord));
      setErrors({});
      setConfirmOpen(false);
    }
  }, [open, baseRecord]);

  // 单位随指标自动带出（只读）
  const metric = useMemo(() => metricList.find((m) => m.id === form.metricId), [form.metricId]);
  const unit = metric?.unit ?? "";
  const isCurrent = form.dataType === "当期值";

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((errs) => {
      const next = { ...errs };
      delete next[key as string];
      return next;
    });
  }

  // 切换数据类型：当期值 → 结束月份锁定为起始月份
  function switchDataType(t: DataType) {
    setForm((f) => ({ ...f, dataType: t, periodEnd: t === "当期值" ? f.periodStart : f.periodEnd }));
    setErrors({});
  }

  function switchMetric(id: string) {
    setForm((f) => ({ ...f, metricId: id }));
    setErrors((errs) => {
      const next = { ...errs };
      delete next.metricId;
      return next;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.metricId) errs.metricId = "请选择指标名称";
    if (!form.statObject) errs.statObject = "请选择统计对象";
    if (!form.periodStart) errs.periodStart = "请选择起始月份";
    if (!form.periodEnd) errs.periodEnd = "请选择结束月份";
    if (form.periodStart && form.periodEnd && form.periodEnd < form.periodStart)
      errs.periodEnd = "结束月份不能早于起始月份";
    const v = form.value.trim();
    if (!v) errs.value = "请输入指标值";
    else if (!Number.isFinite(Number(v))) errs.value = "指标值仅允许输入有效数值";
    if (form.source.length > 100) errs.source = "数据来源不能超过 100 字";
    if (form.remark.length > 200) errs.remark = "备注不能超过 200 字";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // 轻量 diff：编辑时找出被修改的字段中文名（二次确认摘要）
  function diffFields(r: MetricValueRecord): string[] {
    const names: string[] = [];
    if (r.metricId !== form.metricId) names.push("指标名称");
    if (r.statObject !== form.statObject) names.push("统计对象");
    if (r.dataType !== form.dataType) names.push("数据类型");
    if (r.periodStart !== form.periodStart || r.periodEnd !== form.periodEnd) names.push("统计周期");
    if (String(r.value) !== form.value.trim()) names.push("指标值");
    if ((r.source ?? "") !== form.source.trim()) names.push("数据来源");
    if ((r.remark ?? "") !== form.remark.trim()) names.push("备注");
    return names;
  }

  // 校验 + 判重 → 二次确认
  function handleSubmit() {
    if (!validate()) return;
    const payload = {
      metricId: form.metricId,
      statObject: form.statObject,
      periodStart: form.periodStart,
      periodEnd: isCurrent ? form.periodStart : form.periodEnd,
      dataType: form.dataType,
    };
    if (isMetricValueDuplicated(payload, baseRecord?.id)) {
      toast("相同指标、统计对象、统计周期和数据类型已存在记录，不得重复维护", "warning");
      return;
    }
    setSummary(baseRecord ? diffFields(baseRecord) : []);
    setConfirmOpen(true);
  }

  function handleSave() {
    const saved = saveMetricValue(
      {
        id: baseRecord?.id,
        metricId: form.metricId,
        metricName: metric?.nameCn ?? form.metricId,
        statObject: form.statObject,
        periodStart: form.periodStart,
        periodEnd: isCurrent ? form.periodStart : form.periodEnd,
        dataType: form.dataType,
        value: Number(form.value.trim()),
        unit,
        source: form.source.trim() || undefined,
        remark: form.remark.trim() || undefined,
      },
      { user, now: formatNow() }
    );
    setConfirmOpen(false);
    onClose();
    onSaved();
    toast(baseRecord ? "指标值记录已更新" : `指标值记录已新增（${saved.id}）`, "success");
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={baseRecord ? `编辑指标值（${baseRecord.id}）` : "新增指标值"}
        width={520}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSubmit}>保存</Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* 指标名称（从指标管理中选择；单位随指标带出） */}
          <div>
            <label className={labelCls}>
              指标名称 <span className="text-red-500">*</span>
            </label>
            <select className={inputCls} value={form.metricId} onChange={(e) => switchMetric(e.target.value)}>
              <option value="">请选择指标</option>
              {metricList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameCn}
                </option>
              ))}
            </select>
            {errors.metricId && <p className="mt-1 text-xs text-red-500">{errors.metricId}</p>}
            <p className="mt-1 text-xs text-gray-400">仅可选择指标管理中已登记的指标</p>
          </div>

          {/* 统计对象 */}
          <div>
            <label className={labelCls}>
              统计对象 <span className="text-red-500">*</span>
            </label>
            <select className={inputCls} value={form.statObject} onChange={(e) => set("statObject", e.target.value)}>
              <option value="">请选择统计对象</option>
              {STAT_OBJECTS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {errors.statObject && <p className="mt-1 text-xs text-red-500">{errors.statObject}</p>}
          </div>

          {/* 数据类型（单选） */}
          <div>
            <label className={labelCls}>
              数据类型 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-5 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              {DATA_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="dataType"
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={form.dataType === t}
                    onChange={() => switchDataType(t)}
                  />
                  {t}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {isCurrent ? "当期值原则上对应单个月份，结束月份自动与起始月份一致" : "累计值对应连续月份范围"}
            </p>
          </div>

          {/* 统计周期（月份范围选择器；当期值锁定单月） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                起始月份 <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                className={inputCls}
                value={form.periodStart}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    periodStart: e.target.value,
                    periodEnd: f.dataType === "当期值" ? e.target.value : f.periodEnd,
                  }))
                }
              />
              {errors.periodStart && <p className="mt-1 text-xs text-red-500">{errors.periodStart}</p>}
            </div>
            <div>
              <label className={labelCls}>
                结束月份 <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                className={`${inputCls} disabled:bg-gray-100 disabled:text-gray-400`}
                value={isCurrent ? form.periodStart : form.periodEnd}
                disabled={isCurrent}
                onChange={(e) => set("periodEnd", e.target.value)}
                title={isCurrent ? "当期值对应单个月份，结束月份与起始月份一致" : undefined}
              />
              {errors.periodEnd && <p className="mt-1 text-xs text-red-500">{errors.periodEnd}</p>}
            </div>
          </div>
          {(form.periodStart || form.periodEnd) && (
            <p className="-mt-3 text-xs text-gray-400">
              统计周期：{form.periodStart ? monthLabel(form.periodStart) : "—"}—
              {form.periodEnd || (isCurrent ? form.periodStart : "") ? monthLabel(isCurrent ? form.periodStart : form.periodEnd) : "—"}
            </p>
          )}

          {/* 指标值 + 单位（只读带出） */}
          <div className="grid grid-cols-[1fr_120px] gap-4">
            <div>
              <label className={labelCls}>
                指标值 <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder="如：12,580.00"
                error={errors.value}
              />
            </div>
            <div>
              <label className={labelCls}>单位</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50 truncate" title="单位随所选指标自动带出">
                {unit || "—"}
              </div>
            </div>
          </div>

          {/* 数据来源 */}
          <div>
            <label className={labelCls}>数据来源</label>
            <input
              maxLength={100}
              className={inputCls}
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="请填写数据来源或提供部门，如：财务部门手工填报"
            />
            <div className="mt-1 flex justify-between">
              {errors.source ? <p className="text-xs text-red-500">{errors.source}</p> : <span />}
              <span className="text-xs text-gray-400">{form.source.length}/100</span>
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className={labelCls}>备注</label>
            <textarea
              rows={3}
              maxLength={200}
              className={`${inputCls} resize-none`}
              value={form.remark}
              onChange={(e) => set("remark", e.target.value)}
              placeholder="请填写补充说明"
            />
            <div className="mt-1 flex justify-between">
              {errors.remark ? <p className="text-xs text-red-500">{errors.remark}</p> : <span />}
              <span className="text-xs text-gray-400">{form.remark.length}/200</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            说明：相同指标、统计对象、统计周期和数据类型不得重复维护；保存与删除均需二次确认并记录操作人及操作时间。
          </p>
        </div>
      </Drawer>

      {/* 保存二次确认弹窗 */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="确认保存" size="sm">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            {baseRecord ? (
              <>
                确认保存对记录 <span className="font-mono text-xs">{baseRecord.id}</span> 的修改
                {summary.length ? <>（修改了{summary.join("、")}）</> : <>（内容无变化）</>}？
              </>
            ) : (
              <>
                确认新增指标值记录
                {metric ? <>「{metric.nameCn}｜{form.statObject}｜{form.dataType}」</> : null}？
              </>
            )}
            保存后将记录操作人及操作时间。
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>确认保存</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
