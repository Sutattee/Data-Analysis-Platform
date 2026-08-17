import { Suspense } from "react";
import { ReportDetail } from "@/components/yearbook/ReportDetail";

export default function ReportDetailPage() {
  // useSearchParams 需 Suspense 边界
  return (
    <Suspense fallback={null}>
      <ReportDetail />
    </Suspense>
  );
}
