import { AlertStrategiesList } from "@/components/alert/AlertStrategiesList";

// 工艺质量 · 告警管理：仅展示质量数据告警策略（QAS 前缀；实测异常 + 预测风险，质量口径列结构与筛选）
export default function QualityAlertManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">告警管理</h1>
      </div>
      <AlertStrategiesList basePath="/quality/alert/management" variant="quality" />
    </div>
  );
}
