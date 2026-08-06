"use client";

import { MetadataExplorer } from "@/components/metadata/MetadataExplorer";

export default function DataModelPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* 顶部：标题（仅展示，无管理功能） */}
      <div className="mb-3 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">数据模型</h1>
      </div>

      {/* 主体（只读）：默认「字段列表」Tab，顺序 字段列表/基础信息/关系图/数据预览 */}
      <MetadataExplorer
        readOnly
        defaultTab="fields"
        tabOrder={["fields", "basic", "relation", "preview"]}
      />
    </div>
  );
}
