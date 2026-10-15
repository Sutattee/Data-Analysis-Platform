"use client";

import { AlertRecordDetail } from "@/components/alert/AlertRecordDetail";

// 告警记录详情（工艺质量板块，质量口径字段布局，面包屑返回质量告警中心）
export default function QualityAlertDetailPage() {
  return <AlertRecordDetail basePath="/quality/alert/records" layout="quality" />;
}
