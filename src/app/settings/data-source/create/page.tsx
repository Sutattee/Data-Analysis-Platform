"use client";

import Link from "next/link";
import { CreateDataSourceForm } from "@/components/data-source/CreateDataSourceForm";

export default function CreateDataSourcePage() {
  return (
    <div className="flex flex-col h-[calc(100vh-48px)] gap-4">
      <div className="flex-shrink-0">
        <Link
          href="/settings/data-source"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-1"
        >
          <span>←</span>
          <span>返回数据源管理</span>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">新增数据源</h1>
      </div>

      {/* 白色卡片铺满剩余页面区域 */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <CreateDataSourceForm />
      </div>
    </div>
  );
}
