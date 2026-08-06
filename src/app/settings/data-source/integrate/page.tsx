"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntegratedTable } from "@/types";
import { addIntegratedTables } from "@/lib/store/data-source-store";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { SpartaIntegratePanel } from "@/components/data-source/SpartaIntegratePanel";
import { FullSyncModal } from "@/components/data-source/FullSyncModal";

export default function SpartaIntegratePage() {
  const router = useRouter();
  const toast = useToast();
  const [syncOpen, setSyncOpen] = useState(false);

  function back() {
    router.push("/settings/data-source");
  }

  function handleConfirm(tables: IntegratedTable[]) {
    const added = addIntegratedTables(tables);
    const requested = tables.length;
    if (added === 0) {
      toast("所选数据表已集成，无需重复添加", "warning");
    } else if (added < requested) {
      toast(`添加成功：新增 ${added} 张，${requested - added} 张已存在`, "info");
    } else {
      toast(`添加成功（共 ${added} 张）`, "success");
    }
    back();
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-48px)]">
      {/* 顶部：标题 + 全量同步 */}
      <div className="flex items-start justify-between flex-shrink-0 gap-4">
        <div>
          <button
            onClick={back}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-1"
          >
            <span>←</span>
            <span>返回数据源管理</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900">集成 Sparta 数据</h1>
          <p className="text-sm text-gray-500 mt-1">从 Sparta 平台勾选数据表，集成后自动同步其元数据</p>
        </div>
        <Button onClick={() => setSyncOpen(true)}>全量同步</Button>
      </div>

      {/* 主体（含底部 取消/确定） */}
      <SpartaIntegratePanel onConfirm={handleConfirm} onCancel={back} />

      {/* 全量同步进度弹窗 */}
      <FullSyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  );
}
