"use client";

// 折标系数 - 新增/编辑表单抽屉（编辑 = 基于原版本生成新版本，原记录永久保留）
// 表单底部实时展示完整换算关系表达式预览；保存前检测同序列周期冲突
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import {
  BASE_UNITS,
  COEFF_TYPES,
  ENERGY_TYPES,
  RESULT_UNITS,
  hasPeriodConflict,
  nextVersionOf,
  previewExpression,
  saveCoefficient,
} from "@/lib/mock-data/energy-coefficients";
import type { CoeffEnergyType, CoefficientVersion, CoeffType } from "@/types";

// 表单态（数字输入用字符串，便于校验）
interface CoeffFormState {
  energyType: CoeffEnergyType;
  coeffType: CoeffType;
  energySource: "外购" | "自制";
  baseAmount: string;
  baseUnit: string;
  value: string;
  resultUnit: string;
  effectiveStart: string;
  effectiveEnd: string;
  enabled: boolean;
  basis: string;
  changeNote: string;
}

function toFormState(c: CoefficientVersion | null): CoeffFormState {
  return {
    energyType: c?.energyType ?? "电",
    coeffType: c?.coeffType ?? "折标准煤系数",
    energySource: c?.energySource ?? "外购",
    baseAmount: c ? String(c.baseAmount) : "1",
    baseUnit: c?.baseUnit ?? "kWh",
    value: c ? String(c.value) : "",
    resultUnit: c?.resultUnit ?? "kgce",
    effectiveStart: c?.effectiveStart ?? "",
    effectiveEnd: c?.effectiveEnd ?? "",
    enabled: c?.enabled ?? true,
    basis: c?.basis ?? "",
    changeNote: "",
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

  // 切换能源类型：联动原始单位（不在可选列表时重置为第一项）与能源来源（非蒸汽固定外购）
  function switchEnergyType(t: CoeffEnergyType) {
    setForm((f) => {
      const units = BASE_UNITS[t];
      return {
        ...f,
        energyType: t,
        baseUnit: units.includes(f.baseUnit) ? f.baseUnit : units[0],
        energySource: t === "蒸汽" ? f.energySource : "外购",
      };
    });
    setErrors({});
  }

  // 切换系数类型：联动结果单位
  function switchCoeffType(t: CoeffType) {
    setForm((f) => {
      const units = RESULT_UNITS[t];
      return {
        ...f,
        coeffType: t,
        resultUnit: units.includes(f.resultUnit) ? f.resultUnit : units[0],
      };
    });
    setErrors({});
  }

  function validate(): { baseAmount: number; value: number } | null {
    const errs: Record<string, string> = {};

    const baseAmount = Number(form.baseAmount);
    if (!form.baseAmount.trim() || !Number.isFinite(baseAmount) || baseAmount <= 0) {
      errs.baseAmount = "换算基准量必须为大于 0 的数字";
    }
    const value = Number(form.value);
    if (!form.value.trim() || !Number.isFinite(value) || value <= 0) {
      errs.value = "换算值必须为大于 0 的数字（支持小数）";
    }
    if (!form.effectiveStart) errs.effectiveStart = "请选择生效开始日期";
    if (!form.effectiveEnd) errs.effectiveEnd = "请选择生效结束日期";
    if (form.effectiveStart && form.effectiveEnd && form.effectiveEnd < form.effectiveStart) {
      errs.effectiveEnd = "生效结束日期不能早于开始日期";
    }
    if (!form.basis.trim()) errs.basis = "请填写来源依据（国家标准 / 政府公告 / 公司内部文件）";
    else if (form.basis.length > 200) errs.basis = "来源依据不能超过 200 字";
    if (isEdit && !form.changeNote.trim()) errs.changeNote = "编辑生成新版本时必须填写变更说明";
    if (form.changeNote.length > 200) errs.changeNote = "变更说明不能超过 200 字";

    setErrors(errs);
    if (Object.keys(errs).length) return null;
    return { baseAmount, value };
  }

  // 校验通过后：检测同序列周期冲突 → 有冲突先确认，无冲突直接保存
  function handleSave() {
    const nums = validate();
    if (!nums) return;
    const hit = hasPeriodConflict(
      form.energyType,
      form.coeffType,
      form.energySource,
      form.effectiveStart,
      form.effectiveEnd,
      baseVersion?.id
    );
    if (hit) {
      setConflict(hit);
      return;
    }
    doSave(nums);
  }

  function doSave(nums: { baseAmount: number; value: number }) {
    setSaving(true);
    saveCoefficient(
      {
        energyType: form.energyType,
        coeffType: form.coeffType,
        energySource: form.energySource,
        baseAmount: nums.baseAmount,
        baseUnit: form.baseUnit,
        value: nums.value,
        resultUnit: form.resultUnit,
        effectiveStart: form.effectiveStart,
        effectiveEnd: form.effectiveEnd,
        enabled: form.enabled,
        basis: form.basis.trim(),
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

  // 即将生成的版本号（随序列联动，以保存时系统生成为准）
  const nextVersion = nextVersionOf(form.energyType, form.coeffType, form.energySource);
  // 实时表达式预览（填写完整后显示）
  const baseAmountNum = Number(form.baseAmount);
  const valueNum = Number(form.value);
  const previewReady =
    Number.isFinite(baseAmountNum) &&
    baseAmountNum > 0 &&
    Number.isFinite(valueNum) &&
    valueNum > 0;

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
          {/* 能源类型 + 系数类型（单选按钮） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                能源类型 <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                value={form.energyType}
                onChange={(e) => switchEnergyType(e.target.value as CoeffEnergyType)}
              >
                {ENERGY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                系数类型 <span className="text-red-500">*</span>
              </label>
              <div className="flex h-[38px] items-center gap-4">
                {COEFF_TYPES.map((t) => (
                  <label key={t} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                    <input
                      type="radio"
                      className="accent-primary-600"
                      checked={form.coeffType === t}
                      onChange={() => switchCoeffType(t)}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 能源来源（蒸汽区分外购/自制，其余固定外购） */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>
                能源来源 <span className="text-red-500">*</span>
              </label>
              {form.energyType === "蒸汽" ? (
                <select
                  className={inputCls}
                  value={form.energySource}
                  onChange={(e) => set("energySource", e.target.value as "外购" | "自制")}
                >
                  <option value="外购">外购</option>
                  <option value="自制">自制</option>
                </select>
              ) : (
                <div className={readonlyCls}>外购</div>
              )}
            </div>
            {/* 版本号（系统生成，只读） */}
            <div>
              <label className={labelCls}>版本号</label>
              <div className={readonlyCls}>
                {nextVersion}
                {isEdit && <span className="ml-1 text-xs">（新）</span>}
              </div>
            </div>
            {/* 状态（保存后系统推导，只读） */}
            <div>
              <label className={labelCls}>状态</label>
              <div className={readonlyCls}>保存后按生效周期自动判定</div>
            </div>
          </div>

          {/* 换算关系：基准量 + 原始单位 + 换算值 + 结果单位 */}
          <div>
            <label className={labelCls}>换算关系</label>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={`${inputCls} ${errors.baseAmount ? "border-red-400 focus:ring-red-400" : ""}`}
                  value={form.baseAmount}
                  onChange={(e) => set("baseAmount", e.target.value)}
                  placeholder="基准量"
                />
                <p className="mt-0.5 text-center text-xs text-gray-400">换算基准量</p>
              </div>
              <div>
                <select
                  className={inputCls}
                  value={form.baseUnit}
                  onChange={(e) => set("baseUnit", e.target.value)}
                >
                  {BASE_UNITS[form.energyType].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <p className="mt-0.5 text-center text-xs text-gray-400">原始单位</p>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className={`${inputCls} ${errors.value ? "border-red-400 focus:ring-red-400" : ""}`}
                  value={form.value}
                  onChange={(e) => set("value", e.target.value)}
                  placeholder="换算值"
                />
                <p className="mt-0.5 text-center text-xs text-gray-400">换算值</p>
              </div>
              <div>
                <select
                  className={inputCls}
                  value={form.resultUnit}
                  onChange={(e) => set("resultUnit", e.target.value)}
                >
                  {RESULT_UNITS[form.coeffType].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <p className="mt-0.5 text-center text-xs text-gray-400">结果单位</p>
              </div>
            </div>
            {(errors.baseAmount || errors.value) && (
              <p className="mt-1 text-xs text-red-500">{errors.baseAmount ?? errors.value}</p>
            )}
            {/* 实时完整表达式预览 */}
            <div className="mt-2 rounded-lg border border-primary-100 bg-primary-50/60 px-3 py-2">
              <span className="text-xs text-primary-700">表达式预览：</span>
              <span className="ml-1 text-sm font-medium text-gray-800">
                {previewReady
                  ? previewExpression(
                      form.energyType,
                      baseAmountNum,
                      form.baseUnit,
                      valueNum,
                      form.resultUnit
                    )
                  : "—（填写换算基准量与换算值后显示）"}
              </span>
            </div>
          </div>

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
              placeholder="如国家标准 GB/T 2589-2020 / 政府公告 / 公司内部文件名称"
            />
            <div className="mt-1 flex justify-between">
              {errors.basis ? <p className="text-xs text-red-500">{errors.basis}</p> : <span />}
              <span className="text-xs text-gray-400">{form.basis.length}/200</span>
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

          {/* 系统生成只读信息 */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-400">
            创建时间 / 创建人 由系统自动生成；版本号在同「能源类型 + 系数类型 + 能源来源」序列下自动递增，
            编辑将生成新版本（原版本永久保留），新版本到达生效时间后自动替代旧版本。
          </div>
        </div>
      </Drawer>

      {/* 周期冲突确认：同一时点仅允许一个有效版本 */}
      <Modal open={conflict !== null} onClose={() => setConflict(null)} title="生效周期冲突确认" size="sm">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            检测到同序列（{form.energyType} · {form.coeffType} · {form.energySource}）下版本{" "}
            <span className="font-medium text-gray-800">{conflict?.version}</span>
            （{conflict?.effectiveStart} 至 {conflict?.effectiveEnd}，{conflict?.status}）与本次设置的生效周期重叠。
            保存后，新版本到达生效时间将自动替代该版本（旧版本置为已失效并记录替代时间）。是否继续保存？
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setConflict(null)}>
              取消
            </Button>
            <Button
              onClick={() => {
                const nums = validate();
                if (nums) doSave(nums);
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
