import type { MetricTargetVersion, TargetPeriod } from "@/types";

/**
 * 目标值管理 —— 模拟数据 + 会话级 store（刷新还原）。
 * 业务规则：
 * 1. 版本号在「同指标 + 同考核周期」序列下系统自动递增（V1、V2…）；
 * 2. 编辑不修改原记录，而是生成新版本（变更说明必填）；
 * 3. 新版本到达生效时间后，旧生效版本自动置「已失效」并记录被替代时间；
 * 4. 未来版本（生效开始晚于当前）不立即替代旧版本；
 * 5. 同一时点同一序列仅允许一个有效版本（保存前由 UI 做周期冲突确认）；
 * 6. 停用不产生新版本，记录停用时间/操作人/原因，恢复需编辑生成新版本；
 * 7. 历史版本永久保留，不提供删除；
 * 8. 历史达标计算按统计日期匹配当时生效的版本；
 * 9. 预测结果保存目标快照（含目标值与版本号，见预测模块）。
 */

// 演示用"当前时间"锚点（状态推导依据）
export const TODAY = "2026-08-17";

// 开放目标值配置的指标（其余指标不支持配置）
export const SUPPORTED_TARGET_METRICS = ["m1", "m7"];

// 支持的考核周期（当前两个指标均支持全部周期）
export const SUPPORTED_TARGET_PERIODS: TargetPeriod[] = ["月度", "季度", "年度"];

// 预置版本：每指标年度序列 3 版（V1 已失效 → V2 生效中 → V3 待生效 9/1 起）
let targets: MetricTargetVersion[] = [
  // ===== m7 单箱综合能耗（公斤标煤/箱，1 位小数） =====
  {
    id: "tv-m7-1",
    version: "V1",
    metricId: "m7",
    metricName: "单箱综合能耗",
    period: "年度",
    direction: "≤",
    value: 32.0,
    unit: "公斤标煤/箱",
    effectiveStart: "2025-01-01",
    effectiveEnd: "2025-12-31",
    enabled: true,
    status: "已失效",
    effectiveTime: "2025-01-01",
    createdAt: "2025-01-06 09:30",
    createdBy: "王五",
    basis: "2025年度公司能耗考核目标（年度工作会议纪要）",
    remark: "首次立项的基准年度目标",
    replacedAt: "2026-01-01",
  },
  {
    id: "tv-m7-2",
    version: "V2",
    metricId: "m7",
    metricName: "单箱综合能耗",
    period: "年度",
    direction: "≤",
    value: 31.0,
    unit: "公斤标煤/箱",
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    effectiveTime: "2026-01-01",
    createdAt: "2025-12-20 10:00",
    createdBy: "王五",
    basis: "2026年度公司能耗考核目标（节能降耗三年行动方案）",
    remark: "",
  },
  {
    id: "tv-m7-3",
    version: "V3",
    metricId: "m7",
    metricName: "单箱综合能耗",
    period: "年度",
    direction: "≤",
    value: 30.5,
    unit: "公斤标煤/箱",
    effectiveStart: "2026-09-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "待生效",
    effectiveTime: "2026-09-01",
    createdAt: "2026-08-10 14:20",
    createdBy: "王五",
    basis: "行业对标（2026年烟草行业能效对标通报）",
    remark: "对标行业先进值，四季度起收紧目标",
    changeNote: "对标行业先进水平，自9月起将年度目标由31.0收紧至30.5",
  },
  // ===== m1 单位产值碳排放量（吨/万元，4 位小数） =====
  {
    id: "tv-m1-1",
    version: "V1",
    metricId: "m1",
    metricName: "单位产值碳排放量",
    period: "年度",
    direction: "≤",
    value: 0.04,
    unit: "吨/万元",
    effectiveStart: "2025-01-01",
    effectiveEnd: "2025-12-31",
    enabled: true,
    status: "已失效",
    effectiveTime: "2025-01-01",
    createdAt: "2025-01-06 09:40",
    createdBy: "王五",
    basis: "2025年度碳排放强度控制目标",
    replacedAt: "2026-01-01",
  },
  {
    id: "tv-m1-2",
    version: "V2",
    metricId: "m1",
    metricName: "单位产值碳排放量",
    period: "年度",
    direction: "≤",
    value: 0.035,
    unit: "吨/万元",
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    effectiveTime: "2026-01-01",
    createdAt: "2025-12-20 10:10",
    createdBy: "王五",
    basis: "2026年度碳排放强度考核目标（碳达峰行动方案）",
    remark: "",
  },
  {
    id: "tv-m1-3",
    version: "V3",
    metricId: "m1",
    metricName: "单位产值碳排放量",
    period: "年度",
    direction: "处于目标区间",
    lower: 0.03,
    upper: 0.035,
    unit: "吨/万元",
    effectiveStart: "2026-09-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "待生效",
    effectiveTime: "2026-09-01",
    createdAt: "2026-08-12 16:05",
    createdBy: "王五",
    basis: "绿色工厂评价要求（区间式管控试点）",
    remark: "改为区间管控：低于下限时允许核实数据真实性",
    changeNote: "由单值上限改为区间式管控，适配绿色工厂评价要求",
  },
];

// 版本号数字大小（V3 → 3），用于排序与递增
function versionNum(v: string): number {
  const n = Number(v.replace(/^V/, ""));
  return Number.isFinite(n) ? n : 0;
}

