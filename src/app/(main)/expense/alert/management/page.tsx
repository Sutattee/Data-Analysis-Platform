import { AlertStrategiesList } from "@/components/alert/AlertStrategiesList";
import { EXPENSE_ALERT_METRIC_OPTIONS } from "@/lib/mock-data/expense-alerts";

// 费用预算执行 · 告警管理：仅展示监测预算指标执行进度偏差的策略（费用口径列结构与筛选）
export default function ExpenseAlertManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">告警管理</h1>
      </div>
      <AlertStrategiesList
        metrics={EXPENSE_ALERT_METRIC_OPTIONS}
        basePath="/expense/alert/management"
        variant="expense"
      />
    </div>
  );
}
