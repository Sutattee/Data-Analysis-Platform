import { AlertStrategiesList } from "@/components/alert/AlertStrategiesList";

export default function AlertManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">预警管理</h1>
      </div>
      <AlertStrategiesList />
    </div>
  );
}
