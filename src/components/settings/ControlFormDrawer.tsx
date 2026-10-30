"use client";

// 管控值管理 - 新增/编辑表单抽屉
// 规则：指标名称编辑时不可修改；单位随指标自动带出（只读）；
// 判断方向默认按指标带出（水分允许范围 between / 偏差·次数·时长 ≤ / 优质品率 ≥）；
// 单值 / 区间数值按指标口径校验（percent 0~100 / count 非负整数 / duration 非负数）；
// 每个指标仅一条配置，已停用配置的指标不可再新增；保存后关闭抽屉并刷新列表
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import {
  DIR_LABEL,
  DIR_OPTIONS,
  controlMetricCatalog,
  controlMetricOf,
  isControlConfigured,
  saveControlConfig,
  validateControlValue,
} from "@/lib/mock-data/metric-controls";
import type { ControlDir, MetricControlConfig } from "@/types";

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface FormState {
  metricId: string;            // 指标（编辑时不可改）
  dir: ControlDir | "";        // 判断方向（选指标后默认带出）
  value: string;               // 单值（输入态）
  low: string;                 // 区间下限（输入态）
  high: string;                // 区间上限（输入态）
  enabled: boolean;            // 启停（新增默认启用）
}

const EMPTY: FormState = {
  metricId: "",
  dir: "",
  value: "",
  low: "",
  high: "",
  enabled: true,
};

function toFormState(r: MetricControlConfig | null): FormState {
  if (!r) return { ...EMPTY };
  return {
    metricId: r.metricId,
    dir: r.dir,
    value: r.value !== undefined ? String(r.value) : "",
    low: r.low !== undefined ? String(r.low) : "",
    high: r.high !== undefined ? String(r.high) : "",
    enabled: r.enabled,
  };
}

const labelCls = "text-sm font-medium text-gray-700 mb-1";
const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
// 只读展示（灰底）：编辑时的指标、随指标带出的单位
const readonlyCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50";

