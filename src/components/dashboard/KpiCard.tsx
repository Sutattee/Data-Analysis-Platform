"use client";

import { KpiData } from "@/types";
import { formatNumber, formatChange, getTrendColor, getTrendArrow } from "@/lib/utils";

export function KpiCard({ data }: { data: KpiData }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="text-xs text-gray-500 mb-1">{data.label}</div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold text-gray-900">
          {formatNumber(data.value)}
        </span>
        <span className="text-sm text-gray-400">{data.unit}</span>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor(data.trend)}`}>
        <span>{getTrendArrow(data.trend)}</span>
        <span>{formatChange(data.change)}</span>
        <span className="text-gray-400 font-normal">vs 上月</span>
      </div>
    </div>
  );
}
