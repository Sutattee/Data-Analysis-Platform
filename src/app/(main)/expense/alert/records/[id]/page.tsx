"use client";

import { AlertRecordDetail } from "@/components/alert/AlertRecordDetail";

// 告警记录详情（费用预算执行板块，费用口径字段布局，面包屑返回费用告警中心）
export default function ExpenseAlertDetailPage() {
  return <AlertRecordDetail basePath="/expense/alert/records" layout="expense" />;
}
