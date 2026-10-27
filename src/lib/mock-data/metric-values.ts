import type { MetricValueRecord } from "@/types";
import { metricList } from "./metric-management";

/**
 * 指标值管理 —— 模拟数据 + 会话级 store（刷新还原）。
 * 固定维护「工业总产值」的月度值（无法通过业务系统自动获取、需人工填报）。
 * 业务规则：
 * 1. 每条记录对应一个自然月，系统按月保存工业总产值；
 * 2. 相同数据月份只能存在一条有效记录，不得重复新增；
 * 3. 编辑、删除须二次确认，并保留操作人及操作时间；
 * 4. 删除后的记录不再参与指标计算和数据分析。
 */

// 固定维护指标：工业总产值（m18）；表单与列表共用其名称/单位/小数位
export const FIXED_METRIC = (() => {
  const m = metricList.find((x) => x.id === "m18")!;
  return { id: m.id, nameCn: m.nameCn, unit: m.unit, decimals: m.decimals };
})();

// 预置指标值记录（工业总产值 × 单月，演示月度维护口径）
let records: MetricValueRecord[] = [
  {
    id: "mv-001",
    metricId: FIXED_METRIC.id,
    metricName: FIXED_METRIC.nameCn,
    month: "2026-08",
    value: 1580,
    unit: FIXED_METRIC.unit,
    source: "财务部门手工填报",
    remark: "2026年8月确认数据",
    createdBy: "王五",
    createdAt: "2026-09-01 10:30",
    updatedBy: "苏恒",
    updatedAt: "2026-09-02 14:00",
  },
  {
    id: "mv-002",
    metricId: FIXED_METRIC.id,
    metricName: FIXED_METRIC.nameCn,
    month: "2026-07",
    value: 1560,
    unit: FIXED_METRIC.unit,
    source: "财务部门手工填报",
    createdBy: "王五",
    createdAt: "2026-08-05 09:20",
  },
  {
    id: "mv-003",
    metricId: FIXED_METRIC.id,
    metricName: FIXED_METRIC.nameCn,
    month: "2026-06",
    value: 1520,
    unit: FIXED_METRIC.unit,
    source: "财务部门手工填报",
    createdBy: "王五",
    createdAt: "2026-07-03 11:00",
  },
  {
    id: "mv-004",
    metricId: FIXED_METRIC.id,
    metricName: FIXED_METRIC.nameCn,
    month: "2025-12",
    value: 1521,
    unit: FIXED_METRIC.unit,
    source: "财务部门手工填报",
    remark: "2025 年度决算口径",
    createdBy: "王五",
    createdAt: "2026-01-20 15:00",
    updatedBy: "王五",
    updatedAt: "2026-02-10 09:30",
  },
  {
    id: "mv-005",
    metricId: FIXED_METRIC.id,
    metricName: FIXED_METRIC.nameCn,
    month: "2025-11",
    value: 1498,
    unit: FIXED_METRIC.unit,
    source: "财务部门手工填报",
    createdBy: "王五",
    createdAt: "2025-12-04 10:10",
  },
];

// 新建记录 id 序列（确定性递增）
let nextSeq = 5;
function nextRecordId(): string {
  nextSeq += 1;
  return `mv-${String(nextSeq).padStart(3, "0")}`;
}

// 月份展示：YYYY-MM → 2026年8月
export function monthLabel(m: string): string {
  const [y, mm] = m.split("-");
  return `${y}年${Number(mm)}月`;
}

// 记录列表（按更新时间倒序，未更新过按创建时间）
export function listMetricValues(): MetricValueRecord[] {
  return [...records].sort((a, b) =>
    (b.updatedAt ?? b.createdAt) < (a.updatedAt ?? a.createdAt) ? -1 : 1
  );
}

export function getMetricValue(id: string): MetricValueRecord | undefined {
  return records.find((r) => r.id === id);
}

// 判重：相同数据月份只能存在一条有效记录（指标固定；excludeId 用于编辑时排除自身）
export function isMetricValueDuplicated(
  payload: { month: string },
  excludeId?: string
): boolean {
  return records.some((r) => r.id !== excludeId && r.month === payload.month);
}

// 保存输入（新增 / 编辑公用；指标名称与单位由固定指标带出）
export interface MetricValueSaveInput {
  id?: string; // 编辑时携带原记录 id
  month: string;
  value: number;
  source?: string;
  remark?: string;
}

// 保存：新增插入；编辑原地更新并记录更新人 / 时间
export function saveMetricValue(
  input: MetricValueSaveInput,
  ctx: { user: string; now: string }
): MetricValueRecord {
  if (input.id) {
    const updated = records.map((r) =>
      r.id === input.id
        ? {
            ...r,
            month: input.month,
            value: input.value,
            source: input.source,
            remark: input.remark,
            updatedBy: ctx.user,
            updatedAt: ctx.now,
          }
        : r
    );
    records = updated;
    return records.find((r) => r.id === input.id)!;
  }
  const created: MetricValueRecord = {
    id: nextRecordId(),
    metricId: FIXED_METRIC.id,
    metricName: FIXED_METRIC.nameCn,
    month: input.month,
    value: input.value,
    unit: FIXED_METRIC.unit,
    source: input.source,
    remark: input.remark,
    createdBy: ctx.user,
    createdAt: ctx.now,
  };
  records = [created, ...records];
  return created;
}

// 删除：记录移除，不再参与指标计算和数据分析
export function removeMetricValue(id: string): void {
  records = records.filter((r) => r.id !== id);
}
