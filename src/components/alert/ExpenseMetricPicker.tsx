"use client";

import { useEffect, useRef, useState } from "react";
import { EXPENSE_ALERT_METRICS } from "@/lib/mock-data/expense-alerts";
import { EXPENSE_NODES } from "@/lib/mock-data/expense-overview";
import { DEPT_STATS, EXPENSE_INDICATORS } from "@/lib/mock-data/expense-indicators";

// 节点 → 子树内全部预算指标名（含自身叶子；路径「\」连接按前缀归属；根「全部费用」= 全部，subjectPath 不含根段）
const SUBTREE_OF = (() => {
  const map = new Map<string, string[]>();
  for (const node of EXPENSE_NODES) {
    map.set(
      node.id,
      node.depth === 0
        ? EXPENSE_ALERT_METRICS.map((m) => m.name)
        : EXPENSE_ALERT_METRICS.filter(
            (m) => m.subjectPath === node.path || m.subjectPath.startsWith(`${node.path}\\`)
          ).map((m) => m.name)
    );
  }
  return map;
})();

// 节点 → 直属（叶子科目）预算指标名（菜单中挂在科目行下的指标行）
const SUBTREE_LEAVES = (() => {
  const map = new Map<string, string[]>();
  for (const node of EXPENSE_NODES) {
    const list: string[] = [];
    for (const m of EXPENSE_ALERT_METRICS) if (m.subjectPath === node.path) list.push(m.name);
    if (list.length) map.set(node.id, list);
  }
  return map;
})();

// 部门 TAB：部门列表（与费用页左侧目录同源同序）→ 该部门关联的预算指标名（勾选部门 = 级联勾选其全部指标）
const DEPTS = DEPT_STATS.map((d) => d.dept);
const DEPT_METRICS = (() => {
  const map = new Map<string, string[]>();
  for (const m of EXPENSE_ALERT_METRICS) {
    for (const dept of m.depts) {
      const list = map.get(dept) ?? [];
      list.push(m.name);
      map.set(dept, list);
    }
  }
  return map;
})();

// 科目/部门行尾计数 = 主数据预算指标行数（同名指标跨部门多行分计，如「全部费用 463」）；勾选仍按去重指标名级联
const SUBTREE_ROW_COUNT = (() => {
  const map = new Map<string, number>();
  for (const node of EXPENSE_NODES) {
    map.set(
      node.id,
      node.depth === 0
        ? EXPENSE_INDICATORS.length
        : EXPENSE_INDICATORS.filter(
            (n) => n.subjectPath === node.path || n.subjectPath.startsWith(`${node.path}\\`)
          ).length
    );
  }
  return map;
})();
const DEPT_ROW_COUNT = new Map(
  DEPTS.map((dept) => [dept, EXPENSE_INDICATORS.filter((n) => n.dept === dept).length])
);

