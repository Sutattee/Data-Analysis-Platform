"use client";

import { MetadataTable } from "@/types";
import { RelationGraph } from "./RelationGraph";

/**
 * 关系图 Tab：复用 RelationGraph；无关联时显示占位。
 */
export function RelationGraphTab({ table }: { table: MetadataTable }) {
  if (!table.relations || table.relations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
        <span className="text-5xl mb-3">🕸️</span>
        <p className="text-sm">暂无关系图</p>
        <p className="text-xs mt-1 text-gray-300">该表未配置任何关联关系</p>
      </div>
    );
  }
  return (
    <div className="py-2">
      <RelationGraph tableName={table.name} relations={table.relations} />
    </div>
  );
}
