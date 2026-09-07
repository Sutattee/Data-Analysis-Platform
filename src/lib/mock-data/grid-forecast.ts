// 网格能耗预测仪表盘 — 模拟数据与评价工具
// 单位：综合能耗 tce、单箱综合能耗 公斤标煤/箱(E7)、电 kWh、天然气 Nm³、蒸汽 t、水 m³
import {
  ALERT_RECORDS,
  ENERGY_WORKSHOPS,
  ENERGY_GRIDS,
  ENERGY_EQUIPMENTS,
  gridsOfWorkshop,
  equipmentsOfGrid,
  orgPathOf,
} from "./alerts";
import type { AlertLevel } from "@/types";

// ===== 五级评价 =====
export type EvalGrade = "优秀" | "良好" | "一般" | "预警" | "告警" | "危险";
export type ForecastStatus = "预计达标" | "存在超标风险" | "预计超标";

// 异常明细数据（电耗类异常：网格层行，点击网格名称可下钻至设备层）
export interface AnomalyDeviceRow {
  code: string; // 设备编码
  reading: number; // 当日读数（kWh）
  avg: number; // 历史均值（kWh）
}
export interface AnomalyGridRow {
  name: string; // 网格名称
  actual: number; // 当日重点网格电耗实际值（kWh）
  avg: number; // 该网格历史均值（kWh）
  devices: AnomalyDeviceRow[]; // 设备层明细（下钻展示）
}

// 异常详情（抽屉展示，可由告警记录或趋势异常点构造）
export interface AnomalyDetail {
  title: string;
  metricName?: string;
  baseline?: string;
  current?: string; // 当前值（当前异常）
  forecastValue?: string; // 预测值（预测异常）
  deviationValue?: string; // 偏离值（带方向与单位，如 +220.47 kWh）
  deviationRate?: string; // 偏离率（带方向，如 +647.8%）
  confidenceRange?: string; // 置信区间（预测异常）
  triggerTime?: string; // 发生时间（当前异常）
  forecastTime?: string; // 预计越界时间（预测异常）
  cause?: string;
  causeType?: "AI生成" | "人工补录"; // 原因类型（cause 存在时有值）
  suggestion?: string;
  dept?: string; // 部门 / 车间（能源总览等页面构造的异常携带）
  recordId?: string; // 存在时抽屉显示「查看告警记录详情」
  level?: AlertLevel; // 告警等级（与告警记录页一致）
  gridDetails?: AnomalyGridRow[]; // 异常明细数据（网格层，可下钻至设备层；电耗类异常携带）
}

export const GRADE_STYLE: Record<EvalGrade, { color: string; soft: string; text: string }> = {
  优秀: { color: "#16a34a", soft: "bg-green-50", text: "text-green-700" },
  良好: { color: "#84cc16", soft: "bg-lime-50", text: "text-lime-700" },
  一般: { color: "#eab308", soft: "bg-yellow-50", text: "text-yellow-700" },
  预警: { color: "#f97316", soft: "bg-orange-50", text: "text-orange-700" },
  告警: { color: "#ef4444", soft: "bg-red-50", text: "text-red-700" },
  危险: { color: "#b91c1c", soft: "bg-red-100", text: "text-red-800" },
};

// 告警等级五色（趋势图异常点与图例统一使用）：提示蓝灰 / 关注黄 / 预警橙 / 告警红 / 危险深红
export const ALERT_LEVEL_COLOR: Record<AlertLevel, string> = {
  提示: "#64748b",
  关注: "#eab308",
  预警: "#f97316",
  告警: "#ef4444",
  危险: "#b91c1c",
};

export const FORECAST_STATUS_STYLE: Record<ForecastStatus, { color: string; soft: string; text: string }> = {
  预计达标: { color: "#16a34a", soft: "bg-green-50", text: "text-green-700" },
  存在超标风险: { color: "#f97316", soft: "bg-orange-50", text: "text-orange-700" },
  预计超标: { color: "#ef4444", soft: "bg-red-50", text: "text-red-700" },
};

// 等级优先级（用于异常排序）
export const LEVEL_RANK: Record<AlertLevel, number> = { 提示: 1, 关注: 2, 预警: 3, 告警: 4, 危险: 5 };

// 越低越好的指标评级：ratio = value/target
export function gradeOfLowerBetter(value: number, target: number): EvalGrade {
  if (target <= 0) return "良好";
  const r = value / target;
  if (r <= 0.95) return "优秀";
  if (r <= 1.0) return "良好";
  if (r <= 1.05) return "一般";
  if (r <= 1.12) return "预警";
  return "危险";
}

