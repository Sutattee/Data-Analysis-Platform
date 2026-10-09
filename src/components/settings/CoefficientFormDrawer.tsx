"use client";

// 折标系数 - 新增/编辑表单抽屉（编辑 = 基于原版本生成新版本，原记录永久保留）
// 系数单位随能源类型自动带出（kgce/kWh 等）；保存前检测同能源类型周期冲突
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import {
  ENERGY_TYPES,
  ENERGY_UNITS,
  hasPeriodConflict,
  nextVersionOf,
  saveCoefficient,
} from "@/lib/mock-data/energy-coefficients";
import type { CoeffEnergyType, CoefficientVersion } from "@/types";

// 表单态（数字输入用字符串，便于校验）
interface CoeffFormState {
  energyType: CoeffEnergyType;
  value: string; // 折标煤系数
  effectiveStart: string;
  effectiveEnd: string;
  enabled: boolean;
  basis: string;
  remark: string;
}

function toFormState(c: CoefficientVersion | null): CoeffFormState {
  return {
    energyType: c?.energyType ?? "电（一类碳排放）",
    value: c ? String(c.value) : "",
    effectiveStart: c?.effectiveStart ?? "",
    effectiveEnd: c?.effectiveEnd ?? "",
    enabled: c?.enabled ?? true,
    basis: c?.basis ?? "",
    remark: c?.remark ?? "",
  };
}

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const labelCls = "text-sm font-medium text-gray-700 mb-1";
const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
const textareaCls = `${inputCls} resize-none`;
const readonlyCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50";

