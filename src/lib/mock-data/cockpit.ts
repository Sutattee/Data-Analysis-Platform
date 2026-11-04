// 管理驾驶舱数据层：面向董事长/总经理的全厂 KPI 汇总。
// 口径说明：驾驶舱为 2026年10月 快照，各业务域 mock 的数据锚点不一（能耗/生产 2026-08-09、
// 费用 8月末、质量 2026-10-22），因此本文件按驾驶舱 PRD 示例值手锚趋势与排名，
// 并尽量复用平台现有常量（台时产量/净效率/检验得分/可控费用/预算总额/缺陷/过程管控/辅料），
// 不改动任何原有数据文件（制丝优质品率以驾驶舱素材 98.4 为准，不动 SILK_PREMIUM）。
import type { AlertDomain, AlertLevel } from "@/types";
import { ALERT_RECORDS, LEVEL_PRIORITY } from "./alerts";
import {
  DEFECT_TOTAL,
  FINISHED_PREMIUM,
  PACKING_SCORE,
  TOP_DEFECTS,
  type ProcessMetric,
} from "./quality";
import { EFFICIENCY_CARDS, EQUIPMENT_UNITS } from "./equipment-efficiency";

// ========== 基础口径 ==========
export const COCKPIT_STAT = { monthLabel: "2026年10月", quarter: "2026年第三季度" };
export const COCKPIT_HEADER = { platform: "产质耗KPI分析平台", title: "卷烟厂 · 管理驾驶舱" };

// ========== 六张核心指标卡 ==========
// 值复用各业务域现有数据；能耗 29.8 / 预算执行率 97.0 为驾驶舱 PRD 锚点
const hourlyCard = EFFICIENCY_CARDS.find((c) => c.key === "hourly")!;
const netCard = EFFICIENCY_CARDS.find((c) => c.key === "net")!;

export interface CoreCard {
  key: string;
  name: string;
  long?: boolean;
  value: string;
  unit: string;
  ctx: { label: string; delta?: string; tone: "good" | "warning" | "muted" };
  attention?: boolean; // 橙色警示卡（可控费用 / 预算执行率）
  href: string;
}

export const CORE_CARDS: CoreCard[] = [
  {
    key: "hourly", name: "台时产量",
    value: hourlyCard.value.toLocaleString(), unit: "箱/台",
    ctx: { label: `目标${hourlyCard.target!.toLocaleString()}`, delta: `↓${hourlyCard.target! - hourlyCard.value}`, tone: "warning" },
    href: "/production/equipment-efficiency",
  },
  {
    key: "net", name: "设备运行净效率",
    value: netCard.value.toFixed(1), unit: "%",
    ctx: { label: `历史${netCard.avg!.toFixed(1)}%`, delta: "↓0.6 pct", tone: "warning" },
    href: "/production/equipment-efficiency",
  },
  {
    key: "packing", name: "包装与卷制质量检验加权平均值", long: true,
    value: PACKING_SCORE.value.toFixed(1), unit: "分",
    ctx: { label: "月度检验结果", tone: "muted" },
    href: "/quality/overview",
  },
  {
    key: "energy", name: "单箱卷烟综合能耗",
    value: "29.8", unit: "kgce/箱",
    ctx: { label: "目标31", delta: "↓1.2", tone: "good" },
    href: "/energy/overview",
  },
  {
    key: "perbox", name: "单箱可控费用", attention: true,
    value: "408", unit: "元/箱",
    ctx: { label: "目标300", delta: "↑108", tone: "warning" },
    href: "/expense/analysis/per-box-cost",
  },
  {
    key: "budget", name: "预算执行率", attention: true,
    value: "97.0", unit: "%",
    ctx: { label: "计划执行进度83.3%", delta: "↑13.7 pct", tone: "warning" },
    href: "/expense/overview?metric=rate",
  },
];

// ========== 能耗趋势（1-10月，10月锚 29.8 / 目标31 / 历史均值30） ==========
export interface EnergyTrendPoint {
  month: string;
  actual: number;
  target: number;
  avg: number;
  anomaly?: boolean; // 异常点（点击下钻告警详情）
}

