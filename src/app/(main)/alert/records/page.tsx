import { Suspense } from "react";
import { AlertRecordsList } from "@/components/alert/AlertRecordsList";

export default function AlertRecordsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">预警记录</h1>
      </div>
      {/* useSearchParams 需 Suspense 边界 */}
      <Suspense fallback={null}>
        <AlertRecordsList />
      </Suspense>
    </div>
  );
}
