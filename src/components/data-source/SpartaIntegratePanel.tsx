"use client";

import { useMemo, useState } from "react";
import { DataSourceTypeKey, IntegratedTable, SpartaSource } from "@/types";
import {
  spartaTypes,
  getSpartaSources,
  getSpartaTables,
  getTypeLabel,
} from "@/lib/mock-data/data-source";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface Props {
  onConfirm: (tables: IntegratedTable[]) => void;
  onCancel: () => void;
}

const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";

/**
 * 集成 Sparta 数据面板：左侧 数据源类型 → 数据源 二级级联 + 表名搜索 + 可选表列表；
 * 右侧已勾选表列表。
 */
export function SpartaIntegratePanel({ onConfirm, onCancel }: Props) {
  const [typeKey, setTypeKey] = useState<DataSourceTypeKey | "">("");
  const [sourceId, setSourceId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sources: SpartaSource[] = useMemo(
    () => (typeKey ? getSpartaSources(typeKey) : []),
    [typeKey]
  );
  // 选定数据源后直接拉取其下数据表
  const tables = useMemo(
    () => (sourceId && typeKey ? getSpartaTables(sourceId, typeKey) : []),
    [sourceId, typeKey]
  );

  const filteredTables = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return tables;
    return tables.filter((t) => t.name.toLowerCase().includes(kw));
  }, [tables, keyword]);

  const selectedTables = useMemo(
    () => tables.filter((t) => selectedIds.has(t.id)),
    [tables, selectedIds]
  );

  // 级联切换时重置下级与已选
  function handleTypeChange(v: string) {
    setTypeKey(v as DataSourceTypeKey | "");
    setSourceId("");
    setSelectedIds(new Set());
    setKeyword("");
  }
  function handleSourceChange(v: string) {
    setSourceId(v);
    setSelectedIds(new Set());
    setKeyword("");
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllVisible() {
    const allVisible = filteredTables.every((t) => selectedIds.has(t.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisible) {
        filteredTables.forEach((t) => next.delete(t.id));
      } else {
        filteredTables.forEach((t) => next.add(t.id));
      }
      return next;
    });
  }

  function handleConfirm() {
    const src = sources.find((s) => s.id === sourceId);
    if (!src || selectedTables.length === 0) return;
    const now = formatDateTime(Date.now());
    const payload: IntegratedTable[] = selectedTables.map((t) => ({
      id: `${src.name}:${t.name}`,
      name: t.name,
      typeKey: t.typeKey,
      sourceName: src.name,
      databaseName: src.name,
      integratedAt: now,
      lastSyncedAt: now,
    }));
    onConfirm(payload);
  }

  const sourceSelected = Boolean(sourceId);
  const allVisibleChecked =
    filteredTables.length > 0 && filteredTables.every((t) => selectedIds.has(t.id));

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex gap-4 flex-1 min-h-0">
      {/* ===== 左侧：级联选择 + 表列表 ===== */}
      <div className="w-1/2 flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 space-y-3 border-b border-gray-50 flex-shrink-0">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500">请选择数据源类型</label>
            <select value={typeKey} onChange={(e) => handleTypeChange(e.target.value)} className={selectCls}>
              <option value="">请选择数据源类型</option>
              {spartaTypes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500">请选择数据源</label>
            <select
              value={sourceId}
              onChange={(e) => handleSourceChange(e.target.value)}
              disabled={!typeKey}
              className={`${selectCls} disabled:bg-gray-50 disabled:cursor-not-allowed`}
            >
              <option value="">请选择数据源</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={!sourceSelected}
            placeholder="输入关键字搜索"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* 表列表 */}
        <div className="flex-1 overflow-auto min-h-0">
          {!sourceSelected ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400 py-16">
              选择数据源后自动拉取数据表
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">暂无数据</div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-2 sticky top-0 bg-white border-b border-gray-50">
                <input
                  type="checkbox"
                  checked={allVisibleChecked}
                  onChange={toggleAllVisible}
                  className="accent-primary-600"
                />
                <span className="text-xs text-gray-500">
                  全选当前结果（{filteredTables.length} 张）
                </span>
              </div>
              <ul className="divide-y divide-gray-50">
                {filteredTables.map((t) => (
                  <li key={t.id}>
                    <label className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggle(t.id)}
                        className="accent-primary-600"
                      />
                      <span className="text-sm text-gray-700 font-mono">{t.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* ===== 右侧：已勾选表列表 ===== */}
      <div className="w-1/2 flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 flex-shrink-0">
          <span className="text-sm font-medium text-gray-700">已选数据表</span>
          <span className="text-xs text-gray-400">
            共 <span className="text-primary-600 font-medium">{selectedTables.length}</span> 张
          </span>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {selectedTables.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400 py-16">
              暂未选择任何数据表
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">数据表名称</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">数据源类型</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {selectedTables.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm text-gray-700 font-mono">{t.name}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{getTypeLabel(t.typeKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </div>

      {/* ===== 底部：取消 / 确定 ===== */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 flex-shrink-0">
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleConfirm} disabled={selectedTables.length === 0}>
          确定（{selectedTables.length}）
        </Button>
      </div>
    </div>
  );
}
