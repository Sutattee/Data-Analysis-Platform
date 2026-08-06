"use client";

import { IntegratedTable, TableMetadata } from "@/types";
import { getTypeLabel } from "@/lib/mock-data/data-source";
import { formatNumber } from "@/lib/utils";

function Field({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800 break-all">{value ?? "—"}</dd>
    </div>
  );
}

/**
 * 基础信息：只读定义列表。
 */
export function BasicInfo({ table, meta }: { table: IntegratedTable; meta: TableMetadata }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
        <Field label="数据表名称" value={table.name} />
        <Field label="数据源类型" value={getTypeLabel(table.typeKey)} />
        <Field label="所属数据源" value={table.sourceName} />
        <Field label="所属数据库" value={table.databaseName} />
        <Field label="数据行数" value={formatNumber(meta.rowCount)} />
        <Field label="字段数量" value={meta.fieldCount} />
        <Field label="存储大小" value={`${meta.sizeMb} MB`} />
        <Field label="集成时间" value={table.integratedAt} />
        <Field label="最近同步时间" value={table.lastSyncedAt} />
      </dl>
      {meta.remark && (
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <div className="text-xs text-gray-400 mb-1">备注</div>
          <div className="text-sm text-gray-600 leading-relaxed">{meta.remark}</div>
        </div>
      )}
    </div>
  );
}
