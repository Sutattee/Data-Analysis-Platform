"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import MainLayout from "@/components/layout/MainLayout";

export default function MainGroupLayout({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!state.isLoggedIn) {
      router.replace("/login");
    }
  }, [state.isLoggedIn, router]);

  if (!state.isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}
