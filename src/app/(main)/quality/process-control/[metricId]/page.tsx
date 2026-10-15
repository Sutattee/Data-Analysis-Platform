"use client";

// 过程管控详情页：/quality/process-control/[metricId]（metricId = SF01~SF09 / QC-10 / QC-11）
// 从工艺质量总览「过程管控」列表的指标名称或「详情」进入；指标编码解析与兜底见主视图
import { ProcessControlDetailView } from "@/components/process-control/ProcessControlDetailView";

export default function ProcessControlDetailPage() {
  return <ProcessControlDetailView />;
}
