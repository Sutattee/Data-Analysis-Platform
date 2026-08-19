import type { CoeffEnergyType, CoefficientVersion, CoeffType } from "@/types";

/**
 * 折标系数管理 —— 模拟数据 + 会话级 store（刷新还原）。
 * 统一维护能源折标准煤系数与能源碳排放因子及其历史版本。
 * 业务规则：
 * 1. 版本号在「同能源类型 + 系数类型 + 能源来源」序列下系统自动递增（V1、V2…）；
 * 2. 编辑不修改原记录，而是生成新版本（变更说明必填）；
 * 3. 新版本到达生效时间后自动切换，旧版本置「已失效」并记录被替代时间；
 * 4. 同一时点同一序列仅允许一个有效版本（保存前由 UI 做周期冲突确认）；
 * 5. 停用不产生新版本，记录停用时间/操作人/原因，恢复需新增版本；
 * 6. 历史版本永久保留，无删除功能；
 * 7. 能耗/碳排放计算按统计日期匹配当时生效的系数版本；
 * 8. 计算结果留痕（记录所用系数版本号）；
 * 9. 单位自动换算：综合能耗换算为 tce、碳排放换算为 tCO₂e；
 * 10. 避免重复计算：厂级汇总天然气后不再重复汇总自产蒸汽折标量/碳排放（自产蒸汽仅用于车间分摊）；
 * 11. 电力碳排放因子按年度新增版本维护。
 */

// 演示用"当前时间"锚点（状态推导依据）
export const TODAY = "2026-08-17";

// 原始单位选项（按能源类型约束）
export const BASE_UNITS: Record<CoeffEnergyType, string[]> = {
  "电": ["kWh"],
  "蒸汽": ["t", "GJ"],
  "天然气": ["m³"],
};

// 结果单位选项（按系数类型约束）
export const RESULT_UNITS: Record<CoeffType, string[]> = {
  "折标准煤系数": ["kgce", "tce"],
  "能源碳排放因子": ["kgCO₂e", "tCO₂e"],
};

export const ENERGY_TYPES: CoeffEnergyType[] = ["电", "蒸汽", "天然气"];
export const COEFF_TYPES: CoeffType[] = ["折标准煤系数", "能源碳排放因子"];