export function ControlFormDrawer({
  open,
  onClose,
  baseConfig, // null = 新增
  user,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  baseConfig: MetricControlConfig | null;
  user: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(toFormState(baseConfig));
      setErrors({});
    }
  }, [open, baseConfig]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((errs) => {
      const next = { ...errs };
      delete next[key as string];
      return next;
    });
  }

  // 选择指标：带出单位精度与默认判断方向，清空数值
  function changeMetric(id: string) {
    const def = controlMetricOf(id);
    setForm((f) => ({ ...f, metricId: id, dir: def?.defaultDir ?? "", value: "", low: "", high: "" }));
    setErrors((errs) => {
      const next = { ...errs };
      delete next.metricId;
      delete next.dir;
      return next;
    });
  }

  const metricDef = form.metricId ? controlMetricOf(form.metricId) : undefined;
  const isBetween = form.dir === "between";

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.metricId) errs.metricId = "请选择指标名称";
    if (!form.dir) errs.dir = "请选择判断方向";
    if (metricDef && form.dir) {
      if (isBetween) {
        const eLow = validateControlValue(metricDef.valueKind, metricDef.decimals, form.low);
        if (eLow) errs.low = eLow;
        const eHigh = validateControlValue(metricDef.valueKind, metricDef.decimals, form.high);
        if (eHigh) errs.high = eHigh;
        if (!eLow && !eHigh && Number(form.low) >= Number(form.high)) {
          errs.high = "上限必须大于下限";
        }
      } else {
        const eVal = validateControlValue(metricDef.valueKind, metricDef.decimals, form.value);
        if (eVal) errs.value = eVal;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    if (
      !baseConfig &&
      form.metricId &&
      isControlConfigured(form.metricId)
    ) {
      toast("该指标已存在管控值配置（含停用），不可重复新增", "warning");
      return;
    }
    saveControlConfig(
      {
        id: baseConfig?.id,
        metricId: form.metricId,
        dir: form.dir as ControlDir,
        value: !isBetween && form.value.trim() ? Number(form.value) : undefined,
        low: isBetween && form.low.trim() ? Number(form.low) : undefined,
        high: isBetween && form.high.trim() ? Number(form.high) : undefined,
        enabled: form.enabled,
      },
      { user, now: formatNow() }
    );
    onClose();
    onSaved();
    toast(baseConfig ? "管控值配置已更新，已启用配置立即生效" : "管控值已新增", "success");
  }

  // 指标候选：预置指标目录全量展示（重复配置在保存时校验拦截）
  const metricOptions = controlMetricCatalog().map((m) => ({ value: m.id, label: m.name }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={baseConfig ? `编辑管控值（${baseConfig.metricName}）` : "新增管控值"}
      width={520}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 指标名称（预置指标目录；编辑不可修改） */}
        <div>
          <label className={labelCls}>
            指标名称 <span className="text-red-500">*</span>
          </label>
          {baseConfig ? (
            <div className={readonlyCls} title="编辑时指标名称不可修改">
              {baseConfig.metricName}
            </div>
          ) : (
            <SearchSelect
              options={metricOptions}
              value={form.metricId}
              onChange={changeMetric}
              placeholder="请输入并选择指标"
              emptyText="未找到匹配的指标"
            />
          )}
          {errors.metricId && <p className="mt-1 text-xs text-red-500">{errors.metricId}</p>}
        </div>

        {/* 判断方向 + 管控值 + 单位：一行紧凑排版（区间形态为 判断方向/下限/上限/单位 四列） */}
        {isBetween ? (
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>
                判断方向 <span className="text-red-500">*</span>
              </label>
              <select className={inputCls} value={form.dir} onChange={(e) => set("dir", e.target.value as ControlDir)}>
                <option value="" disabled>
                  请选择
                </option>
                {DIR_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {DIR_LABEL[d]}
                  </option>
                ))}
              </select>
              {errors.dir && <p className="mt-1 text-xs text-red-500">{errors.dir}</p>}
            </div>
            <div>
              <label className={labelCls}>
                管控下限 <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.low}
                onChange={(e) => set("low", e.target.value)}
                placeholder={metricDef ? `如：${(0).toFixed(metricDef.decimals)}` : "—"}
                error={errors.low}
              />
            </div>
            <div>
              <label className={labelCls}>
                管控上限 <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.high}
                onChange={(e) => set("high", e.target.value)}
                placeholder={metricDef ? `如：${(100).toFixed(metricDef.decimals)}` : "—"}
                error={errors.high}
              />
            </div>
            <div>
              <label className={labelCls}>单位</label>
              <div className={readonlyCls} title="单位根据指标自动带出，不允许修改">
                {metricDef?.unit ?? "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>
                判断方向 <span className="text-red-500">*</span>
              </label>
              <select className={inputCls} value={form.dir} onChange={(e) => set("dir", e.target.value as ControlDir)}>
                <option value="" disabled>
                  请选择
                </option>
                {DIR_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {DIR_LABEL[d]}
                  </option>
                ))}
              </select>
              {errors.dir && <p className="mt-1 text-xs text-red-500">{errors.dir}</p>}
            </div>
            <div>
              <label className={labelCls}>
                管控值 <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder={metricDef ? `如：${(1).toFixed(metricDef.decimals)}` : "—"}
                error={errors.value}
              />
            </div>
            <div>
              <label className={labelCls}>单位</label>
              <div className={readonlyCls} title="单位根据指标自动带出，不允许修改">
                {metricDef?.unit ?? "—"}
              </div>
            </div>
          </div>
        )}

        {/* 启停状态：开关（新增默认启用） */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            启停状态 <span className="text-red-500">*</span>
          </span>
          <button
            type="button"
            onClick={() => set("enabled", !form.enabled)}
            className={`inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
              form.enabled ? "bg-primary-600" : "bg-gray-300"
            }`}
            title={form.enabled ? "点击停用" : "点击启用"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.enabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    </Drawer>
  );
}
