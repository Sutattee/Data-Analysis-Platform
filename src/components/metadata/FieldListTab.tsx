"use client";

import { useMemo, useState } from "react";
import { MetadataTable, MetadataField } from "@/types";
import { Pagination } from "@/components/ui/Pagination";
import { FieldEditModal } from "./FieldEditModal";

interface Props {
  table: MetadataTable;
  allTables: MetadataTable[];
  onSaveField: (fieldName: string, patch: Partial<MetadataField>) => void;
  readOnly?: boolean;
}

const thCls = "text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-sm text-gray-700";

export function FieldListTab({ table, allTables, onSaveField, readOnly = false }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editingField, setEditingField] = useState<MetadataField | null>(null);

  const total = table.fields.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => table.fields.slice((safePage - 1) * pageSize, safePage * pageSize),
    [table.fields, safePage, pageSize]
  );

  // 用于同义词重复校验：本表同义词 + 其它字段的同义词
  const existingSynonyms = useMemo(() => {
    const set = new Set<string>(table.synonyms);
    table.fields.forEach((f) => {
      if (editingField && f.name === editingField.name) return;
      f.synonyms.forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [table, editingField]);

  function handleSave(patch: Partial<MetadataField>) {
    if (!editingField) return;
    onSaveField(editingField.name, patch);
    setEditingField(null);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b border-gray-100">
              <th className={thCls}>字段名</th>
              <th className={thCls}>数据类型</th>
              <th className={thCls}>业务含义</th>
              <th className={thCls}>同义词标签</th>
              <th className={thCls}>外键关联</th>
              {!readOnly && <th className={`${thCls} text-right`}>操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.map((f) => (
              <tr key={f.name} className="hover:bg-gray-50">
                <td className={`${tdCls} font-mono text-xs text-primary-700 whitespace-nowrap`}>{f.name}</td>
                <td className={`${tdCls} font-mono text-xs text-gray-500 whitespace-nowrap`}>{f.dataType}</td>
                <td className={`${tdCls} text-xs text-gray-600 max-w-[260px]`}>{f.businessMeaning || "—"}</td>
                <td className={tdCls}>
                  {f.synonyms.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {f.synonyms.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className={`${tdCls} font-mono text-xs text-gray-500 whitespace-nowrap`}>
                  {f.fk ? `${f.fk.table}.${f.fk.field}` : "—"}
                </td>
                {!readOnly && (
                  <td className={`${tdCls} text-right whitespace-nowrap`}>
                    <button
                      onClick={() => setEditingField(f)}
                      className="px-2.5 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      编辑
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-3 mt-2 border-t border-gray-100 flex-shrink-0">
        <Pagination
          total={total}
          page={safePage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
        />
      </div>

      {!readOnly && (
        <FieldEditModal
          open={editingField !== null}
          field={editingField}
          allTables={allTables}
          existingSynonyms={existingSynonyms}
          onClose={() => setEditingField(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
