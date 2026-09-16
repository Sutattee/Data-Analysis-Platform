"use client";

import { useState } from "react";
import { DEPT_STATS } from "@/lib/mock-data/expense-indicators";

interface DeptCatalogProps {
  dept: string;
  onDeptChange: (d: string) => void;
}

// 部门计数徽标：N·M⚠（有异常时 M 显示红色；无异常时只显示 N，不展示 ·0）
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

// 「部门费用」页左侧目录：部门平铺列表 + 关键字搜索 + 指标计数徽标
export function DeptCatalog({ dept, onDeptChange }: DeptCatalogProps) {
  const [keyword, setKeyword] = useState("");
  const kw = keyword.trim();
  const depts = kw ? DEPT_STATS.filter((d) => d.dept.includes(kw)) : DEPT_STATS;

  return (
    <aside className="sticky top-0 w-64 flex-shrink-0 self-start rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* 搜索框 */}
      <div className="border-b border-gray-100 p-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索部门"
          className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none"
        />
      </div>
      {/* 目录内容 */}
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
        {depts.length > 0 ? (
          depts.map((d) => (
            <div
              key={d.dept}
              className={`flex cursor-pointer items-center rounded-md py-1.5 pl-2 pr-2 text-sm hover:bg-gray-50 ${
                dept === d.dept ? "bg-primary-50 font-medium text-primary-700" : "text-gray-700"
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
