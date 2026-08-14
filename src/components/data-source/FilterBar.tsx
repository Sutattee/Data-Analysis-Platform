"use client";

import { ReactNode } from "react";
import { selectableDataSourceTypes } from "@/lib/mock-data/data-source";
import { Button } from "@/components/ui/Button";

interface FilterBarProps {
  type: string;
  status: string;
  keyword: string;
  onTypeChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onKeywordChange: (v: string) => void;
  onSearch?: () => void;
  actions?: ReactNode; // 搜索行右侧的功能按钮
}

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white min-w-[140px]";

/**
 * 顶部筛选区：数据源类型 + 可用状态 + 关键字搜索。
 * 任一条件变更即触发回调，由父组件刷新列表。
 */
export function FilterBar({
  type,
  status,
  keyword,
  onTypeChange,
  onStatusChange,
  onKeywordChange,
  onSearch,
  actions,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500 whitespace-nowrap">数据源类型</label>
        <select value={type} onChange={(e) => onTypeChange(e.target.value)} className={selectCls}>
          <option value="all">全部</option>
          {selectableDataSourceTypes.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500 whitespace-nowrap">可用状态</label>
        <select value={status} onChange={(e) => onStatusChange(e.target.value)} className={selectCls}>
          <option value="all">全部</option>
          <option value="available">可用</option>
          <option value="unavailable">不可用</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch?.();
          }}
          placeholder="搜索数据源名称/负责人"
          className="w-[280px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Button onClick={() => onSearch?.()}>查询</Button>
      </div>

      {actions && <div className="ml-auto flex gap-2">{actions}</div>}
    </div>
  );
}
