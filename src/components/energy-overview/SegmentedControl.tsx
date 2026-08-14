"use client";

// 图表头部的小型分段切换器（周期切换 / 指标页签）
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-2.5 py-1 text-xs whitespace-nowrap transition-colors ${
              active ? "bg-primary-600 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
