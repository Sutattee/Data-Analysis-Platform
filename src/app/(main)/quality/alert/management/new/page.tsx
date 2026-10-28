"use client";

import Link from "next/link";
import { QualityAlertStrategyForm } from "@/components/alert/QualityAlertStrategyForm";

// 新建数据告警（工艺质量板块；含企业微信通知配置：通知方式/接收人/重复提醒/提醒间隔）
export default function QualityNewStrategyPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-96px)] gap-4">
      <div className="flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
          <Link href="/quality/alert/management" className="hover:text-primary-600">告警中心</Link>
          <span>/</span>
          <span className="text-gray-600">数据告警详情</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">新建数据告警</h1>
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <QualityAlertStrategyForm mode="new" listPath="/quality/alert/management" />
      </div>
    </div>
  );
}
