"use client";

import { DataSourceRecord } from "@/types";
import { getTypeLabel } from "@/lib/mock-data/data-source";

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800 break-all">{value || "—"}</dd>
    </div>
  );
}

/**
 * 数据源详情（只读）：双列定义列表。
 */
export function DataSourceDetail({ record }: { record: DataSourceRecord }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
      <Field label="数据源类型" value={getTypeLabel(record.type)} />
      <Field label="数据源名称" value={record.name} />
      <Field
        label="可用状态"
        value={record.status === "available" ? "可用" : "不可用"}
      />
      <Field label="地址" value={record.host} />
      <Field label="端口号" value={record.port} />
      <Field label="数据库名称" value={record.database} />
      <Field label="用户名" value={record.username} />
      <Field label="负责人" value={record.owner} />
      <Field label="创建人" value={record.creator} />
      <Field label="创建时间" value={record.createdAt} />
      <Field label="更新人" value={record.updater} />
      <Field label="更新时间" value={record.updatedAt} />
      <div className="col-span-2">
        <Field label="备注" value={record.remark} />
      </div>
    </dl>
  );
}
