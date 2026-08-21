"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  headerRight?: ReactNode;
  padding?: boolean;
}

export function Card({ children, className = "", title, headerRight, padding = true }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-200 ${className}`}>
      {(title || headerRight) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-gray-50">
          {title && <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>}
          {headerRight}
        </div>
      )}
      <div className={padding ? "p-5" : ""}>{children}</div>
    </div>
  );
}
