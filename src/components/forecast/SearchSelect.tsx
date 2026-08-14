"use client";

import { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string; // 副文本（如单位）
}

interface SearchSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyText?: string;
}

/**
 * 可搜索下拉（单选）：输入关键字过滤候选，点选后收起并回显选中项。
 * 骨架来自 SearchMultiSelect（外点关闭 / includes 过滤 / 浮层样式）。
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "请输入并选择",
  emptyText = "无匹配项",
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selected = options.find((o) => o.value === value);
  const k = kw.trim().toLowerCase();
  const filtered = options.filter(
    (o) => !k || o.label.toLowerCase().includes(k) || o.hint?.toLowerCase().includes(k)
  );

  return (
    <div className="relative" ref={ref}>
      <input
        value={open ? kw : selected?.label ?? ""}
        onChange={(e) => {
          setKw(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setKw("");
          setOpen(true);
        }}
        placeholder={selected ? selected.label : placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">{emptyText}</div>
          ) : (
            filtered.map((o) => {
              const sel = o.value === value;
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                    sel ? "text-primary-700" : "text-gray-700"
                  }`}
                >
                  <span>
                    {o.label}
                    {o.hint && <span className="text-gray-400 ml-1.5 text-xs">{o.hint}</span>}
                  </span>
                  {sel && <span className="text-primary-600">✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
