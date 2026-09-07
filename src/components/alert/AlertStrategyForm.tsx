"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { AlertConditionBuilder } from "@/components/alert/AlertConditionBuilder";
import { SearchMultiSelect } from "@/components/alert/SearchMultiSelect";
import { useApp } from "@/lib/store/AppContext";
import { ALERT_LEVELS, ALERT_USERS } from "@/lib/mock-data/alerts";
import { objectsForMetric } from "@/lib/mock-data/objects";
import {
  ALERT_DETECT_CYCLES,
  NOTIFY_METHOD_OPTIONS,
  defaultNotifyTemplate,
  domainOfMetric,
  activeTargetForMetric,
  addAlertStrategy,
  updateAlertStrategy,
} from "@/lib/mock-data/alert-strategies";
import type {
  AlertStrategy,
  AlertCondition,
  AlertType,
  AlertDomain,
  AlertScope,
  AlertLevel,
  AlertDetectCycle,
} from "@/types";

// 表单数据（不含 id / enabled / updatedAt，保存时补齐）
interface FormData {
  name: string;
  description: string;
  type: AlertType;
  domain: AlertDomain;
  scope: AlertScope;
  objects: string[];
  conditions: AlertCondition[];
  relation: "且" | "或";
  level: AlertLevel;
  detectCycle: AlertDetectCycle;
  notifyTemplate: string;
  notifyMethods: string[];
  receivers: string[];
  repeatAlert: boolean;
  repeatCount: number;
  repeatInterval: number;
}

const EMPTY: FormData = {
  name: "",
  description: "",
  type: "当前异常",
  domain: "生产管理",
  scope: "指定对象", // 告警对象固定为按指标筛选的指定对象
  objects: [],
  conditions: [{ metric: "", operator: "≤", baselineType: "基准值", baselineValue: "" }],
  relation: "且",
  level: "预警",
  detectCycle: "每小时",
  notifyTemplate: defaultNotifyTemplate(),
  notifyMethods: [...NOTIFY_METHOD_OPTIONS], // 通知方式默认选中（当前可选项：邮件）
  receivers: [],
  repeatAlert: false,
  repeatCount: 3,
  repeatInterval: 5,
};

