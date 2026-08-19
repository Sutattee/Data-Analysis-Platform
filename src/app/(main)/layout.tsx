"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import MainLayout from "@/components/layout/MainLayout";

export default function MainGroupLayout({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const router = useRouter();

  useEffect(() => {
    // 等待 localStorage 加载完成后再判断登录状态
    if (!state.loading && !state.isLoggedIn) {
      router.replace("/login");
    }
  }, [state.isLoggedIn, state.loading, router]);

  // 加载中或尚未登录，展示 loading（避免新标签页打开时立即重定向到登录页）
  if (state.loading || !state.isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}
