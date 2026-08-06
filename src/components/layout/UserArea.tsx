"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import { Settings, User } from "lucide-react";

export function UserArea() {
  const { state } = useApp();
  const router = useRouter();

  return (
    <div className="border-t border-gray-100 p-3">
      <div className="flex items-center gap-3">
        {/* 头像 — 点击进入个人中心 */}
        <button
          onClick={() => router.push("/profile")}
          className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-medium text-sm flex-shrink-0 hover:bg-primary-200 transition-colors"
          title="个人中心"
        >
          {state.user?.avatar ? (
            <img src={state.user.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            (state.user?.nickname || state.user?.username)?.charAt(0)?.toUpperCase() || "U"
          )}
        </button>

        <div className="flex-1 min-w-0">
          <button
            onClick={() => router.push("/profile")}
            className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors truncate block w-full text-left"
          >
            {state.user?.nickname || state.user?.username || "用户"}
          </button>
        </div>

        {/* 管理后台 */}
        <button
          onClick={() => router.push("/settings")}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="管理后台"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
