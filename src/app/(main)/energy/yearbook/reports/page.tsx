import { ReportList } from "@/components/yearbook/ReportList";

export default function YearbookReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">年鉴报告</h1>
      </div>
      <ReportList />
    </div>
  );
}
