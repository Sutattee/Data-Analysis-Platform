// 工艺参数推荐 —— 模拟数据层（加香出口水分达标场景）
// 以「加香出口水分达标」为目标，按 牌号 × 加香机台 × 历史参考期 输出一套工艺参数建议（联合方案）；
// 建议值由确定性规则产生：建议 = 计算基准 + 量化到步长的（来料水分 − 名义水分）× 参数敏感度，
// 名义水分 / 敏感度 / 最低样本要求（30 条）均为明确配置，可整体替换为真实算法；
// 候选参数 4 项按机台控制方式启用：排潮风门开度与排潮负压设定值二选一（1#/2# 风门、3# 负压）。
import { addDaysISO } from "@/lib/mock-data/quality-defect";

// ============ 候选参数 ============

export type ParamKey = "drumSpeed" | "atomizePress" | "exhaustDamper" | "exhaustVacuum";

export interface ParamDef {
  key: ParamKey;
  name: string;
  unit: string;
  step: number; // 设备调整步长（建议值量化与展示精度）
  decimals: number; // 数值展示小数位
  pctDelta?: boolean; // 调整量用 pct（百分点）
}

export const PARAM_CANDIDATES: ParamDef[] = [
  { key: "drumSpeed", name: "筒体转速", unit: "r/min", step: 0.5, decimals: 1 },
  { key: "atomizePress", name: "雾化空气压力", unit: "MPa", step: 0.01, decimals: 2 },
  { key: "exhaustDamper", name: "排潮风门开度", unit: "%", step: 1, decimals: 0, pctDelta: true },
  { key: "exhaustVacuum", name: "排潮负压设定值", unit: "Pa", step: 50, decimals: 0 },
];

const PARAM_MAP = new Map(PARAM_CANDIDATES.map((p) => [p.key, p]));

// 参数敏感度：来料水分每偏离名义值 1% 对应的建议调整量（雾化压力不参与，恒为基准值）
const SENSITIVITY: Record<ParamKey, number> = {
  drumSpeed: 1, // r/min / 1%
  atomizePress: 0,
  exhaustDamper: 4, // pct / 1%
  exhaustVacuum: 100, // Pa / 1%
};

// 机台 → 启用参数（按实际控制方式：排潮风门开度 / 排潮负压设定值二选一）
const MACHINE_PARAMS: Record<string, ParamKey[]> = {
  "1#加香机": ["drumSpeed", "atomizePress", "exhaustDamper"],
  "2#加香机": ["drumSpeed", "atomizePress", "exhaustDamper"],
  "3#加香机": ["drumSpeed", "atomizePress", "exhaustVacuum"],
};

export function enabledParamsOf(machine: string): ParamDef[] {
  return (MACHINE_PARAMS[machine] ?? []).map((k) => PARAM_MAP.get(k)!);
}

// ============ 牌号 × 机台 ============

// 牌号按数据权限可见（模拟全量）
export const RECOMMEND_BRANDS = ["娇子", "长城", "宽窄"];

// 牌号 → 适用加香机台（机台名与工艺质量告警口径一致）
export const BRAND_MACHINES: Record<string, string[]> = {
  娇子: ["1#加香机", "2#加香机"],
  长城: ["2#加香机", "3#加香机"],
  宽窄: ["1#加香机", "3#加香机"],
};

export function machinesOfBrand(brand: string): string[] {
  return BRAND_MACHINES[brand] ?? [];
}

// ============ 时间基准 ============

// 本地当日 yyyy-mm-dd（默认参考期与「不得晚于当前日期」校验用；页面正文仅客户端渲染）
export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 默认历史参考期：近 90 天、截至昨日（仅限定历史分析范围，不影响当前工况采集）
export function defaultRange(): { from: string; to: string } {
  const to = addDaysISO(todayISO(), -1);
  return { from: addDaysISO(to, -89), to };
}

// ============ 当前工况快照 ============

export interface ConditionSnapshot {
  brand: string;
  machine: string;
  inflowMoisture: number; // 来料水分 %
  flowRate: number; // 物料流量 kg/h
  recipeVer: string; // 配方版本（原系统版本标识）
  batch: string; // 当前批次
  collectedAt: string; // 工况采集时间 yyyy-MM-dd HH:mm
  recipeCollectedAt: string; // 配方版本生效时间（前一日换批，与主采集时间不一致 → 字段旁标注）
  standardText: string; // 出口水分达标标准：目标（下限 ~ 上限），按牌号自动读取，不可修改
}

