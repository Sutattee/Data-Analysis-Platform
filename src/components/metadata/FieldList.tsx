"use client";

import { Badge } from "@/components/ui/Badge";
import { FieldDef } from "@/types";

/**
 * 字段列表：字段名 / 数据类型 / 是否主键 / 说明。
 */
export function FieldList({ fields }: { fields: FieldDef[] }) {
  const thCls = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className={thCls}>字段名</th>
            <th className={thCls}>数据类型</th>
            <th className={thCls}>主键</th>
            <th className={thCls}>说明</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {fields.map((f) => (
            <tr key={f.name} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-sm font-mono text-primary-700 whitespace-nowrap">{f.name}</td>
              <td className="px-4 py-2.5 text-xs text-gray-600 font-mono whitespace-nowrap">{f.type}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                {f.isPrimaryKey ? <Badge variant="warning">主键</Badge> : <span className="text-gray-300 text-xs">—</span>}
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-500">{f.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
