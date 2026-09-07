"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import { MATERIAL_META, type MaterialKey } from "@/lib/mock-data/material-consumption";
import {
  CONSUME_LEVEL_OPTIONS,
  consumeLevelValue,
  DEFAULT_PLAN_OUTPUT,
  MATERIAL_FORECAST_MODEL,
  MATERIAL_HISTORY_RANGE,
  NEXT_MONTH_LABEL,
  type ConsumeLevel,
  type MaterialForecastInput,
} from "@/lib/mock-data/material-forecast";

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

const METRIC_KEYS: MaterialKey[] = ["tipPaper", "boxLabel", "tobacco", "filterRod"];

// 辅料预测条件区：预测类型（未来值预测）+ 通用预测条件，内部持有全部状态
export function MaterialConditionForm({
  onRun,
  running,
}: {
  onRun: (input: MaterialForecastInput) => void;
  running: boolean;
}) {
  const [metricKey, setMetricKey] = useState<MaterialKey>("tipPaper");
  // 各牌号下个月计划产量（自动带入，允许编辑）
  const [planInput, setPlanInput] = useState(String(DEFAULT_PLAN_OUTPUT));
  // 各牌号历史单耗档位（自动带入，随指标联动）
  const [level, setLevel] = useState<ConsumeLevel>("均值");

  const planNum = Number(planInput);
  const planErr = !/^\d+(\.\d+)?$/.test(planInput.trim()) || planNum <= 0 ? "请输入大于 0 的数值" : undefined;

  function handleSubmit() {
    if (planErr || running) return;
    onRun({ metricKey, planOutput: planNum, consumeLevel: level });
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 text-sm font-semibold text-gray-800">① 选择预测类型</div>
        {/* 仅支持未来值预测：单卡选中态展示 */}
        <div className="w-full lg:w-1/4">
          <div className="rounded-lg border-2 border-primary-500 bg-primary-50 p-3.5 text-left">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">📈 未来值预测</div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              根据最新实际数据和生产计划、历史数据，预测指标未来数值
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 text-sm font-semibold text-gray-800">② 配置预测条件</div>

        {/* 表单区：宽度减半，右侧留白 */}
        <div className="w-full lg:w-1/2">
          {/* 通用条件 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="预测指标" required>
              <SearchSelect
                options={METRIC_KEYS.map((k) => ({ value: k, label: MATERIAL_META[k].label, hint: MATERIAL_META[k].unit }))}
                value={metricKey}
                onChange={(v) => {
                  setMetricKey(v as MaterialKey);
                  setLevel("均值"); // 切换指标后单耗档位重置为均值
                }}
                placeholder="按指标名称搜索"
              />
            </Field>
            <Field label="预测对象" required>
              <div className={readonlyCls}>全厂</div>
            </Field>
            <Field label="历史数据范围">
              <div className={readonlyCls}>{MATERIAL_HISTORY_RANGE}</div>
            </Field>
            <Field label="模型">
              <div className={readonlyCls}>{MATERIAL_FORECAST_MODEL}</div>
            </Field>
          </div>

          <div className="my-4 border-t border-gray-100" />

          {/* 业务条件 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="各牌号下个月计划产量" error={planErr}>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={planInput}
                  onChange={(e) => setPlanInput(e.target.value)}
                  className={`${inputCls} pr-10`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">箱</span>
              </div>
            </Field>
            <Field label="各牌号历史单耗数据">
              <SearchSelect
                options={CONSUME_LEVEL_OPTIONS}
                value={level}
                onChange={(v) => setLevel(v as ConsumeLevel)}
              />
              {/* 选定档位后自动拉取对应数值展示（仅数值 + 单位） */}
              <div className="mt-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {consumeLevelValue(metricKey, level)}
              </div>
            </Field>
          </div>

          <div className="my-4 border-t border-gray-100" />

          <Field label="预测时间范围" required>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="material-forecast-range" checked readOnly className="h-4 w-4 accent-blue-600" />
              {NEXT_MONTH_LABEL}
            </label>
          </Field>

          {/* 操作按钮：左对齐 */}
          <div className="mt-5 flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={running || !!planErr}>
              {running ? (
                <>
                  <Spinner size="sm" /> 预测中...
                </>
              ) : (
                "开始预测"
              )}
            </Button>
            {planErr && <span className="text-xs text-red-500">存在未通过校验的条件，请修正后再预测</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
