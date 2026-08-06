import { KpiData } from "@/types";
import { KpiCard } from "./KpiCard";

export function MetricGrid({ data }: { data: KpiData[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {data.map((item) => (
        <KpiCard key={item.label} data={item} />
      ))}
    </div>
  );
}
