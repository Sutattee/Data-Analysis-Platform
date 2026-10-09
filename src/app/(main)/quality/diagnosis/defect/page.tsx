import { Suspense } from "react";
import { DefectDiagnosisView } from "@/components/quality-diagnosis/DefectDiagnosisView";

// 缺陷诊断：useSearchParams 需 Suspense 包裹（Next 14 静态页 CSR bailout）
export default function DefectDiagnosisPage() {
  return (
    <Suspense fallback={null}>
      <DefectDiagnosisView />
    </Suspense>
  );
}
