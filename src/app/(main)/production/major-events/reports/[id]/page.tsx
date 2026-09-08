import { Suspense } from "react";
import { ReportDetail } from "@/components/production-events/ReportDetail";

export default function MajorEventReportDetailPage() {
  // useSearchParams 需 Suspense 边界
  return (
    <Suspense fallback={null}>
      <ReportDetail />
    </Suspense>
  );
}
