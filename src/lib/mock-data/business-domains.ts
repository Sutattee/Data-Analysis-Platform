// 业务域管理 mock 数据层：全局业务域字典 + 各业务模块引用统计（删除保护）。
// 删除保护口径：指标管理（指标归属域）、报告模板（模板 domain）、标准问答（问答所属域），
// 任一模块仍在引用即禁止删除，提示解除关联后再删除。
import { metricList } from "./metric-management";
import { REPORT_TEMPLATES_ALL } from "./report-gen";
import { standardQaList } from "./standard-qa";

export interface BusinessDomain {
  id: string;   // 系统自动生成的唯一 ID
  name: string; // 业务域名称
}

// 初始业务域：平台各模块在用口径 + 「综合管理」未被引用（演示可删除）
export const BUSINESS_DOMAINS_SEED: BusinessDomain[] = [
  { id: "bd-001", name: "生产管理" },
  { id: "bd-002", name: "工艺质量" },
  { id: "bd-003", name: "能源消耗" },
  { id: "bd-004", name: "能源管理" },
  { id: "bd-005", name: "设备管理" },
  { id: "bd-006", name: "物耗管理" },
  { id: "bd-007", name: "质量管理" },
  { id: "bd-008", name: "安全生产" },
  { id: "bd-009", name: "综合管理" },
];

// 引用检测：返回仍在引用该业务域的业务模块及数量（结果为空 = 无引用，可删除）
export function getDomainReferences(name: string): { module: string; count: number }[] {
  return [
    { module: "指标管理", count: metricList.filter((m) => m.domain === name).length },
    { module: "报告模板", count: REPORT_TEMPLATES_ALL.filter((t) => t.domain === name).length },
    { module: "标准问答", count: standardQaList.filter((q) => q.domain === name).length },
  ].filter((r) => r.count > 0);
}

// 生成唯一 ID：bd- 前缀 + 时间戳 36 进制 + 随机段（新增业务域时系统自动生成）
export function generateDomainId(): string {
  return `bd-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
