// 稳定性预测 —— 模拟数据（会话内静态，本期仅展示最新一轮预测结果）
// 基于机台生产参数、过程指标及车间环境数据对稳定性指标滚动预测，按五级等级体系判定：
// 提示 / 关注 / 预警 / 告警 / 危险（严重程度递增，颜色与告警中心一致），「正常」仅为展示状态，
// 未配置规则、暂无法判定不能归为正常；统计周期四种（批 / 月 / 班 / 日）→ 横轴为批号 / 月份 / 日期
// （班周期同为批次刻度，班次信息在悬浮提示），预测窗口随周期（10 批次 / 3 个月 / 10 班次 / 22 日）；
// 规则方向三种（上限型 ≥ / 下限型 ≤ / 双侧超出型），
// 各指标按启用等级配置多条阈值边界，等级变化预测文本由实测值与预测序列计算派生；
// 参考范围、基准值与等级阈值原表标注「待提供」，此处预置模拟值供演示，可直接替换。
import { BRAND_OPTIONS, SHIFT_OPTIONS } from "@/lib/mock-data/quality-defect";
import { LEVEL_PRIORITY } from "@/lib/mock-data/alerts";
import type { AlertLevel } from "@/types";

// ============ 五级等级规则 ============

export type RuleOp = ">=" | "<=" | "between"; // 上限型 / 下限型 / 双侧超出型（全部等级共用方向）

// 单个等级的阈值边界（「未启用」的等级不配置）
export interface LevelThreshold {
  level: AlertLevel;
  threshold?: number; // 单边阈值
  low?: number; // 双侧下边界
  high?: number; // 双侧上边界
}

// 指标等级规则：方向 + 启用等级列表（按严重度降序存放）
export interface AlertRule {
  op: RuleOp;
  levels: LevelThreshold[];
}

// 等级判定：从最严重等级向下找首个命中的等级（双侧型为超出任一边界）；null = 正常
export function levelOfValue(v: number, rule: AlertRule): AlertLevel | null {
  for (const lv of rule.levels) {
    if (rule.op === ">=" && v >= (lv.threshold ?? Infinity)) return lv.level;
    if (rule.op === "<=" && v <= (lv.threshold ?? -Infinity)) return lv.level;
    if (rule.op === "between" && (v < (lv.low ?? -Infinity) || v > (lv.high ?? Infinity))) return lv.level;
  }
  return null;
}

// 命中等级的规则文本："≥2.20%" / "≤-15.0mg" / "-0.50% ~ +0.50%"
export function levelRuleText(rule: AlertRule, lv: LevelThreshold, unit: string): string {
  if (rule.op === ">=") return `≥${lv.threshold}${unit}`;
  if (rule.op === "<=") return `≤${lv.threshold}${unit}`;
  return `${lv.low} ~ ${lv.high}${unit}`;
}

// 管控值展示文本：等级规则最轻级边界（越界即至少最轻级）——单边「≤x」/「≥x」、双侧「low ~ high」；
// 未配置规则返回 null（摘要显示「未配置」，图上不画管控值线）
export function controlTextOf(metric: StabilityMetricDef): string | null {
  const rule = metric.rule;
  if (!rule) return null;
  const lightest = rule.levels[rule.levels.length - 1];
  const fmt = (v: number) => v.toFixed(metric.decimals);
  if (rule.op === "between") {
    return lightest.low === undefined || lightest.high === undefined ? null : `${fmt(lightest.low)} ~ ${fmt(lightest.high)}${metric.unit}`;
  }
  return lightest.threshold === undefined ? null : `${rule.op === ">=" ? "≤" : "≥"}${fmt(lightest.threshold)}${metric.unit}`;
}

// 等级颜色（与告警中心一致）：图表描边 / 文本着色
export const LEVEL_COLOR: Record<AlertLevel, string> = {
  提示: "#64748b", // 蓝灰
  关注: "#eab308", // 黄
  预警: "#f97316", // 橙
  告警: "#ef4444", // 红
  危险: "#b91c1c", // 深红
};

export const LEVEL_TEXT_CLS: Record<AlertLevel, string> = {
  提示: "text-slate-600",
  关注: "text-yellow-600",
  预警: "text-orange-600",
  告警: "text-red-500",
  危险: "text-red-700",
};

// 等级严重度比较（正常 = 0，等级越大越严重）
export function severityOf(level: AlertLevel | null): number {
  return level === null ? 0 : LEVEL_PRIORITY[level];
}

// ============ 参数映射（各指标独立参数集；环境类参数归属车间环境） ============

export interface StabilityParamDef {
  key: string;
  name: string;
  unit: string;
  source: "process" | "env";
  tip: string; // 取值方式提示（参数卡片悬浮展示）
}

// 共享参数定义（同 key 跨指标复用）
const PARAM_DEFS: Record<string, StabilityParamDef> = {
  wallTemp: { key: "wallTemp", name: "筒壁温度", unit: "℃", source: "process", tip: "最新值" },
  airTemp: { key: "airTemp", name: "热风温度", unit: "℃", source: "process", tip: "近1小时均值" },
  exhaust: { key: "exhaust", name: "排潮风门开度", unit: "%", source: "process", tip: "最新值" },
  steamPress: { key: "steamPress", name: "蒸汽压力", unit: "MPa", source: "process", tip: "近1小时均值" },
  flavorMoist: { key: "flavorMoist", name: "加香入口烟丝水分", unit: "%", source: "process", tip: "批次均值" },
  cutFlow: { key: "cutFlow", name: "烟丝流量", unit: "kg/h", source: "process", tip: "近1小时均值" },
  flavorFlow: { key: "flavorFlow", name: "香料实际流量", unit: "L/h", source: "process", tip: "近1小时均值" },
  envTemp: { key: "envTemp", name: "环境温度", unit: "℃", source: "env", tip: "近1小时均值" },
  envHum: { key: "envHum", name: "环境湿度", unit: "%", source: "env", tip: "近1小时均值" },
  rollSpeed: { key: "rollSpeed", name: "卷接速度", unit: "支/分", source: "process", tip: "最新值" },
  fillValue: { key: "fillValue", name: "烟丝填充值", unit: "cm³/g", source: "process", tip: "批次均值" },
};

