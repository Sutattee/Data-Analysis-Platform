"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/lib/store/AppContext";
import { PRIMARY_NAV } from "@/lib/constants";
import { MENU_ICON_MAP } from "@/components/layout/NavIcon";
import type { NavItem } from "@/types";

// 判断一级导航项是否激活：优先用 matchPrefixes（用于二级路由分散的组），否则用 href 前缀
function isPrimaryActive(pathname: string, item: NavItem): boolean {
  if (item.matchPrefixes?.length) {
    return item.matchPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { state, logout } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  // 当前激活的一级组：用于决定是否展示左侧二级导航
  const activeGroup = PRIMARY_NAV.find((item) => isPrimaryActive(pathname, item));
  const subNavItems = activeGroup?.children;
  const showSubNav = !!subNavItems && subNavItems.length > 0;

  // 头像下拉菜单 & 退出登录二次确认
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 左侧二级导航折叠态（折叠后仅展示图标）
  const [navCollapsed, setNavCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击菜单外部时关闭下拉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function go(path: string) {
    setMenuOpen(false);
    router.push(path);
  }

  function confirmLogout() {
    logout();
    setConfirmOpen(false);
    router.push("/login");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* 顶部一级横向导航栏 */}
      <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-4">
        {/* Logo + 平台名 */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            D
          </div>
          <span className="hidden whitespace-nowrap text-sm font-semibold text-gray-800 md:inline">
            什邡卷烟厂产质耗KPI分析平台
          </span>
        </div>

        {/* 一级导航 tabs（窄屏横向滚动） */}
        <nav className="flex h-full flex-1 items-center gap-1 overflow-x-auto">
          {PRIMARY_NAV.map((item) => {
            const isActive = isPrimaryActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-full flex-shrink-0 items-center whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors
                  ${
                    isActive
                      ? "border-primary-600 text-primary-700"
                      : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 右侧：头像 + 下拉菜单 */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-200"
            title="账号菜单"
          >
            {state.user?.avatar ? (
              <img src={state.user.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              (state.user?.nickname || state.user?.username)?.charAt(0)?.toUpperCase() || "U"
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
              <button
                onClick={() => go("/settings")}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                {MENU_ICON_MAP.settings}
                <span>管理后台</span>
              </button>
              <button
                onClick={() => go("/profile")}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                {MENU_ICON_MAP.profile}
                <span>个人信息</span>
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                {MENU_ICON_MAP.logout}
                <span>退出登录</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 主体：可选左侧二级导航 + 右侧内容 */}
      <div className="flex flex-1 overflow-hidden">
        {showSubNav && (
          <aside
            className={`hidden flex-shrink-0 flex-col border-r border-slate-200 bg-slate-100 transition-all duration-200 lg:flex ${
              navCollapsed ? "w-14" : "w-[204px]"
            }`}
          >
            <Sidebar items={subNavItems!} collapsed={navCollapsed} onExpand={() => setNavCollapsed(false)} />
            {/* 折叠 / 展开开关（底部左下角） */}
            <div className={`flex shrink-0 px-1.5 py-2 ${navCollapsed ? "justify-center" : "justify-start"}`}>
              <button
                onClick={() => setNavCollapsed((v) => !v)}
                title={navCollapsed ? "展开导航" : "折叠导航"}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-gray-400 transition-colors hover:bg-slate-200 hover:text-gray-600"
              >
                {navCollapsed ? "»" : "«"}
              </button>
            </div>
          </aside>
        )}
        <main className="flex-1 overflow-auto">
          {/* 页面内容 */}
          <div className="min-h-full py-4 pl-4 pr-0 md:py-6 md:pl-6 md:pr-0">{children}</div>
        </main>
      </div>

      {/* 退出登录二次确认 */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="退出登录" size="sm">
        <p className="text-sm text-gray-600">确定要退出当前账号吗？</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setConfirmOpen(false)}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={confirmLogout}
            className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
          >
            确认退出
          </button>
        </div>
      </Modal>
    </div>
  );
}