export const ENERGY_TREND: EnergyTrendPoint[] = [
  { month: "1月", actual: 30.2, target: 31.0, avg: 29.8 },
  { month: "2月", actual: 29.6, target: 31.0, avg: 29.9 },
  { month: "3月", actual: 30.5, target: 31.0, avg: 30.0 },
  { month: "4月", actual: 31.2, target: 31.0, avg: 30.1 },
  { month: "5月", actual: 30.8, target: 31.0, avg: 30.0 },
  { month: "6月", actual: 32.4, target: 31.0, avg: 30.1, anomaly: true },
  { month: "7月", actual: 30.4, target: 31.0, avg: 30.2 },
  { month: "8月", actual: 31.1, target: 31.0, avg: 30.1 },
  { month: "9月", actual: 29.6, target: 31.0, avg: 30.0 },
  { month: "10月", actual: 29.8, target: 31.0, avg: 30.0 },
];

export const ENERGY_FOOTNOTE = "单箱电耗24.6 kWh/箱 ｜ 蒸汽耗总量3,860 t";

// 异常点下钻：取能源域等级最高、最新的未处理记录详情页
export function energyAnomalyHref(): string | undefined {
  const hits = ALERT_RECORDS.filter(
    (r) => r.domain === "能源消耗" && !r.handledBy && LEVEL_PRIORITY[r.level] >= LEVEL_PRIORITY["预警"],
  ).sort((a, b) =>
    LEVEL_PRIORITY[b.level] - LEVEL_PRIORITY[a.level] || b.triggerTime.localeCompare(a.triggerTime),
  );
  return hits[0] ? `/alert/records/${hits[0].id}` : undefined;
}

// ========== 预算执行率趋势（1-10月累计；10月末执行率97.0 / 计划83.3 / 偏差+13.7pct） ==========
export interface BudgetTrendPoint {
  month: string;
  rate: number; // 累计预算执行率 %
  plan: number; // 计划执行进度 %
  executed: number; // 累计执行金额（万元）
}

export const BUDGET_ANNUAL = 15652; // 年度预算（万元，复用 OPERATING_COST 口径）
export const BUDGET_TREND: BudgetTrendPoint[] = [
  { month: "1月", rate: 7.7, plan: 8.3, executed: 1200 },
  { month: "2月", rate: 16.6, plan: 16.7, executed: 2600 },
  { month: "3月", rate: 26.2, plan: 25.0, executed: 4100 },
  { month: "4月", rate: 35.8, plan: 33.3, executed: 5600 },
  { month: "5月", rate: 44.7, plan: 41.7, executed: 7000 },
  { month: "6月", rate: 55.0, plan: 50.0, executed: 8600 },
  { month: "7月", rate: 64.5, plan: 58.3, executed: 10100 },
  { month: "8月", rate: 76.0, plan: 66.6, executed: 11900 },
  { month: "9月", rate: 86.3, plan: 75.0, executed: 13500 },
  { month: "10月", rate: 97.0, plan: 83.3, executed: 15180 },
];

export const BUDGET_HEALTH = { score: 72, grade: "一般" };

// ========== 16台卷接包装机组月度计划完成率（10月口径，升序：完成率最低在前） ==========
// PRD 锚点：12#机组92.0%、8#机组93.1%、1#机组100.0%；其余确定性填充
export interface UnitRate {
  name: string; // 如 12#卷接包装机组
  rate: number; // 完成率 %
  missedDays: string[]; // 10月未完成计划的日期
}

const UNIT_RATE_MAP: Record<number, { rate: number; missedDays?: string[] }> = {
  1: { rate: 100.0 },
  2: { rate: 97.8 },
  3: { rate: 96.5 },
  4: { rate: 98.2 },
  5: { rate: 95.4 },
  6: { rate: 97.1 },
  7: { rate: 94.6, missedDays: ["10-19"] },
  8: { rate: 93.1, missedDays: ["10-09", "10-21"] },
  9: { rate: 96.8 },
  10: { rate: 95.7 },
  11: { rate: 94.2, missedDays: ["10-12"] },
  12: { rate: 92.0, missedDays: ["10-06", "10-14", "10-22"] },
  13: { rate: 96.1 },
  14: { rate: 95.0 },
  15: { rate: 93.8, missedDays: ["10-17"] },
  16: { rate: 94.9 },
};

