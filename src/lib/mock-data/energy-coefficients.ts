import type { CoeffEnergyType, CoefficientVersion } from "@/types";

/**
 * 折标系数管理 —— 模拟数据 + 会话级 store（刷新还原）。
 * 按能源类型维护折标煤系数（每单位能源折合的标准煤量）及其历史版本。
 * 业务规则：
 * 1. 版本号在同能源类型序列下系统自动递增（V1、V2…）；
 * 2. 编辑不修改原记录，而是生成新版本（原版本永久保留）；
 * 3. 新版本到达生效时间后自动切换，旧版本置「已失效」并记录被替代时间；
 * 4. 同一能源类型同一时点仅允许一个有效版本（保存前由 UI 做周期冲突确认）；
 * 5. 停用不产生新版本，记录停用时间/操作人/原因，恢复需新增版本；
 * 6. 历史版本永久保留，无删除功能；
 * 7. 能耗计算按统计日期匹配当时生效的系数版本。
 */

// 演示用"当前时间"锚点（状态推导依据）
export const TODAY = "2026-08-17";

// 能源类型选项（下拉单选）
export const ENERGY_TYPES: CoeffEnergyType[] = ["电（一类碳排放）", "天然气（二类碳排放）", "蒸汽"];

// 能源计量单位（折标煤系数单位 = kgce / 计量单位，随能源类型自动带出）
export const ENERGY_UNITS: Record<CoeffEnergyType, string> = {
  "电（一类碳排放）": "kWh",
  "天然气（二类碳排放）": "m³",
  蒸汽: "t",
};

// 预置系数版本（电 0.1229 / 天然气 1.2143 / 蒸汽 0.0986 tce→98.6 kgce，与 GB/T 2589-2020 参考值一致）
let coefficients: CoefficientVersion[] = [
  // ===== 电 =====
  {
    id: "ec-001",
    version: "V1",
    energyType: "电（一类碳排放）",
    value: 0.1229,
    effectiveStart: "2025-01-01",
    effectiveEnd: "2025-12-31",
    enabled: true,
    status: "已失效",
    basis: "《综合能耗计算通则》GB/T 2589-2020",
    createdAt: "2025-01-06 10:00",
    createdBy: "苏恒",
    replacedAt: "2026-01-01",
  },
  {
    id: "ec-002",
    version: "V2",
    energyType: "电（一类碳排放）",
    value: 0.1229,
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    basis: "《综合能耗计算通则》GB/T 2589-2020（年度复审沿用）",
    createdAt: "2025-12-25 09:30",
    createdBy: "苏恒",
  },
  // ===== 天然气 =====
  {
    id: "ec-003",
    version: "V1",
    energyType: "天然气（二类碳排放）",
    value: 1.2143,
    effectiveStart: "2025-01-01",
    effectiveEnd: "2025-12-31",
    enabled: false,
    status: "已失效",
    basis: "《综合能耗计算通则》GB/T 2589-2020",
    createdAt: "2025-01-06 10:20",
    createdBy: "苏恒",
    disabledAt: "2025-11-30 16:20",
    disabledBy: "苏恒",
    disableReason: "2025 年核算口径调整，天然气折标系数改按低位发热量实测值维护",
  },
  {
    id: "ec-004",
    version: "V2",
    energyType: "天然气（二类碳排放）",
    value: 1.2143,
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    basis: "公司碳排放核算资料",
    remark: "厂级汇总口径：天然气折标后不再重复汇总自产蒸汽折标量（避免重复计算）",
    createdAt: "2026-01-05 10:30",
    createdBy: "苏恒",
  },
  // ===== 蒸汽 =====
  {
    id: "ec-005",
    version: "V1",
    energyType: "蒸汽",
    value: 98.6,
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    basis: "《综合能耗计算通则》GB/T 2589-2020（蒸汽焓值折算）",
    createdAt: "2026-01-05 14:20",
    createdBy: "苏恒",
  },
  {
    id: "ec-006",
    version: "V2",
    energyType: "蒸汽",
    value: 98.6,
    effectiveStart: "2026-09-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "待生效",
    basis: "公司内部文件：自产蒸汽折标测算报告（锅炉热效率折算）",
    remark: "自产蒸汽折标量仅用于车间分摊，厂级汇总不重复计入",
    createdAt: "2026-08-11 15:30",
    createdBy: "苏恒",
  },
];