// 参考范围（kind=range）或基准值+容差（kind=base，无容差则不判方向）；模拟值，待正式提供后替换
export type ParamSpec = { kind: "range"; low: number; high: number } | { kind: "base"; base: number; tol?: number };

export const PARAM_SPECS: Record<string, ParamSpec> = {
  wallTemp: { kind: "range", low: 42, high: 52 },
  airTemp: { kind: "range", low: 110, high: 125 },
  exhaust: { kind: "range", low: 35, high: 55 },
  steamPress: { kind: "range", low: 0.6, high: 0.8 },
  flavorMoist: { kind: "range", low: 12, high: 13 },
  cutFlow: { kind: "base", base: 6500, tol: 200 },
  flavorFlow: { kind: "base", base: 52, tol: 2 },
  envTemp: { kind: "range", low: 18, high: 28 },
  envHum: { kind: "range", low: 40, high: 65 },
  rollSpeed: { kind: "range", low: 6500, high: 7000 },
  fillValue: { kind: "range", low: 4.3, high: 4.8 },
};

// ============ 指标档案 ============

export type Cycle = "批" | "月" | "班" | "日";

export interface StabilityMetricDef {
  code: string; // 指标编码
  name: string; // 指标名称
  unit: string;
  decimals: number; // 数值展示小数位
  cycle: Cycle; // 统计周期 → 预测窗口与横轴形态
  process: string; // 关联工序（来源归属之一）
  params: StabilityParamDef[]; // 来源工序参数（与 seed values/phis 顺序一一对应）
  rule: AlertRule | null; // null = 未配置等级规则
  machines: string[]; // 支持机台
}

export const STABILITY_METRICS: StabilityMetricDef[] = [
  {
    code: "SF01", name: "成品水分标准偏差", unit: "%", decimals: 2, cycle: "批", process: "松散回潮",
    params: [PARAM_DEFS.wallTemp, PARAM_DEFS.airTemp],
    rule: { op: ">=", levels: [{ level: "危险", threshold: 2.4 }, { level: "告警", threshold: 2.2 }, { level: "预警", threshold: 2.1 }, { level: "关注", threshold: 2.0 }] },
    machines: ["1#松散回潮机", "2#松散回潮机", "3#松散回潮机"],
  },
  {
    code: "SF02", name: "松散回潮非稳态指数", unit: "", decimals: 2, cycle: "批", process: "松散回潮",
    params: [PARAM_DEFS.wallTemp],
    rule: null, // 演示「未配置等级规则」
    machines: ["1#松散回潮机", "2#松散回潮机", "3#松散回潮机"],
  },
  {
    code: "SF03", name: "烘丝工序非稳态指数", unit: "", decimals: 2, cycle: "批", process: "烘丝",
    params: [PARAM_DEFS.exhaust, PARAM_DEFS.steamPress],
    rule: { op: ">=", levels: [{ level: "危险", threshold: 1.35 }, { level: "告警", threshold: 1.2 }, { level: "预警", threshold: 1.15 }, { level: "关注", threshold: 1.1 }] },
    machines: ["1#烘丝机", "3#烘丝机", "5#烘丝机"],
  },
  {
    code: "SF04", name: "烘丝机出口水分偏差", unit: "%", decimals: 2, cycle: "批", process: "烘丝",
    params: [PARAM_DEFS.airTemp],
    rule: { op: "between", levels: [{ level: "告警", low: -0.5, high: 0.5 }, { level: "关注", low: -0.4, high: 0.4 }] },
    machines: ["1#烘丝机", "3#烘丝机", "5#烘丝机"],
  },
  {
    code: "SF05", name: "加香出口水分不达标次数", unit: "次", decimals: 0, cycle: "日", process: "加香",
    params: [PARAM_DEFS.flavorMoist, PARAM_DEFS.cutFlow, PARAM_DEFS.flavorFlow, PARAM_DEFS.envTemp, PARAM_DEFS.envHum],
    rule: { op: ">=", levels: [{ level: "告警", threshold: 5 }, { level: "提示", threshold: 4 }] },
    machines: ["1#加香机", "2#加香机", "3#加香机"],
  },
  {
    code: "SF06", name: "非细支单支重量偏差", unit: "mg", decimals: 1, cycle: "班", process: "卷制",
    params: [PARAM_DEFS.rollSpeed],
    rule: { op: "between", levels: [{ level: "告警", low: -20, high: 20 }, { level: "预警", low: -18, high: 18 }] },
    machines: ["1#卷接包机组", "3#卷接包机组", "5#卷接包机组"],
  },
  {
    code: "SF07", name: "烟支单支克重偏差", unit: "mg", decimals: 1, cycle: "班", process: "卷制",
    params: [PARAM_DEFS.fillValue],
    rule: { op: "<=", levels: [{ level: "危险", threshold: -18 }, { level: "告警", threshold: -15 }, { level: "预警", threshold: -13.5 }, { level: "关注", threshold: -12 }] }, // 下限型：克重不足
    machines: ["1#卷接包机组", "2#卷接包机组", "4#卷接包机组"],
  },
  {
    code: "SF08", name: "常规烟支硬度变异系数", unit: "%", decimals: 2, cycle: "班", process: "卷制",
    params: [PARAM_DEFS.rollSpeed, PARAM_DEFS.fillValue],
    rule: { op: ">=", levels: [{ level: "告警", threshold: 3.5 }, { level: "预警", threshold: 3.35 }, { level: "关注", threshold: 3.2 }, { level: "提示", threshold: 3.0 }] },
    machines: ["2#卷接包机组", "3#卷接包机组", "5#卷接包机组"],
  },
  {
    code: "SF09", name: "中支烟支硬度变异系数", unit: "%", decimals: 2, cycle: "班", process: "卷制",
    params: [PARAM_DEFS.rollSpeed, PARAM_DEFS.fillValue],
    rule: { op: ">=", levels: [{ level: "告警", threshold: 4.0 }, { level: "预警", threshold: 3.85 }, { level: "关注", threshold: 3.7 }, { level: "提示", threshold: 3.5 }] },
    machines: ["2#卷接包机组", "3#卷接包机组", "4#卷接包机组"],
  },
];

