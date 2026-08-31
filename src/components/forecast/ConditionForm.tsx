"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { SegmentedControl } from "@/components/energy-overview/SegmentedControl";
import { SearchSelect } from "./SearchSelect";
import { TypeCards } from "./TypeCards";
import { CustomRangePicker } from "./CustomRangePicker";
import {
  FORECAST_METRICS,
  CONDITION_DICT,
  HISTORY_RANGE,
  CUSTOM_RANGE,
  FUTURE_RANGE_OPTIONS,
  SCENARIO_RANGE_OPTIONS,
  effectiveTargetOf,
  formatTargetDir,
  reverseItemsOf,
  type ForecastType,
  type ForecastInput,
} from "@/lib/mock-data/forecast";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent";
const readonlyCls =
  "w-full px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-500";

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
  const [targetInput, setTargetInput] = useState(""); // 单值方向的临时测算值
  const [rangeLowerInput, setRangeLowerInput] = useState(""); // 区间方向的临时下限
  const [rangeUpperInput, setRangeUpperInput] = useState(""); // 区间方向的临时上限
  const [calcRangeState, setCalcRangeState] = useState("单日");
  const [customDays, setCustomDays] = useState<number | null>(null); // 自定义范围的预测天数
  const [conds, setConds] = useState<Record<string, string>>({});
  const [compare, setCompare] = useState(false);
  const [reverseItem, setReverseItem] = useState("");
  const [remainingPlanInput, setRemainingPlanInput] = useState("");

  // 联动（派生值，无需 effect）：类型 → 指标 → 对象/模型 → 时间范围
  // 能否达标预测 / 达标反推 仅支持已配置目标值的指标（无目标值指标不支持能否达标预测）
  const metricsForType = FORECAST_METRICS.filter(
    (m) => m.types.includes(type) && (type === "未来值预测" || type === "条件测算" || effectiveTargetOf(m) !== null)
  );
  const metric = metricsForType.find((m) => m.key === metricKey) ?? metricsForType[0];
  // 有效目标值（目标值管理「生效中」版本；无则为 null → 不支持能否达标预测）
  const effTarget = effectiveTargetOf(metric);
  const models = metric.models.filter((m) => m.types.includes(type));
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const object =
    metric.objects.includes(objectKey) && objectKey ? objectKey : metric.objects[0];
  // 时间范围选项由指标统计频率决定（切换指标后旧选项不在列表内时回退到首项）
  // 「自定义」仅日度指标支持（自定义截止日期）
  const customAllowed = metric.frequency === "日度";
  const futureOptions = FUTURE_RANGE_OPTIONS[metric.frequency];
  const scenarioOptions = SCENARIO_RANGE_OPTIONS[metric.frequency];
  const range =
    rangeState === CUSTOM_RANGE
      ? customAllowed
        ? CUSTOM_RANGE
        : futureOptions[0]
      : futureOptions.includes(rangeState)
        ? rangeState
        : futureOptions[0];
  const calcRange =
    calcRangeState === CUSTOM_RANGE
      ? customAllowed
        ? CUSTOM_RANGE
        : scenarioOptions[0]
      : scenarioOptions.includes(calcRangeState)
        ? calcRangeState
        : scenarioOptions[0];
  const reverseOptions = reverseItemsOf(metric.name);

  // 切换指标时重置与旧指标相关的输入
  useEffect(() => {
    setConds({});
    setTargetInput("");
    setRangeLowerInput("");
    setRangeUpperInput("");
    setReverseItem(reverseItemsOf(metric.name)[0] ?? "");
    setRemainingPlanInput(metric.targetCtx ? String(metric.targetCtx.remainingPlan) : "");
    // 考核周期按指标配置自动选中（如单位产量碳排放量 → 本季度，单箱综合能耗 → 本年度）
    setPeriod(metric.assessmentPeriod ?? "本年度");
    setCustomDays(null);
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
  }, [type, metricKey, modelId, rangeState, period, calcRangeState, customDays, conds, compare, reverseItem, targetInput, rangeLowerInput, rangeUpperInput, remainingPlanInput]);

  // ----- 校验（即时红字）-----
  const condErrors: Record<string, string> = {};
  if (type === "条件测算") {
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
  // 区间方向的临时测算值校验（下限/上限均为数字且下限 < 上限）
  const isRangeTarget = effTarget?.direction === "处于目标区间";
  const rangeLowerErr =
    rangeLowerInput.trim() !== "" && Number.isNaN(Number(rangeLowerInput)) ? "请输入数字" : undefined;
  const rangeUpperErr =
    rangeUpperInput.trim() !== "" && Number.isNaN(Number(rangeUpperInput)) ? "请输入数字" : undefined;
  const rangeOrderErr =
    rangeLowerInput.trim() !== "" &&
    rangeUpperInput.trim() !== "" &&
    !rangeLowerErr &&
    !rangeUpperErr &&
    Number(rangeLowerInput) >= Number(rangeUpperInput)
      ? "下限必须小于上限"
      : undefined;
  const planErr =
    remainingPlanInput.trim() === ""
      ? "必填"
      : Number.isNaN(Number(remainingPlanInput)) || Number(remainingPlanInput) <= 0
        ? "请输入大于 0 的数字"
        : undefined;
  // 自定义范围：选中「自定义」后须完成截止日期 / 周期长度选择
  const customErr =
    ((type === "未来值预测" && range === CUSTOM_RANGE) || (type === "条件测算" && calcRange === CUSTOM_RANGE)) &&
    customDays === null
      ? "请选择预测截止时间，完成自定义周期"
      : undefined;
  const hasError =
    Object.keys(condErrors).length > 0 ||
    targetErr !== undefined ||
    rangeLowerErr !== undefined ||
    rangeUpperErr !== undefined ||
    rangeOrderErr !== undefined ||
    customErr !== undefined ||
    (type === "达标反推" && planErr !== undefined);

  // 临时测算值：单值方向 → targetValue；区间方向 → targetLower / targetUpper
  function tempTargetFields() {
    if (isRangeTarget) {
      return {
        ...(rangeLowerInput.trim() !== "" ? { targetLower: Number(rangeLowerInput) } : {}),
        ...(rangeUpperInput.trim() !== "" ? { targetUpper: Number(rangeUpperInput) } : {}),
      };
    }
    return targetInput.trim() !== "" ? { targetValue: Number(targetInput) } : {};
  }

  // 目标值字段（能否达标预测 / 达标反推共用）：
  // 系统自动带入有效目标值与判断条件（支持 <、≤、>、≥、=目标值、处于目标区间）并展示单位；
  // 用户修改视为「临时测算值」，仅用于本次预测，不修改正式目标配置。
  function renderTargetValueField() {
    if (!effTarget) return null;
    const dir = formatTargetDir(effTarget.direction);
    const tempHint = isRangeTarget
      ? rangeLowerInput.trim() !== "" || rangeUpperInput.trim() !== ""
      : targetInput.trim() !== "";
    return (
      <Field
        label="目标值"
        required
        hint={
          tempHint
            ? "已修改为临时测算值，仅用于本次预测，不修改正式目标配置"
            : `自动带入生效版本 ${effTarget.version}（${effTarget.period}考核），来自目标值管理`
        }
        error={targetErr ?? rangeLowerErr ?? rangeUpperErr ?? rangeOrderErr}
      >
        {isRangeTarget ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex h-[38px] items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
              处于目标区间
            </span>
            <input
              className={`${inputCls} ${rangeLowerErr || rangeOrderErr ? "border-red-400" : ""}`}
              value={rangeLowerInput}
              placeholder={effTarget.lower !== undefined ? String(effTarget.lower) : "下限"}
              onChange={(e) => setRangeLowerInput(e.target.value)}
            />
            <span className="text-gray-400">～</span>
            <input
              className={`${inputCls} ${rangeUpperErr || rangeOrderErr ? "border-red-400" : ""}`}
              value={rangeUpperInput}
              placeholder={effTarget.upper !== undefined ? String(effTarget.upper) : "上限"}
              onChange={(e) => setRangeUpperInput(e.target.value)}
            />
            <span className="inline-flex h-[38px] items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
              {metric.unit}
            </span>
          </div>
        ) : (
          <div className="flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
              {dir}
            </span>
            <input
              className={`${inputCls} rounded-l-none rounded-r-none ${targetErr ? "border-red-400" : ""}`}
              value={targetInput}
              placeholder={effTarget.value !== undefined ? String(effTarget.value) : "目标值"}
              onChange={(e) => setTargetInput(e.target.value)}
            />
            <span className="inline-flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
              {metric.unit}
            </span>
          </div>
        )}
      </Field>
    );
  }

  function handleSubmit() {
    const input: ForecastInput = {
      type,
      metricKey: metric.key,
      object,
      modelId: model.id,
      ...(type === "未来值预测" ? { range, ...(range === CUSTOM_RANGE ? { customDays: customDays ?? undefined } : {}) } : {}),
      ...(type === "能否达标预测" ? { period, ...tempTargetFields() } : {}),
      ...(type === "条件测算"
        ? {
            calcRange,
            ...(calcRange === CUSTOM_RANGE ? { customDays: customDays ?? undefined } : {}),
            conditions: Object.fromEntries(
              Object.entries(conds)
                .filter(([, v]) => v.trim() !== "")
                .map(([k, v]) => [k, CONDITION_DICT[k]?.type === "enum" ? v : Number(v)])
            ),
            compareBaseline: compare,
          }
        : {}),
      ...(type === "达标反推"
        ? {
            period,
            reverseItem,
            remainingPlan: Number(remainingPlanInput),
            ...tempTargetFields(),
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

        {/* 表单区：宽度减半，右侧留白 */}
        <div className="w-full lg:w-1/2">
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
          <Field label="历史数据范围">
            <div className={readonlyCls}>{HISTORY_RANGE}</div>
          </Field>
          {/* 模型：展示该指标当前预测类型默认使用的最新版本模型，仅展示不可修改 */}
          <Field label="模型">
            <div className={readonlyCls}>{model.name}</div>
          </Field>
        </div>

        <div className="my-4 border-t border-gray-100" />

        {/* 类型专属条件 */}
        {type === "未来值预测" && (
          <Field label="预测时间范围" required error={customErr}>
            <SegmentedControl
              options={[
                ...futureOptions.map((r) => ({ value: r, label: r })),
                ...(customAllowed ? [{ value: CUSTOM_RANGE, label: CUSTOM_RANGE }] : []),
              ]}
              value={range}
              onChange={setRangeState}
            />
            {range === CUSTOM_RANGE && (
              <div className="mt-2">
                <CustomRangePicker days={customDays} onDaysChange={setCustomDays} />
              </div>
            )}
          </Field>
        )}

        {type === "能否达标预测" && (
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
            {effTarget ? (
              <>
                {renderTargetValueField()}
                <Field label="当前累计实际值">
                  <div className={readonlyCls}>{metric.targetCtx?.currentAcc}</div>
                </Field>
                <Field label="剩余生产计划">
                  <div className={readonlyCls}>
                    {metric.targetCtx?.remainingPlan.toLocaleString()} 箱
                  </div>
                </Field>
              </>
            ) : (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-400">
                  该指标未配置目标值，不支持能否达标预测（请在指标管理中维护目标值）
                </p>
              </div>
            )}
          </div>
        )}

        {type === "条件测算" && (
          <div className="space-y-4">
            <Field label="预测时间范围" required error={customErr}>
              <SegmentedControl
                options={[
                  ...scenarioOptions.map((r) => ({ value: r, label: r })),
                  ...(customAllowed ? [{ value: CUSTOM_RANGE, label: CUSTOM_RANGE }] : []),
                ]}
                value={calcRange}
                onChange={setCalcRangeState}
              />
              {calcRange === CUSTOM_RANGE && (
                <div className="mt-2">
                  <CustomRangePicker days={customDays} onDaysChange={setCustomDays} />
                </div>
              )}
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

        {type === "达标反推" && (
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
            {effTarget ? (
              <>
                {renderTargetValueField()}
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
              </>
            ) : (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-400">
                  该指标未配置目标值，不支持达标反推（请在指标管理中维护目标值）
                </p>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮：左对齐 */}
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={handleSubmit} disabled={running || hasError}>
            {running ? (
              <>
                <Spinner size="sm" /> 预测中...
              </>
            ) : (
              "开始预测"
            )}
          </Button>
          {hasError && <span className="text-xs text-red-500">存在未通过校验的条件，请修正后再预测</span>}
        </div>
        </div>
      </Card>
    </div>
  );
}