export const UNIT_RATES: UnitRate[] = EQUIPMENT_UNITS.map((name, i) => {
  const cfg = UNIT_RATE_MAP[i + 1]!;
  return { name, rate: cfg.rate, missedDays: cfg.missedDays ?? [] };
}).sort((a, b) => a.rate - b.rate);

// ========== 工艺质量：双环形图 ==========
export interface YieldRing {
  name: string;
  value: number;
  color: string; // CSS 变量 --ring-color
  batch: string; // 悬浮展示：检验批次
  time: string; // 悬浮展示：检验时间
  href: string;
}

export const YIELD_RINGS: YieldRing[] = [
  { name: "成品优质品率", value: FINISHED_PREMIUM.value, color: "#55dbff", batch: "批次 20261022-03", time: "2026-10-22 16:40", href: "/quality/overview" },
  // 制丝 98.4 为驾驶舱素材口径（平台 SILK_PREMIUM 为 98.6，保持不动）
  { name: "制丝优质品率", value: 98.4, color: "#65e7bf", batch: "批次 20261022-02", time: "2026-10-22 14:15", href: "/quality/overview" },
];

// ========== 工艺质量：过程管控偏离说明 + 稳定性分析深链 ==========
// pm-x → SF 稳定性指标编码（/quality/forecast/stability 支持 ?metric=SFxx 预选）
export const PROCESS_LINK: Record<string, string> = {
  "pm-1": "/quality/forecast/stability?metric=SF02",
  "pm-2": "/quality/forecast/stability?metric=SF01",
  "pm-3": "/quality/forecast/stability?metric=SF03",
  "pm-4": "/quality/forecast/stability?metric=SF04",
  "pm-5": "/quality/forecast/stability?metric=SF05",
  "pm-6": "/quality/forecast/stability?metric=SF07",
  "pm-7": "/quality/forecast/stability?metric=SF06",
  "pm-8": "/quality/forecast/stability?metric=SF08",
  "pm-9": "/quality/forecast/stability?metric=SF09",
};

// 偏离说明：超上限/低于下限给量化偏离，待配置不判定
export function processDeviationOf(m: ProcessMetric): string {
  if (m.tolRange) {
    const [low, high] = m.tolRange;
    if (m.latestNum < low) return `低于下限${(low - m.latestNum).toFixed(2)}pct`;
    if (m.latestNum > high) return `超上限${(m.latestNum - high).toFixed(2)}pct`;
    return "区间内达标";
  }
  if (m.toleranceNum == null) return "管控值待配置，不判定达标状态";
  if (m.latestNum > m.toleranceNum) return `超上限${(m.latestNum - m.toleranceNum).toFixed(2)}pct`;
  return "未超限";
}

// ========== 工艺质量：缺陷 Top5（复用质量总览口径，占比 = 条数/总数58） ==========
export const DEFECT_TOP = TOP_DEFECTS.map((d) => ({
  ...d,
  pct: Math.round((d.count / DEFECT_TOTAL) * 1000) / 10,
}));
export const DEFECT_TOTAL_COUNT = DEFECT_TOTAL;

// ========== 辅料消耗四行（复用 materialCards 昨日口径；盘纸基准=历史均值，其余=目标） ==========
export interface MaterialRow {
  key: string;
  label: string;
  valueText: string;
  baseText: string;
  baseType: "历史均值" | "目标";
  diffText: string;
  tone: "good" | "warning";
}

export const MATERIAL_ROWS: MaterialRow[] = [
  { key: "tipPaper", label: "单箱耗盘纸量", valueText: "29.8米/箱", baseText: "均值30.0", baseType: "历史均值", diffText: "低于均值0.2米/箱", tone: "good" },
  { key: "boxLabel", label: "单箱耗商标纸（小盒）量", valueText: "2,500张/箱", baseText: "目标2,480", baseType: "目标", diffText: "超目标20张/箱", tone: "warning" },
  { key: "tobacco", label: "单箱耗烟叶量", valueText: "38.6公斤/箱", baseText: "目标40.0", baseType: "目标", diffText: "低于目标1.4公斤/箱", tone: "good" },
  { key: "filterRod", label: "单箱耗嘴棒量", valueText: "50,000支/箱", baseText: "目标48,000", baseType: "目标", diffText: "超目标2,000支/箱", tone: "warning" },
];
export const MATERIAL_HREF = "/production/materials";

