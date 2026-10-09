"use client";

// 缺陷预测：基于机台生产参数及车间环境数据的滚动风险预测（本期展示最新预测结果）
import { DefectForecastView } from "@/components/quality-forecast/DefectForecastView";

export default function DefectForecastPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">缺陷预测</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          基于机台生产参数及车间环境数据对指定缺陷进行滚动风险预测，展示最新预测结果
        </p>
      </div>
      <DefectForecastView />
    </div>
  );
}
