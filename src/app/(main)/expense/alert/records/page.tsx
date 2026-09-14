import { ExpenseAlertRecordsList } from "@/components/alert/ExpenseAlertRecordsList";

// 费用预算执行 · 告警记录：仅展示预算指标执行进度偏差类告警（费用口径列结构与筛选）
export default function ExpenseAlertRecordsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">告警记录</h1>
      </div>
      <ExpenseAlertRecordsList basePath="/expense/alert/records" />
    </div>
  );
}