// 新建版本 id 序列（确定性递增）
let nextSeq = 100;
function nextCoeffId(): string {
  nextSeq += 1;
  return `ec-${String(nextSeq).padStart(3, "0")}`;
}

// 版本号数字大小（V3 → 3）
function versionNum(v: string): number {
  const n = Number(v.replace(/^V/, ""));
  return Number.isFinite(n) ? n : 0;
}

// 系数列表（按创建时间倒序，新增在前）
export function listCoefficients(): CoefficientVersion[] {
  return [...coefficients].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getCoefficient(id: string): CoefficientVersion | undefined {
  return coefficients.find((c) => c.id === id);
}

// 同能源类型下一版本号
export function nextVersionOf(energyType: CoeffEnergyType): string {
  const nums = coefficients.filter((c) => c.energyType === energyType).map((c) => versionNum(c.version));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `V${next}`;
}

// 状态推导：结合生效周期与启用开关判断版本状态
function deriveStatus(
  start: string,
  end: string,
  enabled: boolean,
  today: string
): CoefficientVersion["status"] {
  if (!enabled) return "已失效";
  if (start > today) return "待生效";
  if (end < today) return "已失效";
  return "生效中";
}

// 同能源类型周期重叠检测（保存前提示用户确认替代关系）
export function hasPeriodConflict(
  energyType: CoeffEnergyType,
  start: string,
  end: string,
  excludeId?: string
): CoefficientVersion | undefined {
  return coefficients.find(
    (c) =>
      c.id !== excludeId &&
      c.energyType === energyType &&
      c.enabled &&
      c.status !== "已失效" &&
      c.effectiveStart <= end &&
      c.effectiveEnd >= start
  );
}

// 保存输入（新增 / 编辑生成新版本公用）
export interface CoefficientSaveInput {
  energyType: CoeffEnergyType;
  value: number; // 折标煤系数（>0 支持小数）
  effectiveStart: string;
  effectiveEnd: string;
  enabled: boolean;
  basis: string;
  remark?: string;
  baseVersionId?: string; // 编辑来源版本（生成新版本，不改原记录）
}

// 保存系数：生成新版本并按规则执行旧版本替代；返回新建版本
export function saveCoefficient(
  input: CoefficientSaveInput,
  ctx: { user: string; now: string }
): CoefficientVersion {
  const version = nextVersionOf(input.energyType);
  const status = deriveStatus(input.effectiveStart, input.effectiveEnd, input.enabled, TODAY);

  const created: CoefficientVersion = {
    id: nextCoeffId(),
    version,
    energyType: input.energyType,
    value: input.value,
    effectiveStart: input.effectiveStart,
    effectiveEnd: input.effectiveEnd,
    enabled: input.enabled,
    status,
    basis: input.basis,
    remark: input.remark,
    createdAt: ctx.now,
    createdBy: ctx.user,
  };
  coefficients = [created, ...coefficients];

  // 规则 3/4：新版本已到生效时间 → 立即替代同能源类型重叠的旧有效版本；未来版本不替代
  if (status === "生效中") {
    coefficients = coefficients.map((c) =>
      c.id !== created.id &&
        c.energyType === input.energyType &&
        c.enabled &&
        c.status !== "已失效" &&
        c.effectiveStart <= input.effectiveEnd &&
        c.effectiveEnd >= input.effectiveStart
        ? { ...c, status: "已失效", replacedAt: input.effectiveStart }
        : c
    );
  }
  return created;
}

// 停用：不产生新版本，仅记录停用信息（恢复需新增版本）
export function disableCoefficient(id: string, ctx: { user: string; now: string; reason: string }): void {
  coefficients = coefficients.map((c) =>
    c.id === id
      ? {
          ...c,
          enabled: false,
          status: "已失效",
          disabledAt: ctx.now,
          disabledBy: ctx.user,
          disableReason: ctx.reason,
        }
      : c
  );
}

// 按统计日期匹配当时生效的系数版本（规则 7：历史/当前计算按日期取数）
export function matchCoefficient(energyType: CoeffEnergyType, date: string): CoefficientVersion | undefined {
  return coefficients.find(
    (c) =>
      c.energyType === energyType &&
      c.enabled &&
      c.effectiveStart <= date &&
      c.effectiveEnd >= date
  );
}
