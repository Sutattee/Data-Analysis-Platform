import { Suspense } from "react";
import { QualityAlertRecordsList } from "@/components/alert/QualityAlertRecordsList";

// 工艺质量 · 告警记录：仅展示质量指标告警（ZL 前缀；实测异常 + 预测风险，质量口径列结构与筛选）
export default function QualityAlertRecordsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">告警记录</h1>
      </div>
      <Suspense>
        <QualityAlertRecordsList basePath="/quality/alert/records" />
      </Suspense>
    </div>
  );
}
