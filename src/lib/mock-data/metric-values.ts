import type { MetricValueRecord } from "@/types";
import { metricList } from "./metric-management";

// 可维护指标值口径：排除「在岗职工平均人数」（该指标无需人工维护指标值）
export const MAINTAINABLE_METRICS = metricList.filter((m) => m.id !== "m19");

/**
 * 指标值维护 —— 模拟数据 + 会话级 store（刷新还原）。
 * 维护无法通过业务系统自动获取、需人工填报的指标数据（如企业工业总产值）。
 * 业务规则：
 * 1. 「当期值」原则上对应单个月份（periodStart = periodEnd）；
 * 2. 「累计值」对应连续月份范围（periodStart ≤ periodEnd）；
 * 3. 相同指标 + 统计对象 + 统计周期 + 数据类型不得重复新增（保存前判重）；
 * 4. 编辑、删除须二次确认，并保留操作人及操作时间；
 * 5. 删除后的记录不再参与指标计算和数据分析。
 */

// 统计对象选项（企业 / 部门级）
export const STAT_OBJECTS = ["什邡卷烟厂", "卷包车间", "制丝车间", "动力车间"];

// 预置指标值记录（演示：不同指标 × 对象 × 类型 × 周期）
let records: MetricValueRecord[] = [
  {
    id: "mv-001",
    metricId: "m18",
    metricName: "工业总产值",
    statObject: "什邡卷烟厂",
    periodStart: "2026-01",
    periodEnd: "2026-08",
    dataType: "累计值",
    value: 12580,
    unit: "万元",
    source: "财务部门手工填报",
    remark: "2026年8月确认数据",
    createdBy: "王五",
    createdAt: "2026-09-01 10:30",
    updatedBy: "苏恒",
    updatedAt: "2026-09-02 14:00",
  },
  {
    id: "mv-002",
    metricId: "m18",
    metricName: "工业总产值",
    statObject: "什邡卷烟厂",
    periodStart: "2026-08",
    periodEnd: "2026-08",
    dataType: "当期值",
    value: 1590,
    unit: "万元",
    source: "财务部门手工填报",
    createdBy: "王五",
    createdAt: "2026-09-01 10:32",
  },
  {
    id: "mv-003",
    metricId: "m18",
    metricName: "工业总产值",
    statObject: "什邡卷烟厂",
    periodStart: "2026-07",
    periodEnd: "2026-07",
    dataType: "当期值",
    value: 1560,
    unit: "万元",
    source: "财务部门手工填报",
    createdBy: "王五",
    createdAt: "2026-08-05 09:20",
  },
  {
    id: "mv-006",
    metricId: "m18",
    metricName: "工业总产值",
    statObject: "卷包车间",
    periodStart: "2026-08",
    periodEnd: "2026-08",
    dataType: "当期值",
    value: 680,
    unit: "万元",
    source: "卷包车间月末快报",
    createdBy: "王五",
    createdAt: "2026-09-03 09:15",
  },
  {
    id: "mv-008",
    metricId: "m18",
    metricName: "工业总产值",
    statObject: "什邡卷烟厂",
    periodStart: "2025-01",
    periodEnd: "2025-12",
    dataType: "累计值",
    value: 18260,
    unit: "万元",
    source: "财务部门手工填报",
    remark: "2025 年度决算口径",
    createdBy: "王五",
    createdAt: "2026-01-20 15:00",
    updatedBy: "王五",
    updatedAt: "2026-02-10 09:30",
  },
];

// 新建记录 id 序列（确定性递增）
let nextSeq = 8;
function nextRecordId(): string {
  nextSeq += 1;
  return `mv-${String(nextSeq).padStart(3, "0")}`;
}

// 月份展示：YYYY-MM → 2026年8月
export function monthLabel(m: string): string {
  const [y, mm] = m.split("-");
  return `${y}年${Number(mm)}月`;
}

// 统计周期展示：2026年1月—2026年8月（单月时仍显示起止两段，与示例一致）
export function periodLabel(r: Pick<MetricValueRecord, "periodStart" | "periodEnd">): string {
  return `${monthLabel(r.periodStart)}—${monthLabel(r.periodEnd)}`;
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

// 判重：相同指标 + 统计对象 + 统计周期 + 数据类型（excludeId 用于编辑时排除自身）
export function isMetricValueDuplicated(
  payload: Pick<MetricValueRecord, "metricId" | "statObject" | "periodStart" | "periodEnd" | "dataType">,
  excludeId?: string
): boolean {
  return records.some(
    (r) =>
      r.id !== excludeId &&
      r.metricId === payload.metricId &&
      r.statObject === payload.statObject &&
      r.periodStart === payload.periodStart &&
      r.periodEnd === payload.periodEnd &&
      r.dataType === payload.dataType
  );
}

// 保存输入（新增 / 编辑公用）
export interface MetricValueSaveInput {
  id?: string; // 编辑时携带原记录 id
  metricId: string;
  metricName: string;
  statObject: string;
  periodStart: string;
  periodEnd: string;
  dataType: MetricValueRecord["dataType"];
  value: number;
  unit: string;
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
            metricId: input.metricId,
            metricName: input.metricName,
            statObject: input.statObject,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            dataType: input.dataType,
            value: input.value,
            unit: input.unit,
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
    metricId: input.metricId,
    metricName: input.metricName,
    statObject: input.statObject,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    dataType: input.dataType,
    value: input.value,
    unit: input.unit,
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
