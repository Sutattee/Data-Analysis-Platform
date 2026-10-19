"use client";

// 缺陷预测：基于机台生产参数及车间环境数据的滚动风险预测（本期展示最新预测结果）
import { DefectForecastView } from "@/components/quality-forecast/DefectForecastView";

export default function DefectForecastPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">缺陷预测</h1>
      <DefectForecastView />
    </div>
  );
}
