"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { AlertConditionBuilder } from "@/components/alert/AlertConditionBuilder";
import { QualityThresholdNote } from "@/components/alert/QualityThresholdNote";
import { useApp } from "@/lib/store/AppContext";
import { ALERT_LEVELS, ALERT_USERS } from "@/lib/mock-data/alerts";
import { SearchMultiSelect } from "@/components/alert/SearchMultiSelect";
import { objectsForMetric } from "@/lib/mock-data/objects";
import { defaultNotifyTemplate, addAlertStrategy, updateAlertStrategy, activeTargetForMetric } from "@/lib/mock-data/alert-strategies";
import {
  TYPE_DISPLAY,
  alertTypeOfDisplay,
  QUALITY_TYPE_OPTIONS,
  qualityMetricOptionsOf,
  qualityDefectKindOf,
  qualityMetricOf,
  qualityCycleUnitOf,
} from "@/lib/mock-data/quality-alerts";
import type { AlertStrategy, AlertCondition, AlertLevel } from "@/types";

// 表单数据（按需求文档字段；告警类型用展示文案「实测异常」，保存时映射存储枚举「当前异常」；
// 连续同向偏离为策略级选填字段，保存时写入全部触发条件）
interface FormData {
  name: string;
  description: string;
  typeDisplay: string; // "实测异常" | "预测风险"
  conditions: AlertCondition[];
  relation: "且" | "或";
  level: AlertLevel;
  consecutiveShift: string; // 连续同向偏离（正整数字符串；空 = 未配置）
  notifyMethods: string[];  // 通知方式（多选；当前选项仅「企业微信」）
  receivers: string[];      // 接收人（多选，搜索用户名）
  repeatAlert: boolean;     // 重复提醒开关（开启后对未处理告警重复通知）
  repeatCount: string;      // 重复次数（正整数字符串，含首次，默认 3）
  repeatInterval: string;   // 提醒间隔（分钟，正整数字符串，默认 5）
}

const EMPTY: FormData = {
  name: "",
  description: "",
  typeDisplay: "实测异常",
  conditions: [{ metric: "", operator: "≤", baselineType: "基准值", baselineValue: "" }],
  relation: "且",
  level: "预警",
  consecutiveShift: "",
  notifyMethods: ["企业微信"],
  receivers: [],
  repeatAlert: false,
  repeatCount: "3",
  repeatInterval: "5",
};

// 通知方式候选（当前仅支持企业微信）
const QUALITY_NOTIFY_METHODS = ["企业微信"];

function toFormData(s: AlertStrategy): FormData {
  return {
    name: s.name,
    description: s.description ?? "",
    typeDisplay: TYPE_DISPLAY[s.type],
    conditions: s.conditions.map((c) => ({ ...c })),
    relation: s.relation,
    level: s.level,
    consecutiveShift:
      s.conditions[0]?.consecutiveShifts != null ? String(s.conditions[0].consecutiveShifts) : "",
    notifyMethods: s.notifyMethods,
    receivers: s.receivers,
    repeatAlert: s.repeatAlert,
    repeatCount: String(s.repeatCount ?? 3),
    repeatInterval: String(s.repeatInterval ?? 5),
  };
}

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const labelCls = "block text-sm font-medium text-gray-700 mb-1";
const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

// 功能提示气泡（hover 显示）
function Tip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group/tip ml-1 align-middle text-gray-400 hover:text-primary-500 cursor-help">
      <span className="text-xs leading-none">❓</span>
      <span className="absolute left-4 top-1/2 -translate-y-1/2 hidden group-hover/tip:block z-30 w-max max-w-[280px] px-3 py-2 rounded-md bg-gray-800 text-white text-xs leading-relaxed shadow-lg">
        {text}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-800" />
      </span>
    </span>
  );
}