// 三态复选框视觉（全选 ✓ / 半选 – / 未选空）
function CheckMark({ state }: { state: "all" | "part" | "none" }) {
  return (
    <span
      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] leading-none ${
        state === "none"
          ? "border-gray-300 bg-white text-transparent"
          : "border-primary-600 bg-primary-600 text-white"
      }`}
    >
      {state === "part" ? "–" : "✓"}
    </span>
  );
}

interface ExpenseMetricPickerProps {
  value: string[]; // 已选指标名（无后缀）
  onChange: (v: string[]) => void;
  placeholder?: string;
  error?: boolean;
}

/**
 * 费用数据指标多选：下拉顶部「费用科目 / 部门」双 TAB 切换菜单——
 *  · 费用科目：完整多级费用科目菜单，勾选「全部费用」（根节点）即全选，勾选父级科目级联勾选子树全部指标；
 *  · 部门：部门列表（与费用页目录同源），勾选部门 = 级联勾选该部门全部指标；
 *  复选框三态（✓ 全选 / – 半选 / 空），取消级联同理；
 *  支持关键字「搜索费用或指标」（平铺命中行，同样可勾选，搜索态隐藏 TAB）。
 */
export function ExpenseMetricPicker({
  value,
  onChange,
  placeholder = "搜索费用或指标",
  error,
}: ExpenseMetricPickerProps) {
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState("");
  const [tab, setTab] = useState<"subject" | "dept">("subject"); // 下拉菜单 TAB：费用科目 / 部门
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const valueSet = new Set(value);

  // 勾选/取消单个指标
  function toggle(name: string) {
    onChange(valueSet.has(name) ? value.filter((x) => x !== name) : [...value, name]);
  }

  // 科目级联：子树已全选 → 整体取消；否则（含半选）子树全部勾选
  function toggleSubtree(names: string[]) {
    if (names.length === 0) return;
    const allIn = names.every((x) => valueSet.has(x));
    if (allIn) {
      const removing = new Set(names);
      onChange(value.filter((x) => !removing.has(x)));
    } else {
      onChange(Array.from(new Set([...value, ...names])));
    }
  }

  // 搜索：按指标名 / 所属科目路径过滤（平铺展示「指标名 + 科目路径」）
  const k = kw.trim().toLowerCase();
  const searchHits = k
    ? EXPENSE_ALERT_METRICS.filter(
        (m) => m.name.toLowerCase().includes(k) || m.subjectPath.toLowerCase().includes(k)
      )
    : null;

  // tag 区超出部分折叠为计数（全选「全部费用」时避免标签溢出）
  const MAX_TAGS = 10;
  const shownTags = value.slice(0, MAX_TAGS);
  const restCount = value.length - shownTags.length;

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(true)}
        className={`min-h-[42px] w-full px-2 py-1.5 border rounded-lg text-sm bg-white flex flex-wrap items-center gap-1 cursor-text transition-all duration-200 ${
          error ? "border-red-400" : "border-gray-300"
        } focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent`}
      >
        {shownTags.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs"
          >
            {name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x !== name));
              }}
              className="text-primary-400 hover:text-primary-700"
              aria-label="移除"
            >
              ✕
            </button>
          </span>
        ))}
        {restCount > 0 && (
          <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded text-xs">
            +{restCount} 项
          </span>
        )}
        <input
          value={kw}
          onChange={(e) => {
            setKw(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={value.length ? "" : placeholder}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm py-1"
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {searchHits ? (
            searchHits.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">无匹配项</div>
            ) : (
              searchHits.map((m) => {
                const sel = valueSet.has(m.name);
                return (
                  <button
                    type="button"
                    key={m.subjectPath + m.name}
                    onClick={() => toggle(m.name)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                      sel ? "text-primary-700" : "text-gray-700"
                    }`}
                  >
                    <CheckMark state={sel ? "all" : "none"} />
                    <span className="truncate">
                      {m.name}
                      <span className="text-gray-400 ml-1.5 text-xs">{m.subjectPath}</span>
                    </span>
                  </button>
                );
              })
            )
          ) : (
            <>
              {/* 菜单顶部 TAB：费用科目 / 部门 */}
              <div className="sticky top-0 z-10 flex border-b border-gray-100 bg-white">
                {([["subject", "费用科目"], ["dept", "部门"]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                      tab === key
                        ? "border-b-2 border-primary-600 text-primary-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === "subject" ? (
                /* 完整多级费用科目菜单：根节点即「全部费用」（勾选=全选）；科目行复选框支持父子级联 */
                EXPENSE_NODES.map((node) => {
                  const subtree = SUBTREE_OF.get(node.id) ?? [];
                  const picked = subtree.filter((x) => valueSet.has(x)).length;
                  const state = subtree.length === 0
                    ? "none"
                    : picked === 0 ? "none" : picked === subtree.length ? "all" : "part";
                  return (
                    <div key={node.id}>
                      <button
                        type="button"
                        disabled={subtree.length === 0}
                        onClick={() => toggleSubtree(subtree)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left ${
                          subtree.length === 0
                            ? "cursor-default text-gray-400"
                            : "font-medium text-gray-600 hover:bg-gray-50"
                        }`}
                        style={{ paddingLeft: `${12 + node.depth * 16}px` }}
                      >
                        <CheckMark state={state} />
                        {node.name}
                        {(SUBTREE_ROW_COUNT.get(node.id) ?? 0) > 0 && (
                          <span className="text-gray-400 font-normal">{SUBTREE_ROW_COUNT.get(node.id)}</span>
                        )}
                      </button>
                      {(SUBTREE_LEAVES.get(node.id) ?? []).map((name) => {
                        const sel = valueSet.has(name);
                        return (
                          <button
                            type="button"
                            key={name}
                            onClick={() => toggle(name)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                              sel ? "text-primary-700" : "text-gray-700"
                            }`}
                            style={{ paddingLeft: `${24 + node.depth * 16}px` }}
                          >
                            <CheckMark state={sel ? "all" : "none"} />
                            <span>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              ) : (
                /* 部门列表：勾选部门 = 级联勾选该部门全部预算指标（与费用页左侧目录同源同序） */
                DEPTS.map((dept) => {
                  const names = DEPT_METRICS.get(dept) ?? [];
                  const picked = names.filter((x) => valueSet.has(x)).length;
                  const state = picked === 0 ? "none" : picked === names.length ? "all" : "part";
                  return (
                    <button
                      type="button"
                      key={dept}
                      disabled={names.length === 0}
                      onClick={() => toggleSubtree(names)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                        names.length === 0
                          ? "cursor-default text-gray-400"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <CheckMark state={state} />
                      <span className="flex-1">{dept}</span>
                      {(DEPT_ROW_COUNT.get(dept) ?? 0) > 0 && (
                        <span className="text-xs text-gray-400">{DEPT_ROW_COUNT.get(dept)}</span>
                      )}
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