export function metricOf(code: string): StabilityMetricDef | undefined {
  return STABILITY_METRICS.find((m) => m.code === code);
}

// 预测窗口：批 / 班 10 步，月 3 步，日 22 步
function windowSizeOf(cycle: Cycle): number {
  return cycle === "月" ? 3 : cycle === "日" ? 22 : 10;
}

// 窗口文案：批 / 班周期以已排产批次为窗口单位（班周期横轴同为批次刻度）；月周期为自然月；
// 日周期为已排产日（与告警侧 SF05 预测窗口同口径）
export function windowTextOf(cycle: Cycle): string {
  const n = windowSizeOf(cycle);
  return cycle === "月" ? `未来${n}个月` : cycle === "日" ? `未来已排产的${n}日` : `未来${n}个已排产批次`;
}

// ============ 预测结果 ============

export interface TrendPoint {
  label: string; // 横轴刻度：批号 / 月份（批 / 班周期均为批次刻度，月周期为月份）
  value: number; // 指标值
  batch?: string; // 批号（批 / 班周期 = 横轴同源；月周期无 → Tooltip 不展示）
  shift?: string; // 班次（批 / 班周期 = 该批次生产班次「10-6 白班」；月周期无）
  shiftGroup?: string; // 班组（甲 / 乙 / 丙班，按机台偏移轮换；综合曲线剔除）
  brand?: string; // 牌号（按机台偏移轮换；综合曲线剔除）
}

export interface ForecastParamValue {
  key: string;
  value: number | null; // null = 参数缺失
  phi: number; // 模型解释贡献（单位 = 指标单位；符号已按规则方向编码：>0 恒为增险）
}

export interface StabilityForecast {
  code: string;
  machine: string;
  base: number; // 基准值 = 历史末点 = 预测首点 = 最新实测值
  confidence: number | null; // null → 摘要显示「—」
  updatedAt: string; // 预测更新时间
  hist: TrendPoint[]; // 历史实测（末点为基准）
  future: TrendPoint[]; // 预测序列（首点为基准，与历史衔接）
  params: ForecastParamValue[]; // 本轮预测实际使用的参数
  insufficient?: boolean; // 必需输入不满足 → 本轮「数据不足」
  failed?: boolean; // 模型执行失败 → 本轮「预测失败」
  reason?: string; // 数据不足 / 预测失败原因
}

// ---- 原始组合定义（values / phis 与指标参数顺序一一对应）----

interface FutureSpec {
  kind: "hold" | "climb" | "drift";
  target?: number; // climb：hitStep 步处到达的目标值
  hitStep?: number; // climb：预计达阈步数（1 起）
  delta?: number; // drift：窗口末累计漂移量
}

interface ForecastSeed {
  code: string;
  machine: string;
  base: number;
  histFrom: number; // 历史起点
  futureSpec: FutureSpec;
  conf: number | null;
  updatedAt: string;
  values: (number | null)[];
  phis: number[];
  insufficient?: boolean;
  failed?: boolean;
  reason?: string;
}

