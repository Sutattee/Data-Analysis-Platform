"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertStrategyForm } from "@/components/alert/AlertStrategyForm";
import { getAlertStrategy } from "@/lib/mock-data/alert-strategies";

export default function EditStrategyPage() {
  const params = useParams<{ id: string }>();
  const initial = getAlertStrategy(params.id);

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] gap-4">
      <div className="flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
          <Link href="/alert/management" className="hover:text-primary-600">预警中心</Link>
          <span>/</span>
          <span className="text-gray-600">数据预警详情</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">编辑数据预警</h1>
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        {initial ? (
          <AlertStrategyForm mode="edit" initial={initial} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm text-gray-500">策略不存在或已被删除</p>
            <Link href="/alert/management" className="mt-3 text-sm text-primary-600 hover:text-primary-700">
              返回预警管理
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