export function CoefficientFormDrawer({
  open,
  onClose,
  baseVersion, // null = 新增
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  baseVersion: CoefficientVersion | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { state } = useApp();
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";
  const [form, setForm] = useState<CoeffFormState>(toFormState(null));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // 周期冲突确认（保存前提示用户确认替代关系）
  const [conflict, setConflict] = useState<CoefficientVersion | null>(null);
  const isEdit = baseVersion !== null;

  useEffect(() => {
    if (open) {
      setForm(toFormState(baseVersion));
      setErrors({});
      setConflict(null);
    }
  }, [open, baseVersion]);

  function set<K extends keyof CoeffFormState>(key: K, value: CoeffFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((errs) => {
      const next = { ...errs };
      delete next[key as string];
      return next;
    });
  }

  function validate(): number | null {
    const errs: Record<string, string> = {};

    const value = Number(form.value);
    if (!form.value.trim() || !Number.isFinite(value) || value <= 0) {
      errs.value = "折标煤系数必须为大于 0 的数字（支持小数）";
    }
    if (!form.effectiveStart) errs.effectiveStart = "请选择生效开始日期";
    if (!form.effectiveEnd) errs.effectiveEnd = "请选择生效结束日期";
    if (form.effectiveStart && form.effectiveEnd && form.effectiveEnd < form.effectiveStart) {
      errs.effectiveEnd = "生效结束日期不能早于开始日期";
    }
    if (!form.basis.trim()) errs.basis = "请填写来源依据（国家标准 / 政府公告 / 公司内部文件）";
    else if (form.basis.length > 200) errs.basis = "来源依据不能超过 200 字";
    if (form.remark.length > 200) errs.remark = "备注不能超过 200 字";

    setErrors(errs);
    if (Object.keys(errs).length) return null;
    return value;
  }

  // 校验通过后：检测同能源类型周期冲突 → 有冲突先确认，无冲突直接保存
  function handleSave() {
    const value = validate();
    if (value === null) return;
    const hit = hasPeriodConflict(form.energyType, form.effectiveStart, form.effectiveEnd, baseVersion?.id);
    if (hit) {
      setConflict(hit);
      return;
    }
    doSave(value);
  }

  function doSave(value: number) {
    setSaving(true);
    saveCoefficient(
      {
        energyType: form.energyType,
        value,
        effectiveStart: form.effectiveStart,
        effectiveEnd: form.effectiveEnd,
        enabled: form.enabled,
        basis: form.basis.trim(),
        remark: form.remark.trim() || undefined,
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

  // 即将生成的版本号（随能源类型联动，以保存时系统生成为准）
  const nextVersion = nextVersionOf(form.energyType);
  // 系数单位（随能源类型自动带出）
  const unit = ENERGY_UNITS[form.energyType];
  // 1 kWh = 已填系数 kgce（灰色换算提示）
  const valueNum = Number(form.value);
  const conversionTip = `1 ${unit} = ${
    form.value.trim() && Number.isFinite(valueNum) && valueNum > 0 ? valueNum : "已填系数"
  } kgce`;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={isEdit ? "编辑系数（生成新版本）" : "新增系数"}
        width={560}
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
          {/* 能源类型 + 版本号（系统生成，只读） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                能源类型 <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                value={form.energyType}
                onChange={(e) => set("energyType", e.target.value as CoeffEnergyType)}
              >
                {ENERGY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>版本号</label>
              <div className={readonlyCls}>
                {nextVersion}
                {isEdit && <span className="ml-1 text-xs">（新）</span>}
              </div>
            </div>
          </div>

          {/* 折标煤系数：单位随能源类型自动带出，下方灰色换算提示 */}
          <div>
            <label className={labelCls}>
              折标煤系数 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.0001"
                className={`${inputCls} ${errors.value ? "border-red-400 focus:ring-red-400" : ""}`}
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder="请输入"
              />
              <span className="flex-shrink-0 text-sm text-gray-500">kgce/{unit}</span>
            </div>
            {errors.value ? (
              <p className="mt-1 text-xs text-red-500">{errors.value}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">{conversionTip}</p>
            )}
          </div>

          {/* 生效周期：起止日期（起始不得晚于结束） */}
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
              {errors.effectiveStart && (
                <p className="mt-1 text-xs text-red-500">{errors.effectiveStart}</p>
              )}
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
              {errors.effectiveEnd && (
                <p className="mt-1 text-xs text-red-500">{errors.effectiveEnd}</p>
              )}
            </div>
          </div>

          {/* 是否启用：开关（默认开启） */}
          <div className="flex items-center justify-between">
            <div>
              <label className={labelCls}>
                是否启用 <span className="text-red-500">*</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => set("enabled", !form.enabled)}
              className={`inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                form.enabled ? "bg-primary-600" : "bg-gray-300"
              }`}
              title={form.enabled ? "点击关闭" : "点击开启"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.enabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* 来源依据（必填） */}
          <div>
            <label className={labelCls}>
              来源依据 <span className="text-red-500">*</span>
            </label>
            <input
              maxLength={200}
              className={`${inputCls} ${errors.basis ? "border-red-400 focus:ring-red-400" : ""}`}
              value={form.basis}
              onChange={(e) => set("basis", e.target.value)}
              placeholder="填写国家标准、政府公告或公司内部文件"
            />
            <div className="mt-1 flex justify-between">
              {errors.basis ? <p className="text-xs text-red-500">{errors.basis}</p> : <span />}
              <span className="text-xs text-gray-400">{form.basis.length}/200</span>
            </div>
          </div>

          {/* 备注（选填，≤200 字） */}
          <div>
            <label className={labelCls}>备注</label>
            <textarea
              rows={3}
              maxLength={200}
              className={`${textareaCls} ${errors.remark ? "border-red-400 focus:ring-red-400" : ""}`}
              value={form.remark}
              onChange={(e) => set("remark", e.target.value)}
              placeholder="补充说明（选填，不超过 200 字）"
            />
            <div className="mt-1 flex justify-between">
              {errors.remark ? <p className="text-xs text-red-500">{errors.remark}</p> : <span />}
              <span className="text-xs text-gray-400">{form.remark.length}/200</span>
            </div>
          </div>

        </div>
      </Drawer>

      {/* 周期冲突确认：同一时点仅允许一个有效版本 */}
      <Modal open={conflict !== null} onClose={() => setConflict(null)} title="生效周期冲突确认" size="sm">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            检测到同能源类型（{form.energyType}）下版本{" "}
            <span className="font-medium text-gray-800">{conflict?.version}</span>
            （{conflict?.effectiveStart}至{conflict?.effectiveEnd}，{conflict?.status}）与本次设置的生效周期重叠。
            保存后，新版本到达生效时间将自动替代该版本（旧版本置为已失效并记录替代时间）。是否继续保存？
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setConflict(null)}>
              取消
            </Button>
            <Button
              onClick={() => {
                const value = validate();
                if (value !== null) doSave(value);
              }}
            >
              确认保存
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