const SEEDS: ForecastSeed[] = [
  // ===== SF01 成品水分标准偏差（关注2.00/预警2.10/告警2.20/危险2.40，批）=====
  // 2#：实测告警（2.31）→ 3 批次升至 2.41 越过危险线后高位维持（默认指标默认机台，演示「预测：危险」）
  { code: "SF01", machine: "2#松散回潮机", base: 2.31, histFrom: 2.05, futureSpec: { kind: "climb", target: 2.48, hitStep: 4 }, conf: 0.85, updatedAt: "2026-10-10 08:00",
    values: [53.4, 126.5], phis: [0.31, 0.18] },
  { code: "SF01", machine: "1#松散回潮机", base: 2.05, histFrom: 1.94, futureSpec: { kind: "climb", target: 2.26, hitStep: 3 }, conf: 0.83, updatedAt: "2026-10-10 07:40",
    values: [48.2, 127.1], phis: [0.06, 0.15] },
  { code: "SF01", machine: "3#松散回潮机", base: 1.86, histFrom: 1.95, futureSpec: { kind: "drift", delta: -0.05 }, conf: 0.87, updatedAt: "2026-10-10 07:20",
    values: [46.0, 116.5], phis: [0.04, 0.02] },
  // ===== SF02 松散回潮非稳态指数（未配置预警规则，批）=====
  { code: "SF02", machine: "1#松散回潮机", base: 0.92, histFrom: 0.88, futureSpec: { kind: "drift", delta: 0.02 }, conf: 0.8, updatedAt: "2026-10-10 07:30",
    values: [48.5], phis: [0.03] },
  { code: "SF02", machine: "2#松散回潮机", base: 0.88, histFrom: 0.9, futureSpec: { kind: "drift", delta: -0.01 }, conf: 0.82, updatedAt: "2026-10-10 07:25",
    values: [45.5], phis: [0.02] },
  { code: "SF02", machine: "3#松散回潮机", base: 0.95, histFrom: 0.91, futureSpec: { kind: "drift", delta: 0.03 }, conf: 0.79, updatedAt: "2026-10-10 07:15",
    values: [50.0], phis: [0.04] },
  // ===== SF03 烘丝工序非稳态指数（关注1.10~危险1.35，批）=====
  // 5#：关注 → 预警 → 告警 → 危险三级跳（3 批次升至危险 1.42，演示「危险」等级预测）
  { code: "SF03", machine: "5#烘丝机", base: 1.12, histFrom: 1.04, futureSpec: { kind: "climb", target: 1.42, hitStep: 3 }, conf: 0.84, updatedAt: "2026-10-10 08:00",
    values: [58.2, 0.84], phis: [0.09, 0.05] },
  { code: "SF03", machine: "3#烘丝机", base: 0.98, histFrom: 1.02, futureSpec: { kind: "drift", delta: -0.04 }, conf: 0.86, updatedAt: "2026-10-10 07:35",
    values: [44.5, 0.66], phis: [0.02, 0.01] },
  { code: "SF03", machine: "1#烘丝机", base: 1.26, histFrom: 1.13, futureSpec: { kind: "hold" }, conf: 0.82, updatedAt: "2026-10-10 07:45",
    values: [60.0, 0.87], phis: [0.11, 0.07] },
  // ===== SF04 烘丝机出口水分偏差（双侧 关注±0.40/告警±0.50，批）=====
  { code: "SF04", machine: "1#烘丝机", base: 0.62, histFrom: 0.48, futureSpec: { kind: "hold" }, conf: 0.83, updatedAt: "2026-10-10 07:50",
    values: [129.2], phis: [0.21] },
  { code: "SF04", machine: "3#烘丝机", base: 0.44, histFrom: 0.36, futureSpec: { kind: "climb", target: 0.56, hitStep: 1 }, conf: 0.8, updatedAt: "2026-10-10 07:35",
    values: [127.3], phis: [0.14] },
  { code: "SF04", machine: "5#烘丝机", base: 0.18, histFrom: 0.24, futureSpec: { kind: "drift", delta: -0.03 }, conf: 0.85, updatedAt: "2026-10-10 07:15",
    values: [118.0], phis: [0.03] },
  // ===== SF05 加香出口水分不达标次数（提示≥4/告警≥5，日）=====
  // 1#：实测 5.4 已达告警级 → 窗口内高位维持（演示「预计持续告警」）
  { code: "SF05", machine: "1#加香机", base: 5.4, histFrom: 4, futureSpec: { kind: "hold" }, conf: 0.78, updatedAt: "2026-10-10 08:00",
    values: [13.4, 6820, 55.6, 26.2, 63.5], phis: [1.4, 0.9, 0.7, 0, 0] },
  { code: "SF05", machine: "2#加香机", base: 4, histFrom: 3, futureSpec: { kind: "climb", target: 5, hitStep: 2 }, conf: null, updatedAt: "2026-10-10 06:30",
    values: [12.8, 6560, 53.1, 24.4, 58.2], phis: [0.8, 0.5, 0.3, 0, 0.2] },
  {
    // 烟丝流量测点离线 → 必需输入不满足，本轮「数据不足」
    code: "SF05", machine: "3#加香机", base: 0, histFrom: 0, futureSpec: { kind: "hold" }, conf: null, updatedAt: "2026-10-10 06:20",
    values: [13.1, null, 52.4, 25.1, 61.0], phis: [0, 0, 0, 0, 0],
    insufficient: true, reason: "烟丝流量测点数据缺失，必需输入不满足模型要求",
  },
  // ===== SF06 非细支单支重量偏差（双侧 预警±18/告警±20，班）=====
  { code: "SF06", machine: "3#卷接包机组", base: 23.5, histFrom: 19.5, futureSpec: { kind: "hold" }, conf: 0.84, updatedAt: "2026-10-10 08:00",
    values: [7150], phis: [3.2] },
  { code: "SF06", machine: "1#卷接包机组", base: 17.8, histFrom: 15.5, futureSpec: { kind: "climb", target: 22.5, hitStep: 2 }, conf: 0.81, updatedAt: "2026-10-10 07:40",
    values: [6980], phis: [1.6] },
  {
    // 预测模型服务超时 → 本轮「预测失败」
    code: "SF06", machine: "5#卷接包机组", base: 0, histFrom: 0, futureSpec: { kind: "hold" }, conf: null, updatedAt: "2026-10-10 06:40",
    values: [6720], phis: [0],
    failed: true, reason: "预测模型服务超时，本轮预测未生成",
  },
  // ===== SF07 烟支单支克重偏差（下限型 关注-12~危险-18，班）=====
  // 2#：实测告警 → 2 班次降至 -19.2 越过危险线（演示「危险」等级预测）
  { code: "SF07", machine: "2#卷接包机组", base: -16.2, histFrom: -13.5, futureSpec: { kind: "climb", target: -19.2, hitStep: 2 }, conf: 0.82, updatedAt: "2026-10-10 08:00",
    values: [4.15], phis: [2.4] },
  { code: "SF07", machine: "4#卷接包机组", base: -13.8, histFrom: -12.2, futureSpec: { kind: "climb", target: -16.0, hitStep: 1 }, conf: 0.8, updatedAt: "2026-10-10 07:30",
    values: [4.38], phis: [1.2] },
  { code: "SF07", machine: "1#卷接包机组", base: -8.4, histFrom: -9.5, futureSpec: { kind: "drift", delta: 0.8 }, conf: 0.85, updatedAt: "2026-10-10 07:05",
    values: [4.62], phis: [0.4] },
  // ===== SF08 常规烟支硬度变异系数（提示3.0~告警3.5，班）=====
  // 3#：实测告警 3.62 → 2 班次内回落至提示级并维持（演示「预计逐步降级」）
  { code: "SF08", machine: "3#卷接包机组", base: 3.62, histFrom: 3.35, futureSpec: { kind: "climb", target: 3.1, hitStep: 2 }, conf: 0.83, updatedAt: "2026-10-10 08:00",
    values: [7080, 4.82], phis: [0.22, 0.1] },
  { code: "SF08", machine: "5#卷接包机组", base: 3.28, histFrom: 3.12, futureSpec: { kind: "climb", target: 3.56, hitStep: 4 }, conf: 0.8, updatedAt: "2026-10-10 07:45",
    values: [6950, 4.75], phis: [0.12, 0.06] },
  { code: "SF08", machine: "2#卷接包机组", base: 2.95, histFrom: 3.02, futureSpec: { kind: "drift", delta: -0.06 }, conf: 0.85, updatedAt: "2026-10-10 07:20",
    values: [6800, 4.55], phis: [0.05, 0.02] },
  // ===== SF09 中支烟支硬度变异系数（提示3.5~告警4.0，班）=====
  { code: "SF09", machine: "4#卷接包机组", base: 4.15, histFrom: 3.9, futureSpec: { kind: "hold" }, conf: 0.82, updatedAt: "2026-10-10 08:00",
    values: [7040, 4.5], phis: [0.18, 0.08] },
  { code: "SF09", machine: "2#卷接包机组", base: 3.78, histFrom: 3.6, futureSpec: { kind: "climb", target: 4.08, hitStep: 3 }, conf: 0.81, updatedAt: "2026-10-10 07:35",
    values: [6920, 4.44], phis: [0.1, 0.05] },
  { code: "SF09", machine: "3#卷接包机组", base: 3.42, histFrom: 3.5, futureSpec: { kind: "drift", delta: -0.07 }, conf: 0.84, updatedAt: "2026-10-10 07:15",
    values: [6840, 4.58], phis: [0.04, 0.02] },
];