// 出口水分达标标准（按牌号）
const STANDARD_TEXT: Record<string, string> = {
  娇子: "12.5%（12.0% ~ 13.0%）",
  长城: "12.6%（12.1% ~ 13.1%）",
  宽窄: "12.4%（11.9% ~ 12.9%）",
};

// 工况静态值 + 采集时刻（日期取当日拼接）
interface CondSeed {
  inflowMoisture: number;
  flowRate: number;
  recipeVer: string;
  batch: string;
  collectedHM: string; // 采集时刻 HH:mm
}

const COND_SEEDS: Record<string, CondSeed> = {
  "娇子|1#加香机": { inflowMoisture: 22.1, flowRate: 4850, recipeVer: "JX-PE-2026-17", batch: "2418", collectedHM: "08:42" },
  "娇子|2#加香机": { inflowMoisture: 20.6, flowRate: 5120, recipeVer: "JX-PE-2026-08", batch: "2419", collectedHM: "09:05" },
  "长城|2#加香机": { inflowMoisture: 21.9, flowRate: 4630, recipeVer: "CC-PE-2026-21", batch: "3105", collectedHM: "08:15" },
  "长城|3#加香机": { inflowMoisture: 21.2, flowRate: 4780, recipeVer: "CC-PE-2026-19", batch: "3106", collectedHM: "07:58" },
  "宽窄|1#加香机": { inflowMoisture: 22.4, flowRate: 4210, recipeVer: "KZ-PE-2026-11", batch: "1876", collectedHM: "08:30" },
  "宽窄|3#加香机": { inflowMoisture: 21.8, flowRate: 4350, recipeVer: "KZ-PE-2026-06", batch: "1877", collectedHM: "09:12" },
};

// 当前工况：与所选牌号、机台及当前批次严格匹配（不套用其他牌号/批次/过期数据）
export function conditionOf(brand: string, machine: string): ConditionSnapshot {
  const seed = COND_SEEDS[`${brand}|${machine}`];
  const today = todayISO();
  return {
    brand,
    machine,
    inflowMoisture: seed.inflowMoisture,
    flowRate: seed.flowRate,
    recipeVer: seed.recipeVer,
    batch: seed.batch,
    collectedAt: `${today} ${seed.collectedHM}`,
    recipeCollectedAt: `${addDaysISO(today, -1)} 20:15`,
    standardText: STANDARD_TEXT[brand] ?? "—",
  };
}

// ============ 参数推荐 ============

export interface AdviceRow {
  key: ParamKey;
  name: string; // 工艺参数名
  unit: string;
  current: string; // 当前设定值（"—" = 未接入，不用实测值冒充）
  suggest: string; // 建议设定值（"—" = 样本不足，未生成数值）
  delta: string; // 调整量：+1.5 / -50 / +4pct / 无需调整 / —
}

export interface RecommendResult {
  rows: AdviceRow[];
  sampleCount: number; // 参考期内匹配有效历史样本数
  insufficient: boolean; // 样本不足 → 不输出数值建议
}

export const MIN_SAMPLES = 30; // 最低样本要求（条，明确配置）

// 组合种子：名义水分（敏感度基准）/ 样本密度 / 当前设定值（null = 未接入）/ 达标组合基准
interface ComboSeed {
  nominalMoisture: number;
  density: number; // 有效历史样本密度（条/天）
  setpoints: Record<ParamKey, number | null>;
  refs: Record<ParamKey, number>; // 历史达标组合基准（当前设定值未接入时的建议计算基准）
}

