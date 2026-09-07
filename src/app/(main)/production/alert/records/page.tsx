import { Suspense } from "react";
import { AlertRecordsList } from "@/components/alert/AlertRecordsList";
import { PRODUCTION_MATERIAL_METRICS } from "@/lib/mock-data/alerts";

// 生产管理 · 告警记录：仅展示 4 个辅料指标的告警
export default function ProductionAlertRecordsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">告警记录</h1>
      </div>
      {/* useSearchParams 需 Suspense 边界 */}
      <Suspense fallback={null}>
        <AlertRecordsList metrics={PRODUCTION_MATERIAL_METRICS} />
      </Suspense>
    </div>
  );
}
