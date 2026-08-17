import { Suspense } from "react";
import { EventList } from "@/components/yearbook/EventList";

export default function YearbookEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">事件列表</h1>
      </div>
      {/* useSearchParams 需 Suspense 边界 */}
      <Suspense fallback={null}>
        <EventList />
      </Suspense>
    </div>
  );
}
