// 碳排放与环保合规评价 — 指标卡模拟数据（季度口径）
import { ENERGY_WORKSHOPS, gridsOfWorkshop, equipmentsOfGrid, orgPathOf } from "./alerts";
import { genTrendForecast, gradeByShare, deviceTypeOf, LEVEL_RANK, type EvalGrade } from "./grid-forecast";
import type { AlertLevel } from "@/types";

// 指标方向：lower=越低越好，higher=越高越好，total=总量（vs 目标），score=综合得分
export type CarbonDirection = "lower" | "higher" | "total" | "score";

export interface CarbonMetricInfo {
  direction: CarbonDirection;
  value?: number; // 当前值
  unit: string;
  target?: number; // 目标 / 标准 / 上限
  targetLabel?: string; // 如 "目标 ≤0.035"、"标准 ≥80%"
  yoy?: number; // 同比 %
  mom?: number; // 环比 %
  grade?: EvalGrade; // 评价等级（未配置标准时留空 → 中性色条）
  // score 专用
  score?: number;
  compliant?: string; // 合规状态
  delta?: number; // 较上季度分值变化
}

export const carbonMetrics: Record<string, CarbonMetricInfo> = {
  // 碳排放健康度：综合得分 + 合规状态
  health: { direction: "score", unit: "分", score: 88, grade: "良好", compliant: "合规", delta: 3 },
  // CO₂排放当量（总量，未配评价标准 → 中性）
  co2: { direction: "total", unit: "tCO₂e", value: 2860, target: 3000, yoy: -4.2, mom: -1.8, targetLabel: "季度目标 3,000" },
  // 单位产值碳排放量（E1，越低越好）
  perOutput: { direction: "lower", unit: "tCO₂e/万元", value: 0.032, target: 0.035, yoy: -5.6, mom: -2.1, grade: "优秀", targetLabel: "目标 ≤0.035" },
  // 水资源重复利用率（E8，越高越好）
  waterReuse: { direction: "higher", unit: "%", value: 82.6, target: 80, yoy: 3.1, mom: 1.2, grade: "良好", targetLabel: "标准 ≥80%" },
  // 单箱化学需氧量排放量（E6，越低越好）
  perBoxCOD: { direction: "lower", unit: "g/箱", value: 3.4, target: 3.5, yoy: -3.8, mom: -1.5, grade: "一般", targetLabel: "标准 ≤3.50" },
  // 污水排放COD（E9，越低越好）
  cod: { direction: "lower", unit: "mg/L", value: 48, target: 50, yoy: -6.7, mom: -2.3, grade: "预警", targetLabel: "标准 ≤50 mg/L" },
};

// ===== 1. 碳排放趋势与预测（复用 genTrendForecast）=====
const CARBON_TREND_BASE: Record<string, Record<"总量" | "单位产值", [number, number]>> = {
  全厂: { 总量: [286, 300], 单位产值: [0.35, 0.38] },
  动力车间: { 总量: [120, 128], 单位产值: [0.4, 0.42] },
  制丝车间: { 总量: [98, 105], 单位产值: [0.33, 0.36] },
  卷包车间: { 总量: [68, 72], 单位产值: [0.3, 0.32] },
};
export function getCarbonTrend(object: string, metric: "总量" | "单位产值", range: "1m" | "3m") {
  const [base, target] = CARBON_TREND_BASE[object]?.[metric] ?? CARBON_TREND_BASE["全厂"][metric];
  return genTrendForecast("month", 12, range === "1m" ? 1 : 3, base, target, metric === "总量" ? 2 : 6, metric === "总量" ? 0.02 : 0.12);
}

