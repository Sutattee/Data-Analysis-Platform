"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";

/**
 * /admin 原为「管理后台」占位页，现统一收敛至 /settings（管理后台真实页面）。
 * 此路由仅做重定向，保留登录守卫。
 */
export default function AdminPage() {
  const { state } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!state.isLoggedIn) {
      router.replace("/login");
    } else {
      router.replace("/settings");
    }
  }, [state.isLoggedIn, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
    </div>
  );
}
