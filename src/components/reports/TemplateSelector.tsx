"use client";

import { ReportTemplate } from "@/types";
import { Card } from "@/components/ui/Card";

interface TemplateSelectorProps {
  templates: ReportTemplate[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export function TemplateSelector({ templates, selected, onSelect }: TemplateSelectorProps) {
  // 按分类分组
  const grouped: Record<string, ReportTemplate[]> = {};
  templates.forEach((t) => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-gray-500 mb-2">{category}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => onSelect(tpl.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selected === tpl.id
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-100 bg-white hover:border-gray-300"
                }`}
              >
                <h5 className="text-sm font-medium text-gray-800">{tpl.name}</h5>
                <p className="text-xs text-gray-500 mt-1">{tpl.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