// ===== 2. 环保合规指标趋势（E6/E8/E9）=====
export interface CompliancePoint {
  date: string;
  actual: number;
  limit: number;
  anomaly?: boolean;
  anomalyGrade?: EvalGrade;
}
const COMPLIANCE_CFG: Record<string, { label: string; unit: string; base: number; limit: number; lowerIsBetter: boolean }> = {
  perBoxCOD: { label: "单箱化学需氧量排放量(E6)", unit: "g/箱", base: 3.4, limit: 3.5, lowerIsBetter: true },
  waterReuse: { label: "水资源重复利用率(E8)", unit: "%", base: 82, limit: 80, lowerIsBetter: false },
  cod: { label: "污水排放COD(E9)", unit: "mg/L", base: 48, limit: 50, lowerIsBetter: true },
};
export const COMPLIANCE_TYPES = ["perBoxCOD", "waterReuse", "cod"] as const;
export function complianceMeta(type: string) {
  return COMPLIANCE_CFG[type];
}
export function getComplianceTrend(type: "perBoxCOD" | "waterReuse" | "cod"): CompliancePoint[] {
  const cfg = COMPLIANCE_CFG[type];
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2026, i - 4, 1);
    const wave = Math.sin((i + type.length) * 0.8) * cfg.base * 0.05;
    let actual = +(cfg.base + wave + i * cfg.base * 0.003).toFixed(2);
    let anomaly = false;
    let anomalyGrade: EvalGrade | undefined;
    if ((i + type.length) % 5 === 0) {
      anomaly = true;
      const over = [1.05, 1.09, 1.13][i % 3]; // 不同偏离程度
      actual = +(cfg.limit * (cfg.lowerIsBetter ? over : 2 - over)).toFixed(2);
      const ratio = Math.abs(actual - cfg.limit) / cfg.limit;
      anomalyGrade = ratio > 0.1 ? "危险" : ratio > 0.05 ? "预警" : "一般";
    }
    return { date: `${d.getFullYear()}/${d.getMonth() + 1}`, actual, limit: cfg.limit, anomaly, anomalyGrade };
  });
}

// ===== 3. 碳排放来源构成（双层）=====
export function getCarbonSource(range: "本月累计" | "本季度累计" = "本季度累计") {
  const f = range === "本月累计" ? 1 / 3 : 1;
  const boiler = 1200 * f;
  const process = 680 * f;
  const electric = 720 * f;
  const steam = 260 * f;
  const direct = boiler + process;
  const indirect = electric + steam;
  const total = direct + indirect || 1;
  return {
    total: +total.toFixed(1),
    inner: [
      { key: "direct", name: "直接碳排放(Scope1)", value: +direct.toFixed(1), pct: +((direct / total) * 100).toFixed(1), color: "#3b82f6" },
      { key: "indirect", name: "间接碳排放(Scope2)", value: +indirect.toFixed(1), pct: +((indirect / total) * 100).toFixed(1), color: "#14b8a6" },
    ],
    outer: [
      { key: "boiler", name: "天然气锅炉", value: +boiler.toFixed(1), pct: +((boiler / total) * 100).toFixed(1), color: "#1d4ed8" },
      { key: "process", name: "工艺直燃", value: +process.toFixed(1), pct: +((process / total) * 100).toFixed(1), color: "#60a5fa" },
      { key: "electric", name: "外购电力", value: +electric.toFixed(1), pct: +((electric / total) * 100).toFixed(1), color: "#0d9488" },
      { key: "steam", name: "外购蒸汽", value: +steam.toFixed(1), pct: +((steam / total) * 100).toFixed(1), color: "#5eead4" },
    ],
  };
}

// ===== 4. 实际碳排放分层对比 =====
export interface CarbonHierItem {
  name: string;
  value: number;
  share: number;
  mom: number;
  grade: EvalGrade;
}
const CARBON_HIER_BASE: Record<string, number> = { 总: 95, 直接: 62, 间接: 33 };
export function getCarbonHierarchy(
  level: "workshop" | "grid" | "equipment",
  parent: string | null,
  metric: string
): CarbonHierItem[] {
  const names =
    level === "workshop" ? ENERGY_WORKSHOPS : level === "grid" ? gridsOfWorkshop(parent ?? undefined) : equipmentsOfGrid(parent ?? undefined);
  const base = CARBON_HIER_BASE[metric] ?? 95;
  const raw = names.map((name, i) => {
    const factor = Math.max(0.2, 1 - i * 0.18);
    const jitter = 0.95 + ((i * 13) % 5) * 0.02;
    const value = +(base * factor * jitter).toFixed(1);
    return { name, value, mom: +(((i * 5) % 9) - 4 + (i % 2 ? 0.3 : -0.2)).toFixed(1) };
  });
  const maxVal = Math.max(...raw.map((r) => r.value), 1);
  const total = raw.reduce((s, x) => s + x.value, 0) || 1;
  return raw
    .map((it) => ({ ...it, share: +((it.value / total) * 100).toFixed(1), grade: gradeByShare(it.value / maxVal) }))
    .sort((a, b) => b.value - a.value);
}

