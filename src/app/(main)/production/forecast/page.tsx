"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { MaterialConditionForm } from "@/components/production/MaterialConditionForm";
import { ForecastResultView } from "@/components/forecast/ForecastResult";
import { ConclusionPanel } from "@/components/forecast/ConclusionPanel";
import { runMaterialForecast, type MaterialForecastInput } from "@/lib/mock-data/material-forecast";
import type { ForecastResult } from "@/lib/mock-data/forecast";

// 预测分析：配置预测条件（未来值预测）→ 模型测算 → 预测结果与图表 → 三段式结构化结论
export default function MaterialForecastPage() {
  const toast = useToast();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);

  async function handleRun(input: MaterialForecastInput) {
    setRunning(true);
    setResult(null);
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

      {/* 结果区：loading / 空态 / 结果 + 结论 */}
      {running && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
            <p className="mt-3 text-sm text-gray-500">小模型测算中，约需数秒...</p>
          </div>
        </Card>
      )}

      {!running && !result}

      {result && (
        <Card title="预测结果">
          <ForecastResultView result={result} />
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
