"use client";

import { AlertRecordDetail } from "@/components/alert/AlertRecordDetail";

// 告警记录详情（生产管理板块，面包屑返回生产告警记录）
export default function ProductionAlertDetailPage() {
  return <AlertRecordDetail basePath="/production/alert/records" />;
}