// ---- 横轴刻度（批号 / 月份）----

const roundTo = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

// 批 / 班周期统一批次刻度（班周期横轴不再用班次，班次信息保留在点位上下文）；
// 月周期为自然月（基准 10 月，跨年顺延 1 月）；日周期为 M-DD 日期刻度（基准 10-29，
// 历史 6 天 + 预测基准起顺延 22 日，跨月自动进位至 11 月）
function dayLabels(): { hist: string[]; future: string[] } {
  const daysInMonth = (m: number) => new Date(2026, m, 0).getDate();
  const seq: string[] = [];
  let m = 10;
  let d = 24; // 历史首日 10-24
  for (let i = 0; i < 6 + 22; i += 1) {
    seq.push(`${m}-${d < 10 ? `0${d}` : `${d}`}`);
    d += 1;
    if (d > daysInMonth(m)) {
      m += 1;
      d = 1;
    }
  }
  return { hist: seq.slice(0, 6), future: seq.slice(5) }; // future 首点 = 基准 10-29
}

function labelsOf(cycle: Cycle): { hist: string[]; future: string[] } {
  if (cycle === "月") {
    return { hist: ["5月", "6月", "7月", "8月", "9月", "10月"], future: ["10月", "11月", "12月", "1月"] };
  }
  if (cycle === "日") return dayLabels();
  const hist = [2346, 2347, 2348, 2349, 2350, 2351].map(String);
  const future = [2351, 2352, 2353, 2354, 2355, 2356, 2357, 2358, 2359, 2360, 2361].map(String);
  return { hist, future };
}

// ---- 序列生成（确定性平滑插值；base = 历史末点 = 预测首点，保证三方同口径）----

// 字符串确定性哈希（班组 / 牌号按机台偏移轮换用）
function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h;
}

// 点位生产上下文（确定性）：批 / 班周期带批号（= 横轴刻度）+ 生产班次 + 班组 / 牌号；
// 月 / 日周期无（按自然周期聚合，无数值字段悬浮与抽屉均不展示）；
// g = 全局点位序号（历史 0..5，预测首点与历史末点重合），h = 机台偏移
function pointMeta(
  cycle: Cycle,
  label: string,
  g: number,
  h: number
): Pick<TrendPoint, "batch" | "shift" | "shiftGroup" | "brand"> {
  if (cycle === "月" || cycle === "日") return {};
  return {
    batch: label,
    shift: `10-${6 + Math.floor(g / 2)}${g % 2 === 0 ? "白班" : "夜班"}`,
    shiftGroup: SHIFT_OPTIONS[(g + h + 1) % SHIFT_OPTIONS.length],
    brand: BRAND_OPTIONS[(g + h) % BRAND_OPTIONS.length],
  };
}

function buildSeries(seed: ForecastSeed, metric: StabilityMetricDef): { hist: TrendPoint[]; future: TrendPoint[] } {
  const { hist: hLabels, future: fLabels } = labelsOf(metric.cycle);
  const d = metric.decimals;
  const h = hashOf(`${seed.code}|${seed.machine}`);
  // 历史 6 点：histFrom 平滑爬升至 base（凸增缓动）
  const hist = hLabels.map((label, j) => ({
    label,
    value: roundTo(seed.histFrom + (seed.base - seed.histFrom) * (j / (hLabels.length - 1)) ** 2, d),
    ...pointMeta(metric.cycle, label, j, h),
  }));
  // 预测：hold 高位维持 / climb 于 hitStep 步到达 target / drift 线性漂移
  const future = fLabels.map((label, i) => {
    const spec = seed.futureSpec;
    let v = seed.base;
    if (spec.kind === "hold") {
      v = i === 0 ? seed.base : seed.base + Math.abs(seed.base) * 0.006 * Math.sin(i * 1.7);
    } else if (spec.kind === "climb") {
      const hit = spec.hitStep ?? 1;
      const target = spec.target ?? seed.base;
      if (i <= hit) {
        const t = i / hit;
        v = seed.base + (target - seed.base) * t * t;
      } else {
        v = target + Math.abs(target - seed.base) * 0.12 * Math.sin((i - hit) * 1.9);
      }
    } else {
      v = seed.base + (spec.delta ?? 0) * (i / (fLabels.length - 1));
    }
    return { label, value: roundTo(v, d), ...pointMeta(metric.cycle, label, hLabels.length - 1 + i, h) };
  });
  return { hist, future };
}

// 展开为完整预测结果
const FORECASTS: StabilityForecast[] = SEEDS.map((s) => {
  const metric = metricOf(s.code)!;
  const { hist, future } = buildSeries(s, metric);
  return {
    code: s.code,
    machine: s.machine,
    base: s.base,
    confidence: s.conf,
    updatedAt: s.updatedAt,
    hist,
    future,
    params: metric.params.map((p, i) => ({ key: p.key, value: s.values[i], phi: s.phis[i] })),
    insufficient: s.insufficient,
    failed: s.failed,
    reason: s.reason,
  };
});

// ============ 等级派生（五级体系） ============

// 当前实测等级：数据不足 / 预测失败 / 未配置规则 → null（不能归为正常）
export function currentLevelOf(f: StabilityForecast): AlertLevel | null {
  const metric = metricOf(f.code)!;
  if (f.insufficient || f.failed || !metric.rule) return null;
  return levelOfValue(f.base, metric.rule);
}

// 预测最高等级：窗口内各预测时点等级中的最高（不含基准首点——首点为当前实测，
// 否则当前等级恒被计入，「未来降级」永远无法成立）；null = 正常
export function maxFutureLevelOf(f: StabilityForecast): AlertLevel | null {
  const metric = metricOf(f.code)!;
  if (f.insufficient || f.failed || !metric.rule) return null;
  let best: AlertLevel | null = null;
  for (const p of f.future.slice(1)) {
    const lv = levelOfValue(p.value, metric.rule);
    if (severityOf(lv) > severityOf(best)) best = lv;
  }
  return best;
}

