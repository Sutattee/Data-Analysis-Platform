"use client";

import type { AlertOperator } from "@/types";
import { ExpenseMetricPicker } from "@/components/alert/ExpenseMetricPicker";

// 费用口径判断方式（单值比较 + 区间两类）
const OPERATORS: AlertOperator[] = ["<", "≤", ">", "≥", "≠", "=", "超出正常区间", "处于区间"];
const RANGE_OPERATORS: AlertOperator[] = ["超出正常区间", "处于区间"];

// 一条触发条件的编辑态：多选指标 + 判断方式 + 数值（区间为下限/上限，单位固定 pct）
export interface ExpenseConditionDraft {
  metrics: string[];    // 数据指标名（无「-执行进度偏差」后缀），支持多选
  operator: AlertOperator;
  valueLo: string;      // 数值（单值）或区间下限
  valueHi: string;      // 区间上限（单值时不用）
}

export function isRangeOperator(op: AlertOperator): boolean {
  return RANGE_OPERATORS.includes(op);
}

export function blankDraft(): ExpenseConditionDraft {
  return { metrics: [], operator: "处于区间", valueLo: "", valueHi: "" };
}

const selectCls =
  "px-2.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
const inputCls = selectCls;
const readonlyCls =
  "flex h-[38px] min-w-[110px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 text-sm text-gray-500";

interface ExpenseConditionBuilderProps {
  conditions: ExpenseConditionDraft[];
  relation: "且" | "或";
  errors?: string[];
  onChange: (conditions: ExpenseConditionDraft[], relation: "且" | "或") => void;
}

// 费用触发条件构造器：数据指标（科目树多选）→ 判定指标（固定）→ 判断方式 → 数值（1-2 个，单位 pct）
// 最多 5 条独立条件，第一条默认保留；多条件统一 且/或 关系（不支持嵌套逻辑）
export function ExpenseConditionBuilder({
  conditions,
  relation,
  errors = [],
  onChange,
}: ExpenseConditionBuilderProps) {
  function update(i: number, patch: Partial<ExpenseConditionDraft>) {
    onChange(
      conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
      relation
    );
  }

  function add() {
    if (conditions.length >= 5) return;
    onChange([...conditions, blankDraft()], relation);
  }

  function remove(i: number) {
    if (conditions.length <= 1) return; // 第一条默认保留
    onChange(
      conditions.filter((_, idx) => idx !== i),
      relation
    );
  }

  // 切换判断方式：单值 ↔ 区间时清空数值，避免格式错配
  function handleOperatorChange(i: number, op: AlertOperator) {
    const wasRange = isRangeOperator(conditions[i].operator);
    const willBeRange = isRangeOperator(op);
    update(i, wasRange === willBeRange ? { operator: op } : { operator: op, valueLo: "", valueHi: "" });
  }

  // 仅保留数字、小数点与正负号
  const numOnly = (v: string) => v.replace(/[^\d.+-]/g, "");

  return (
    <div>
      {/* 多条件关系（仅多于1条时显示）：满足全部 = 且 / 满足任一 = 或 */}
      {conditions.length > 1 && (
        <div className="flex items-center gap-4 mb-3 text-sm">
          <span className="text-gray-500">条件关系：</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="expense-condition-relation"
              checked={relation === "且"}
              onChange={() => onChange(conditions, "且")}
              className="accent-primary-600"
            />
            <span className="text-gray-700">满足全部条件（且）</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="expense-condition-relation"
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
          const isRange = isRangeOperator(c.operator);
          return (
            <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              {/* 顺序：数据指标 → 判定指标 → 判断方式 → 数值 */}
              <div className="flex flex-wrap items-end gap-3">
                {/* 数据指标（多级费用科目菜单，多选可搜索） */}
                <div className="flex flex-col gap-1 min-w-[240px] flex-1">
                  <span className="text-xs text-gray-500">数据指标</span>
                  <ExpenseMetricPicker
                    value={c.metrics}
                    onChange={(metrics) => update(i, { metrics })}
                    error={!!errors[i] && c.metrics.length === 0}
                  />
                </div>

                {/* 判定指标（固定展示，不支持编辑） */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">判定指标</span>
                  <div className={readonlyCls}>执行进度偏差</div>
                </div>

                {/* 判断方式 */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">判断方式</span>
                  <select
                    className={selectCls}
                    value={c.operator}
                    onChange={(e) => handleOperatorChange(i, e.target.value as AlertOperator)}
                  >
                    {OPERATORS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                {/* 数值：区间为下限+上限，其余单值；单位固定 pct */}
                {isRange ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">下限值</span>
                      <div className="flex">
                        <input
                          className={`${inputCls} rounded-r-none`}
                          value={c.valueLo}
                          onChange={(e) => update(i, { valueLo: numOnly(e.target.value) })}
                          placeholder="如 15"
                        />
                        <span className="inline-flex h-[38px] items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-xs text-gray-400">
                          pct
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">上限值</span>
                      <div className="flex">
                        <input
                          className={`${inputCls} rounded-r-none`}
                          value={c.valueHi}
                          onChange={(e) => update(i, { valueHi: numOnly(e.target.value) })}
                          placeholder="如 20"
                        />
                        <span className="inline-flex h-[38px] items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-xs text-gray-400">
                          pct
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">数值</span>
                    <div className="flex">
                      <input
                        className={`${inputCls} rounded-r-none`}
                        value={c.valueLo}
                        onChange={(e) => update(i, { valueLo: numOnly(e.target.value) })}
                        placeholder="如 20"
                      />
                      <span className="inline-flex h-[38px] items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-xs text-gray-400">
                        pct
                      </span>
                    </div>
                  </div>
                )}

                {/* 删除（第一条默认保留） */}
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

      {/* 添加条件（最多 5 条） */}
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
