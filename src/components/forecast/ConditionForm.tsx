"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { SegmentedControl } from "@/components/energy-overview/SegmentedControl";
import { SearchSelect } from "./SearchSelect";
import { TypeCards } from "./TypeCards";
import {
  FORECAST_METRICS,
  CONDITION_DICT,
  HISTORY_RANGE,
  reverseItemsOf,
  type ForecastType,
  type ForecastInput,
} from "@/lib/mock-data/forecast";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent";
const readonlyCls =
  "w-full px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-500";
const dateCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

// 表单字段壳：label + 内容 + 提示
function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  );
}

// 预测条件区：类型卡片 + 通用条件 + 四类型专属条件，内部持有全部状态
// initial：从预测记录「按原条件再次预测」进入时恢复的类型与指标（配合父级 key 重挂载）
export function ConditionForm({
  onRun,
  running,
  initial,
  onInvalidate,
}: {
  onRun: (input: ForecastInput) => void;
  running: boolean;
  initial?: { type?: ForecastType; metricKey?: string };
  /** 任一预测条件变化时触发：父级应清空已展示的旧结果 */
  onInvalidate?: () => void;
}) {
  const [type, setType] = useState<ForecastType>(initial?.type ?? "未来值预测");
  const [metricKey, setMetricKey] = useState(initial?.metricKey ?? "steamHvac");
  const [objectKey, setObjectKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [rangeState, setRangeState] = useState("未来7日");
  const [period, setPeriod] = useState("本年度");
  const [targetInput, setTargetInput] = useState("");
  const [calcMode, setCalcMode] = useState<"tomorrow" | "date" | "period">("tomorrow");
  const [calcDate, setCalcDate] = useState("2026-08-10");
  const [conds, setConds] = useState<Record<string, string>>({});
  const [compare, setCompare] = useState(false);
  const [reverseItem, setReverseItem] = useState("");
  const [remainingPlanInput, setRemainingPlanInput] = useState("");

  // 联动（派生值，无需 effect）：类型 → 指标 → 对象/模型 → 时间范围
  const metricsForType = FORECAST_METRICS.filter((m) => m.types.includes(type));
  const metric = metricsForType.find((m) => m.key === metricKey) ?? metricsForType[0];
  const models = metric.models.filter((m) => m.types.includes(type));
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const object =
    metric.objects.includes(objectKey) && objectKey ? objectKey : metric.objects[0];
  const ranges = metric.ranges.filter((r) => model?.ranges.includes(r));
  const range = ranges.includes(rangeState) ? rangeState : ranges[0] ?? "明日";
  const reverseOptions = reverseItemsOf(metric.name);

  // 切换指标时重置与旧指标相关的输入
  useEffect(() => {
    setConds({});
    setTargetInput("");
    setReverseItem(reverseItemsOf(metric.name)[0] ?? "");
    setRemainingPlanInput(metric.targetCtx ? String(metric.targetCtx.remainingPlan) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric.key]);

  // 任一预测条件变化（类型/指标/模型/范围/周期/工况等）→ 旧结果失效，通知父级清空
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onInvalidate?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, metricKey, modelId, rangeState, period, calcMode, calcDate, conds, compare, reverseItem, targetInput, remainingPlanInput]);

  // ----- 校验（即时红字）-----
  const condErrors: Record<string, string> = {};
  if (type === "工况情景测算") {
    for (const c of metric.conditions) {
      const def = CONDITION_DICT[c.code];
      const raw = conds[c.code];
      if (def.type === "enum" || raw === undefined || raw.trim() === "") continue; // 空 = 使用默认值
      const v = Number(raw);
      if (Number.isNaN(v)) condErrors[c.code] = "请输入数字";
      else if (def.min !== undefined && v < def.min)
        condErrors[c.code] = `低于允许范围（${def.min}～${def.max}${def.unit}）`;
      else if (def.max !== undefined && v > def.max)
        condErrors[c.code] = `超出允许范围（${def.min}～${def.max}${def.unit}）`;
    }
  }
  const targetErr =
    targetInput.trim() !== "" && Number.isNaN(Number(targetInput)) ? "请输入数字" : undefined;
  const planErr =
    remainingPlanInput.trim() === ""
      ? "必填"
      : Number.isNaN(Number(remainingPlanInput)) || Number(remainingPlanInput) <= 0
        ? "请输入大于 0 的数字"
        : undefined;
  const hasError =
    Object.keys(condErrors).length > 0 ||
    targetErr !== undefined ||
    (type === "达标条件反推" && planErr !== undefined);

  function handleSubmit() {
    const input: ForecastInput = {
      type,
      metricKey: metric.key,
      object,
      modelId: model.id,
      ...(type === "未来值预测" ? { range } : {}),
      ...(type === "目标达成预测"
        ? { period, ...(targetInput.trim() !== "" ? { targetValue: Number(targetInput) } : {}) }
        : {}),
      ...(type === "工况情景测算"
        ? {
            calcMode,
            calcDate,
            conditions: Object.fromEntries(
              Object.entries(conds)
                .filter(([, v]) => v.trim() !== "")
                .map(([k, v]) => [k, CONDITION_DICT[k]?.type === "enum" ? v : Number(v)])
            ),
            compareBaseline: compare,
          }
        : {}),
      ...(type === "达标条件反推"
        ? {
            period,
            reverseItem,
            remainingPlan: Number(remainingPlanInput),
            ...(targetInput.trim() !== "" ? { targetValue: Number(targetInput) } : {}),
          }
        : {}),
    };
    onRun(input);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 text-sm font-semibold text-gray-800">① 选择预测类型</div>
        <TypeCards value={type} onChange={setType} />
      </Card>

      <Card>
        <div className="mb-4 text-sm font-semibold text-gray-800">② 配置预测条件</div>

        {/* 通用条件 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="预测指标" required>
            <SearchSelect
              options={metricsForType.map((m) => ({ value: m.key, label: m.name, hint: m.unit }))}
              value={metric.key}
              onChange={setMetricKey}
              placeholder="按指标名称搜索"
            />
          </Field>
          <Field label="预测对象" required>
            {metric.objects.length === 1 ? (
              <div className={readonlyCls}>{metric.objects[0]}</div>
            ) : (
              <select className={inputCls} value={object} onChange={(e) => setObjectKey(e.target.value)}>
                {metric.objects.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            )}
          </Field>
          <div className="md:col-span-2">
            <Field label="预测模型" required>
              <select className={inputCls} value={model?.id ?? ""} onChange={(e) => setModelId(e.target.value)}>
                {models.map((mm) => (
                  <option key={mm.id} value={mm.id}>
                    {mm.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="历史数据范围">
            <div className={readonlyCls}>{HISTORY_RANGE}</div>
          </Field>
        </div>

        <div className="my-4 border-t border-gray-100" />

        {/* 类型专属条件 */}
        {type === "未来值预测" && (
          <Field label="预测时间范围" required>
            <SegmentedControl
              options={ranges.map((r) => ({ value: r, label: r }))}
              value={range}
              onChange={setRangeState}
            />
          </Field>
        )}

        {type === "目标达成预测" && metric.target && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="考核周期" required>
              <SegmentedControl
                options={[
                  { value: "本月", label: "本月" },
                  { value: "本季度", label: "本季度" },
                  { value: "本年度", label: "本年度" },
                ]}
                value={period}
                onChange={setPeriod}
              />
            </Field>
            <Field label="预测截止时间">
              <div className={readonlyCls}>
                {period === "本月" ? "2026-08-31（月末）" : period === "本季度" ? "2026-09-30（季末）" : "2026-12-31（年末）"}
              </div>
            </Field>
            <Field
              label="目标值"
              required
              hint={
                targetInput.trim() !== "" && Number(targetInput) !== metric.target.value
                  ? "已手动调整，本次按临时测算值处理，不保存至指标配置"
                  : undefined
              }
              error={targetErr}
            >
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                  {metric.target.direction}
                </span>
                <input
                  className={`${inputCls} rounded-l-none`}
                  value={targetInput}
                  placeholder={String(metric.target.value)}
                  onChange={(e) => setTargetInput(e.target.value)}
                />
              </div>
            </Field>
            <Field label="当前累计实际值">
              <div className={readonlyCls}>{metric.targetCtx?.currentAcc}</div>
            </Field>
            <Field label="剩余生产计划">
              <div className={readonlyCls}>
                {metric.targetCtx?.remainingPlan.toLocaleString()} 箱
              </div>
            </Field>
          </div>
        )}

        {type === "工况情景测算" && (
          <div className="space-y-4">
            <Field label="测算时段" required>
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl
                  options={[
                    { value: "tomorrow", label: "明日" },
                    { value: "date", label: "指定日期" },
                    { value: "period", label: "指定周期" },
                  ]}
                  value={calcMode}
                  onChange={setCalcMode}
                />
                {calcMode === "date" && (
                  <input type="date" className={dateCls} value={calcDate} onChange={(e) => setCalcDate(e.target.value)} />
                )}
                {calcMode === "period" && (
                  <span className="text-xs text-gray-400">默认按数据截止日后 7 日为测算周期</span>
                )}
              </div>
            </Field>

            <div>
              <div className="mb-2 text-sm text-gray-600">
                工况条件输入{" "}
                <span className="text-xs text-gray-400">（系统自动带入默认值，允许调整）</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {metric.conditions.map((c) => {
                  const def = CONDITION_DICT[c.code];
                  const label = c.label ?? def.name;
                  const err = condErrors[c.code];
                  return (
                    <div key={c.code}>
                      <label className="mb-1 block text-sm text-gray-600">
                        {label}
                        {c.required && <span className="ml-0.5 text-red-500">*</span>}
                      </label>
                      {def.type === "number" ? (
                        <div className="relative">
                          <input
                            type="number"
                            step={def.step}
                            className={`${inputCls} pr-10 ${err ? "border-red-400" : ""}`}
                            value={conds[c.code] ?? ""}
                            placeholder={String(c.default)}
                            onChange={(e) => setConds({ ...conds, [c.code]: e.target.value })}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{def.unit}</span>
                        </div>
                      ) : (
                        <select
                          className={inputCls}
                          value={conds[c.code] ?? String(c.default)}
                          onChange={(e) => setConds({ ...conds, [c.code]: e.target.value })}
                        >
                          {def.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        {err ? (
                          <span className="text-red-500">{err}</span>
                        ) : (
                          <>
                            允许范围 {def.min}～{def.max}
                            {def.unit}
                          </>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                className="h-4 w-4 accent-primary-600"
              />
              对比当前计划工况（基准）——开启后输出测算工况相对基准的变化量
            </label>
          </div>
        )}

        {type === "达标条件反推" && metric.target && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="目标周期" required>
              <SegmentedControl
                options={[
                  { value: "本月", label: "本月" },
                  { value: "本季度", label: "本季度" },
                  { value: "本年度", label: "本年度" },
                ]}
                value={period}
                onChange={setPeriod}
              />
            </Field>
            <Field
              label="反推内容"
              required
              hint={reverseOptions.length ? "选项来自指标管理「达标反推设置」" : undefined}
              error={reverseOptions.length ? undefined : "该指标未配置反推内容，请先在指标管理中维护"}
            >
              {reverseOptions.length ? (
                <select className={inputCls} value={reverseItem} onChange={(e) => setReverseItem(e.target.value)}>
                  {reverseOptions.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <div className={readonlyCls}>暂无配置</div>
              )}
            </Field>
            <Field
              label="目标值"
              required
              hint={
                targetInput.trim() !== "" && Number(targetInput) !== metric.target.value
                  ? "已手动调整，本次按临时测算值处理"
                  : undefined
              }
              error={targetErr}
            >
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                  {metric.target.direction}
                </span>
                <input
                  className={`${inputCls} rounded-l-none`}
                  value={targetInput}
                  placeholder={String(metric.target.value)}
                  onChange={(e) => setTargetInput(e.target.value)}
                />
              </div>
            </Field>
            <Field label="当前累计实际值">
              <div className={readonlyCls}>{metric.targetCtx?.currentAcc}</div>
            </Field>
            <Field label="已完成产量">
              <div className={readonlyCls}>{metric.targetCtx?.doneOutput}</div>
            </Field>
            <Field label="剩余生产计划" required hint="默认自动加载，可按最新排产调整" error={planErr}>
              <div className="relative">
                <input
                  type="number"
                  className={`${inputCls} pr-8 ${planErr ? "border-red-400" : ""}`}
                  value={remainingPlanInput}
                  onChange={(e) => setRemainingPlanInput(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">箱</span>
              </div>
            </Field>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          {hasError && <span className="text-xs text-red-500">存在未通过校验的条件，请修正后再预测</span>}
          <Button onClick={handleSubmit} disabled={running || hasError}>
            {running ? (
              <>
                <Spinner size="sm" /> 预测中...
              </>
            ) : (
              "开始预测"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
