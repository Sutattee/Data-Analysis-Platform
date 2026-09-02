"use client";

import type { AlertType, AlertCondition } from "@/types";
import {
  ALERT_OPERATORS,
  OPERATOR_BASELINE_MAP,
  FORECAST_RANGES,
  METRIC_OPTIONS,
  FORECAST_METRIC_OPTIONS,
  metricDefOf,
  activeTargetForMetric,
  historicalAvgForMetric,
} from "@/lib/mock-data/alert-strategies";
import { SearchSelect } from "@/components/forecast/SearchSelect";

const selectCls =
  "px-2.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
const inputCls = selectCls;
const readonlyCls =
  "flex h-[38px] items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 text-sm text-gray-500";

interface AlertConditionBuilderProps {
  type: AlertType;
  conditions: AlertCondition[];
  relation: "且" | "或";
  errors?: string[];
  onChange: (conditions: AlertCondition[], relation: "且" | "或") => void;
}

// 新建一条空条件
function blankCondition(type: AlertType): AlertCondition {
  return {
    metric: "",
    operator: "≤",
    baselineType: "基准值",
    baselineValue: "",
    ...(type === "预测风险" ? { forecastRange: "未来7天" } : {}),
  };
}

export function AlertConditionBuilder({
  type,
  conditions,
  relation,
  errors = [],
  onChange,
}: AlertConditionBuilderProps) {
  const isForecast = type === "预测风险";
  const metricOptions = isForecast ? FORECAST_METRIC_OPTIONS : METRIC_OPTIONS;

  function update(i: number, patch: Partial<AlertCondition>) {
    onChange(
      conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
      relation
    );
  }

  function add() {
    if (conditions.length >= 5) return;
    onChange([...conditions, blankCondition(type)], relation);
  }

  function remove(i: number) {
    if (conditions.length <= 1) return; // 第一条默认保留
    onChange(
      conditions.filter((_, idx) => idx !== i),
      relation
    );
  }

  // 正常区间：拆分下限/上限
  const rangeParts = (v: string): [string, string] => {
    const [lo = "", hi = ""] = v.split("～");
    return [lo, hi];
  };

  // 目标值：系统自动带入有效目标值（目标值管理），不支持编辑
  const targetOf = (metric: string): string => {
    const t = activeTargetForMetric(metric);
    if (!t) return "";
    return t.direction === "处于目标区间" ? `${t.lower}～${t.upper}` : String(t.value ?? "");
  };

  // 历史均值：系统自动带入最新历史均值（近30个统计周期），不支持编辑
  const avgOf = (metric: string): string => historicalAvgForMetric(metric);

  return (
    <div>
      {/* 多条件关系（仅多于1条时显示）*/}
      {conditions.length > 1 && (
        <div className="flex items-center gap-4 mb-3 text-sm">
          <span className="text-gray-500">条件关系：</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="condition-relation"
              checked={relation === "且"}
              onChange={() => onChange(conditions, "且")}
              className="accent-primary-600"
            />
            <span className="text-gray-700">满足全部条件（且）</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="condition-relation"
              checked={relation === "或"}
              onChange={() => onChange(conditions, "或")}
              className="accent-primary-600"
            />
            <span className="text-gray-700">满足任一条件（或）</span>
          </label>
        </div>
      )}

      {/* 条件列表 */}
      <div className="space-y-2.5">
        {conditions.map((c, i) => {
          const isRange = c.baselineType === "正常区间";
          const isTarget = c.baselineType === "目标值";
          const isHistoryAvg = c.baselineType === "历史均值";
          const allowedBaselines = OPERATOR_BASELINE_MAP[c.operator];
          const [lo, hi] = rangeParts(c.baselineValue);
          const unit = metricDefOf(c.metric)?.unit ?? "";
          const targetValue = targetOf(c.metric);
          const avgValue = avgOf(c.metric);

          // 判断方式 ↔ 基准类型 联动
          function handleOperatorChange(newOp: AlertCondition["operator"]) {
            const allowed = OPERATOR_BASELINE_MAP[newOp];
            const patch: Partial<AlertCondition> = { operator: newOp };
            // 当前基准类型不在新判断方式的候选内 → 重置为首项
            if (!allowed.includes(c.baselineType)) patch.baselineType = allowed[0];
            // 单值 ↔ 正常区间 切换时清空，避免格式错配（单值 vs 下限～上限）
            const willBeRange = (patch.baselineType ?? c.baselineType) === "正常区间";
            if (isRange !== willBeRange) patch.baselineValue = "";
            // 切换后若为目标值/历史均值类型 → 自动带入系统值
            if ((patch.baselineType ?? c.baselineType) === "目标值") {
              patch.baselineValue = targetValue;
            } else if ((patch.baselineType ?? c.baselineType) === "历史均值") {
              patch.baselineValue = avgValue;
            }
            update(i, patch);
          }
          function handleBaselineTypeChange(newBt: AlertCondition["baselineType"]) {
            const patch: Partial<AlertCondition> = { baselineType: newBt };
            const willBeRange = newBt === "正常区间";
            // 正常区间语义上唯一搭配「超出正常区间」
            if (willBeRange) patch.operator = "超出正常区间";
            if (newBt === "目标值") {
              // 自动带入有效目标值（不支持编辑）
              patch.baselineValue = targetValue;
            } else if (newBt === "历史均值") {
              // 自动带入最新历史均值（不支持编辑）
              patch.baselineValue = avgValue;
            } else if (isRange !== willBeRange) {
              patch.baselineValue = "";
            }
            update(i, patch);
          }
          // 切换数据指标：目标值/历史均值类型时重新带入新指标的系统值
          function handleMetricChange(name: string) {
            const patch: Partial<AlertCondition> = { metric: name };
            if (c.baselineType === "目标值") {
              const t = targetOf(name);
              if (t) {
                patch.baselineValue = t;
              } else {
                // 新指标未配置目标值 → 回退为基准值
                patch.baselineType = "基准值";
                patch.baselineValue = "";
              }
            } else if (c.baselineType === "历史均值") {
              const avg = avgOf(name);
              if (avg) {
                patch.baselineValue = avg;
              } else {
                // 新指标暂无历史均值 → 回退为基准值
                patch.baselineType = "基准值";
                patch.baselineValue = "";
              }
            }
            update(i, patch);
          }

          return (
            <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              {/* 顺序：数据指标 → 判断方式 → 基准类型 → 基准值 → 偏离比例 */}
              <div className="flex flex-wrap items-end gap-3">
                {/* 数据指标（下拉单选，支持关键字搜索）*/}
                <div className="flex flex-col gap-1 min-w-[190px] flex-1">
                  <span className="text-xs text-gray-500">数据指标</span>
                  <SearchSelect
                    options={metricOptions.map((m) => ({ value: m, label: m, hint: metricDefOf(m)?.unit }))}
                    value={c.metric}
                    onChange={handleMetricChange}
                    placeholder="请选择或搜索指标"
                  />
                </div>

                {/* 判断方式 */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">判断方式</span>
                  <select
                    className={selectCls}
                    value={c.operator}
                    onChange={(e) => handleOperatorChange(e.target.value as AlertCondition["operator"])}
                  >
                    {ALERT_OPERATORS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                {/* 基准类型 */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">基准类型</span>
                  <select
                    className={selectCls}
                    value={c.baselineType}
                    onChange={(e) => handleBaselineTypeChange(e.target.value as AlertCondition["baselineType"])}
                  >
                    {allowedBaselines.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* 基准值：目标值=系统带入只读；正常区间=下限+上限；其余=数字输入（按指标带出单位） */}
                {isRange ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">下限值</span>
                      <input
                        className={inputCls}
                        value={lo}
                        onChange={(e) => update(i, { baselineValue: `${e.target.value}～${hi}` })}
                        placeholder="如 12.5%"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">上限值</span>
                      <input
                        className={inputCls}
                        value={hi}
                        onChange={(e) => update(i, { baselineValue: `${lo}～${e.target.value}` })}
                        placeholder="如 13.5%"
                      />
                    </div>
                  </>
                ) : isTarget ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">目标值</span>
                    {targetValue ? (
                      <div className="flex">
                        <div className={`${readonlyCls} rounded-r-none`}>
                          {targetValue}
                        </div>
                        <span className="inline-flex h-[38px] items-center rounded-r-lg border border-l-0 border-dashed border-gray-300 bg-gray-50 px-3 text-xs text-gray-400">
                          {unit}
                        </span>
                      </div>
                    ) : (
                      <div className={readonlyCls}>该指标未配置目标值</div>
                    )}
                  </div>
                ) : isHistoryAvg ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">历史均值</span>
                    {avgValue ? (
                      <div className="flex">
                        <div className={`${readonlyCls} rounded-r-none`}>
                          {avgValue}
                        </div>
                        <span className="inline-flex h-[38px] items-center rounded-r-lg border border-l-0 border-dashed border-gray-300 bg-gray-50 px-3 text-xs text-gray-400">
                          {unit}
                        </span>
                      </div>
                    ) : (
                      <div className={readonlyCls}>该指标暂无历史均值</div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">{c.baselineType}</span>
                    <div className="flex">
                      <input
                        className={`${inputCls} rounded-r-none`}
                        value={c.baselineValue}
                        onChange={(e) => update(i, { baselineValue: e.target.value })}
                        placeholder="如 85"
                      />
                      <span className="inline-flex h-[38px] items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-xs text-gray-400">
                        {unit || "—"}
                      </span>
                    </div>
                  </div>
                )}

                {/* 偏离比例（选填，不填=越界即触发）*/}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">偏离比例(%)</span>
                  <input
                    className={inputCls}
                    value={c.deviation ?? ""}
                    onChange={(e) => update(i, { deviation: e.target.value })}
                    placeholder="选填"
                    title="选填；不填写表示只要越界基准值即触发"
                  />
                </div>

                {/* 预测范围（仅预测风险）*/}
                {isForecast && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">预测范围</span>
                    <select
                      className={selectCls}
                      value={c.forecastRange ?? ""}
                      onChange={(e) => update(i, { forecastRange: e.target.value })}
                    >
                      {FORECAST_RANGES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 删除 */}
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={conditions.length <= 1}
                    className="h-[38px] px-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400"
                    title={conditions.length <= 1 ? "首条条件不可删除" : "删除条件"}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 目标值/历史均值说明 / 区间说明 */}
              {isTarget && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  目标值由系统自动带入（来自目标值管理，含单位），不支持编辑
                </p>
              )}
              {isHistoryAvg && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  历史均值由系统自动带入（最新统计周期均值，含单位），不支持编辑
                </p>
              )}
              {isRange && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  超出正常区间：低于下限或高于上限即触发；偏离比例选填，不填写表示只要越界即触发
                </p>
              )}

              {errors[i] && <p className="mt-1.5 text-xs text-red-500">{errors[i]}</p>}
            </div>
          );
        })}
      </div>

      {/* 添加条件 */}
      {conditions.length < 5 && (
        <button
          type="button"
          onClick={add}
          className="mt-2.5 text-sm text-primary-600 hover:text-primary-700"
        >
          + 添加条件
        </button>
      )}
    </div>
  );
}
