"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/types";
import { NavIcon } from "./NavIcon";

interface SidebarProps {
  items: NavItem[];
}

// 判断某路由是否处于激活态（当前页或其子路径）
function isItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

// 通用纵向二级导航：由父级传入 items（如能源消耗组的二级菜单）
export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  // 折叠组状态：默认全部折叠
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  // 进入含激活子项的分组时自动展开，确保当前页在侧边栏可见
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      items.forEach((item) => {
        const childHit = item.children?.some((c) => isItemActive(pathname, c.href));
        if (childHit && !next.has(item.label)) {
          next.add(item.label);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [pathname, items]);

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2">
      {items.map((item) => {
        const hasChildren = item.children && item.children.length > 0;

        // 无子菜单：平铺链接
        if (!hasChildren) {
          const isActive = isItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg text-sm transition-all duration-200 active:scale-[0.97]
                ${
                  isActive
                    ? "bg-primary-50 text-primary-700 font-medium shadow-sm"
                    : "text-gray-600 hover:bg-slate-200 hover:text-gray-800"
                }`}
            >
              <span className="flex-shrink-0"><NavIcon icon={item.icon} /></span>
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        }

        // 有子菜单：可折叠分组
        const isOpen = expanded.has(item.label);
        const childActive = item.children!.some((c) => isItemActive(pathname, c.href));
        const isActive = isItemActive(pathname, item.href) || childActive;

        return (
          <div key={item.label} className="mb-1">
            <button
              onClick={() => toggle(item.label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 active:scale-[0.97]
                ${
                  isActive
                    ? "bg-primary-50 text-primary-700 font-medium shadow-sm"
                    : "text-gray-600 hover:bg-slate-200 hover:text-gray-800"
                }`}
            >
              <span className="flex-shrink-0"><NavIcon icon={item.icon} /></span>
              <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
              <span
                className={`text-[10px] text-gray-400 inline-block transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
              >
                ▶
              </span>
            </button>

            {/* 二级菜单 */}
            {isOpen && (
              <div className="mt-0.5 ml-4 border-l border-gray-100 pl-2 space-y-0.5">
                {item.children!.map((child) => {
                  const active = isItemActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-primary-50 text-primary-700 font-medium"
                          : "text-gray-500 hover:bg-slate-200 hover:text-gray-700"
                      }`}
                    >
                      {child.label}
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
