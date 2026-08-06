"use client";

import { useEffect, useMemo, useState } from "react";
import { MetadataTable } from "@/types";

interface Props {
  tables: MetadataTable[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface Group {
  dbId: string;
  dbName: string;
  tables: MetadataTable[];
}

/**
 * 左侧表列表：按数据源（数据库）两级折叠展示。
 * 顶部标题为"数据源"；每个数据源名后显示其表数量 (x)；默认展开第一个数据源。
 */
export function MetadataTableList({ tables, selectedId, onSelect }: Props) {
  // 按数据源分组，保留出现顺序
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const t of tables) {
      if (!map.has(t.databaseId)) {
        map.set(t.databaseId, { dbId: t.databaseId, dbName: t.databaseName, tables: [] });
      }
      map.get(t.databaseId)!.tables.push(t);
    }
    return Array.from(map.values());
  }, [tables]);

  const firstDbId = groups[0]?.dbId;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(firstDbId ? [firstDbId] : []));

  // 选中表所在的数据源组若被折叠，自动展开（覆盖初始/搜索后重选场景）
  useEffect(() => {
    if (!selectedId) return;
    const grp = groups.find((g) => g.tables.some((t) => t.id === selectedId));
    if (grp && !expanded.has(grp.dbId)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(grp.dbId);
        return next;
      });
    }
  }, [selectedId, groups, expanded]);

  function toggle(dbId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dbId)) next.delete(dbId);
      else next.add(dbId);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1 flex-shrink-0">
          数据源
        </h4>
        <div className="py-16 text-center text-sm text-gray-400">暂无数据表</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1 flex-shrink-0">
        数据源
      </h4>
      <div className="flex-1 min-h-0 overflow-auto pr-1 -mr-1">
        {groups.map((g) => {
          const isOpen = expanded.has(g.dbId);
          return (
            <div key={g.dbId} className="mb-1">
              {/* 数据源组标题 */}
              <button
                onClick={() => toggle(g.dbId)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[10px] text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}>
                    ▶
                  </span>
                  <span className="text-xs font-medium text-gray-700 truncate">{g.dbName}</span>
                </span>
                <span className="text-[11px] text-gray-400 ml-1 flex-shrink-0">({g.tables.length})</span>
              </button>
              {/* 数据表列表 */}
              {isOpen && (
                <ul className="space-y-0.5 mt-0.5 ml-3 border-l border-gray-100 pl-2">
                  {g.tables.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => onSelect(t.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                          selectedId === t.id
                            ? "bg-primary-50 text-primary-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <div className="font-mono text-xs truncate">{t.name}</div>
                        {t.chineseName && (
                          <div
                            className={`text-[11px] truncate ${
                              selectedId === t.id ? "text-primary-500" : "text-gray-400"
                            }`}
                          >
                            {t.chineseName}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