export type LevelChangeKind = "upgrade" | "hold" | "degrade" | "normal" | "unconfigured" | "unavailable";

// 等级变化预测（按当前实测等级与窗口内预测最高等级判定）：
// 升级 → 首达预测最高等级点的「{批号}批次已触发{等级}」（月周期「26年12月已触发{等级}」）；
// 同级维持 → 预计持续{等级}；降级（窗口内仍有等级，如 告警→关注）→ 同「已触发」口径；
// 当前已越级且窗口内全部恢复正常 → 预计逐步降级；当前正常且窗口内均正常 → 窗口内正常；
// 未配置规则 / 数据不足·预测失败 → 未配置等级规则 / 暂无法预测等级
export function levelChangeOf(f: StabilityForecast): { kind: LevelChangeKind; text: string; step?: number; toLevel?: AlertLevel } {
  const metric = metricOf(f.code)!;
  if (f.insufficient || f.failed) return { kind: "unavailable", text: "暂无法预测等级" };
  const rule = metric.rule;
  if (!rule) return { kind: "unconfigured", text: "未配置等级规则" };
  const cur = currentLevelOf(f);
  const max = maxFutureLevelOf(f);
  // 窗口首达某等级点的触发表述：批 / 班周期用横轴批号（如 2355批次已触发告警）；
  // 月周期按基准 2026-10 顺延自然月并跨年（如 26年12月已触发关注 / 27年1月已触发告警）；
  // 日周期用 M月D日（横轴刻度 11-05 → 11月5日已触发告警）
  const hitTextOf = (lv: AlertLevel, step: number): string => {
    if (metric.cycle === "月") {
      const m = 10 + step;
      const y = 26 + Math.floor((m - 1) / 12);
      return `${y}年${((m - 1) % 12) + 1}月已触发${lv}`;
    }
    if (metric.cycle === "日") {
      const [mm, dd] = (f.future[step]?.label ?? "").split("-");
      return mm && dd ? `${+mm}月${+dd}日已触发${lv}` : `已触发${lv}`;
    }
    return `${f.future[step]?.label ?? ""}批次已触发${lv}`;
  };
  const stepOfMax = () =>
    f.future.slice(1).findIndex((p) => severityOf(levelOfValue(p.value, rule)) === severityOf(max)) + 1; // 1 起：距基准的步数
  if (max !== null && severityOf(max) > severityOf(cur)) {
    const step = stepOfMax();
    return { kind: "upgrade", text: hitTextOf(max, step), step, toLevel: max };
  }
  if (cur !== null) {
    // 当前已越级：同级 = 预计持续{等级}；降至更低等级 = 该等级首达点「已触发」口径；全部恢复正常 = 预计逐步降级
    if (max !== null && severityOf(max) === severityOf(cur)) {
      return { kind: "hold", text: `预计持续${cur}` };
    }
    if (max !== null) {
      const step = stepOfMax();
      return { kind: "degrade", text: hitTextOf(max, step), step, toLevel: max };
    }
    return { kind: "degrade", text: "预计逐步降级" };
  }
  return { kind: "normal", text: "窗口内正常" };
}

// 最新实测值状态：当前等级（等级名 / 正常）；未配置规则或无法判定 → —（不归为正常）
export function statusOf(f: StabilityForecast): AlertLevel | "正常" | "—" {
  const metric = metricOf(f.code)!;
  if (f.insufficient || f.failed || !metric.rule) return "—";
  return currentLevelOf(f) ?? "正常";
}

// ============ 超出量 / 预测极值派生（卡片右侧、预测详情、悬浮提示共用口径） ============

// 超出量单位展示：百分比指标以 pct 计（与告警记录详情「超出量」口径一致）
export function exceedUnitOf(unit: string): string {
  return unit === "%" ? "pct" : unit;
}

// 点位超出量：越出最轻级边界（= 管控值）的带方向差值（正 = 超上限 / 负 = 低于下限）；
// 未越界返回 null（悬浮提示、抽屉均不展示）
export function exceedDeltaOfValue(v: number, rule: AlertRule): number | null {
  const lightest = rule.levels[rule.levels.length - 1];
  if (rule.op === "between") {
    const { low, high } = lightest;
    if (high !== undefined && v > high) return v - high;
    if (low !== undefined && v < low) return v - low;
    return null;
  }
  const t = lightest.threshold;
  if (t === undefined) return null;
  if (rule.op === ">=" && v > t) return v - t;
  if (rule.op === "<=" && v < t) return v - t;
  return null;
}

// 窗口最不利预测极值：沿规则方向取窗口内（不含基准）最不利点——上限型取最大值、
// 下限型取最小值、双侧型取越出边界的极值（未越界取任一极值，方向记「上限」）；
// over = 相对管控值边界的超出量（未越界 → undefined，展示「—」）
export interface ForecastPeak {
  value: number;
  side: "上限" | "下限";
  over: number | undefined;
}

export function peakOfForecast(f: StabilityForecast): ForecastPeak | null {
  const metric = metricOf(f.code)!;
  const rule = metric.rule;
  if (!rule || f.insufficient || f.failed) return null;
  const vals = f.future.slice(1).map((p) => p.value);
  if (vals.length === 0) return null;
  const lightest = rule.levels[rule.levels.length - 1];
  if (rule.op === "between" && lightest.low !== undefined && lightest.high !== undefined) {
    const maxV = Math.max(...vals);
    const minV = Math.min(...vals);
    if (maxV > lightest.high) return { value: maxV, side: "上限", over: maxV - lightest.high };
    if (minV < lightest.low) return { value: minV, side: "下限", over: lightest.low - minV };
    return { value: maxV, side: "上限", over: undefined };
  }
  const t = lightest.threshold;
  if (t === undefined) return null;
  if (rule.op === ">=") {
    const maxV = Math.max(...vals);
    return { value: maxV, side: "上限", over: maxV > t ? maxV - t : undefined };
  }
  const minV = Math.min(...vals);
  return { value: minV, side: "下限", over: minV < t ? t - minV : undefined };
}

