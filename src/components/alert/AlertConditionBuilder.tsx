"use client";

import type { AlertType, AlertCondition } from "@/types";
import {
  ALERT_OPERATORS,
  ALERT_BASELINE_TYPES,
  FORECAST_RANGES,
  METRIC_OPTIONS,
  FORECAST_METRIC_OPTIONS,
} from "@/lib/mock-data/alert-strategies";

const selectCls =
  "px-2.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
const inputCls = selectCls;

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
    operator: "低于",
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
          const [lo, hi] = rangeParts(c.baselineValue);
          return (
            <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              <div className="flex flex-wrap items-end gap-3">
                {/* 数据指标（可搜索）*/}
                <div className="flex flex-col gap-1 min-w-[150px] flex-1">
                  <span className="text-xs text-gray-500">数据指标</span>
                  <input
                    list={`metric-opts-${i}`}
                    value={c.metric}
                    onChange={(e) => update(i, { metric: e.target.value })}
                    placeholder="请选择或搜索指标"
                    className={inputCls}
                  />
                  <datalist id={`metric-opts-${i}`}>
                    {metricOptions.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
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

                {/* 判断方式 */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">判断方式</span>
                  <select
                    className={selectCls}
                    value={c.operator}
                    onChange={(e) => update(i, { operator: e.target.value as AlertCondition["operator"] })}
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
                    onChange={(e) => update(i, { baselineType: e.target.value as AlertCondition["baselineType"] })}
                  >
                    {ALERT_BASELINE_TYPES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* 基准值（正常区间为下限+上限）*/}
                {isRange ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">下限值</span>
                      <input
                        className={inputCls}
                        value={lo}
                        onChange={(e) => update(i, { baselineValue: `${e.target.value}～${hi}` })}
                        placeholder="如 95.0%"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">上限值</span>
                      <input
                        className={inputCls}
                        value={hi}
                        onChange={(e) => update(i, { baselineValue: `${lo}～${e.target.value}` })}
                        placeholder="如 99.0%"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">基准值</span>
                    <input
                      className={inputCls}
                      value={c.baselineValue}
                      onChange={(e) => update(i, { baselineValue: e.target.value })}
                      placeholder="如 85% 或 31.0 kgce/t"
                    />
                  </div>
                )}

                {/* 偏离比例（选填）*/}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">偏离比例(%)</span>
                  <input
                    className={inputCls}
                    value={c.deviation ?? ""}
                    onChange={(e) => update(i, { deviation: e.target.value })}
                    placeholder="选填"
                  />
                </div>

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
