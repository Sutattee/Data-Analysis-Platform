"use client";

// 稳定性预测：基于机台生产参数及车间环境数据的滚动预测（本期展示最新一轮预测结果）
import { Suspense } from "react";
import { StabilityForecastView } from "@/components/quality-stability-forecast/StabilityForecastView";

export default function StabilityForecastPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">稳定性预测</h1>
      <Suspense>
        <StabilityForecastView />
      </Suspense>
    </div>
  );
}
