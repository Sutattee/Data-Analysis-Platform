"use client";

import Link from "next/link";
import { ExpenseAlertStrategyForm } from "@/components/alert/ExpenseAlertStrategyForm";

// 新建数据告警（费用预算执行板块，按需求文档精简字段）
export default function ExpenseNewStrategyPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-96px)] gap-4">
      <div className="flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
          <Link href="/expense/alert/management" className="hover:text-primary-600">告警中心</Link>
          <span>/</span>
          <span className="text-gray-600">数据告警详情</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">新建数据告警</h1>
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <ExpenseAlertStrategyForm mode="new" listPath="/expense/alert/management" />
      </div>
    </div>
  );
}
