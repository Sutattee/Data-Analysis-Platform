"use client";

import { DataMetric } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function MetricList({ metrics }: { metrics: DataMetric[] }) {
  // 按分类分组
  const grouped: Record<string, DataMetric[]> = {};
  metrics.forEach((m) => {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category} title={`📌 ${category}指标`}>
          <div className="space-y-3">
            {items.map((metric) => (
              <div key={metric.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800">{metric.name}</span>
                  <Badge>{metric.dimension}</Badge>
                  <span className="text-xs text-gray-400">更新: {metric.updateFrequency}</span>
                </div>
                <p className="text-xs text-gray-500">{metric.definition}</p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