// ========== 全厂重点异常（仅预警/告警/危险且未处理；「当前异常」展示为「实测异常」） ==========
export type AnomalyFilter = "全部" | "实测异常" | "预测风险";

export interface CockpitAnomalyItem {
  id: string;
  level: AlertLevel;
  type: "实测异常" | "预测风险";
  domain: AlertDomain;
  title: string;
  object: string; // 告警对象
  metric: string; // 指标
  time: string;
  value: string; // 告警值（实测=当前值 / 预测=预测值）
  href: string;
}

export interface CockpitAnomalySummary {
  total: number;
  danger: number;
  alarm: number;
  warning: number;
  actualCount: number;
  predictionCount: number;
  items: CockpitAnomalyItem[];
}

// 域 → 告警记录列表路由前缀（详情页兼作路由参数）
const DOMAIN_HREF: Record<AlertDomain, string> = {
  能源消耗: "/alert/records/",
  生产管理: "/production/alert/records/",
  工艺质量: "/quality/alert/records/",
  费用预算执行: "/expense/alert/records/",
};

const ANOMALY_LEVELS: AlertLevel[] = ["预警", "告警", "危险"];

// 排序：等级降序 → 同级实测优先 → 触发时间倒序
function sortAnomalies(a: CockpitAnomalyItem, b: CockpitAnomalyItem): number {
  const p = LEVEL_PRIORITY[b.level] - LEVEL_PRIORITY[a.level];
  if (p !== 0) return p;
  const t = (b.type === "实测异常" ? 1 : 0) - (a.type === "实测异常" ? 1 : 0);
  if (t !== 0) return t;
  return b.time.localeCompare(a.time);
}

export function cockpitAnomalies(filter: AnomalyFilter): CockpitAnomalySummary {
  const items: CockpitAnomalyItem[] = ALERT_RECORDS.filter(
    (r) => ANOMALY_LEVELS.includes(r.level) && !r.handledBy,
  ).map((r) => ({
    id: r.id,
    level: r.level,
    type: r.type === "当前异常" ? "实测异常" : "预测风险",
    domain: r.domain,
    title: r.title,
    object: r.objectName,
    metric: r.metricName,
    time: r.triggerTime,
    value: r.valueLabel,
    href: `${DOMAIN_HREF[r.domain]}${r.id}`,
  }));
  const sorted = items.sort(sortAnomalies);
  const full: CockpitAnomalySummary = {
    total: sorted.length,
    danger: sorted.filter((i) => i.level === "危险").length,
    alarm: sorted.filter((i) => i.level === "告警").length,
    warning: sorted.filter((i) => i.level === "预警").length,
    actualCount: sorted.filter((i) => i.type === "实测异常").length,
    predictionCount: sorted.filter((i) => i.type === "预测风险").length,
    items: sorted,
  };
  if (filter === "全部") return full;
  return {
    ...full,
    items: sorted.filter((i) => i.type === filter),
  };
}

// ========== 碳与水资源（四行；碳排放本月含四类子项，PRD 值） ==========
export interface CarbonWaterRow {
  name: string;
  valueText?: string; // 单值行的当前值
  valueLines?: { label: string; value: string }[]; // 多子项行（碳排放本月，四类排放）
  valueUnit?: string; // 子项共享单位（如 kg CO₂）
  refText: string; // 基准或变化
  tone: "good" | "warning" | "muted";
  href?: string;
}

export const CARBON_WATER: CarbonWaterRow[] = [
  { name: "单位产量碳排放量", valueText: "0.032 kg CO₂/万支", refText: "目标值：0.030（↑0.002）", tone: "warning", href: "/energy/overview" },
  { name: "单位产量水耗", valueText: "0.12 m³/万支", refText: "同比 ↓4.1% 环比 ↑1.6%", tone: "good", href: "/energy/overview" },
  { name: "污水COD", valueText: "42 mg/L", refText: "目标值：0mg/L", tone: "warning", href: "/energy/overview" },
  {
    name: "碳排放（本月）",
    valueLines: [
      { label: "第一类碳排放", value: "385.6" },
      { label: "第二类碳排放", value: "1,248.3" },
      { label: "第三类碳排放", value: "96.5" },
      { label: "第四类碳排放", value: "42.8" },
    ],
    valueUnit: "kg CO₂",
    refText: "待配置",
    tone: "muted",
    href: "/energy/overview",
  },
];

