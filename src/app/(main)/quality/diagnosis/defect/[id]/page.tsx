import { Suspense } from "react";
import { DiagnosisDetailView } from "@/components/quality-diagnosis/DiagnosisDetailView";

// 诊断详情：useSearchParams 需 Suspense 包裹（Next 14 静态页 CSR bailout）
export default function DiagnosisDetailPage() {
  return (
    <Suspense fallback={null}>
      <DiagnosisDetailView />
    </Suspense>
  );
}
