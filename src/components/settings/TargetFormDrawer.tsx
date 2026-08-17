"use client";

// 目标值管理 - 新增/编辑表单抽屉（编辑 = 基于原版本生成新版本，原记录永久保留）
// 保存前检测同序列周期冲突，冲突时先弹确认（同一时点仅允许一个有效版本）
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import {
  SUPPORTED_TARGET_PERIODS,
  hasPeriodConflict,
  nextVersionOf,
  saveTarget,
} from "@/lib/mock-data/metric-targets";
import type { MetricManage, MetricTargetVersion, TargetDirection, TargetPeriod } from "@/types";

const DIRECTIONS: TargetDirection[] = ["<", "≤", ">", "≥", "=", "处于目标区间"];

// 表单态（数字输入用字符串，便于做空值/小数位校验）
interface TargetFormState {
  period: TargetPeriod;
  direction: TargetDirection;
  value: string;
  lower: string;
  upper: string;
  effectiveStart: string;
  effectiveEnd: string;
  enabled: boolean;
  basis: string;
  remark: string;
  changeNote: string;
}

function toFormState(v: MetricTargetVersion | null): TargetFormState {
  return {
    period: v?.period ?? "年度",
    direction: v?.direction ?? "≤",
    value: v?.value !== undefined ? String(v.value) : "",
    lower: v?.lower !== undefined ? String(v.lower) : "",
    upper: v?.upper !== undefined ? String(v.upper) : "",
    effectiveStart: v?.effectiveStart ?? "",
    effectiveEnd: v?.effectiveEnd ?? "",
    enabled: v?.enabled ?? true,
    basis: v?.basis ?? "",
    remark: v?.remark ?? "",
    changeNote: "",
  };
}

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 小数位数
function decimalsOf(s: string): number {
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

const labelCls = "text-sm font-medium text-gray-700 mb-1";
const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
const textareaCls = `${inputCls} resize-none`;
const readonlyCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50";

export function TargetFormDrawer({
  open,
  onClose,
  metric,
  baseVersion, // null = 新增
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  metric: MetricManage;
  baseVersion: MetricTargetVersion | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { state } = useApp();
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";
  const [form, setForm] = useState<TargetFormState>(toFormState(null));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // 周期冲突确认（保存前提示用户确认替代关系）；pendingNums 缓存已通过校验的数值
  const [conflict, setConflict] = useState<MetricTargetVersion | null>(null);
  const [pendingNums, setPendingNums] = useState<{ value?: number; lower?: number; upper?: number }>({
    value: undefined,
    lower: undefined,
    upper: undefined,
  });
  const isEdit = baseVersion !== null;

  useEffect(() => {
    if (open) {
      setForm(toFormState(baseVersion));
      setErrors({});
      setConflict(null);
    }
  }, [open, baseVersion]);

  function set<K extends keyof TargetFormState>(key: K, value: TargetFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((errs) => {
      const next = { ...errs };
      delete next[key as string];
      return next;
    });
  }

  // 数字校验：必填、合法数字、>0、小数位与指标一致
  function checkNumber(key: string, s: string, required: boolean): number | undefined {
    if (!required) return undefined;
    if (!s.trim()) {
      setErrors((e) => ({ ...e, [key]: "请输入数值" }));
      return undefined;
    }
    const n = Number(s);
    if (!Number.isFinite(n)) {
      setErrors((e) => ({ ...e, [key]: "请输入合法数字" }));
      return undefined;
    }
    if (n <= 0) {
      setErrors((e) => ({ ...e, [key]: "数值必须大于 0" }));
      return undefined;
    }
    if (decimalsOf(s) > metric.decimals) {
      setErrors((e) => ({ ...e, [key]: `小数位不能超过 ${metric.decimals} 位（与指标一致）` }));
      return undefined;
    }
    return n;
  }

  function validate(): { value?: number; lower?: number; upper?: number } | null {
    const errs: Record<string, string> = {};
    const isRange = form.direction === "处于目标区间";
    let value: number | undefined;
    let lower: number | undefined;
    let upper: number | undefined;

    if (isRange) {
      lower = checkNumber("lower", form.lower, true);
      upper = checkNumber("upper", form.upper, true);
      if (lower !== undefined && upper !== undefined && lower >= upper) {
        errs.upper = "目标区间上限必须大于下限";
      }
    } else {
      value = checkNumber("value", form.value, true);
    }
    if (!form.effectiveStart) errs.effectiveStart = "请选择生效开始日期";
    if (!form.effectiveEnd) errs.effectiveEnd = "请选择生效结束日期";
    if (form.effectiveStart && form.effectiveEnd && form.effectiveEnd < form.effectiveStart) {
      errs.effectiveEnd = "生效结束日期不能早于开始日期";
    }
    if (form.basis.length > 200) errs.basis = "目标依据不能超过 200 字";
    if (form.remark.length > 200) errs.remark = "备注不能超过 200 字";
    if (isEdit && !form.changeNote.trim()) errs.changeNote = "编辑生成新版本时必须填写变更说明";
    if (form.changeNote.length > 200) errs.changeNote = "变更说明不能超过 200 字";

    setErrors(errs);
    if (Object.keys(errs).length) return null;
    return { value, lower, upper };
  }

  // 校验通过后：检测同序列周期冲突 → 有冲突先确认，无冲突直接保存
  function handleSave() {
    const nums = validate();
    if (!nums) return;
    const hit = hasPeriodConflict(
      metric.id,
      form.period,
      form.effectiveStart,
      form.effectiveEnd,
      baseVersion?.id
    );
    if (hit) {
      setPendingNums(nums);
      setConflict(hit);
      return;
    }
    doSave(nums);
  }

  function doSave(nums: { value?: number; lower?: number; upper?: number }) {
    setSaving(true);
    saveTarget(
      {
        metricId: metric.id,
        metricName: metric.nameCn,
        unit: metric.unit,
        decimals: metric.decimals,
        period: form.period,
        direction: form.direction,
        value: nums.value,
        lower: nums.lower,
        upper: nums.upper,
        effectiveStart: form.effectiveStart,
        effectiveEnd: form.effectiveEnd,
        enabled: form.enabled,
        basis: form.basis.trim() || undefined,
        remark: form.remark.trim() || undefined,
        changeNote: form.changeNote.trim() || undefined,
        baseVersionId: baseVersion?.id,
      },
      { user: currentUser, now: formatNow() }
    );
    setSaving(false);
    setConflict(null);
    onClose();
    toast("保存成功", "success");
    onSaved();
  }

  // 即将生成的版本号（随考核周期联动，以保存时系统生成为准）
  const nextVersion = nextVersionOf(metric.id, form.period);
  const isRange = form.direction === "处于目标区间";

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={isEdit ? "编辑目标值（生成新版本）" : "新增目标值"}
        width={520}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              保存
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* 只读：指标名称 / 版本号 / 指标单位 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>指标名称</label>
              <div className={readonlyCls}>{metric.nameCn}</div>
            </div>
            <div>
              <label className={labelCls}>版本号</label>
              <div className={readonlyCls}>
                {nextVersion}
                {isEdit && <span className="ml-1 text-xs">（新）</span>}
              </div>
            </div>
            <div>
              <label className={labelCls}>指标单位</label>
              <div className={readonlyCls}>{metric.unit}</div>
            </div>
          </div>
          {isEdit && (
            <p className="-mt-2 text-xs text-gray-400">
              编辑不会修改原版本 V{baseVersion?.version.replace(/^V/, "")}，保存后将基于其生成新版本，并要求填写变更说明。
            </p>
          )}

          {/* 考核周期 + 判断方向 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                考核周期 <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                value={form.period}
                onChange={(e) => set("period", e.target.value as TargetPeriod)}
              >
                {SUPPORTED_TARGET_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                判断方向 <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                value={form.direction}
                onChange={(e) => set("direction", e.target.value as TargetDirection)}
              >
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 目标值 / 目标区间（按判断方向条件展示） */}
          {isRange ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  目标区间下限 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step={Math.pow(10, -metric.decimals)}
                  className={`${inputCls} ${errors.lower ? "border-red-400 focus:ring-red-400" : ""}`}
                  value={form.lower}
                  onChange={(e) => set("lower", e.target.value)}
                  placeholder={`保留 ${metric.decimals} 位小数`}
                />
                {errors.lower && <p className="mt-1 text-xs text-red-500">{errors.lower}</p>}
              </div>
              <div>
                <label className={labelCls}>
                  目标区间上限 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step={Math.pow(10, -metric.decimals)}
                  className={`${inputCls} ${errors.upper ? "border-red-400 focus:ring-red-400" : ""}`}
                  value={form.upper}
                  onChange={(e) => set("upper", e.target.value)}
                  placeholder={`保留 ${metric.decimals} 位小数`}
                />
                {errors.upper && <p className="mt-1 text-xs text-red-500">{errors.upper}</p>}
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>
                目标值 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step={Math.pow(10, -metric.decimals)}
                className={`${inputCls} ${errors.value ? "border-red-400 focus:ring-red-400" : ""}`}
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder={`数值（${form.direction} 目标值），保留 ${metric.decimals} 位小数`}
              />
              {errors.value && <p className="mt-1 text-xs text-red-500">{errors.value}</p>}
            </div>
          )}

          {/* 生效周期 + 是否启用 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                生效开始 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className={`${inputCls} ${errors.effectiveStart ? "border-red-400 focus:ring-red-400" : ""}`}
                value={form.effectiveStart}
                onChange={(e) => set("effectiveStart", e.target.value)}
              />
              {errors.effectiveStart && <p className="mt-1 text-xs text-red-500">{errors.effectiveStart}</p>}
            </div>
            <div>
              <label className={labelCls}>
                生效结束 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className={`${inputCls} ${errors.effectiveEnd ? "border-red-400 focus:ring-red-400" : ""}`}
                value={form.effectiveEnd}
                onChange={(e) => set("effectiveEnd", e.target.value)}
              />
              {errors.effectiveEnd ? (
                <p className="mt-1 text-xs text-red-500">{errors.effectiveEnd}</p>
              ) : (
                <label className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={form.enabled}
                    onChange={(e) => set("enabled", e.target.checked)}
                  />
                  是否启用（保存后立即按生效周期参与状态判断）
                </label>
              )}
            </div>
          </div>

          {/* 目标依据 */}
          <div>
            <label className={labelCls}>目标依据</label>
            <textarea
              rows={2}
              maxLength={200}
              className={`${textareaCls} ${errors.basis ? "border-red-400 focus:ring-red-400" : ""}`}
              value={form.basis}
              onChange={(e) => set("basis", e.target.value)}
              placeholder="填写目标制定依据，如年度考核文件、行业对标值等（选填）"
            />
            <div className="mt-1 flex justify-between">
              {errors.basis ? <p className="text-xs text-red-500">{errors.basis}</p> : <span />}
              <span className="text-xs text-gray-400">{form.basis.length}/200</span>
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className={labelCls}>备注</label>
            <textarea
              rows={2}
              maxLength={200}
              className={`${textareaCls} ${errors.remark ? "border-red-400 focus:ring-red-400" : ""}`}
              value={form.remark}
              onChange={(e) => set("remark", e.target.value)}
              placeholder="补充说明（选填）"
            />
            <div className="mt-1 flex justify-between">
              {errors.remark ? <p className="text-xs text-red-500">{errors.remark}</p> : <span />}
              <span className="text-xs text-gray-400">{form.remark.length}/200</span>
            </div>
          </div>

          {/* 变更说明（编辑生成新版本时必填） */}
          {isEdit && (
            <div>
              <label className={labelCls}>
                变更说明 <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                maxLength={200}
                className={`${textareaCls} ${errors.changeNote ? "border-red-400 focus:ring-red-400" : ""}`}
                value={form.changeNote}
                onChange={(e) => set("changeNote", e.target.value)}
                placeholder="说明本次相对原版本的变更内容与原因"
              />
              <div className="mt-1 flex justify-between">
                {errors.changeNote ? (
                  <p className="text-xs text-red-500">{errors.changeNote}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-400">{form.changeNote.length}/200</span>
              </div>
            </div>
          )}

          <p className="text-xs leading-relaxed text-gray-400">
            说明：同一指标、同一考核周期下版本号自动递增；新版本到达生效时间后将自动替代旧生效版本；历史版本永久保留，仅可查看。
          </p>
        </div>
      </Drawer>

      {/* 周期冲突确认：同一时点仅允许一个有效版本 */}
      <Modal open={conflict !== null} onClose={() => setConflict(null)} title="生效周期冲突确认" size="sm">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            检测到同序列下版本 <span className="font-medium text-gray-800">{conflict?.version}</span>
            （{conflict?.effectiveStart} 至 {conflict?.effectiveEnd}，{conflict?.status}）与本次设置的生效周期重叠。
            保存后，新版本到达生效时间将自动替代该版本（旧版本置为已失效并记录替代时间）。是否继续保存？
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setConflict(null)}>
              取消
            </Button>
            <Button onClick={() => doSave(pendingNums)}>确认保存</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
