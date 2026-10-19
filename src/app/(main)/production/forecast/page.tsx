"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { MaterialConditionForm } from "@/components/production/MaterialConditionForm";
import { ForecastResultView } from "@/components/forecast/ForecastResult";
import { ConclusionPanel } from "@/components/forecast/ConclusionPanel";
import {
  BRAND_CONSUME_LEVELS,
  MATERIAL_FORECAST_METRICS,
  runMaterialForecast,
  type ConsumeLevel,
  type MaterialForecastInput,
} from "@/lib/mock-data/material-forecast";
import { MATERIAL_BRANDS, MATERIAL_META } from "@/lib/mock-data/material-consumption";
import type { ForecastResult } from "@/lib/mock-data/forecast";

// 各牌号历史单耗数据（本年度）：仅展示当前所选档位对应的一组数据，随预测条件联动；
// 数值随「开始预测」一并计算得到，仅在预测结果区展示；
// 宽度与上方预测结果/预测图表一致（桌面端减半）
function BrandConsumeLevelsTable({ metricKey, consumeLevel }: { metricKey: MaterialForecastInput["metricKey"]; consumeLevel: ConsumeLevel }) {
  const meta = MATERIAL_META[metricKey];
  const decimals = MATERIAL_FORECAST_METRICS[metricKey].decimals;
  return (
    <div className="mt-6 w-full border-t border-gray-100 pt-4 lg:w-1/2">
      <h4 className="mb-2 text-sm font-semibold text-gray-800">各牌号历史单耗数据（本年度）</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-500">
            <th className="py-2 text-left font-medium whitespace-nowrap">牌号</th>
            <th className="py-2 text-right font-medium whitespace-nowrap">历史单耗数据（{consumeLevel}）</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {MATERIAL_BRANDS.map((brand, i) => (
            <tr key={brand}>
              <td className="py-2 whitespace-nowrap text-gray-600">{brand}</td>
              <td className="py-2 text-right whitespace-nowrap font-medium text-gray-800">
                {BRAND_CONSUME_LEVELS[metricKey][consumeLevel][i].toLocaleString("en-US", {
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals,
                })}{" "}
                {meta.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 预测分析：配置预测条件（未来值预测）→ 模型测算 → 预测结果与图表（含各牌号历史单耗）→ 三段式结构化结论
export default function MaterialForecastPage() {
  const toast = useToast();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [lastInput, setLastInput] = useState<MaterialForecastInput | null>(null); // 本轮预测所用条件（结果区单耗表联动）

  async function handleRun(input: MaterialForecastInput) {
    setRunning(true);
    setResult(null);
    setLastInput(input);
    try {
      const r = await runMaterialForecast(input);
      setResult(r);
    } catch {
      toast("预测失败，请稍后重试", "danger");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">预测分析</h1>
      </div>

      <MaterialConditionForm onRun={handleRun} running={running} />

      {/* 结果区：loading / 空态 / 结果（含各牌号历史单耗）+ 结论 */}
      {running && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
            <p className="mt-3 text-sm text-gray-500">小模型测算中，约需数秒...</p>
          </div>
        </Card>
      )}

      {!running && !result}

      {result && lastInput && (
        <Card title="预测结果">
          <ForecastResultView result={result} showMeta={false} />
          <BrandConsumeLevelsTable metricKey={lastInput.metricKey} consumeLevel={lastInput.consumeLevel} />
        </Card>
      )}

      {result && (
        <Card title="预测结果分析">
          <ConclusionPanel sections={result.conclusions} />
        </Card>
      )}
    </div>
  );
}
