"use client";

import { DefectForecastView } from "@/components/quality-forecast/DefectForecastView";

export default function DefectForecastPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-gray-900">缺陷预测</h1>
      <DefectForecastView />
    </div>
  );
}