// 按相对最高值的占比评级：能耗越高 → 等级越低（越接近危险/红），用于排名/对比图
export function gradeByShare(ratio: number): EvalGrade {
  if (ratio >= 0.85) return "危险";
  if (ratio >= 0.7) return "预警";
  if (ratio >= 0.55) return "一般";
  if (ratio >= 0.4) return "良好";
  return "优秀";
}

// 评价等级 → 告警等级映射（用于异常抽屉的告警等级标签与异常点五色映射）
export const GRADE_TO_LEVEL: Record<EvalGrade, AlertLevel> = {
  "优秀": "提示",
  "良好": "提示",
  "一般": "关注",
  "预警": "预警",
  "告警": "告警",
  "危险": "危险",
};

// ===== 折标系数（kgce / 单位用量）=====
export const ENERGY_COEFFICIENT = {
  electric: { label: "本月累计用电量", short: "电", unit: "kWh", coeff: 0.1229 },
  gas: { label: "本月累计天然气用量", short: "天然气", unit: "Nm³", coeff: 1.2143 },
  steam: { label: "本月累计蒸汽用量", short: "蒸汽", unit: "t", coeff: 98.6 },
  water: { label: "本月累计用水量", short: "水", unit: "m³", coeff: 0.0857 },
};

// 能源品类色（结构图专用，避开红橙绿）
export const ENERGY_CATEGORY_COLOR = {
  electric: "#3b82f6",
  gas: "#8b5cf6",
  steam: "#14b8a6",
  water: "#06b6d4",
};

// ===== 1. 顶部核心指标卡 =====
export const coreMetrics = {
  health: { score: 86, grade: "良好" as EvalGrade, delta: 4 },
  totalEnergy: { value: 1285.6, target: 1300, grade: "良好" as EvalGrade, yoy: -3.2, mom: 1.5 },
  perBox: { value: 12.8, target: 12, grade: "一般" as EvalGrade, yoy: -2.1, mom: 0.3 },
  forecast: {
    value: 1310,
    range: [1305, 1370] as [number, number],
    target: 1300,
    deviance: 10,
    devRate: 0.8,
    status: "预计超标" as ForecastStatus,
    time: "2026-08-04 09:00",
    revisedDelta: 55,
    revisedRate: 4.3,
  },
  anomaly: { total: 8, severe: 2, delta: 1, maxLevel: "告警" as AlertLevel },
};

// ===== 2. 能源分类指标卡 =====
export const energyTypeMetrics = {
  electric: { value: 1285600, target: 1300000, devRate: -1.1, yoy: -3.2, mom: 1.5, grade: "良好" as EvalGrade },
  gas: { value: 86400, target: 90000, devRate: -4.0, yoy: -1.8, mom: 0.6, grade: "优秀" as EvalGrade },
  steam: { value: 3120, target: 3000, devRate: 4.0, yoy: 2.1, mom: -0.8, grade: "一般" as EvalGrade },
  water: { value: 18600, target: 19000, devRate: -2.1, yoy: -4.5, mom: 1.2, grade: undefined as EvalGrade | undefined },
};

// ===== 3. 综合能耗趋势与预测 =====
export interface TrendPoint {
  date: string;
  time?: string;
  actual?: number;
  predict?: number;
  originalPredict?: number; // 修正前预测值
  upper?: number;
  lower?: number;
  target: number;
  anomalyGrade?: EvalGrade;
  breach?: boolean;
}

