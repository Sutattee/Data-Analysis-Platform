"use client";

import { useState, useRef, useEffect } from "react";

export interface MultiOption {
  value: string;
  label: string;
  hint?: string; // 副文本，如用户名
}

interface SearchMultiSelectProps {
  options: MultiOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  error?: string;
}

/**
 * 可搜索多选下拉：已选项以 tag 展示（可删除），输入框过滤候选，点击勾选。
 * 用于「接收人」「指定对象」等多选场景。
 */
export function SearchMultiSelect({
  options,
  value,
  onChange,
  placeholder = "请输入并选择",
  emptyText = "无匹配项",
  error,
}: SearchMultiSelectProps) {
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

  const k = kw.trim().toLowerCase();
  const filtered = options.filter(
    (o) => !k || o.label.toLowerCase().includes(k) || o.hint?.toLowerCase().includes(k)
  );

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(true)}
        className={`min-h-[42px] w-full px-2 py-1.5 border rounded-lg text-sm bg-white flex flex-wrap items-center gap-1 cursor-text transition-all duration-200 ${
          error ? "border-red-400" : "border-gray-300"
        } focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent`}
      >
        {value.map((v) => {
          const opt = options.find((o) => o.value === v);
          return (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs"
            >
              {opt?.label ?? v}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((x) => x !== v));
                }}
                className="text-primary-400 hover:text-primary-700"
                aria-label="移除"
              >
                ✕
              </button>
            </span>
          );
        })}
        <input
          value={kw}
          onChange={(e) => {
            setKw(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={value.length ? "" : placeholder}
          className="flex-1 min-w-[80px] outline-none bg-transparent text-sm py-1"
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">{emptyText}</div>
          ) : (
            filtered.map((o) => {
              const sel = value.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => toggle(o.value)}
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
