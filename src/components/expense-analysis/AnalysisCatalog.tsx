"use client";

import { useMemo, useState } from "react";
import {
  EXPENSE_NODES, expenseNodeOf, type ExpenseNode,
} from "@/lib/mock-data/expense-overview";
import { subjectIndicatorCount } from "@/lib/mock-data/expense-indicators";

interface AnalysisCatalogProps {
  subjectId: string;
  onSubjectChange: (id: string) => void;
}

// 指标计数徽标：N·M⚠（有异常时 M 显示红色；无异常时只显示 N，不展示 ·0）
function CountBadge({ nodeId }: { nodeId: string }) {
  const { count, abnormal } = subjectIndicatorCount(nodeId);
  return (
    <span className="ml-auto flex-shrink-0 text-xs text-gray-400">
      {count}
      {abnormal > 0 && (
        <>
          <span className="mx-0.5">·</span>
          <span className="font-medium text-red-600">{abnormal}⚠</span>
        </>
      )}
    </span>
  );
}

// 「费用科目」页左侧目录：费用科目树 + 关键字搜索 + 指标计数徽标
export function AnalysisCatalog({
  subjectId, onSubjectChange,
}: AnalysisCatalogProps) {
  const [keyword, setKeyword] = useState("");
  // 默认全部展开（含全部次级科目），支持逐级折叠
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(EXPENSE_NODES.map((n) => n.id))
  );

  const kw = keyword.trim();

  // 搜索时：名称命中或后代命中的节点可见（保持层级路径）
  const visibleIds = useMemo(() => {
    if (!kw) return null;
    const set = new Set<string>();
    function hit(n: ExpenseNode): boolean {
      const self = n.name.includes(kw);
      const child = n.childIds.some((cid) => hit(expenseNodeOf(cid)));
      if (self || child) set.add(n.id);
      return self || child;
    }
    hit(EXPENSE_NODES[0]);
    return set;
  }, [kw]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function renderNode(node: ExpenseNode, depth: number) {
    if (visibleIds && !visibleIds.has(node.id)) return null;
    const hasChildren = node.childIds.length > 0;
    const isOpen = expanded.has(node.id) || !!visibleIds; // 搜索时强制展开命中路径
    const active = subjectId === node.id;
    return (
      <div key={node.id}>
        <div
          className={`flex cursor-pointer items-center gap-1 rounded-md py-1.5 pr-2 text-sm hover:bg-gray-50 ${
            active ? "bg-primary-50 font-medium text-primary-700" : "text-gray-700"
          }`}
          style={{ paddingLeft: depth * 14 + 4 }}
          onClick={() => onSubjectChange(node.id)}
        >
          {hasChildren ? (
            <button
              type="button"
              className="w-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isOpen ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
          <CountBadge nodeId={node.id} />
        </div>
        {hasChildren && isOpen && node.childIds.map((cid) => renderNode(expenseNodeOf(cid), depth + 1))}
      </div>
    );
  }

  return (
    <aside className="sticky top-0 w-64 flex-shrink-0 self-start rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* 搜索框 */}
      <div className="border-b border-gray-100 p-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索科目或费用"
          className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none"
        />
      </div>
      {/* 目录内容 */}
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
        {renderNode(EXPENSE_NODES[0], 0)}
      </div>
    </aside>
  );
}
