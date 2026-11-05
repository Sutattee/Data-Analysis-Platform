"use client";

// 业务域筛选（选择模板弹窗 / 管理后台报告模板页共用）：
// 下拉按钮「业务域：{value} ▾」+ 选项菜单；点击菜单外区域关闭。
import { useEffect, useRef, useState } from "react";

export function DomainFilter({
  value,
  options,
  onChange,
}: {
  value: string; // 当前选中域（「全部」表示不过滤）
  options: string[]; // 候选业务域（不含「全部」，组件自动前置）
  onChange: (domain: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 点击组件以外区域时收起菜单
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const allOptions = ["全部", ...options];

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="业务域筛选"
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
          value !== "全部"
            ? "bg-primary-50 text-primary-600 border-primary-200"
            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
        }`}
      >
        业务域：{value} ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-36 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl" role="listbox" aria-label="业务域选项">
          {allOptions.map((d) => (
            <button
              key={d}
              role="option"
              aria-selected={d === value}
              onClick={() => {
                onChange(d);
                setOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                d === value ? "bg-primary-50 text-primary-600 font-medium" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
