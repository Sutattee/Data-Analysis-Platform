"use client";

import { reportTemplates } from "@/lib/mock-data/reports";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function ReportTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">报告模板</h1>
          <p className="text-sm text-gray-500 mt-1">管理AI报告生成模板</p>
        </div>
        <Button>+ 新建模板</Button>
      </div>

      {/* 三列卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTemplates.map((tpl) => (
          <div key={tpl.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-gray-800">{tpl.name}</h3>
              <Badge>{tpl.category}</Badge>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">{tpl.description}</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50">编辑</Button>
              <Button variant="ghost" size="sm">预览</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
