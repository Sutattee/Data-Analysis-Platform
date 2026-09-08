import { ReportList } from "@/components/production-events/ReportList";

export default function MajorEventsReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">事件报告</h1>
      </div>
      <ReportList />
    </div>
  );
}