function toFormData(s: AlertStrategy): FormData {
  return {
    name: s.name,
    description: s.description ?? "",
    type: s.type,
    domain: s.domain,
    scope: s.scope,
    // 告警对象为系统按指标自动带入（仅展示），编辑进入时按新规则重算保持一致
    objects: s.conditions[0]?.metric ? objectsForMetric(s.conditions[0].metric) : [...s.objects],
    conditions: s.conditions.map((c) => ({ ...c })),
    relation: s.relation,
    level: s.level,
    detectCycle: s.detectCycle,
    notifyTemplate: s.notifyTemplate,
    notifyMethods: [...s.notifyMethods],
    receivers: [...s.receivers],
    repeatAlert: s.repeatAlert,
    repeatCount: s.repeatCount ?? 3,
    repeatInterval: s.repeatInterval ?? 5,
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

interface AlertStrategyFormProps {
  mode: "new" | "edit";
  initial?: AlertStrategy;
  listPath?: string; // 保存/取消返回的列表页（生产管理入口传 /production/alert/management）
  metricOptions?: string[]; // 指标候选（生产管理入口传辅料白名单）
}

export function AlertStrategyForm({ mode, initial, listPath = "/alert/management", metricOptions }: AlertStrategyFormProps) {
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

  function toggleNotify(m: string) {
    set("notifyMethods", data.notifyMethods.includes(m) ? data.notifyMethods.filter((x) => x !== m) : [...data.notifyMethods, m]);
  }

  // 告警对象：按首条条件的指标自动筛选已关联的对象（对象管理维护），仅展示、不支持编辑
  const alertObjectOptions = objectsForMetric(data.conditions[0]?.metric ?? "");

  function validate(): boolean {
    const e: Record<string, string> = {};
    const ce: string[] = [];
    if (!data.name.trim()) e.name = "请输入告警名称";
    if (data.objects.length === 0) e.objects = "请先在触发条件中选择数据指标";
    data.conditions.forEach((c, i) => {
      const miss: string[] = [];
      if (!c.metric.trim()) miss.push("指标");
      if (c.baselineType === "目标值" && c.metric.trim() && !activeTargetForMetric(c.metric)) {
        ce[i] = "该指标未配置目标值，无法使用「目标值」基准类型";
        return;
      }
      if (
        !c.baselineValue.trim() ||
        (c.baselineValue.includes("～") && c.baselineValue.split("～").some((x) => !x.trim()))
      )
        miss.push("基准值");
      // 偏离比例：正常区间外的基准类型必填，区间格式如 5-10（下限 < 上限）
      if (c.baselineType !== "正常区间") {
        const m = (c.deviation ?? "").trim().match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
        if (!m) miss.push("偏离比例(如5-10)");
        else if (Number(m[1]) >= Number(m[2])) {
          ce[i] = "偏离比例区间下限需小于上限（如 5-10）";
          return;
        }
      }
      ce[i] = miss.length ? `请完善${miss.join("、")}` : "";
    });
    if (data.notifyMethods.length === 0) e.notifyMethods = "请选择通知方式";
    if (data.receivers.length === 0) e.receivers = "请选择接收人";
    if (!data.notifyTemplate.trim()) e.notifyTemplate = "请填写通知预览";
    if (data.repeatAlert) {
      if (!data.repeatCount || data.repeatCount < 1) e.repeatCount = "次数需为正整数";
      if (!data.repeatInterval || data.repeatInterval < 1) e.repeatInterval = "间隔需为正整数";
    }
    const hasCondError = ce.some((x) => x);
    setErrors(e);
    setCondErrors(ce);
    if (Object.keys(e).length || hasCondError) toast("请完善表单必填项", "warning");
    return Object.keys(e).length === 0 && !hasCondError;
  }

  function buildStrategy(): AlertStrategy {
    const base: AlertStrategy = {
      id: initial?.id ?? `AS-${Date.now().toString(36).toUpperCase()}`,
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      type: data.type,
      domain: data.domain,
      scope: "指定对象", // 告警对象固定为按指标筛选的指定对象
      objects: data.objects,
      conditions: data.conditions.map((c) => ({
        ...c,
        metric: c.metric.trim(),
        baselineValue: c.baselineValue.trim(),
        deviation: c.deviation?.trim() || undefined,
      })),
      relation: data.relation,
      level: data.level,
      detectCycle: data.detectCycle,
      notifyTemplate: data.notifyTemplate.trim(),
      notifyMethods: data.notifyMethods,
      receivers: data.receivers,
      repeatAlert: data.repeatAlert,
      repeatCount: data.repeatAlert ? data.repeatCount : undefined,
      repeatInterval: data.repeatAlert ? data.repeatInterval : undefined,
      enabled: initial?.enabled ?? false, // 新建默认停用
      updatedAt: formatNow(),
    };
    return base;
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

          {/* 告警等级 */}
          <div>
            <label className={labelCls}>告警等级 <span className="text-red-500">*</span></label>
            <select className={selectCls} value={data.level} onChange={(e) => set("level", e.target.value as AlertLevel)}>
              {ALERT_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
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

          {/* 触发条件 */}
          <div className="md:col-span-2">
            <label className={labelCls}>触发条件 <span className="text-red-500">*</span></label>
            <AlertConditionBuilder
              type="当前异常"
              conditions={data.conditions}
              relation={data.relation}
              errors={condErrors}
              metricOptions={metricOptions}
              onChange={(conditions, relation) => {
                const firstMetric = conditions[0]?.metric ?? "";
                setData((prev) => ({
                  ...prev,
                  conditions,
                  relation,
                  domain: firstMetric ? domainOfMetric(firstMetric) : prev.domain,
                  // 告警对象随指标自动带入（该指标已关联对象全量），仅展示、不支持编辑
                  objects: objectsForMetric(firstMetric),
                }));
              }}
            />
          </div>

          {/* 告警对象（触发条件之后）：按指标自动筛选并罗列已关联的对象，仅展示、不支持编辑 */}
          <div className="md:col-span-2">
            <label className={labelCls}>告警对象 <span className="text-red-500">*</span></label>
            <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2">
              {alertObjectOptions.length > 0 ? (
                alertObjectOptions.map((o) => (
                  <span
                    key={o}
                    className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-sm text-gray-600"
                  >
                    {o}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">请先在触发条件中选择数据指标</span>
              )}
            </div>
            {errors.objects && <p className="mt-1 text-xs text-red-500">{errors.objects}</p>}
            <p className="mt-1 text-xs text-gray-400">
              根据所选数据指标自动筛选并罗列该指标已关联的对象（对象管理维护），仅展示、不支持编辑。
            </p>
          </div>

          {/* 检测周期 */}
          <div>
            <label className={labelCls}>
              检测周期 <span className="text-red-500">*</span>
              <Tip text="即配置告警策略的执行频率；启用后持续监测，若后续检测数据恢复正常则不再触发告警，并自动将对应数据的异常状态更新为“正常”。" />
            </label>
            <select className={selectCls} value={data.detectCycle} onChange={(e) => set("detectCycle", e.target.value as AlertDetectCycle)}>
              {ALERT_DETECT_CYCLES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 接收人 */}
          <div>
            <label className={labelCls}>接收人 <span className="text-red-500">*</span></label>
            <SearchMultiSelect
              options={ALERT_USERS.map((u) => ({ value: u.name, label: u.name, hint: u.username }))}
              value={data.receivers}
              onChange={(v) => set("receivers", v)}
              placeholder="请输入并选择用户名"
              error={errors.receivers}
            />
          </div>

          {/* 通知方式 */}
          <div className="md:col-span-2">
            <label className={labelCls}>通知方式 <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-5">
              {NOTIFY_METHOD_OPTIONS.map((m) => (
                <label key={m} className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" checked={data.notifyMethods.includes(m)} onChange={() => toggleNotify(m)} className="accent-primary-600" />
                  {m}
                </label>
              ))}
            </div>
            {errors.notifyMethods && <p className="mt-1 text-xs text-red-500">{errors.notifyMethods}</p>}
          </div>

          {/* 通知预览 */}
          <div className="md:col-span-2">
            <label className={labelCls}>通知预览 <span className="text-red-500">*</span></label>
            <textarea
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              value={data.notifyTemplate}
              onChange={(e) => set("notifyTemplate", e.target.value)}
            />
            {errors.notifyTemplate && <p className="mt-1 text-xs text-red-500">{errors.notifyTemplate}</p>}
          </div>

          {/* 重复提醒 */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-gray-700">重复提醒</label>
              <button
                type="button"
                onClick={() => set("repeatAlert", !data.repeatAlert)}
                className={`inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                  data.repeatAlert ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${data.repeatAlert ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              {data.repeatAlert && (
                <>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={data.repeatCount}
                      onChange={(e) => set("repeatCount", Number(e.target.value))}
                    />
                    <span className="text-sm text-gray-600">次</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-600">提醒间隔</span>
                    <input
                      type="number"
                      min={1}
                      className={`w-20 px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.repeatInterval ? "border-red-400" : "border-gray-300"}`}
                      value={data.repeatInterval}
                      onChange={(e) => set("repeatInterval", Number(e.target.value))}
                    />
                    <span className="text-sm text-gray-600">分钟</span>
                  </div>
                </>
              )}
            </div>
            {errors.repeatCount && <p className="mt-1 text-xs text-red-500">{errors.repeatCount}</p>}
            {errors.repeatInterval && <p className="mt-1 text-xs text-red-500">{errors.repeatInterval}</p>}
          </div>
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