// ============ 查询接口 ============

// 机台标签等级：AlertLevel = 预测最高等级；"normal" = 预测正常；"none" = 无有效预测（未配置 / 数据不足 / 预测失败）
export type MachineTagLevel = AlertLevel | "normal" | "none";
export interface MachineTag {
  text: string;
  level: MachineTagLevel;
}

// 机台标签：「预测：告警」/「预测：正常」/「暂无法预测」（= 窗口内预测最高等级）
export function machineTagOf(f: StabilityForecast): MachineTag {
  const metric = metricOf(f.code)!;
  if (f.insufficient || f.failed || !metric.rule) return { text: "暂无法预测", level: "none" };
  const max = maxFutureLevelOf(f);
  return max === null ? { text: "预测：正常", level: "normal" } : { text: `预测：${max}`, level: max };
}

// 机台下拉排序权重：当前已达告警级 → 窗口内将达告警（按首次升级步数升序）→ 其余（按严重度降序）→ 未配置 → 数据不足/失败殿后
function rankOf(f: StabilityForecast): { primary: number; step: number; sev: number } {
  const metric = metricOf(f.code)!;
  if (f.insufficient || f.failed) return { primary: 4, step: 0, sev: 0 };
  if (!metric.rule) return { primary: 3, step: 0, sev: 0 };
  const cur = currentLevelOf(f);
  const change = levelChangeOf(f);
  if (severityOf(cur) >= LEVEL_PRIORITY["告警"]) return { primary: 0, step: 0, sev: severityOf(cur) };
  if (change.kind === "upgrade" && change.toLevel !== undefined && severityOf(change.toLevel) >= LEVEL_PRIORITY["告警"]) {
    return { primary: 1, step: change.step ?? 0, sev: severityOf(change.toLevel) };
  }
  return { primary: 2, step: 0, sev: severityOf(maxFutureLevelOf(f)) };
}

export function metricMachinesOf(code: string): { machine: string; tag: MachineTag }[] {
  return FORECASTS.filter((f) => f.code === code)
    .map((f) => ({ machine: f.machine, tag: machineTagOf(f), rank: rankOf(f) }))
    .sort((a, b) => {
      if (a.rank.primary !== b.rank.primary) return a.rank.primary - b.rank.primary;
      if (a.rank.step !== b.rank.step) return a.rank.step - b.rank.step;
      if (a.rank.sev !== b.rank.sev) return b.rank.sev - a.rank.sev;
      return a.machine.localeCompare(b.machine);
    })
    .map(({ machine, tag }) => ({ machine, tag }));
}

// 默认机台：按下拉排序取首位
export function topMachineOf(code: string): string {
  return metricMachinesOf(code)[0]?.machine ?? "";
}

export function stabilityForecastOf(code: string, machine: string): StabilityForecast | undefined {
  return FORECASTS.find((f) => f.code === code && f.machine === machine);
}

// 全部机台综合预测：有效机台（剔除数据不足 / 预测失败）逐点均值合成单条曲线；
// 时间维度字段（批号 / 班次）保留、机台差异字段（班组 / 牌号）剔除；
// 参数值与置信度取有效均值，更新时间取最新；无有效机台返回 undefined（视图走占位分支）
export function combinedForecastOf(code: string): StabilityForecast | undefined {
  const metric = metricOf(code);
  if (!metric) return undefined;
  const valid = FORECASTS.filter((f) => f.code === code && !f.insufficient && !f.failed);
  if (valid.length === 0) return undefined;
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const hist = valid[0].hist.map((p, j) => ({
    label: p.label,
    value: roundTo(avg(valid.map((f) => f.hist[j].value)), metric.decimals),
    batch: p.batch,
    shift: p.shift,
  }));
  const future = valid[0].future.map((p, i) => ({
    label: p.label,
    value: roundTo(avg(valid.map((f) => f.future[i].value)), metric.decimals),
    batch: p.batch,
    shift: p.shift,
  }));
  const confs = valid.map((f) => f.confidence).filter((c): c is number => c !== null);
  const params = metric.params.map((def, i) => {
    const vals = valid.map((f) => f.params[i].value).filter((v): v is number => v !== null);
    return {
      key: def.key,
      value: vals.length === 0 ? null : Math.round(avg(vals) * 10) / 10,
      phi: Math.round(avg(valid.map((f) => f.params[i].phi)) * 100) / 100,
    };
  });
  return {
    code,
    machine: "全部机台",
    base: hist[hist.length - 1].value,
    confidence: confs.length === 0 ? null : Math.round(avg(confs) * 100) / 100,
    updatedAt: valid.reduce((m, f) => (f.updatedAt > m ? f.updatedAt : m), valid[0].updatedAt),
    hist,
    future,
    params,
  };
}

// 无实测记录的组合用确定性模拟兜底（牌号 / 班次；批号与图表基准批次对齐，见 contextOf）
function fallbackContext(code: string, machine: string): { brand: string; shift: string } {
  const h = hashOf(`${code}|${machine}`);
  return {
    brand: BRAND_OPTIONS[h % BRAND_OPTIONS.length],
    shift: SHIFT_OPTIONS[h % SHIFT_OPTIONS.length],
  };
}

// 生产上下文：当前批次 = 图表基准批次（历史末点 = 预测首点，批周期如 2351，与横轴一致）；
// 牌号 / 班次确定性模拟带出；工序 = 指标关联工序
export function contextOf(code: string, machine: string): { batch: string; brand: string; shift: string; process: string } {
  const metric = metricOf(code);
  const fb = fallbackContext(code, machine);
  const labels = labelsOf(metric?.cycle ?? "批");
  return {
    batch: labels.hist[labels.hist.length - 1],
    brand: fb.brand,
    shift: fb.shift,
    process: metric?.process ?? "—",
  };
}

// ============ 参数展示派生 ============

