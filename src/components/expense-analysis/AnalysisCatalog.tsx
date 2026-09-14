"use client";

import { useMemo, useState } from "react";
import {
  EXPENSE_NODES, expenseNodeOf, type ExpenseNode,
} from "@/lib/mock-data/expense-overview";
import { DEPT_STATS, subjectIndicatorCount } from "@/lib/mock-data/expense-indicators";

export type CatalogTab = "subject" | "dept";

interface AnalysisCatalogProps {
  tab: CatalogTab;
  onTabChange: (t: CatalogTab) => void;
  subjectId: string;
  onSubjectChange: (id: string) => void;
  dept: string | null;
  onDeptChange: (d: string) => void;
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

// 部门计数徽标（同格式）
function DeptCountBadge({ count, abnormal }: { count: number; abnormal: number }) {
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

// 「全部费用」页左侧目录：费用科目（树）/ 部门（平铺）双 TAB + 关键字搜索 + 指标计数徽标
export function AnalysisCatalog({
  tab, onTabChange, subjectId, onSubjectChange, dept, onDeptChange,
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
    const active = tab === "subject" && subjectId === node.id;
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

  const depts = kw ? DEPT_STATS.filter((d) => d.dept.includes(kw)) : DEPT_STATS;

  return (
    <aside className="sticky top-0 w-64 flex-shrink-0 self-start rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* TAB 切换 */}
      <div className="grid grid-cols-2 gap-1 border-b border-gray-100 p-2">
        {([["subject", "费用科目"], ["dept", "部门"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key ? "bg-primary-600 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
            onClick={() => onTabChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
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
        {tab === "subject" ? (
          renderNode(EXPENSE_NODES[0], 0)
        ) : depts.length > 0 ? (
          depts.map((d) => (
            <div
              key={d.dept}
              className={`flex cursor-pointer items-center rounded-md py-1.5 pl-2 pr-2 text-sm hover:bg-gray-50 ${
                tab === "dept" && dept === d.dept ? "bg-primary-50 font-medium text-primary-700" : "text-gray-700"
              }`}
              onClick={() => onDeptChange(d.dept)}
            >
              <span className="truncate">{d.dept}</span>
              <DeptCountBadge count={d.count} abnormal={d.abnormal} />
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-xs text-gray-400">无匹配结果</p>
        )}
      </div>
    </aside>
  );
}
