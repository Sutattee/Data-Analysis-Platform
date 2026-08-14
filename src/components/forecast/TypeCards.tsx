"use client";

import { FORECAST_TYPES, type ForecastType } from "@/lib/mock-data/forecast";

// 预测类型单选卡片：切换后动态调整下方预测条件
export function TypeCards({ value, onChange }: { value: ForecastType; onChange: (t: ForecastType) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {FORECAST_TYPES.map((t) => {
        const sel = value === t.type;
        return (
          <button
            type="button"
            key={t.type}
            onClick={() => onChange(t.type)}
            className={`p-3.5 rounded-lg border-2 text-left transition-all ${
              sel
                ? "border-primary-500 bg-primary-50"
                : "border-gray-100 bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-sm font-medium text-gray-800">
              {t.icon} {t.type}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.desc}</p>
            {(t.type === "目标达成预测" || t.type === "达标条件反推") && (
              <p className="mt-1 text-[10px] text-gray-400">仅已配置目标值的指标支持</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
