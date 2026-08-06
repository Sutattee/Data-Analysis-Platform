"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_NAV } from "@/lib/constants";

export function SettingsSidebar() {
  const pathname = usePathname();
  // 默认展开第一个组（系统配置）
  const [expanded, setExpanded] = useState<Set<string>>(new Set([SETTINGS_NAV[0].group]));

  function toggle(group: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(group)) n.delete(group);
      else n.add(group);
      return n;
    });
  }

  return (
    <nav className="flex-1 overflow-auto py-3">
      {SETTINGS_NAV.map((group) => {
        const isOpen = expanded.has(group.group);
        return (
          <div key={group.group} className="mb-2">
            {/* 一级菜单（可折叠） */}
            <button
              onClick={() => toggle(group.group)}
              className="w-full flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-slate-200/60 rounded transition-colors"
            >
              <span className={`text-[10px] text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
              <span>{group.group}</span>
            </button>
            {/* 二级菜单 */}
            {isOpen && (
              <div className="space-y-0.5 px-2 mt-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary-50 text-primary-700 font-medium"
                          : "text-gray-600 hover:bg-slate-200 hover:text-gray-800"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
