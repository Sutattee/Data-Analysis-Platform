"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  headerRight?: ReactNode;
  padding?: boolean;
  fill?: boolean; // 内容区撑满剩余高度并纵向 flex（用于图表随卡片高度自适应）
  divider?: boolean; // 标题行与内容之间的分割线（默认展示）
}

export function Card({ children, className = "", title, headerRight, padding = true, fill = false, divider = true }: CardProps) {
  // fill：内容层 flex-1 + min-h-0，把卡片高度传递给子元素（配合 ResponsiveContainer height=100%）
  const contentCls = [padding ? "p-5" : "", fill ? "flex min-h-0 flex-1 flex-col" : ""].filter(Boolean).join(" ");
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-200 ${className}`}>
      {(title || headerRight) && (
        <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-4 ${divider ? "border-b border-gray-50" : ""}`}>
          {title && <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>}
          {headerRight}
        </div>
      )}
      <div className={contentCls}>{children}</div>
    </div>
  );
}
