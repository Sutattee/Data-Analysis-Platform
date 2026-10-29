"use client";

// 牌号筛选（预测趋势图右上角，稳定性预测 / 缺陷预测共用）：下拉按钮 + 浮层选项；
// 不同牌号预测趋势不同，切换即整轮切换预测数据
import { useState } from "react";

export function BrandFilter({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (options.length === 0) return null;
  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-primary-400 hover:text-primary-600"
      >
        牌号：<span className="font-medium text-gray-800">{value}</span>
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-28 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {options.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => {
                onChange(b);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-primary-50 ${
                b === value ? "bg-primary-50 font-medium text-primary-700" : "text-gray-600"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
