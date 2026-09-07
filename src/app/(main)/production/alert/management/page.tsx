import { AlertStrategiesList } from "@/components/alert/AlertStrategiesList";
import { PRODUCTION_MATERIAL_METRICS } from "@/lib/mock-data/alerts";

// 生产管理 · 告警管理：仅展示监测 4 个辅料指标的告警策略
export default function ProductionAlertManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">告警管理</h1>
      </div>
      <AlertStrategiesList metrics={PRODUCTION_MATERIAL_METRICS} />
    </div>
  );
}
