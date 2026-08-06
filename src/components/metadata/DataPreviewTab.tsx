"use client";

import { useMemo, useState } from "react";
import { MetadataTable, MetadataField } from "@/types";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatNumber, formatDateTime } from "@/lib/utils";

interface Props {
  table: MetadataTable;
}

const PREVIEW_CAP = 500; // 数据预览最多展示前 500 条

const thCls = "text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap sticky top-0 bg-gray-50";
const tdCls = "px-3 py-2 text-xs text-gray-700 font-mono whitespace-nowrap";

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// 按字段类型确定性生成一行预览数据（补充 mock 不足的行数）
function genRow(fields: MetadataField[], i: number): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  const baseTs = new Date(2024, 0, 13).getTime();
  for (const f of fields) {
    const t = f.dataType.toLowerCase();
    if (t.includes("int") || t.includes("bigint")) row[f.name] = i + 1;
    else if (t.includes("decimal") || t.includes("numeric") || t.includes("double") || t.includes("float"))
      row[f.name] = Math.round((i + 1) * 137.5) / 10;
    else if (t.includes("datetime") || t.includes("date") || t.includes("time") || t.includes("timestamp"))
      row[f.name] = formatDateTime(baseTs + i * 86400000);
    else row[f.name] = `${f.name.slice(0, 6)}_${1001 + i}`;
  }
  return row;
}

export function DataPreviewTab({ table }: Props) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [visibleFields, setVisibleFields] = useState<string[]>(table.fields.map((f) => f.name));
  const [showSettings, setShowSettings] = useState(false);

  // 预览数据：最多前 500 条（mock 不足部分按字段生成补齐）
  const previewRows = useMemo(() => {
    const count = Math.min(table.rowCount, PREVIEW_CAP);
    return Array.from({ length: count }, (_, i) => table.preview[i] ?? genRow(table.fields, i));
  }, [table]);

  const total = previewRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  // 可见列（保持字段顺序）
  const columns = useMemo(
    () => table.fields.filter((f) => visibleFields.includes(f.name)),
    [table.fields, visibleFields]
  );

  const paged = useMemo(
    () => previewRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [previewRows, safePage, pageSize]
  );

  const pageIndices = paged.map((_, i) => (safePage - 1) * pageSize + i);
  const allOnPageChecked = pageIndices.length > 0 && pageIndices.every((idx) => selected.has(idx));

  function toggleRow(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }
  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageChecked) pageIndices.forEach((idx) => next.delete(idx));
      else pageIndices.forEach((idx) => next.add(idx));
      return next;
    });
  }

  function exportCsv() {
    const indices = selected.size > 0 ? Array.from(selected).sort((a, b) => a - b) : pageIndices;
    const rows = indices.map((idx) => previewRows[idx]).filter(Boolean);
    if (rows.length === 0) {
      toast("没有可导出的数据", "warning");
      return;
    }
    const header = columns.map((c) => csvCell(c.name)).join(",");
    const body = rows.map((r) => columns.map((c) => csvCell(r[c.name])).join(",")).join("\n");
    const csv = "﻿" + header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table.name}_preview.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`已导出 ${rows.length} 条数据`, "success");
  }

  function toggleFieldVisible(name: string) {
    setVisibleFields((prev) => (prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]));
  }

  if (total === 0) {
    return <div className="py-20 text-center text-sm text-gray-400">暂无数据</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部批量操作 */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAllOnPage}
            className="px-2.5 py-1 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {allOnPageChecked ? "取消本页全选" : "本页全选"}
          </button>
          <span className="text-xs text-gray-400">
            已勾选 <span className="text-primary-600 font-medium">{selected.size}</span> 条
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowSettings(true)}>
            显示设置
          </Button>
          <Button size="sm" onClick={exportCsv}>
            批量导出
          </Button>
        </div>
      </div>

      {/* 预览表格 */}
      <div className="flex-1 min-h-0 overflow-auto border border-gray-100 rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${thCls} w-10 text-center`}>
                <input type="checkbox" checked={allOnPageChecked} onChange={toggleAllOnPage} className="accent-primary-600" />
              </th>
              {columns.map((c) => (
                <th key={c.name} className={thCls}>{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.map((row, i) => {
              const idx = pageIndices[i];
              const checked = selected.has(idx);
              return (
                <tr key={idx} className={`hover:bg-gray-50 ${checked ? "bg-primary-50/40" : ""}`}>
                  <td className="w-10 text-center px-3 py-2">
                    <input type="checkbox" checked={checked} onChange={() => toggleRow(idx)} className="accent-primary-600" />
                  </td>
                  {columns.map((c) => (
                    <td key={c.name} className={tdCls}>{String(row[c.name] ?? "")}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 底部统计 + 分页 */}
      <div className="flex items-center justify-between gap-4 pt-3 mt-2 border-t border-gray-100 flex-shrink-0 flex-wrap">
        <span className="text-xs text-gray-400">
          共 <span className="font-medium text-gray-600">{formatNumber(table.rowCount)}</span> 条数据（预览前 {total} 条）
        </span>
        <Pagination
          total={total}
          page={safePage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
        />
      </div>

      {/* 显示设置面板 */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="显示设置 - 可见字段" size="sm">
        <div className="space-y-4">
          <div className="space-y-1 max-h-72 overflow-auto">
            {table.fields.map((f) => (
              <label key={f.name} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                <input type="checkbox" checked={visibleFields.includes(f.name)} onChange={() => toggleFieldVisible(f.name)} className="accent-primary-600" />
                <span className="text-sm font-mono text-gray-700">{f.name}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowSettings(false)}>取消</Button>
            <Button onClick={() => setShowSettings(false)}>保存</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
