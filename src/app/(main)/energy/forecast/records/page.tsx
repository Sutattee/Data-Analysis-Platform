import { Suspense } from "react";
import { ForecastRecordsView } from "@/components/forecast/ForecastRecordsView";

export default function ForecastRecordsPage() {
  // useSearchParams（?record= 自动打开详情）需 Suspense 边界
  return (
    <Suspense fallback={null}>
      <ForecastRecordsView />
    </Suspense>
  );
}
