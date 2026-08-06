"use client";

import Link from "next/link";
import { SettingsSidebar } from "@/components/layout/SettingsSidebar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 左侧设置导航 */}
      <aside className="w-48 flex-shrink-0 bg-slate-100 border-r border-slate-200 flex flex-col">
        {/* 返回首页 */}
        <div className="px-3 py-4 border-b border-gray-100">
          <Link
            href="/home"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <span>←</span>
            <span>返回首页</span>
          </Link>
        </div>

        {/* 二级导航 */}
        <div className="flex-1 overflow-auto px-2">
          <SettingsSidebar />
        </div>
      </aside>

      {/* 右侧内容 — 铺满整个屏幕 */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