// 预置系数版本（值与网格监测/预测模块 ENERGY_COEFFICIENT 保持一致）
let coefficients: CoefficientVersion[] = [
  // ===== 电 · 折标准煤系数 =====
  {
    id: "ec-001",
    version: "V1",
    energyType: "电",
    coeffType: "折标准煤系数",
    energySource: "外购",
    baseAmount: 1,
    baseUnit: "kWh",
    value: 0.1229,
    resultUnit: "kgce",
    effectiveStart: "2025-01-01",
    effectiveEnd: "2025-12-31",
    enabled: true,
    status: "已失效",
    basis: "《综合能耗计算通则》GB/T 2589-2020",
    createdAt: "2025-01-06 10:00",
    createdBy: "王五",
    replacedAt: "2026-01-01",
  },
  {
    id: "ec-002",
    version: "V2",
    energyType: "电",
    coeffType: "折标准煤系数",
    energySource: "外购",
    baseAmount: 1,
    baseUnit: "kWh",
    value: 0.1229,
    resultUnit: "kgce",
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    basis: "《综合能耗计算通则》GB/T 2589-2020（年度复审沿用）",
    createdAt: "2025-12-25 09:30",
    createdBy: "王五",
  },
  // ===== 电 · 能源碳排放因子（电力因子按年度新增版本，规则 11） =====
  {
    id: "ec-003",
    version: "V1",
    energyType: "电",
    coeffType: "能源碳排放因子",
    energySource: "外购",
    baseAmount: 10000,
    baseUnit: "kWh",
    value: 5.703,
    resultUnit: "tCO₂e",
    effectiveStart: "2025-01-01",
    effectiveEnd: "2025-12-31",
    enabled: true,
    status: "已失效",
    basis: "生态环境部 2023 年度全国电网平均排放因子公告（0.5703 tCO₂e/MWh）",
    createdAt: "2025-01-06 10:10",
    createdBy: "王五",
    replacedAt: "2026-01-01",
  },
  {
    id: "ec-004",
    version: "V2",
    energyType: "电",
    coeffType: "能源碳排放因子",
    energySource: "外购",
    baseAmount: 10000,
    baseUnit: "kWh",
    value: 5.368,
    resultUnit: "tCO₂e",
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    basis: "生态环境部 2024 年度全国电网平均排放因子公告（0.5368 tCO₂e/MWh）",
    createdAt: "2026-01-05 14:00",
    createdBy: "王五",
    changeNote: "按最新年度公告更新电力碳排放因子",
  },
  // ===== 天然气 · 折标准煤系数 =====
  {
    id: "ec-005",
    version: "V1",
    energyType: "天然气",
    coeffType: "折标准煤系数",
    energySource: "外购",
    baseAmount: 1,
    baseUnit: "m³",
    value: 1.2143,
    resultUnit: "kgce",
    effectiveStart: "2025-01-01",
    effectiveEnd: "2025-12-31",
    enabled: true,
    status: "已失效",
    basis: "《综合能耗计算通则》GB/T 2589-2020",
    createdAt: "2025-01-06 10:20",
    createdBy: "王五",
    replacedAt: "2026-01-01",
  },
  {
    id: "ec-006",
    version: "V2",
    energyType: "天然气",
    coeffType: "折标准煤系数",
    energySource: "外购",
    baseAmount: 1,
    baseUnit: "m³",
    value: 1.2143,
    resultUnit: "kgce",
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    basis: "《综合能耗计算通则》GB/T 2589-2020（年度复审沿用）",
    createdAt: "2025-12-25 09:40",
    createdBy: "王五",
  },
  // ===== 天然气 · 能源碳排放因子（大基准量示例） =====
  {
    id: "ec-007",
    version: "V1",
    energyType: "天然气",
    coeffType: "能源碳排放因子",
    energySource: "外购",
    baseAmount: 10000,
    baseUnit: "m³",
    value: 18,
    resultUnit: "tCO₂e",
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    basis: "公司碳排放核算资料（燃料低位发热量 × 碳氧化率核算）",
    createdAt: "2026-01-05 14:10",
    createdBy: "王五",
    remark: "厂级汇总口径：天然气碳排放后，自产蒸汽不再重复核算碳排放",
  },
  // ===== 蒸汽 · 折标准煤系数（外购 / 自制来源区分） =====
  {
    id: "ec-008",
    version: "V1",
    energyType: "蒸汽",
    coeffType: "折标准煤系数",
    energySource: "外购",
    baseAmount: 1,
    baseUnit: "t",
    value: 98.6,
    resultUnit: "kgce",
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    basis: "《综合能耗计算通则》GB/T 2589-2020（蒸汽焓值折算）",
    createdAt: "2026-01-05 14:20",
    createdBy: "王五",
  },
  {
    id: "ec-009",
    version: "V1",
    energyType: "蒸汽",
    coeffType: "折标准煤系数",
    energySource: "自制",
    baseAmount: 1,
    baseUnit: "t",
    value: 98.6,
    resultUnit: "kgce",
    effectiveStart: "2026-09-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "待生效",
    basis: "公司内部文件：自产蒸汽折标测算报告（锅炉热效率折算）",
    createdAt: "2026-08-11 15:30",
    createdBy: "王五",
    remark: "自产蒸汽折标量仅用于车间分摊，厂级汇总不重复计入（避免重复计算）",
  },
  // ===== 蒸汽 · 能源碳排放因子（含手动停用示例，规则 5） =====
  {
    id: "ec-011",
    version: "V1",
    energyType: "蒸汽",
    coeffType: "能源碳排放因子",
    energySource: "外购",
    baseAmount: 1,
    baseUnit: "GJ",
    value: 0.0951,
    resultUnit: "tCO₂e",
    effectiveStart: "2025-01-01",
    effectiveEnd: "2025-12-31",
    enabled: false,
    status: "已失效",
    basis: "省级温室气体清单编制指南（外购热力排放因子）",
    createdAt: "2025-01-06 10:30",
    createdBy: "王五",
    disabledAt: "2025-06-30 11:00",
    disabledBy: "王五",
    disableReason: "2025 年核算口径调整：蒸汽碳排放改由天然气端核算，避免重复计算",
  },
  {
    id: "ec-012",
    version: "V2",
    energyType: "蒸汽",
    coeffType: "能源碳排放因子",
    energySource: "外购",
    baseAmount: 1,
    baseUnit: "GJ",
    value: 0.0951,
    resultUnit: "tCO₂e",
    effectiveStart: "2026-01-01",
    effectiveEnd: "2026-12-31",
    enabled: true,
    status: "生效中",
    basis: "省级温室气体清单编制指南（外购热力排放因子，年度复审沿用）",
    createdAt: "2025-12-25 09:50",
    createdBy: "王五",
    changeNote: "基于停用的 V1 恢复维护：仅核算外购蒸汽碳排放",
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

// 数字千分位（避免 locale 差异）
function thousands(n: number): string {
  const s = String(n);
  const dot = s.indexOf(".");
  const int = dot === -1 ? s : s.slice(0, dot);
  const dec = dot === -1 ? "" : s.slice(dot);
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + dec;
}

// 完整换算关系表达式：如「每 10,000 m³ 天然气折合 18 tCO₂e」
export function previewExpression(
  energyType: CoeffEnergyType,
  baseAmount: number,
  baseUnit: string,
  value: number,
  resultUnit: string
): string {
  return `每 ${thousands(baseAmount)} ${baseUnit}${energyType}折合 ${thousands(value)} ${resultUnit}`;
}

export function formatExpression(c: CoefficientVersion): string {
  return previewExpression(c.energyType, c.baseAmount, c.baseUnit, c.value, c.resultUnit);
}

// 系数列表（按创建时间倒序，新增在前）
export function listCoefficients(): CoefficientVersion[] {
  return [...coefficients].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getCoefficient(id: string): CoefficientVersion | undefined {
  return coefficients.find((c) => c.id === id);
}

// 同序列（能源类型 + 系数类型 + 能源来源）下一版本号
export function nextVersionOf(
  energyType: CoeffEnergyType,
  coeffType: CoeffType,
  energySource: "外购" | "自制"
): string {
  const nums = coefficients
    .filter(
      (c) =>
        c.energyType === energyType && c.coeffType === coeffType && c.energySource === energySource
    )
    .map((c) => versionNum(c.version));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `V${next}`;
}

// 按状态推导：结合生效周期与启用开关判断版本状态
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

// 同序列周期重叠检测（保存前提示用户确认替代关系）
export function hasPeriodConflict(
  energyType: CoeffEnergyType,
  coeffType: CoeffType,
  energySource: "外购" | "自制",
  start: string,
  end: string,
  excludeId?: string
): CoefficientVersion | undefined {
  return coefficients.find(
    (c) =>
      c.id !== excludeId &&
      c.energyType === energyType &&
      c.coeffType === coeffType &&
      c.energySource === energySource &&
      c.enabled &&
      c.status !== "已失效" &&
      c.effectiveStart <= end &&
      c.effectiveEnd >= start
  );
}

// 保存输入（新增 / 编辑生成新版本公用；编辑时带 baseVersionId 与 changeNote）
export interface CoefficientSaveInput {
  energyType: CoeffEnergyType;
  coeffType: CoeffType;
  energySource: "外购" | "自制";
  baseAmount: number;
  baseUnit: string;
  value: number;
  resultUnit: string;
  effectiveStart: string;
  effectiveEnd: string;
  enabled: boolean;
  basis: string;
  changeNote?: string;
  baseVersionId?: string; // 编辑来源版本（生成新版本，不改原记录）
}

// 保存系数：生成新版本并按规则执行旧版本替代；返回新建版本
export function saveCoefficient(
  input: CoefficientSaveInput,
  ctx: { user: string; now: string }
): CoefficientVersion {
  const version = nextVersionOf(input.energyType, input.coeffType, input.energySource);
  const status = deriveStatus(input.effectiveStart, input.effectiveEnd, input.enabled, TODAY);

  const created: CoefficientVersion = {
    id: nextCoeffId(),
    version,
    energyType: input.energyType,
    coeffType: input.coeffType,
    energySource: input.energySource,
    baseAmount: input.baseAmount,
    baseUnit: input.baseUnit,
    value: input.value,
    resultUnit: input.resultUnit,
    effectiveStart: input.effectiveStart,
    effectiveEnd: input.effectiveEnd,
    enabled: input.enabled,
    status,
    basis: input.basis,
    createdAt: ctx.now,
    createdBy: ctx.user,
    changeNote: input.changeNote,
  };
  coefficients = [created, ...coefficients];

  // 规则 3/4：新版本已到生效时间 → 立即替代同序列重叠的旧有效版本；未来版本不替代
  if (status === "生效中") {
    coefficients = coefficients.map((c) =>
      c.id !== created.id &&
        c.energyType === input.energyType &&
        c.coeffType === input.coeffType &&
        c.energySource === input.energySource &&
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
export function disableCoefficient(
  id: string,
  ctx: { user: string; now: string; reason: string }
): void {
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
export function matchCoefficient(
  energyType: CoeffEnergyType,
  coeffType: CoeffType,
  energySource: "外购" | "自制",
  date: string
): CoefficientVersion | undefined {
  return coefficients.find(
    (c) =>
      c.energyType === energyType &&
      c.coeffType === coeffType &&
      c.energySource === energySource &&
      c.enabled &&
      c.effectiveStart <= date &&
      c.effectiveEnd >= date
  );
}