// 数值相对参考范围 / 基准值的方向：超上限或超容差 ↑ / 低于下限或低于容差 ↓ / 范围内容 → / 无基准或缺失不判断
export function paramDirection(p: ForecastParamValue): {
  dir: "up" | "down" | "in" | "none";
  deviation: string; // 偏差展示：+4 / -0.2 / 0 / +320 / —
  rangeText: string; // 参考范围或基准展示
} {
  const spec = PARAM_SPECS[p.key];
  if (p.value === null || !spec) return { dir: "none", deviation: "—", rangeText: "—" };
  if (spec.kind === "range") {
    const text = `${spec.low} ~ ${spec.high}`;
    if (p.value > spec.high) {
      const d = Math.round((p.value - spec.high) * 100) / 100;
      return { dir: "up", deviation: `+${d}`, rangeText: text };
    }
    if (p.value < spec.low) {
      const d = Math.round((p.value - spec.low) * 100) / 100;
      return { dir: "down", deviation: `${d}`, rangeText: text };
    }
    return { dir: "in", deviation: "0", rangeText: text };
  }
  // 基准值型：偏差 = 实际值 − 基准值；有容差按容差判向，无容差不判向
  const dev = Math.round((p.value - spec.base) * 100) / 100;
  const text = `基准 ${spec.base}`;
  if (spec.tol === undefined) return { dir: "none", deviation: dev === 0 ? "0" : `${dev > 0 ? "+" : ""}${dev}`, rangeText: text };
  if (dev > spec.tol) return { dir: "up", deviation: `+${dev}`, rangeText: text };
  if (dev < -spec.tol) return { dir: "down", deviation: `${dev}`, rangeText: text };
  return { dir: "in", deviation: `${dev > 0 ? "+" : ""}${dev}`, rangeText: text };
}

// ============ 风险来源 ============

// 风险来源：仅增险因素（φ>0）按贡献降序 + 增险贡献占比 + 来源分类；降险因素不展示
export function contributionsOf(f: StabilityForecast): { key: string; name: string; phi: number; unit: string; pct: number; sourceLabel: string }[] {
  const metric = metricOf(f.code)!;
  const pos = f.params.filter((p) => p.phi > 0);
  const sum = pos.reduce((s, p) => s + p.phi, 0) || 1;
  return pos
    .map((p) => {
      const def = metric.params.find((d) => d.key === p.key)!;
      return {
        key: p.key,
        name: def.name,
        phi: p.phi,
        unit: metric.unit,
        pct: Math.round((p.phi / sum) * 100),
        sourceLabel: def.source === "env" ? "车间环境" : metric.process,
      };
    })
    .sort((a, b) => b.phi - a.phi);
}

// 来源工序分布：按来源分类汇总增险贡献占比（关联工序 + 车间环境）
export function sourceBreakdownOf(f: StabilityForecast): { name: string; pct: number; value: number }[] {
  const contributions = contributionsOf(f);
  const map = new Map<string, number>();
  for (const c of contributions) map.set(c.sourceLabel, (map.get(c.sourceLabel) ?? 0) + c.phi);
  const total = contributions.reduce((s, c) => s + c.phi, 0) || 1;
  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      pct: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);
}

// ============ AI 风险解读（单段中文 ≤200 字符；模板 + 数据引用，不编造数值）============

// 各参数对应的重点核查动作
const ADVICE: Record<string, string> = {
  wallTemp: "筒壁温度控温精度与筒壁结垢状态",
  airTemp: "热风温度设定与换热器工况",
  exhaust: "排潮风门开度与执行机构状态",
  steamPress: "蒸汽压力稳定性与减压阀工况",
  flavorMoist: "加香入口烟丝水分及前工序出口水分",
  cutFlow: "烟丝流量计量与喂料稳定性",
  flavorFlow: "香料流量计量与喷嘴状态",
  envTemp: "车间温度测点与空调工况",
  envHum: "车间湿度测点与除湿设备运行",
  rollSpeed: "卷接速度与机台转速稳定性",
  fillValue: "烟丝填充值及掺配均匀性",
};

// AI 解读段落：主题 + 正文（视图按「主题：正文」渲染）；数据不足、预测失败由视图层拦截，不进入本函数
export interface StabilityAiSection {
  topic: "风险概况" | "参数关注" | "核查重点";
  text: string;
}

export function aiInterpretation(f: StabilityForecast, code: string, machine: string): StabilityAiSection[] {
  const metric = metricOf(code)!;
  const confText = f.confidence !== null ? `，模型置信度${Math.round(f.confidence * 100)}%` : "";
  const change = levelChangeOf(f);

  // 段1 预测概况：区分当前实测等级与预测最高等级（升级/降级表述「{批号}批次已触发X」）
  let overview: string;
  if (change.kind === "unconfigured") {
    overview = `${machine}${metric.name}未配置等级规则，暂无等级判断（最新实测${f.base}${metric.unit}${confText}）。`;
  } else {
    const status = statusOf(f);
    const curText = status === "—" ? "暂无法判定" : status;
    // 升级/持续/降级直接引用等级变化预测短句（如 2355批次已触发告警 / 预计持续告警 / 预计逐步降级）
    const changeText =
      change.kind === "upgrade" || change.kind === "hold" || change.kind === "degrade"
        ? change.text
        : "预测窗口内保持正常";
    overview = `${machine}${metric.name}最新实测${f.base}${metric.unit}（当前实测等级${curText}，${changeText}${confText}）。`;
  }

  // 段2 参数关注：已明确风险方向的增险贡献前 1-2 项及其相对基准的偏差
  const contributions = contributionsOf(f);
  const paramText = contributions
    .slice(0, 2)
    .map((c) => {
      const p = f.params.find((x) => x.key === c.key)!;
      const def = metric.params.find((d) => d.key === c.key)!;
      const { dir, deviation } = paramDirection(p);
      const devText =
        dir === "up" ? `偏离${deviation}` : dir === "down" ? `偏离${deviation}` : dir === "in" ? "处于参考范围内" : "偏差依据不足";
      return `${c.name}（${p.value}${def.unit}，${devText}）`;
    })
    .join("、");

  // 段3 核查重点
  const top = contributions[0];

  return [
    { topic: "风险概况", text: overview },
    { topic: "参数关注", text: paramText ? `${paramText}。` : "暂无显著增险参数。" },
    { topic: "核查重点", text: top ? `${ADVICE[top.key]}，具体原因需现场核查。` : "相关测点及基准设置，建议现场复核。" },
  ];
}
