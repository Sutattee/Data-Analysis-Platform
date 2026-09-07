"use client";

import Link from "next/link";
import { AlertStrategyForm } from "@/components/alert/AlertStrategyForm";
import { PRODUCTION_MATERIAL_METRICS } from "@/lib/mock-data/alerts";

// 新建数据告警（生产管理板块）：指标仅可选 4 个辅料指标
export default function ProductionNewStrategyPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-96px)] gap-4">
      <div className="flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
          <Link href="/production/alert/management" className="hover:text-primary-600">告警中心</Link>
          <span>/</span>
          <span className="text-gray-600">数据告警详情</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">新建数据告警</h1>
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <AlertStrategyForm
          mode="new"
          listPath="/production/alert/management"
          metricOptions={PRODUCTION_MATERIAL_METRICS}
        />
      </div>
    </div>
  );
}