// 生成趋势序列：unit 决定日/月粒度；history/forecast 为对应粒度下的数量
export function genTrendForecast(unit: "day" | "month", history: number, forecast: number, base: number, target: number, seed: number, waveAmp = 0.035): TrendPoint[] {
  const pts: TrendPoint[] = [];
  const anchor = new Date(2026, 7, 1); // 基准 2026-08-01
  const fmt = (d: Date) => (unit === "day" ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getFullYear()}/${d.getMonth() + 1}`);
  const p2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const fmtTime = (d: Date, idx: number) =>
    `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(unit === "day" ? d.getDate() : 15)} ${p2(9 + (idx % 8))}:${p2((idx % 12) * 5)}`;

  for (let i = history - 1; i >= 0; i--) {
    const d = unit === "day"
      ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - i)
      : new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const idx = history - 1 - i;
    const wave = Math.sin((seed + idx) * 0.9) * base * waveAmp;
    const drift = idx * base * 0.004;
    let actual = +(base + wave + drift).toFixed(1);
    let anomalyGrade: EvalGrade | undefined;
    if (idx === Math.floor(history * 0.5)) { anomalyGrade = "危险"; actual = +(target * 1.13).toFixed(1); }
    else if (idx === Math.floor(history * 0.2)) { anomalyGrade = "预警"; actual = +(target * 1.07).toFixed(1); }
    else if (idx === Math.floor(history * 0.8)) { anomalyGrade = "一般"; actual = +(target * 1.03).toFixed(1); }
    pts.push({ date: fmt(d), time: fmtTime(d, idx), actual, target, anomalyGrade });
  }
  for (let i = 1; i <= forecast; i++) {
    const d = unit === "day"
      ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + i)
      : new Date(anchor.getFullYear(), anchor.getMonth() + i, 1);
    const predict = +(base + i * base * 0.014).toFixed(1);
    const spread = base * (0.025 + i * 0.012);
    const breach = i === forecast && predict > target;
    // 预测段首点注入异常（与事件 effectDate 重合 → 组合标记出现在预测曲线）
    let anomalyGrade: EvalGrade | undefined;
    if (i === 1) anomalyGrade = "预警";
    pts.push({
      date: fmt(d),
      time: fmtTime(d, i + history),
      predict,
      originalPredict: +(predict * 0.96).toFixed(1),
      upper: +(predict + spread).toFixed(1),
      lower: +(predict - spread).toFixed(1),
      target,
      breach,
      anomalyGrade,
    });
  }
  return pts;
}

const TREND_BASE: Record<string, Record<"综合" | "E7", [number, number]>> = {
  全厂: { 综合: [128, 130], E7: [12.8, 12] },
  动力车间: { 综合: [52, 54], E7: [14, 13] },
  制丝车间: { 综合: [46, 48], E7: [13, 12.5] },
  卷包车间: { 综合: [30, 31], E7: [11.5, 11] },
};

export type ForecastRange = "7d" | "15d" | "1m" | "3m";

export function getTrendForecast(object: string, metric: "综合" | "E7", range: ForecastRange = "3m"): TrendPoint[] {
  const [base, target] = TREND_BASE[object]?.[metric] ?? TREND_BASE["全厂"][metric];
  // 7d/15d：日粒度，历史近30天；1m/3m：月粒度，历史近12个月，未来为 1/3 个自然月
  const cfg = range === "7d"
    ? { unit: "day" as const, h: 30, f: 7 }
    : range === "15d"
    ? { unit: "day" as const, h: 30, f: 15 }
    : range === "1m"
    ? { unit: "month" as const, h: 12, f: 1 }
    : { unit: "month" as const, h: 12, f: 3 };
  return genTrendForecast(cfg.unit, cfg.h, cfg.f, base, target, metric === "综合" ? 1 : 5);
}

// ===== 4. 分层实际能耗对比（可下钻） =====
export interface HierarchyItem {
  name: string;
  value: number;
  share: number;
  mom: number;
  grade: EvalGrade;
}

const HIER_BASE: Record<string, number> = { 综合: 42, 电: 420000, 气: 28000, 蒸汽: 1000, 水: 6000 };

export function getHierarchy(
  level: "workshop" | "grid" | "equipment",
  parent: string | null,
  metric: string
): HierarchyItem[] {
  let names: string[];
  if (level === "workshop") names = ENERGY_WORKSHOPS;
  else if (level === "grid") names = gridsOfWorkshop(parent ?? undefined);
  else names = equipmentsOfGrid(parent ?? undefined);

  const base = HIER_BASE[metric] ?? 42;
  const raw = names.map((name, i) => {
    const factor = Math.max(0.2, 1 - i * 0.18);
    const jitter = 0.92 + ((i * 7) % 5) * 0.03;
    const value = +(base * factor * jitter).toFixed(metric === "综合" ? 1 : 0);
    return { name, value, mom: +(((i * 3) % 7) - 3 + (i % 2 ? 0.5 : -0.4)).toFixed(1) };
  });
  const maxVal = Math.max(...raw.map((r) => r.value), 1);
  const total = raw.reduce((s, x) => s + x.value, 0) || 1;
  return raw
    .map((it) => ({
      ...it,
      share: +((it.value / total) * 100).toFixed(1),
      // 能耗越高 → 等级越低（越接近危险/红）
      grade: gradeByShare(it.value / maxVal),
    }))
    .sort((a, b) => b.value - a.value);
}

// 设备类型识别（用于 Top 排名的设备类型筛选）
export function deviceTypeOf(name: string): string {
  if (/变压器|配电柜/.test(name)) return "变配电";
  if (/水泵|补水泵/.test(name)) return "泵类";
  if (/风机/.test(name)) return "风机";
  if (/锅炉/.test(name)) return "锅炉";
  if (/空压机|干燥机/.test(name)) return "空压";
  if (/加压机/.test(name)) return "加压机";
  if (/发生器|回收/.test(name)) return "热能";
  if (/空调/.test(name)) return "空调";
  return "其他";
}

export interface TopItem {
  name: string;
  parent: string; // 所属车间/网格
  value: number;
  share: number;
  mom: number; // 环比 %
  grade: EvalGrade;
}

// 全厂能耗 Top 排名（按层级 + 指标；设备层可按类型筛；不支持下钻）
export function getTopRanking(
  level: "workshop" | "grid" | "equipment",
  metric: string,
  deviceType = "全部"
): TopItem[] {
  let names: { name: string; parent: string }[];
  if (level === "workshop") {
    names = ENERGY_WORKSHOPS.map((n) => ({ name: n, parent: "全厂" }));
  } else if (level === "grid") {
    names = ENERGY_GRIDS.map((g) => ({ name: g, parent: orgPathOf(g).workshop ?? "—" }));
  } else {
    names = ENERGY_EQUIPMENTS
      .map((e) => ({ name: e, parent: orgPathOf(e).grid ?? "—", type: deviceTypeOf(e) }))
      .filter((e) => deviceType === "全部" || e.type === deviceType)
      .map((e) => ({ name: e.name, parent: e.parent }));
  }

  const base = HIER_BASE[metric] ?? 42;
  const raw = names.map((n, i) => {
    const factor = Math.max(0.15, 1 - i * 0.18);
    const jitter = 0.95 + ((i * 13) % 5) * 0.02;
    const value = +(base * factor * jitter).toFixed(metric === "综合" ? 1 : 0);
    return { ...n, value, mom: +(((i * 5) % 9) - 4 + (i % 2 ? 0.3 : -0.2)).toFixed(1) };
  });
  const maxVal = Math.max(...raw.map((r) => r.value), 1);
  const total = raw.reduce((s, x) => s + x.value, 0) || 1;
  return raw
    .map((it) => ({
      name: it.name,
      parent: it.parent,
      value: it.value,
      share: +((it.value / total) * 100).toFixed(1),
      mom: it.mom,
      grade: gradeByShare(it.value / maxVal),
    }))
    .sort((a, b) => b.value - a.value);
}

// ===== 5. 分类能源用量趋势（4 类，各自单位） =====
export interface TypeTrendPoint {
  date: string;
  time?: string;
  actual: number;
  target: number;
  upper?: number;
  lower?: number;
  anomaly?: boolean;
}
const TYPE_BASE: Record<string, number> = { electric: 42000, gas: 2800, steam: 100, water: 600 };

export function getEnergyTypeTrend(
  type: "electric" | "gas" | "steam" | "water",
  _object: string,
  granularity: "日" | "月" | "年"
): TypeTrendPoint[] {
  const count = granularity === "日" ? 30 : granularity === "月" ? 12 : 6;
  const base = TYPE_BASE[type];
  const pts: TypeTrendPoint[] = [];
  for (let i = 0; i < count; i++) {
    const wave = Math.sin((i + type.length) * 0.8) * base * 0.08;
    const drift = i * base * 0.006;
    let actual = +(base + wave + drift).toFixed(1);
    const target = +(base * 1.02).toFixed(1);
    let anomaly = false;
    if (i === 11 || i === 22) { anomaly = true; actual = +(target * 1.1).toFixed(1); }
    const label = granularity === "日" ? `8/${i + 1}` : granularity === "月" ? `${i + 1}月` : `${2021 + i}`;
    const p2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const time =
      granularity === "日"
        ? `2026-08-${p2(i + 1)} ${p2(9 + (i % 8))}:${p2((i % 12) * 5)}`
        : granularity === "月"
        ? `2026-${p2(i + 1)}-15 10:29`
        : `${2021 + i}-12-15 10:29`;
    pts.push({ date: label, time, actual, target, anomaly });
  }
  return pts;
}

// ===== 6. 能源结构（电/气/蒸汽 折标占比，水排除） =====
export interface StructureItem {
  key: string;
  name: string;
  value: number; // tce
  original: number;
  unit: string;
  pct: number;
  color: string;
}

// 预测修正事件（重大事件触发，effectDate 与预测段月份对齐）
export interface CorrectionEvent {
  effectDate: string;
  name: string;
  before: number;
  after: number;
  delta: number;
  rate: number; // 修正幅度 %
  reason: string;
  correctTime: string;
}
export function getCorrectionEvents(): CorrectionEvent[] {
  return [
    {
      effectDate: "2026/9",
      name: "生产计划调整",
      before: 130,
      after: 135.5,
      delta: 5.5,
      rate: +(((135.5 - 130) / 130) * 100).toFixed(1),
      reason: "9 月排产上调，预测能耗同步上调。",
      correctTime: "2026-08-02 10:00",
    },
    {
      effectDate: "2026/10",
      name: "新设备投运",
      before: 138,
      after: 132,
      delta: -6,
      rate: +(((132 - 138) / 138) * 100).toFixed(1),
      reason: "高能效新设备投运，预测能耗下调。",
      correctTime: "2026-08-03 14:00",
    },
  ];
}

export function getEnergyStructure(object: string, range: "本月累计" | "今年累计" = "本月累计"): StructureItem[] {
  // 今年累计约为本月累计的 12 倍
  const f = (object === "全厂" ? 1 : 0.4) * (range === "今年累计" ? 12 : 1);
  const elec = 1285600 * f;
  const gas = 86400 * f;
  const steam = 3120 * f;
  const water = 18600 * f;
  const tceElec = (elec * ENERGY_COEFFICIENT.electric.coeff) / 1000;
  const tceGas = (gas * ENERGY_COEFFICIENT.gas.coeff) / 1000;
  const tceSteam = (steam * ENERGY_COEFFICIENT.steam.coeff) / 1000;
  const tceWater = (water * ENERGY_COEFFICIENT.water.coeff) / 1000;
  const total = tceElec + tceGas + tceSteam + tceWater || 1;
  return [
    { key: "electric", name: "电", value: +tceElec.toFixed(1), original: elec, unit: "kWh", pct: +((tceElec / total) * 100).toFixed(1), color: ENERGY_CATEGORY_COLOR.electric },
    { key: "gas", name: "天然气", value: +tceGas.toFixed(1), original: gas, unit: "Nm³", pct: +((tceGas / total) * 100).toFixed(1), color: ENERGY_CATEGORY_COLOR.gas },
    { key: "steam", name: "蒸汽", value: +tceSteam.toFixed(1), original: steam, unit: "t", pct: +((tceSteam / total) * 100).toFixed(1), color: ENERGY_CATEGORY_COLOR.steam },
    { key: "water", name: "水", value: +tceWater.toFixed(1), original: water, unit: "m³", pct: +((tceWater / total) * 100).toFixed(1), color: ENERGY_CATEGORY_COLOR.water },
  ];
}

// 能耗三态构成：基础能耗（非生产）/ 正常生产能耗 / 高负荷能耗
export interface ThreeStateItem {
  key: string;
  name: string;
  value: number; // tce
  pct: number;
  color: string;
}

export function getEnergyThreeState(range: "本月累计" | "今年累计" = "本月累计"): ThreeStateItem[] {
  const f = range === "今年累计" ? 12 : 1;
  const base = 1285.6 * 0.15 * f; // 基础能耗（照明/空调/办公等非生产）
  const normal = 1285.6 * 0.65 * f; // 正常生产能耗
  const high = 1285.6 * 0.2 * f; // 高负荷能耗
  const total = base + normal + high || 1;
  return [
    { key: "base", name: "基础能耗", value: +base.toFixed(1), pct: +((base / total) * 100).toFixed(1), color: "#3b82f6" },
    { key: "normal", name: "正常生产能耗", value: +normal.toFixed(1), pct: +((normal / total) * 100).toFixed(1), color: "#14b8a6" },
    { key: "high", name: "高负荷能耗", value: +high.toFixed(1), pct: +((high / total) * 100).toFixed(1), color: "#8b5cf6" },
  ];
}

// ===== 7. 当前异常分布与定位（基于告警记录聚合） =====
export interface AnomalyItem {
  name: string;
  maxLevel: AlertLevel;
  count: number;
  maxDevRate: number;
  alertCount: number;
  status: "发生中" | "已恢复";
  // 用于打开异常详情抽屉的关联记录 id
  recordId?: string;
}

// 取节点关联的能耗告警记录（车间=其网格记录；网格=其记录；设备=所属网格记录）
function recordsForNode(name: string, level: "workshop" | "grid" | "equipment", parent: string | null) {
  return ALERT_RECORDS.filter((r) => {
    if (r.domain !== "能源消耗") return false;
    const p = orgPathOf(r.objectName);
    if (level === "workshop") return p.workshop === name;
    if (level === "grid") return p.grid === name;
    return parent ? p.grid === parent : false; // equipment 归属 parent 网格
  });
}

// 聚合记录：总数、最高等级 rank、首条 id
function aggregate(recs: typeof ALERT_RECORDS) {
  let maxRank = 0;
  let firstId: string | undefined;
  for (const r of recs) {
    if (LEVEL_RANK[r.level] > maxRank) {
      maxRank = LEVEL_RANK[r.level];
      firstId = r.id;
    }
  }
  return { count: recs.length, maxRank, firstId };
}

// 等级 rank（1-5）转 AlertLevel
function rankToLevel(rank: number): AlertLevel | null {
  if (rank < 1 || rank > 5) return null;
  return (["提示", "关注", "预警", "告警", "危险"] as AlertLevel[])[rank - 1];
}

// 取某对象（全厂/车间）关联的一条能耗告警记录 id（趋势异常点抽屉跳转用）
export function pickAlertRecordId(object: string): string | undefined {
  const p = orgPathOf(object);
  const inObj = ALERT_RECORDS.find(
    (r) => r.domain === "能源消耗" && (p.level === "workshop" ? orgPathOf(r.objectName).workshop === p.workshop : true)
  );
  return (inObj ?? ALERT_RECORDS.find((r) => r.domain === "能源消耗"))?.id;
}

// 异常数聚合：网格=其设备异常数之和；车间=其网格异常数之和
const baseCount = (i: number, scale: number) => (1 + (i % 3)) * scale;
function sumGridCount(grid: string, scale: number): number {
  return equipmentsOfGrid(grid).reduce((s, _, i) => s + baseCount(i, scale), 0);
}
function sumWorkshopCount(workshop: string, scale: number): number {
  return gridsOfWorkshop(workshop).reduce((s, g) => s + sumGridCount(g, scale), 0);
}

export function getAnomalyDistribution(
  level: "workshop" | "grid" | "equipment",
  parent: string | null,
  range: "当前发生中" | "24h" | "7d" = "当前发生中"
): AnomalyItem[] {
  // 当前发生中=仅发生中；24h/7d=发生中+已恢复，7d 数量约为 24h 的 3 倍
  const scale = range === "7d" ? 3 : 1;
  const lvls: AlertLevel[] = ["预警", "告警", "危险", "关注", "预警", "告警"];
  const statusOf = (i: number, name: string): "发生中" | "已恢复" => {
    if (range === "当前发生中") return "发生中";
    const r = range === "24h" ? 3 : 2;
    return (i + name.length) % r === 0 ? "发生中" : "已恢复";
  };

  // 设备层：告警数量/最高等级取其所属网格的记录聚合（设备无独立记录）
  if (level === "equipment") {
    const equips = equipmentsOfGrid(parent ?? undefined);
    const agg = aggregate(recordsForNode("", level, parent));
    return equips.map((name, i) => {
      const count = baseCount(i, scale);
      return {
        name,
        maxLevel: agg.maxRank ? (rankToLevel(agg.maxRank) as AlertLevel) : lvls[(i + name.length) % lvls.length],
        count,
        maxDevRate: 5 + (i % 12),
        alertCount: Math.max(agg.count, count),
        recordId: agg.firstId,
        status: statusOf(i, name),
      };
    });
  }

  // 车间/网格层：告警数量为该节点下所有子对象（网格/设备）记录数之和
  const nodes = level === "workshop" ? ENERGY_WORKSHOPS : gridsOfWorkshop(parent ?? undefined);
  return nodes
    .map((n, i) => {
      const agg = aggregate(recordsForNode(n, level, parent));
      const count = level === "workshop" ? sumWorkshopCount(n, scale) : sumGridCount(n, scale);
      return {
        name: n,
        maxLevel: agg.maxRank ? (rankToLevel(agg.maxRank) as AlertLevel) : lvls[(i + n.length) % lvls.length],
        count,
        maxDevRate: 6 + (i % 15),
        alertCount: Math.max(agg.count, count),
        recordId: agg.firstId,
        status: statusOf(i, n),
      };
    })
    .sort((a, b) => LEVEL_RANK[b.maxLevel] - LEVEL_RANK[a.maxLevel] || b.count - a.count);
}
