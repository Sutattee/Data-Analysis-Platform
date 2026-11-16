"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Logo } from "@/components/layout/Logo";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/lib/store/AppContext";
import { PRIMARY_NAV } from "@/lib/constants";
import { MENU_ICON_MAP } from "@/components/layout/NavIcon";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { state, logout } = useApp();
  const router = useRouter();

  // 头像下拉菜单 & 退出登录二次确认
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 左侧导航折叠态（折叠后仅展示图标）
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
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 左侧一级导航 */}
      <aside
        className={`flex flex-shrink-0 flex-col border-r border-slate-200 bg-slate-100 transition-all duration-200 ${
          navCollapsed ? "w-14" : "w-[204px]"
        }`}
      >
        {/* Logo + 平台名 */}
        <div
          className={`flex flex-shrink-0 items-center border-b border-slate-200 py-3 ${
            navCollapsed ? "justify-center px-0" : "gap-2 px-4"
          }`}
        >
          <Logo size={32} />
          {!navCollapsed && (
            <span className="whitespace-nowrap text-sm font-semibold text-gray-800">智能分析平台</span>
          )}
        </div>

        {/* 菜单 */}
        <Sidebar items={PRIMARY_NAV} collapsed={navCollapsed} onExpand={() => setNavCollapsed(false)} />

        {/* 折叠 / 展开开关（底部左下角） */}
        <div className={`mt-auto flex shrink-0 px-1.5 py-2 ${navCollapsed ? "justify-center" : "justify-start"}`}>
          <button
            onClick={() => setNavCollapsed((v) => !v)}
            title={navCollapsed ? "展开导航" : "折叠导航"}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-gray-400 transition-colors hover:bg-slate-200 hover:text-gray-600"
          >
            {navCollapsed ? "»" : "«"}
          </button>
        </div>
      </aside>

      {/* 右侧：顶部工具条 + 内容 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部工具条：右上角头像 + 下拉菜单（管理后台 / 个人信息 / 退出登录） */}
        <header className="flex h-14 flex-shrink-0 items-center justify-end border-b border-gray-100 bg-white px-4">
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

        {/* 内容 */}
        <main className="flex-1 overflow-auto">
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
