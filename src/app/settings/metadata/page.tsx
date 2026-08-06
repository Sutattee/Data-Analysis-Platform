"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SyncMetadataModal } from "@/components/metadata/SyncMetadataModal";
import { MetadataExplorer } from "@/components/metadata/MetadataExplorer";

export default function MetadataPage() {
  const [syncOpen, setSyncOpen] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* 顶部：标题 */}
      <h1 className="text-xl font-bold text-gray-900 mb-3 flex-shrink-0">元数据管理</h1>

      {/* 主体（可编辑），同步元数据按钮置于搜索行 */}
      <MetadataExplorer
        readOnly={false}
        toolbarExtra={<Button onClick={() => setSyncOpen(true)}>同步元数据</Button>}
        showRecommended
      />

      {/* 同步元数据弹窗 */}
      <SyncMetadataModal open={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  );
}