// 新建/编辑数据告警（工艺质量板块，按需求文档字段：
// 告警名称 / 策略说明 / 告警类型 / 触发条件（判断方式→基准类型→基准值及单位→超出量）/
// 告警等级 / 检测周期（按指标联动）/ 连续同向偏离（选填正整数，单位随指标周期）/
// 通知方式（企业微信）/ 接收人（多选搜索用户名）/ 重复提醒（开关+次数）/ 提醒间隔；
// 告警对象不在表单展示，保存时按首条条件的指标自动带入；操作 = 取消、保存）
export function QualityAlertStrategyForm({
  mode,
  initial,
  listPath = "/quality/alert/management",
}: {
  mode: "new" | "edit";
  initial?: AlertStrategy;
  listPath?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { state } = useApp();
  const isAdmin = state.user?.role === "管理员";

  const [data, setData] = useState<FormData>(initial ? toFormData(initial) : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [condErrors, setCondErrors] = useState<string[]>([]);

  function set<K extends keyof FormData>(key: K, v: FormData[K]) {
    setData((prev) => ({ ...prev, [key]: v }));
  }

  // 存储枚举（实测异常→当前异常），供条件构造器区分预测风险显示
  const alertType = alertTypeOfDisplay(data.typeDisplay);

  // 切换告警类型：实测异常不支持缺陷预测指标 → 清空条件中的缺陷指标（校验会提示重新选择）
  function handleTypeChange(display: string) {
    const next = alertTypeOfDisplay(display);
    setData((prev) => ({
      ...prev,
      typeDisplay: display,
      conditions:
        next === "当前异常"
          ? prev.conditions.map((c) =>
              qualityDefectKindOf(c.metric) ? { ...c, metric: "", forecastRange: undefined } : c
            )
          : prev.conditions,
    }));
  }

  // 告警对象：不在表单展示，保存时按首条条件的指标自动带入机台（结果类指标为「全厂」）
  const firstMetric = data.conditions[0]?.metric ?? "";
  const alertObjectOptions = objectsForMetric(firstMetric);

  // 检测周期：随首条条件指标的统计周期联动（每批次/每班次/每月）
  const detectCycle = qualityMetricOf(firstMetric)?.cycle;

  function validate(): boolean {
    const e: Record<string, string> = {};
    const ce: string[] = [];
    if (!data.name.trim()) e.name = "请输入告警名称";
    // 连续同向偏离：选填；填写时仅支持正整数
    const shiftTrim = data.consecutiveShift.trim();
    if (shiftTrim && (!/^\d+$/.test(shiftTrim) || Number(shiftTrim) < 1)) {
      e.consecutiveShift = "连续同向偏离仅支持正整数";
    }
    // 通知配置：通知方式/接收人必填；开启重复提醒后次数与间隔必填且为正整数
    if (data.notifyMethods.length === 0) e.notifyMethods = "请选择通知方式";
    if (data.receivers.length === 0) e.receivers = "请选择接收人";
    if (data.repeatAlert) {
      const cnt = data.repeatCount.trim();
      if (!cnt || !/^\d+$/.test(cnt) || Number(cnt) < 1) e.repeatCount = "重复次数仅支持正整数";
      const itv = data.repeatInterval.trim();
      if (!itv || !/^\d+$/.test(itv) || Number(itv) < 1) e.repeatInterval = "提醒间隔仅支持正整数";
    }
    data.conditions.forEach((c, i) => {
      const miss: string[] = [];
      if (!c.metric.trim()) miss.push("数据指标");
      if (c.baselineType === "目标值" && c.metric.trim() && !activeTargetForMetric(c.metric)) {
        ce[i] = "该指标未配置目标值，无法使用「目标值」基准类型";
        return;
      }
      if (
        !c.baselineValue.trim() ||
        (c.baselineValue.includes("～") && c.baselineValue.split("～").some((x) => !x.trim()))
      )
        miss.push("基准值");
      // 超出量：选填；填写时为正数（单值，单位随指标）
      const devTrim = (c.deviation ?? "").trim();
      if (devTrim && c.baselineType !== "正常区间") {
        if (!/^\d+(\.\d+)?$/.test(devTrim) || Number(devTrim) <= 0) ce[i] = "超出量需为正数";
      }
      ce[i] = miss.length ? `请完善${miss.join("、")}` : "";
    });
    const hasCondError = ce.some((x) => x);
    setErrors(e);
    setCondErrors(ce);
    if (Object.keys(e).length || hasCondError) toast("请完善表单必填项", "warning");
    return Object.keys(e).length === 0 && !hasCondError;
  }

  function buildStrategy(): AlertStrategy {
    // 连续同向偏离：空输入剥离（undefined），写入全部触发条件（策略级字段）
    const consecutiveShifts = data.consecutiveShift.trim() ? Number(data.consecutiveShift.trim()) : undefined;
    return {
      id: initial?.id ?? `QAS-${Date.now().toString(36).toUpperCase()}`,
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      type: alertType,
      domain: "工艺质量",
      scope: "指定对象",
      objects: alertObjectOptions,
      conditions: data.conditions.map((c) => ({
        ...c,
        metric: c.metric.trim(),
        baselineValue: c.baselineValue.trim(),
        deviation: c.deviation?.trim() || undefined,
        consecutiveShifts,
        // 预测范围仅预测风险保留；实测异常剥离残留，预测风险缺失时补默认
        forecastRange:
          alertType === "预测风险" ? c.forecastRange ?? "未来7天" : undefined,
      })),
      relation: data.relation,
      level: data.level,
      detectCycle: detectCycle ?? "每批次",
      // 通知配置：企业微信 + 接收人；重复提醒开启时保存次数与间隔（关闭时剥离）
      notifyTemplate: defaultNotifyTemplate(),
      notifyMethods: data.notifyMethods,
      receivers: data.receivers,
      repeatAlert: data.repeatAlert,
      repeatCount: data.repeatAlert ? Number(data.repeatCount.trim()) : undefined,
      repeatInterval: data.repeatAlert ? Number(data.repeatInterval.trim()) : undefined,
      enabled: initial?.enabled ?? false, // 新建默认停用
      // 创建/编辑信息（策略详情展示）：新建记当前用户与时间；编辑保留创建信息、记录最近编辑人
      creator: initial?.creator ?? state.user?.username,
      createdAt: initial?.createdAt ?? formatNow(),
      editedBy: mode === "edit" ? state.user?.username : undefined,
      updatedAt: formatNow(),
    };
  }

  function handleSave() {
    if (!validate()) return;
    const s = buildStrategy();
    if (mode === "new") {
      addAlertStrategy(s);
      toast("新建成功", "success");
    } else {
      updateAlertStrategy(s);
      toast("保存成功", "success");
    }
    router.push(listPath);
  }

  // 非管理员不应进入此页（外壳页也会拦截），此处兜底
  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <span className="text-4xl mb-3">🔒</span>
        <p className="text-sm text-gray-500">暂无权限，仅管理员可{mode === "new" ? "新建" : "编辑"}数据告警</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* 中部滚动表单 */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
          {/* 告警名称 */}
          <Input label="告警名称" required placeholder="请输入" value={data.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />

          {/* 告警类型（展示文案：实测异常/预测风险 ↔ 存储枚举映射） */}
          <div>
            <label className={labelCls}>告警类型 <span className="text-red-500">*</span></label>
            <select
              className={selectCls}
              value={data.typeDisplay}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {QUALITY_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              实测异常监测当前值越界；预测风险监测预测值将越界，并支持 2 个缺陷预测指标（预测成品水分 / 预测箱储总存储时长）。
            </p>
          </div>

          {/* 策略说明 */}
          <div className="md:col-span-2">
            <label className={labelCls}>策略说明</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              placeholder="请输入"
              value={data.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* 告警等级（触发条件之前） */}
          <div>
            <label className={labelCls}>告警等级 <span className="text-red-500">*</span></label>
            <select className={selectCls} value={data.level} onChange={(e) => set("level", e.target.value as AlertLevel)}>
              {ALERT_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* 触发条件 */}
          <div className="md:col-span-2">
            <label className={labelCls}>触发条件 <span className="text-red-500">*</span></label>
            <AlertConditionBuilder
              type={alertType}
              conditions={data.conditions}
              relation={data.relation}
              errors={condErrors}
              metricOptions={qualityMetricOptionsOf(alertType)}
              deviationMode="exceed"
              onChange={(conditions, relation) => setData((prev) => ({ ...prev, conditions, relation }))}
            />
            {/* 缺陷指标预测分级示例：仅预测风险类型展示（12 个稳定性指标沿用常规条件配置） */}
            {alertType === "预测风险" && (
              <div className="mt-3">
                <QualityThresholdNote />
              </div>
            )}
          </div>

          {/* 检测周期：随首条条件指标的统计周期联动（单值） */}
          <div>
            <label className={labelCls}>
              检测周期 <span className="text-red-500">*</span>
              <Tip text="即配置告警策略的执行频率，随所选数据指标的统计周期自动确定；启用后持续监测，若后续检测数据恢复正常则不再触发告警。" />
            </label>
            <div className="flex h-[38px] items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 text-sm">
              {detectCycle ? (
                <span className="text-gray-600">{detectCycle}</span>
              ) : (
                <span className="text-gray-400">请先选择数据指标</span>
              )}
            </div>
          </div>

          {/* 连续同向偏离：选填、正整数；单位随首条指标统计周期自动带出（每批次→批次/每班次→班次/每月→月） */}
          <div>
            <label className={labelCls}>
              连续同向偏离
              <Tip text="选填。连续 N 个统计周期同向偏离基准（如连续 3 个批次高于上限）才触发告警，适用于指标缓慢飘移场景。" />
            </label>
            <div
              className={`flex h-[38px] items-center rounded-lg border bg-white transition-all duration-200 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent ${
                errors.consecutiveShift ? "border-red-400" : "border-gray-300"
              }`}
            >
              <input
                type="number"
                min={1}
                step={1}
                className="w-full h-full px-3 text-sm text-gray-800 bg-transparent focus:outline-none"
                placeholder="请输入"
                value={data.consecutiveShift}
                onChange={(e) => set("consecutiveShift", e.target.value)}
              />
              <span className="flex-shrink-0 px-3 text-sm text-gray-400 border-l border-gray-100">
                {firstMetric ? qualityCycleUnitOf(firstMetric) : "—"}
              </span>
            </div>
            {errors.consecutiveShift && (
              <p className="mt-1 text-xs text-red-500">{errors.consecutiveShift}</p>
            )}
          </div>

          {/* 通知方式（多选；当前选项仅企业微信） */}
          <div>
            <label className={labelCls}>通知方式 <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-4 h-[38px]">
              {QUALITY_NOTIFY_METHODS.map((m) => (
                <label key={m} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary-600"
                    checked={data.notifyMethods.includes(m)}
                    onChange={(e) => set("notifyMethods", e.target.checked ? [m] : [])}
                  />
                  {m}
                </label>
              ))}
            </div>
            {errors.notifyMethods && <p className="mt-1 text-xs text-red-500">{errors.notifyMethods}</p>}
          </div>

          {/* 接收人（多选，支持搜索用户名；跨行占位便于展示已选标签） */}
          <div className="md:col-span-2">
            <label className={labelCls}>接收人 <span className="text-red-500">*</span></label>
            <SearchMultiSelect
              options={ALERT_USERS.map((u) => ({ value: u.name, label: u.name, hint: u.username }))}
              value={data.receivers}
              onChange={(v) => set("receivers", v)}
              placeholder="请输入并选择用户名"
              error={errors.receivers}
            />
          </div>

          {/* 重复提醒（选填开关 + 次数）：开启后对未处理的同一条告警重复发送通知 */}
          <div>
            <label className={labelCls}>
              重复提醒
              <Tip text="选填。开启后，对未处理的同一条告警重复发送通知；关闭后只通知一次。" />
            </label>
            <div className="flex h-[38px] items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={data.repeatAlert}
                onClick={() => set("repeatAlert", !data.repeatAlert)}
                className={`relative inline-flex h-[22px] w-[40px] flex-shrink-0 items-center rounded-full transition-colors ${
                  data.repeatAlert ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform ${
                    data.repeatAlert ? "translate-x-[19px]" : "translate-x-[2px]"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600">{data.repeatAlert ? "开启" : "关闭"}</span>
              {data.repeatAlert && (
                <div className="ml-2 flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">最多提醒</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="3"
                    value={data.repeatCount}
                    onChange={(e) => set("repeatCount", e.target.value)}
                  />
                  <span className="text-xs text-gray-400">次</span>
                </div>
              )}
            </div>
            {errors.repeatCount && <p className="mt-1 text-xs text-red-500">{errors.repeatCount}</p>}
          </div>

          {/* 提醒间隔（开启重复提醒后必填；两次通知之间的间隔，分钟） */}
          {data.repeatAlert && (
            <div>
              <label className={labelCls}>提醒间隔 <span className="text-red-500">*</span></label>
              <div
                className={`flex h-[38px] items-center rounded-lg border bg-white transition-all duration-200 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent ${
                  errors.repeatInterval ? "border-red-400" : "border-gray-300"
                }`}
              >
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="w-full h-full px-3 text-sm text-gray-800 bg-transparent focus:outline-none"
                  placeholder="如 5"
                  value={data.repeatInterval}
                  onChange={(e) => set("repeatInterval", e.target.value)}
                />
                <span className="flex-shrink-0 px-3 text-sm text-gray-400 border-l border-gray-100">分钟</span>
              </div>
              {errors.repeatInterval && (
                <p className="mt-1 text-xs text-red-500">{errors.repeatInterval}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部操作 */}
      <div className="flex justify-center items-center gap-3 pt-4 mt-4 border-t border-gray-100 flex-shrink-0">
        <Button variant="secondary" onClick={() => router.push(listPath)}>取消</Button>
        <Button onClick={handleSave}>保存</Button>
      </div>
    </div>
  );
}