// ===== 5. 全厂碳排放 Top 排名 =====
export interface CarbonTopItem {
  name: string;
  parent: string;
  value: number;
  share: number;
  mom: number;
  grade: EvalGrade;
}
export function getCarbonTopRanking(
  level: "workshop" | "grid" | "equipment",
  metric: string,
  deviceType = "全部"
): CarbonTopItem[] {
  let names: { name: string; parent: string }[];
  if (level === "workshop") {
    names = ENERGY_WORKSHOPS.map((n) => ({ name: n, parent: "全厂" }));
  } else if (level === "grid") {
    names = ENERGY_WORKSHOPS.flatMap((w) => gridsOfWorkshop(w).map((g) => ({ name: g, parent: w })));
  } else {
    names = ENERGY_WORKSHOPS.flatMap((w) =>
      gridsOfWorkshop(w).flatMap((g) => equipmentsOfGrid(g).map((e) => ({ name: e, parent: g })))
    );
    if (deviceType !== "全部") names = names.filter((n) => deviceTypeOf(n.name) === deviceType);
  }
  const base = CARBON_HIER_BASE[metric] ?? 95;
  const raw = names.map((n, i) => {
    const factor = Math.max(0.15, 1 - i * 0.18);
    const value = +(base * factor * (0.95 + ((i * 13) % 5) * 0.02)).toFixed(1);
    return { ...n, value, mom: +(((i * 5) % 9) - 4).toFixed(1) };
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

// ===== 6. 减排潜力分析 =====
export interface ReductionItem {
  name: string;
  reduction: number; // tCO₂e
  rate: number; // %
  invest?: string;
  payback?: string;
  basis: string;
}
export function getReductionPotential(): ReductionItem[] {
  return [
    { name: "锅炉节能改造", reduction: 320, rate: 11.2, invest: "180万元", payback: "约2.3年", basis: "锅炉效率提升8%，天然气消耗下降" },
    { name: "绿电替代", reduction: 268, rate: 9.4, invest: "120万元", payback: "约1.8年", basis: "外购电力中40%替换为绿电" },
    { name: "运行优化", reduction: 180, rate: 6.3, invest: "30万元", payback: "约0.6年", basis: "峰谷用电优化+设备负载调度" },
    { name: "工艺直燃优化", reduction: 142, rate: 5.0, invest: "90万元", payback: "约2.1年", basis: "燃烧效率提升+余热回收" },
    { name: "外购蒸汽替代", reduction: 96, rate: 3.4, invest: "60万元", payback: "约2.5年", basis: "自产蒸汽替代部分外购蒸汽" },
    { name: "能源结构优化", reduction: 74, rate: 2.6, invest: "45万元", payback: "约1.9年", basis: "高碳能源向低碳能源调整" },
  ];
}

// ===== 7. 碳排放异常对象排名 =====
export interface CarbonAnomalyItem {
  name: string;
  maxLevel: AlertLevel;
  count: number;
  maxDevRate: number;
  alertCount: number;
  status: "发生中" | "已恢复";
}
export function getCarbonAnomalyDistribution(
  level: "workshop" | "grid" | "equipment",
  parent: string | null,
  range: "当前发生中" | "24h" | "7d" = "当前发生中"
): CarbonAnomalyItem[] {
  const scale = range === "7d" ? 3 : 1;
  const lvls: AlertLevel[] = ["预警", "告警", "危险", "关注", "预警", "告警"];
  const statusOf = (i: number, name: string): "发生中" | "已恢复" => {
    if (range === "当前发生中") return "发生中";
    const r = range === "24h" ? 3 : 2;
    return (i + name.length) % r === 0 ? "发生中" : "已恢复";
  };
  const baseCount = (i: number) => (1 + (i % 3)) * scale;

  if (level === "equipment") {
    const equips = equipmentsOfGrid(parent ?? undefined);
    return equips.map((name, i) => ({
      name,
      maxLevel: lvls[(i + name.length) % lvls.length],
      count: baseCount(i),
      maxDevRate: 5 + (i % 12),
      alertCount: baseCount(i),
      status: statusOf(i, name),
    }));
  }
  const nodes = level === "workshop" ? ENERGY_WORKSHOPS : gridsOfWorkshop(parent ?? undefined);
  return nodes
    .map((n, i) => {
      const count = (2 + (i % 4)) * scale;
      return {
        name: n,
        maxLevel: lvls[(i + n.length) % lvls.length],
        count,
        maxDevRate: 6 + (i % 15),
        alertCount: count,
        status: statusOf(i, n),
      };
    })
    .sort((a, b) => LEVEL_RANK[b.maxLevel] - LEVEL_RANK[a.maxLevel] || b.count - a.count);
}