// 判断指标是否开放目标值配置
export function isTargetSupported(metricId: string): boolean {
  return SUPPORTED_TARGET_METRICS.includes(metricId);
}

// 某指标的目标值版本列表（最新版本在前）
export function listTargets(metricId: string): MetricTargetVersion[] {
  return targets
    .filter((t) => t.metricId === metricId)
    .sort((a, b) => versionNum(b.version) - versionNum(a.version));
}

export function getTarget(id: string): MetricTargetVersion | undefined {
  return targets.find((t) => t.id === id);
}

// 当前生效目标（同一时点同一序列仅一个有效版本）
export function activeTargetOf(metricId: string): MetricTargetVersion | undefined {
  return targets.find((t) => t.metricId === metricId && t.status === "生效中");
}

// 同序列下一版本号（V1、V2…）
export function nextVersionOf(metricId: string, period: TargetPeriod): string {
  const nums = targets
    .filter((t) => t.metricId === metricId && t.period === period)
    .map((t) => versionNum(t.version));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `V${next}`;
}

// 按状态推导：结合生效周期与启用开关判断版本状态
function deriveStatus(
  start: string,
  end: string,
  enabled: boolean,
  today: string
): MetricTargetVersion["status"] {
  if (!enabled) return "已失效";
  if (start > today) return "待生效";
  if (end < today) return "已失效";
  return "生效中";
}

// 周期冲突检测：同序列下存在启用中且生效区间与 [start, end] 重叠的其他版本
export function hasPeriodConflict(
  metricId: string,
  period: TargetPeriod,
  start: string,
  end: string,
  excludeId?: string
): MetricTargetVersion | undefined {
  return targets.find(
    (t) =>
      t.id !== excludeId &&
      t.metricId === metricId &&
      t.period === period &&
      t.enabled &&
      t.status !== "已失效" &&
      t.effectiveStart <= end &&
      t.effectiveEnd >= start
  );
}

// 保存输入（新增 / 编辑生成新版本公用；编辑时带 baseVersionId 与 changeNote）
export interface TargetSaveInput {
  metricId: string;
  metricName: string;
  unit: string;
  decimals: number;
  period: TargetPeriod;
  direction: MetricTargetVersion["direction"];
  value?: number;
  lower?: number;
  upper?: number;
  effectiveStart: string;
  effectiveEnd: string;
  enabled: boolean;
  basis?: string;
  remark?: string;
  changeNote?: string;
  baseVersionId?: string; // 编辑来源版本（生成新版本，不改原记录）
}

// 新建版本 id 序列（确定性递增）
let nextSeq = 100;
function nextTargetId(metricId: string): string {
  nextSeq += 1;
  return `tv-${metricId}-${nextSeq}`;
}

// 保存目标值：生成新版本并按规则执行旧版本替代；返回新建版本
export function saveTarget(
  input: TargetSaveInput,
  ctx: { user: string; now: string }
): MetricTargetVersion {
  const version = nextVersionOf(input.metricId, input.period);
  const status = deriveStatus(input.effectiveStart, input.effectiveEnd, input.enabled, TODAY);

  const created: MetricTargetVersion = {
    id: nextTargetId(input.metricId),
    version,
    metricId: input.metricId,
    metricName: input.metricName,
    period: input.period,
    direction: input.direction,
    value: input.direction === "处于目标区间" ? undefined : input.value,
    lower: input.direction === "处于目标区间" ? input.lower : undefined,
    upper: input.direction === "处于目标区间" ? input.upper : undefined,
    unit: input.unit,
    effectiveStart: input.effectiveStart,
    effectiveEnd: input.effectiveEnd,
    enabled: input.enabled,
    status,
    effectiveTime: input.effectiveStart,
    createdAt: ctx.now,
    createdBy: ctx.user,
    basis: input.basis,
    remark: input.remark,
    changeNote: input.changeNote,
  };
  targets = [created, ...targets];

  // 规则 3/4：新版本已到生效时间 → 立即替代同序列重叠的旧有效版本；未来版本不替代
  if (status === "生效中") {
    targets = targets.map((t) =>
      t.id !== created.id &&
      t.metricId === input.metricId &&
      t.period === input.period &&
      t.enabled &&
      t.status !== "已失效" &&
      t.effectiveStart <= input.effectiveEnd &&
      t.effectiveEnd >= input.effectiveStart
        ? { ...t, status: "已失效", replacedAt: input.effectiveStart }
        : t
    );
  }
  return created;
}

// 停用：不产生新版本，仅记录停用信息（恢复需编辑生成新版本）
export function disableTarget(
  id: string,
  ctx: { user: string; now: string; reason: string }
): void {
  targets = targets.map((t) =>
    t.id === id
      ? {
          ...t,
          enabled: false,
          status: "已失效",
          disabledAt: ctx.now,
          disabledBy: ctx.user,
          disableReason: ctx.reason,
        }
      : t
  );
}

// 目标标准合并展示：单值「≤31.0 公斤标煤/箱」/ 区间「0.03～0.035 吨/万元」
export function formatTargetStandard(t: MetricTargetVersion, decimals = 2): string {
  if (t.direction === "处于目标区间") {
    const lower = (t.lower ?? 0).toFixed(decimals);
    const upper = (t.upper ?? 0).toFixed(decimals);
    return `${lower}～${upper} ${t.unit}`;
  }
  const value = (t.value ?? 0).toFixed(decimals);
  return `${t.direction}${value} ${t.unit}`;
}
