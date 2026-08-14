"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { ConditionForm } from "@/components/forecast/ConditionForm";
import { ForecastResultView } from "@/components/forecast/ForecastResult";
import { ConclusionPanel } from "@/components/forecast/ConclusionPanel";
import { runForecast, type ForecastInput, type ForecastResult, type ForecastType } from "@/lib/mock-data/forecast";

// 预测记录「按原条件再次预测」携带的恢复参数（sessionStorage 传递）
interface ReplayInit {
  type?: ForecastType;
  metricKey?: string;
}

// 情景预测：条件配置 → 模型测算 → 核心结果与图表 → 三段式结构化结论
export default function ScenarioForecastPage() {
  const toast = useToast();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  // 恢复参数（key 变化时 ConditionForm 重挂载以应用初始值）
  const [replay, setReplay] = useState<ReplayInit | undefined>();
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("forecast-replay");
    if (raw) {
      sessionStorage.removeItem("forecast-replay");
      try {
        setReplay(JSON.parse(raw) as ReplayInit);
        setFormKey((k) => k + 1);
      } catch {
        /* 忽略非法数据 */
      }
    }
  }, []);

  async function handleRun(input: ForecastInput) {
    setRunning(true);
    setResult(null);
    try {
      const r = await runForecast(input);
      setResult(r);
      toast("预测完成", "success");
    } catch {
      toast("预测失败，请稍后重试", "danger");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">情景预测</h1>
      </div>

      <ConditionForm key={formKey} onRun={handleRun} running={running} initial={replay} onInvalidate={() => setResult(null)} />

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
        <Card title="③ 预测结果">
          <ForecastResultView result={result} />
        </Card>
      )}

      {result && (
        <Card title="④ 预测结果分析">
          <ConclusionPanel sections={result.conclusions} />
        </Card>
      )}
    </div>
  );
}
