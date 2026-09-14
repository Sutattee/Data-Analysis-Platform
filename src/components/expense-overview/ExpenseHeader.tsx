"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import { EXPENSE_NODES, EXPENSE_PERIOD } from "@/lib/mock-data/expense-overview";

// 科目下拉选项：全角空格缩进表层级（全部费用 → 顶层科目 → 子科目）
const SUBJECT_OPTIONS = EXPENSE_NODES.map((n) => ({
  value: n.id,
  label: `${"　".repeat(n.depth)}${n.name}`,
}));

interface ExpenseHeaderProps {
  subjectId: string;
  onSubjectChange: (id: string) => void;
}

// 费用总览标题区：统计周期文案 + 科目搜索框（浮层匹配）+ 费用科目单选下拉
export function ExpenseHeader({ subjectId, onSubjectChange }: ExpenseHeaderProps) {
  const [kw, setKw] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭搜索浮层
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // 关键字匹配科目（按全路径），最多展示 8 条
  const matches = useMemo(() => {
    const k = kw.trim();
    if (!k) return [];
    return EXPENSE_NODES.filter((n) => n.path.includes(k)).slice(0, 8);
  }, [kw]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">费用总览</h1>
        <p className="mt-1 text-sm text-gray-500">
          {EXPENSE_PERIOD.period}｜数据截至{EXPENSE_PERIOD.dataEnd}｜{EXPENSE_PERIOD.frequency}
        </p>
      </div>

      <div className="flex w-full max-w-xl items-center gap-2 lg:w-auto">
        {/* 科目搜索：输入后浮层展示匹配科目全路径，点选即筛选 */}
        <div className="relative flex-1" ref={ref}>
          <input
            value={kw}
            onChange={(e) => {
              setKw(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="搜索科目或费用"
            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>

          {open && kw.trim() && (
            <div className="absolute z-30 mt-1 w-full max-h-56 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
              {matches.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">无匹配科目</div>
              ) : (
                matches.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => {
                      onSubjectChange(n.id);
                      setKw("");
                      setOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                  >
                    {n.path}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 费用科目单选下拉（层级缩进树） */}
        <div className="w-52 flex-shrink-0">
          <SearchSelect options={SUBJECT_OPTIONS} value={subjectId} onChange={onSubjectChange} placeholder="全部费用" />
        </div>
      </div>
    </div>
  );
}