// ========== 智能解读：固定指令 + 一键生成的全厂KPI解读报告 ==========
// 「智能解读」滑出面板每次打开都以新会话自动发送该指令，mock-ai 命中后返回报告
export const COCKPIT_INSIGHT_COMMAND = "驾驶舱智能解读";

const anomalyBrief = cockpitAnomalies("全部");
const topDefect = DEFECT_TOP[0]!;

export const COCKPIT_INSIGHT_REPORT = `📊 驾驶舱智能解读报告 · ${COCKPIT_STAT.monthLabel}

一、总体判断
本月产质耗运行总体平稳：能耗与质量优于目标，产量效率略低于目标，费用执行存在两项重点风险（单箱可控费用超支、预算执行进度偏差）。

二、分项解读

【产量与效率】
• 台时产量 ${hourlyCard.value.toLocaleString()} 箱/台，低于目标 ${(hourlyCard.target! - hourlyCard.value).toLocaleString()} 箱/台；设备运行净效率 ${netCard.value.toFixed(1)}%，低于历史均值 0.6 pct
• 16台机组完成率 ${UNIT_RATES[0]!.rate.toFixed(1)}%～${UNIT_RATES[UNIT_RATES.length - 1]!.rate.toFixed(1)}%：${UNIT_RATES[0]!.name}（${UNIT_RATES[0]!.rate.toFixed(1)}%）、${UNIT_RATES[1]!.name}（${UNIT_RATES[1]!.rate.toFixed(1)}%）偏低，10月存在未完成计划日期，建议核查排产与故障停机

【工艺质量】
• 成品优质品率 ${YIELD_RINGS[0]!.value.toFixed(1)}%、制丝优质品率 ${YIELD_RINGS[1]!.value.toFixed(1)}%，保持高位
• 过程管控 9 项中 4 项未达标：松散回潮非稳态指数 4.8%（≤4.0%）、成品水分标准偏差 1.65%（≤1.55%）、烟支单支克重偏差 46mg（≤40mg）超上限，烘丝机出口水分偏差 12.4% 低于下限 12.5%
• 全部缺陷 ${DEFECT_TOTAL_COUNT} 条，以「${topDefect.name}」居首（${topDefect.count}条 / 占比${topDefect.pct}%）

【能耗与碳水资源】
• 单箱综合能耗 29.8 kgce/箱，低于目标 1.2 kgce/箱；单箱电耗 24.6 kWh/箱
• 碳排放强度 0.032 kg CO₂/万支，超目标 0.002；中水回用率 82.6%（同比+3.1pct）持续向好

【费用预算】
• 单箱可控费用 408 元/箱，超目标 108 元/箱，为当前最大风险项
• 预算执行率 97.0%，高于计划执行进度 13.7 pct；累计执行 15,180 万元 / 年度预算 ${BUDGET_ANNUAL.toLocaleString()} 万元；健康度 ${BUDGET_HEALTH.score}分（${BUDGET_HEALTH.grade}）

【重点异常】
• 未处理异常 ${anomalyBrief.total} 项（危险${anomalyBrief.danger}、告警${anomalyBrief.alarm}、预警${anomalyBrief.warning}），实测 ${anomalyBrief.actualCount} 项、预测 ${anomalyBrief.predictionCount} 项，建议优先处置危险级异常

三、行动建议
1. 核查可控费用超支科目，复盘预算执行进度偏差的费用成因
2. 跟踪 ${UNIT_RATES[0]!.name}与${UNIT_RATES[1]!.name}的排产与停机损失，恢复台时产量
3. 复盘 4 项未达标过程参数的批次趋势，定位工艺偏差根因
4. 优先处置危险级实测异常，关注碳排放强度超标治理`;

// ========== AI 助手推荐问题 ==========
export const COCKPIT_AI_QUESTIONS = [
  "本月全厂各项KPI完成情况如何？",
  "单箱综合能耗趋势与目标差距分析",
  "哪些费用科目执行进度偏差最大？",
  "当前有哪些危险和告警级异常？",
];
