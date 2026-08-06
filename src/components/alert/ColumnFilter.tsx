"use client";

import { useState, useRef, useEffect } from "react";

interface ColumnFilterProps {
  options: string[];      // 可选项（不含"全部"，组件自动加）
  value: string;          // 当前值，"" 表示全部
  onChange: (v: string) => void;
}

/**
 * 表头筛选：字段名旁的漏斗按钮，点击弹出下拉，即时筛选。
 * 下拉用 fixed 定位（按按钮坐标计算），避免被表格 overflow-x-auto 容器裁剪。
 */
export function ColumnFilter({ options, value, onChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = value !== "";

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    // 页面或表格内滚动时关闭，避免菜单错位
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const allOptions: [string, string][] = [["全部", ""], ...options.map((o) => [o, o] as [string, string])];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className={`inline-flex items-center justify-center w-4 h-4 -my-0.5 rounded hover:bg-gray-200 ${active ? "text-primary-600" : "text-gray-400"}`}
        title="筛选"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 3h13a.5.5 0 0 1 .4.8L10 9.2V13a.5.5 0 0 1-.7.45L6.9 12.1A.5.5 0 0 1 6.6 11.7V9.2L1.1 3.8A.5.5 0 0 1 1.5 3z" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-[100] min-w-[120px] bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-auto"
        >
          {allOptions.map(([label, val]) => (
            <button
              key={val || "all"}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(val);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${value === val ? "text-primary-600 font-medium" : "text-gray-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