const COMBO_SEEDS: Record<string, ComboSeed> = {
  "娇子|1#加香机": {
    nominalMoisture: 21.0, density: 1.8,
    setpoints: { drumSpeed: 11.5, atomizePress: 0.32, exhaustDamper: 62, exhaustVacuum: null },
    refs: { drumSpeed: 11.5, atomizePress: 0.32, exhaustDamper: 62, exhaustVacuum: 750 },
  },
  "娇子|2#加香机": {
    nominalMoisture: 21.0, density: 1.6,
    setpoints: { drumSpeed: 12.0, atomizePress: 0.30, exhaustDamper: 58, exhaustVacuum: null },
    refs: { drumSpeed: 12.0, atomizePress: 0.30, exhaustDamper: 58, exhaustVacuum: 750 },
  },
  "长城|2#加香机": {
    nominalMoisture: 20.5, density: 2.0,
    setpoints: { drumSpeed: 11.0, atomizePress: 0.28, exhaustDamper: 65, exhaustVacuum: null },
    refs: { drumSpeed: 11.0, atomizePress: 0.28, exhaustDamper: 65, exhaustVacuum: 750 },
  },
  "长城|3#加香机": {
    nominalMoisture: 20.5, density: 1.7,
    setpoints: { drumSpeed: 10.5, atomizePress: 0.26, exhaustDamper: null, exhaustVacuum: 750 },
    refs: { drumSpeed: 10.5, atomizePress: 0.26, exhaustDamper: 60, exhaustVacuum: 750 },
  },
  // 雾化空气压力设定值未接入 → 当前设定值/调整量显 "—"（建议值仍输出）
  "宽窄|1#加香机": {
    nominalMoisture: 22.0, density: 1.9,
    setpoints: { drumSpeed: 12.5, atomizePress: null, exhaustDamper: 55, exhaustVacuum: null },
    refs: { drumSpeed: 12.5, atomizePress: 0.30, exhaustDamper: 55, exhaustVacuum: 750 },
  },
  // 样本密度低 → 90 天样本约 18 条 < 最低样本要求 30 条 → 不输出数值建议
  "宽窄|3#加香机": {
    nominalMoisture: 21.5, density: 0.2,
    setpoints: { drumSpeed: 11.0, atomizePress: 0.27, exhaustDamper: null, exhaustVacuum: 700 },
    refs: { drumSpeed: 11.0, atomizePress: 0.27, exhaustDamper: 60, exhaustVacuum: 700 },
  },
};

const roundTo = (v: number, step: number) => Math.round(v / step) * step;
const fmt = (v: number, decimals: number) => v.toFixed(decimals);

// 参考期内匹配有效历史样本数 = 参考期天数 × 组合样本密度（确定性取整）
export function sampleCountOf(brand: string, machine: string, from: string, to: string): number {
  const seed = COMBO_SEEDS[`${brand}|${machine}`];
  const days = Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
  return Math.max(0, Math.round(Math.max(0, days) * seed.density));
}

// 生成参数建议：历史参考期内匹配同牌号、同机台、相近工况的有效历史数据，
// 从达标表现较好的参数组合生成一套联合建议（多参数整体方案，不分别取优拼接）
export function recommendOf(
  brand: string,
  machine: string,
  from: string,
  to: string,
  inflowMoisture: number
): RecommendResult {
  const seed = COMBO_SEEDS[`${brand}|${machine}`];
  const sampleCount = sampleCountOf(brand, machine, from, to);
  const insufficient = sampleCount < MIN_SAMPLES;
  const dev = inflowMoisture - seed.nominalMoisture; // 来料水分相对名义值的偏差

  const rows: AdviceRow[] = enabledParamsOf(machine).map((def) => {
    const cur = seed.setpoints[def.key]; // null = 该机台此参数设定值未接入
    const current = cur === null ? "—" : fmt(cur, def.decimals);
    if (insufficient) {
      // 无法形成有样本支持的合规方案 → 不输出数值
      return { key: def.key, name: def.name, unit: def.unit, current, suggest: "—", delta: "—" };
    }
    // 建议值 = 计算基准（当前设定，未接入时取达标组合基准）+ 水分偏差敏感度，量化到设备调整步长
    const base = cur ?? seed.refs[def.key];
    const suggest = roundTo(base + dev * SENSITIVITY[def.key], def.step);
    const deltaNum = cur === null ? null : suggest - cur;
    const delta =
      cur === null
        ? "—"
        : Math.abs(deltaNum) < 1e-9
          ? "无需调整"
          : `${deltaNum > 0 ? "+" : "-"}${fmt(Math.abs(deltaNum), def.decimals)}${def.pctDelta ? "pct" : ""}`;
    return { key: def.key, name: def.name, unit: def.unit, current, suggest: fmt(suggest, def.decimals), delta };
  });
  return { rows, sampleCount, insufficient };
}
