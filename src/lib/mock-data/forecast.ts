// 情景预测 — 模拟数据与预测引擎（确定性生成：固定锚点 + sin 扰动，无 Date.now / Math.random）
// 四种预测类型：未来值预测 / 目标达成预测 / 工况情景测算 / 达标条件反推
import { metricList } from "./metric-management";
import { activeTargetOf } from "./metric-targets";
import type { MetricTargetVersion } from "@/types";

// ===== 时间锚点（与能源总览 / 网格监控对齐）=====
export const DATA_END = "2026-08-09"; // 最新完整统计日
export const HISTORY_RANGE = "2024-01-01 至 2026-08-09"; // 历史数据范围（系统自动确定）

// ===== 预测类型 =====
export type ForecastType = "未来值预测" | "目标达成预测" | "工况情景测算" | "达标条件反推";
export const FORECAST_TYPES: { type: ForecastType; desc: string; icon: string }[] = [
  { type: "未来值预测", desc: "根据最新实际数据与生产计划、天气等信息，预测指标未来数值", icon: "📈" },
  { type: "目标达成预测", desc: "结合累计实际值与剩余生产计划，判断考核周期能否达成目标", icon: "🎯" },
  { type: "工况情景测算", desc: "输入假设的生产、环境和运行工况，测算指定条件下的指标值", icon: "🧪" },
  { type: "达标条件反推", desc: "在目标值与剩余计划已知时，反向计算达标所需的能耗控制值", icon: "🔁" },
];

// ===== 工况条件字典（平台统一维护）=====
export interface ConditionDef {
  code: string;
  name: string; // 前端展示名称
  unit: string;
  type: "number" | "enum";
  source: string; // 默认数据来源
  fetchMode: string; // 默认取值方式
  min?: number; // 合理范围（输入校验）
  max?: number;
  step?: number;
  options?: string[]; // 枚举选项
}

export const CONDITION_DICT: Record<string, ConditionDef> = {
  outdoor_temperature: { code: "outdoor_temperature", name: "室外温度", unit: "℃", type: "number", source: "天气数据", fetchMode: "根据测算日期自动带入天气数据，允许调整", min: -20, max: 45, step: 0.5 },
  outdoor_humidity: { code: "outdoor_humidity", name: "室外湿度", unit: "%", type: "number", source: "天气数据", fetchMode: "根据测算日期自动带入天气数据，允许调整", min: 0, max: 100, step: 1 },
  indoor_setpoint: { code: "indoor_setpoint", name: "室内温湿度设定值", unit: "℃", type: "number", source: "最近有效运行数据", fetchMode: "自动带入最近有效运行数据，允许调整", min: 18, max: 30, step: 0.5 },
  planned_output: { code: "planned_output", name: "计划产量", unit: "箱", type: "number", source: "生产计划数据", fetchMode: "根据测算时段自动汇总计划产量，允许调整", min: 1, max: 20000, step: 100 },
  silk_output: { code: "silk_output", name: "制丝产量", unit: "kg", type: "number", source: "生产计划数据", fetchMode: "根据测算时段自动汇总，允许调整", min: 1, max: 500000, step: 1000 },
  production_plan: { code: "production_plan", name: "生产计划", unit: "箱", type: "number", source: "生产计划数据", fetchMode: "根据测算时段自动汇总，允许调整", min: 0, max: 20000, step: 100 },
  production_duration: { code: "production_duration", name: "生产时长", unit: "小时", type: "number", source: "生产计划数据", fetchMode: "根据班次及生产计划自动计算，允许调整", min: 0, max: 24, step: 0.5 },
  equipment_runtime: { code: "equipment_runtime", name: "设备运行时长", unit: "小时", type: "number", source: "设备运行计划数据", fetchMode: "优先根据设备运行计划自动获取，获取失败时手动填写", min: 0, max: 24, step: 0.5 },
  equipment_load: { code: "equipment_load", name: "设备负荷", unit: "%", type: "number", source: "设备运行计划数据", fetchMode: "自动带入设备运行计划，允许调整", min: 0, max: 100, step: 5 },
  shift_type: { code: "shift_type", name: "班次", unit: "", type: "enum", options: ["两班", "三班"], source: "生产计划数据", fetchMode: "自动带入，允许调整" },
  grade_condition: { code: "grade_condition", name: "工艺或牌号条件", unit: "", type: "enum", options: ["常规牌号", "细支牌号", "异型牌号"], source: "生产计划数据", fetchMode: "自动带入，允许调整" },
  meal_headcount: { code: "meal_headcount", name: "就餐人数", unit: "人", type: "number", source: "生产计划数据", fetchMode: "根据在岗人数自动估算，允许调整", min: 0, max: 3000, step: 50 },
  workday_type: { code: "workday_type", name: "工作日类型", unit: "", type: "enum", options: ["工作日", "周末", "节假日"], source: "生产计划数据", fetchMode: "根据测算日期自动判断，允许调整" },
  storage_setpoint: { code: "storage_setpoint", name: "库内控制目标", unit: "℃", type: "number", source: "最近有效运行数据", fetchMode: "自动带入最近有效运行数据，允许调整", min: 15, max: 28, step: 0.5 },
  operation_duration: { code: "operation_duration", name: "作业时长", unit: "小时", type: "number", source: "生产计划数据", fetchMode: "根据出入库计划自动计算，允许调整", min: 0, max: 24, step: 0.5 },
  steam_demand: { code: "steam_demand", name: "蒸汽需求量", unit: "t", type: "number", source: "生产计划数据", fetchMode: "根据生产计划折算，允许调整", min: 0, max: 500, step: 5 },
  boiler_load: { code: "boiler_load", name: "锅炉负荷", unit: "%", type: "number", source: "设备运行计划数据", fetchMode: "自动带入设备运行计划，允许调整", min: 0, max: 100, step: 5 },
};

// ===== 小模型能力声明（注册时提供，前端切换后读取）=====
export interface ForecastModel {
  id: string;
  name: string;
  types: ForecastType[]; // 支持的预测类型
  ranges: string[]; // 支持的预测时间范围
  requiredInputs: string[]; // 必填参数（条件编码）
  outputs: string[]; // 输出能力
  accuracy: string; // 历史预测误差
}

const MODEL_TS: ForecastModel = {
  id: "ts-v21", name: "能耗时序预测模型 v2.1",
  types: ["未来值预测"], ranges: ["明日", "未来7日", "未来15日"],
  requiredInputs: [], outputs: ["预测值", "预测区间"], accuracy: "±3.2%",
};
const MODEL_LSTM: ForecastModel = {
  id: "lstm-mv", name: "LSTM 多变量能耗模型",
  types: ["未来值预测", "工况情景测算"], ranges: ["明日", "未来7日", "未来15日"],
  requiredInputs: ["outdoor_temperature", "production_duration"],
  outputs: ["预测值", "预测区间", "基准值", "变化"], accuracy: "±2.8%",
};
const MODEL_TARGET: ForecastModel = {
  id: "target-ga", name: "目标达成分析模型",
  types: ["未来值预测", "目标达成预测", "达标条件反推"], ranges: ["明日", "未来7日", "未来15日"],
  requiredInputs: ["target_value", "remaining_plan"],
  outputs: ["预测值", "预测区间", "目标差距", "控制值"], accuracy: "±2.1%",
};

// ===== 预测指标（能力配置：类型 / 对象 / 范围 / 目标 / 工况条件）=====
export interface MetricCondition {
  code: string;
  required?: boolean; // 必填（由预测模型配置决定）
  label?: string; // 覆盖字典展示名（如「空调运行时长」）
  default: number | string; // 自动带入的默认值
  sensitivity?: number; // 数值条件敏感度（每 +1 单位对结果的影响比例）
  sensitivityMap?: Record<string, number>; // 枚举条件的离散影响
}

export interface ForecastMetric {
  key: string;
  name: string;
  unit: string;
  decimals: number;
  agg: "point" | "sum" | "avg"; // 多日预测口径：单值 / 累计 / 均值
  base: number; // 历史均值基准
  seed: number;
  objects: string[]; // 可预测对象（长度 1 = 固定对象自动带入）
  types: ForecastType[];
  ranges: string[]; // 未来值可选范围
  target?: { value: number; direction: "不高于" | "不低于" }; // 兜底目标（旧配置）
  metricId?: string; // 关联指标管理 id（目标值以目标值管理的有效版本为准）
  targetCtx?: { currentAcc: string; doneOutput: string; remainingPlan: number; currentLevel: number }; // 目标达成 / 反推上下文
  conditions: MetricCondition[]; // 工况条件映射
  influencers: [string, string]; // 主要影响因素（结论文案）
  models: ForecastModel[];
}

export const FORECAST_METRICS: ForecastMetric[] = [
  {
    key: "steamHvac", name: "空调系统每日蒸汽耗", unit: "t", decimals: 1, agg: "sum",
    base: 27.5, seed: 29, objects: ["空调系统"], types: ["未来值预测", "工况情景测算"],
    ranges: ["明日", "未来7日", "未来15日"],
    conditions: [
      { code: "outdoor_temperature", required: true, default: 25, sensitivity: 0.055 },
      { code: "outdoor_humidity", default: 61, sensitivity: 0.002 },
      { code: "indoor_setpoint", default: 24, sensitivity: 0.03 },
      { code: "production_duration", required: true, default: 16, sensitivity: 0.02 },
      { code: "equipment_runtime", label: "空调运行时长", default: 20, sensitivity: 0.018 },
    ],
    influencers: ["室外温度每升高 1℃，空调制冷除湿负荷上升，蒸汽耗约增加 5.5%", "空调运行时长与生产班次强相关，投运区间越长能耗越高"],
    models: [MODEL_TS, MODEL_LSTM],
  },
  {
    key: "packPower", name: "卷包车间单箱电耗", unit: "kWh/箱", decimals: 1, agg: "avg",
    base: 20.4, seed: 17, objects: ["卷包车间"], types: ["未来值预测", "工况情景测算"],
    ranges: ["明日", "未来7日", "未来15日"],
    conditions: [
      { code: "planned_output", required: true, default: 3200, sensitivity: -0.00003 },
      { code: "shift_type", default: "三班", sensitivityMap: { 两班: 0.04, 三班: 0 } },
      { code: "equipment_runtime", default: 22, sensitivity: 0.015 },
      { code: "equipment_load", default: 78, sensitivity: 0.004 },
    ],
    influencers: ["产量越高，固定待机能耗被摊薄，单箱电耗下降", "换牌号频次与机台启停次数增加会抬升单箱电耗"],
    models: [MODEL_TS, MODEL_LSTM],
  },
  {
    key: "silkPower", name: "制丝车间每公斤电耗", unit: "kWh/kg", decimals: 2, agg: "avg",
    base: 0.46, seed: 13, objects: ["制丝车间"], types: ["未来值预测", "工况情景测算"],
    ranges: ["明日", "未来7日", "未来15日"],
    conditions: [
      { code: "silk_output", required: true, default: 420000, sensitivity: -0.0000002 },
      { code: "production_duration", required: true, default: 18, sensitivity: 0.012 },
      { code: "grade_condition", default: "常规牌号", sensitivityMap: { 常规牌号: 0, 细支牌号: 0.03, 异型牌号: 0.06 } },
    ],
    influencers: ["制丝批次越饱和，筒壁预热等固定能耗摊薄越充分", "细支 / 异型牌号工艺路径更长，单位电耗偏高"],
    models: [MODEL_TS, MODEL_LSTM],
  },
  {
    key: "powerDept", name: "动力车间电耗", unit: "kWh", decimals: 0, agg: "sum",
    base: 38600, seed: 31, objects: ["动力车间"], types: ["未来值预测", "工况情景测算"],
    ranges: ["明日", "未来7日", "未来15日"],
    conditions: [
      { code: "production_plan", default: 4200, sensitivity: 0.00004 },
      { code: "equipment_runtime", required: true, default: 24, sensitivity: 0.015 },
      { code: "equipment_load", default: 72, sensitivity: 0.005 },
    ],
    influencers: ["空压 / 制冷负荷随生产计划线性变化，是电耗波动主因", "设备负荷率低于经济区间时，单位供能电耗上升"],
    models: [MODEL_TS, MODEL_LSTM],
  },
  {
    key: "canteenPower", name: "食堂总电耗", unit: "kWh", decimals: 0, agg: "sum",
    base: 3200, seed: 52, objects: ["食堂"], types: ["未来值预测", "工况情景测算"],
    ranges: ["明日", "未来7日", "未来15日"],
    conditions: [
      { code: "meal_headcount", required: true, default: 1200, sensitivity: 0.0005 },
      { code: "workday_type", default: "工作日", sensitivityMap: { 工作日: 0, 周末: -0.35, 节假日: -0.5 } },
      { code: "equipment_runtime", default: 10, sensitivity: 0.03 },
    ],
    influencers: ["就餐人数决定蒸饭 / 消毒等设备投运台数与时长", "周末与节假日仅保留保温与值班负荷，电耗显著下降"],
    models: [MODEL_TS, MODEL_LSTM],
  },
  {
    key: "warehousePower", name: "原辅料仓库总电耗", unit: "kWh", decimals: 0, agg: "sum",
    base: 2100, seed: 41, objects: ["原辅料仓库"], types: ["未来值预测", "工况情景测算"],
    ranges: ["明日", "未来7日", "未来15日"],
    conditions: [
      { code: "outdoor_temperature", default: 25, sensitivity: 0.012 },
      { code: "outdoor_humidity", default: 61, sensitivity: 0.003 },
      { code: "storage_setpoint", default: 22, sensitivity: 0.025 },
      { code: "operation_duration", default: 8, sensitivity: 0.02 },
    ],
    influencers: ["高温高湿天气下除湿机投运时间延长，电耗上升", "出入库作业时长决定堆垛机 / 输送线投运负荷"],
    models: [MODEL_TS, MODEL_LSTM],
  },
  {
    key: "gasBoiler", name: "锅炉天然气总能耗", unit: "Nm³", decimals: 0, agg: "sum",
    base: 2650, seed: 37, objects: ["锅炉房"], types: ["未来值预测", "工况情景测算"],
    ranges: ["明日", "未来7日", "未来15日"],
    conditions: [
      { code: "steam_demand", required: true, default: 120, sensitivity: 0.009 },
      { code: "boiler_load", default: 76, sensitivity: -0.002 },
      { code: "equipment_runtime", default: 24, sensitivity: 0.01 },
    ],
    influencers: ["蒸汽需求量与燃气耗量近似线性，是首要驱动因素", "锅炉负荷率偏离经济区间时，产汽单耗上升"],
    models: [MODEL_TS, MODEL_LSTM],
  },
  {
    key: "comprehensive", name: "单箱综合能耗", unit: "kgce/箱", decimals: 1, agg: "avg",
    base: 29.8, seed: 3, objects: ["全厂"], types: ["未来值预测", "目标达成预测", "达标条件反推"],
    ranges: ["明日", "未来7日", "未来15日"],
    target: { value: 31.0, direction: "不高于" },
    metricId: "m7", // 目标值以目标值管理有效版本为准（单箱综合能耗）
    targetCtx: { currentAcc: "30.9 kgce/箱（截至 2026-08-09）", doneOutput: "386,000 箱", remainingPlan: 214000, currentLevel: 30.9 },
    conditions: [
      { code: "planned_output", required: true, default: 4200, sensitivity: -0.00003 },
      { code: "production_duration", default: 20, sensitivity: 0.01 },
    ],
    influencers: ["卷包排产与机台投运结构决定固定能耗摊薄水平", "制冷 / 空压等辅助系统能效随环境温度波动"],
    models: [MODEL_TS, MODEL_TARGET],
  },
  {
    key: "carbon", name: "单位产值碳排放量", unit: "tCO₂e/万元", decimals: 4, agg: "avg",
    base: 0.0338, seed: 11, objects: ["全厂"], types: ["未来值预测", "目标达成预测", "达标条件反推"],
    ranges: ["明日", "未来7日", "未来15日"],
    target: { value: 0.035, direction: "不高于" },
    metricId: "m1", // 目标值以目标值管理有效版本为准（单位产值碳排放量）
    targetCtx: { currentAcc: "0.0342 tCO₂e/万元（截至 2026-08-09）", doneOutput: "386,000 箱（对应产值 38,200 万元）", remainingPlan: 214000, currentLevel: 0.0342 },
    conditions: [
      { code: "planned_output", required: true, default: 4200, sensitivity: -0.00003 },
      { code: "production_duration", default: 20, sensitivity: 0.008 },
    ],
    influencers: ["外购电力占比与电网碳排放因子是间接排放主因", "产值规模影响单位产值排放摊薄水平"],
    models: [MODEL_TS, MODEL_TARGET],
  },
];

// 指标详情里配置的「达标反推内容」（与指标管理同源）
export function reverseItemsOf(metricName: string): string[] {
  return metricList.find((m) => m.nameCn === metricName)?.reverseItems ?? [];
}

// ===== 有效目标值（来自目标值管理，仅支持已配置目标值的指标） =====
// 目标达成预测 / 达标条件反推 以目标值管理的「生效中」版本为准；
// 无 metricId（未在指标管理中配置目标值）的指标不支持目标达成预测。
export function effectiveTargetOf(m: ForecastMetric): MetricTargetVersion | null {
  const active = m.metricId ? activeTargetOf(m.metricId) : undefined;
  if (active) return active;
  // 兜底：旧配置（无 metricId 但有 target）转换为单值目标
  if (m.target) {
    return {
      id: `legacy-${m.key}`,
      version: "V1",
      metricId: m.metricId ?? "",
      metricName: m.name,
      period: "年度",
      direction: m.target.direction === "不高于" ? "≤" : "≥",
      value: m.target.value,
      unit: m.unit,
      effectiveStart: "2026-01-01",
      effectiveEnd: "2026-12-31",
      enabled: true,
      status: "生效中",
      effectiveTime: "2026-01-01",
      createdAt: "",
      createdBy: "",
    };
  }
  return null;
}

// 判断方向展示（"不高于/不低于" → 符号；"=" → "=目标值"）
export function formatTargetDir(direction: string): string {
  if (direction === "不高于") return "≤";
  if (direction === "不低于") return "≥";
  if (direction === "=") return "=目标值";
  return direction;
}

// ===== 预测输入 / 输出 =====
export interface ForecastInput {
  type: ForecastType;
  metricKey: string;
  object: string;
  modelId: string;
  range?: string; // 未来值：明日 / 未来7日 / 未来15日
  period?: string; // 目标达成 / 反推：本月 / 本季度 / 本年度
  targetValue?: number; // 临时测算目标值（单值方向）
  targetLower?: number; // 临时测算目标区间下限（区间方向）
  targetUpper?: number; // 临时测算目标区间上限（区间方向）
  calcMode?: "tomorrow" | "date" | "period"; // 工况情景测算时段
  calcDate?: string;
  conditions?: Record<string, number | string>; // 工况输入
  compareBaseline?: boolean;
  reverseItem?: string; // 反推内容
  remainingPlan?: number; // 剩余生产计划（反推可调）
}

export interface MetricField {
  label: string;
  value: string;
  tone?: "good" | "warn" | "danger" | "muted"; // 绿 / 橙 / 红 / 灰
}

export interface ChartPoint {
  date: string;
  actual?: number; // 历史实际（蓝实线）
  predict?: number; // 预测值（蓝虚线）
  upper?: number; // 预测区间上界
  lower?: number; // 下界
  target?: number; // 目标值（橙线）
  baseline?: number; // 基准工况
  scenario?: number; // 测算工况
}

export interface ForecastBar {
  name: string;
  value: number;
  tone?: "actual" | "target" | "muted";
}

export interface ConclusionSection {
  icon: string;
  title: string;
  lines: string[];
}

export interface ForecastResult {
  headline: string; // 一句话核心结论
  fields: MetricField[]; // 核心结果字段
  chart:
    | { kind: "trend" | "target" | "scenario-line"; points: ChartPoint[] }
    | { kind: "scenario-bar" | "reverse"; bars: ForecastBar[]; unit: string };
  conclusions: ConclusionSection[]; // 三段式
  meta: { model: string; historyRange: string; dataEnd: string };
}

// ===== 工具 =====
const round = (v: number, d: number) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
const fmt = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const daysOf = (range: string) => (range === "明日" ? 1 : range === "未来7日" ? 7 : 15);

// 未来日期标签（自数据截止日次日起，格式 "8/10"）
function futureLabel(i: number): string {
  const d = new Date(2026, 7, 10 + i - 1);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ===== 预测执行（async，模拟模型调用延迟）=====
export async function runForecast(input: ForecastInput): Promise<ForecastResult> {
  await new Promise((r) => setTimeout(r, 1000));
  const m = FORECAST_METRICS.find((x) => x.key === input.metricKey);
  if (!m) throw new Error("未知预测指标");
  const model = m.models.find((x) => x.id === input.modelId) ?? m.models[0];
  const meta = { model: model.name, historyRange: HISTORY_RANGE, dataEnd: DATA_END };

  if (input.type === "未来值预测") return futureForecast(m, input, meta);
  if (input.type === "目标达成预测") return targetForecast(m, input, meta);
  if (input.type === "工况情景测算") return scenarioForecast(m, input, meta);
  return reverseForecast(m, input, meta);
}

// ----- 1. 未来值预测 -----
function futureForecast(m: ForecastMetric, input: ForecastInput, meta: ForecastResult["meta"]): ForecastResult {
  const model = m.models.find((x) => x.id === input.modelId) ?? m.models[0];
  const days = daysOf(input.range ?? "未来7日");
  const d = m.decimals;
  // 历史序列（近 30 天）
  const points: ChartPoint[] = [];
  for (let i = 29; i >= 1; i--) {
    const dt = new Date(2026, 7, 9 - i + 1);
    points.push({ date: `${dt.getMonth() + 1}/${dt.getDate()}`, actual: round(m.base * (1 + Math.sin(m.seed + i * 0.7) * 0.05), d) });
  }
  // 预测序列（含区间）
  const predicts: number[] = [];
  for (let j = 1; j <= days; j++) {
    const p = round(m.base * (1 + Math.sin(m.seed * 1.3 + j * 0.5) * 0.02 + j * 0.0012), d);
    predicts.push(p);
    points.push({
      date: futureLabel(j),
      predict: p,
      upper: round(p * 1.03, d),
      lower: round(p * 0.97, d),
    });
  }
  // 口径：明日 = 单值；多日按 agg 取累计 / 均值
  const isSingle = days === 1;
  const value = isSingle ? predicts[0] : m.agg === "sum" ? predicts.reduce((s, v) => s + v, 0) : predicts.reduce((s, v) => s + v, 0) / days;
  const lo = (isSingle ? predicts[0] : predicts.reduce((s, v) => s + v * (m.agg === "sum" ? 1 : 1 / days), 0)) * 0.97;
  const hi = (isSingle ? predicts[0] : predicts.reduce((s, v) => s + v * (m.agg === "sum" ? 1 : 1 / days), 0)) * 1.03;
  const histAvg = isSingle ? m.base : m.base * (m.agg === "sum" ? days : 1);
  const diffPct = ((value - histAvg) / histAvg) * 100;
  const valueLabel = isSingle ? "明日值" : m.agg === "sum" ? `${input.range}累计值` : `${input.range}均值`;
  const headline = `${input.range}${m.name}预计${valueLabel === "明日值" ? "为" : valueLabel.includes("累计") ? "累计" : "平均"} ${fmt(value, d)} ${m.unit}，预测区间 ${fmt(lo, d)}～${fmt(hi, d)} ${m.unit}，较历史均值${diffPct >= 0 ? "增加" : "下降"} ${fmt(Math.abs(diffPct), 1)}%`;

  return {
    headline,
    fields: [
      { label: `预测值（${valueLabel}）`, value: `${fmt(value, d)} ${m.unit}`, tone: diffPct > 3 ? "warn" : undefined },
      { label: "预测区间", value: `${fmt(lo, d)} ～ ${fmt(hi, d)} ${m.unit}`, tone: "muted" },
      { label: "较历史均值", value: `${diffPct >= 0 ? "+" : ""}${fmt(diffPct, 1)}%`, tone: Math.abs(diffPct) > 3 ? "warn" : "good" },
      { label: "预测模型", value: meta.model, tone: "muted" },
    ],
    chart: { kind: "trend", points },
    conclusions: buildConclusions(m, model, [
      `预测周期：${input.range}；口径：${valueLabel}。`,
      `关键输入：最新实际数据、剩余周期生产计划、天气预报与当前运行工况（系统自动获取）。`,
    ], [
      `结合排产安排评估预测水平是否可接受；若预测值接近告警阈值，建议提前调整运行策略。`,
      `建议持续跟踪实际值与预测区间的偏离情况，偏离超出区间时复核输入条件是否发生变化。`,
    ]),
    meta,
  };
}

// ----- 2. 目标达成预测 -----
function targetForecast(m: ForecastMetric, input: ForecastInput, meta: ForecastResult["meta"]): ForecastResult {
  const period = input.period ?? "本年度";
  const d = m.decimals;
  const eff = effectiveTargetOf(m)!; // 调用前已保证存在（无目标值指标不支持本类型）
  const isRange = eff.direction === "处于目标区间";
  // 正式目标（有效版本）；临时测算值优先（仅用于本次预测，不修改正式目标配置）
  const formalValue = isRange ? eff.upper! : eff.value!;
  const formalLower = isRange ? eff.lower! : undefined;
  const target = isRange ? input.targetUpper ?? formalValue : input.targetValue ?? formalValue;
  const targetLower = input.targetLower ?? formalLower;
  const isTemp = isRange
    ? input.targetLower !== undefined || input.targetUpper !== undefined
    : input.targetValue !== undefined;
  // 周期末预测系数（确定性）：不同周期给出不同达成态势
  const FACTORS: Record<string, Record<string, number>> = {
    comprehensive: { 本月: 1.02, 本季度: 1.037, 本年度: 1.0604 }, // 29.8 → 30.4 / 30.9 / 31.6
    carbon: { 本月: 0.985, 本季度: 0.99, 本年度: 0.994 }, // 0.0338 → 0.0333 / 0.0335 / 0.0336
  };
  const factor = FACTORS[m.key]?.[period] ?? 1.02;
  const forecastEnd = round(m.base * factor, d);
  const gap = round(forecastEnd - target, d);
  const threshold = target * 0.015;
  const verdict = isRange
    ? forecastEnd > target
      ? "预计超出区间上限"
      : targetLower !== undefined && forecastEnd < targetLower
        ? "预计低于区间下限"
        : "预计达标"
    : gap > threshold
      ? "预计超标"
      : gap >= -threshold
        ? "存在超标风险"
        : "预计达标";
  const verdictTone = verdict === "预计达标" ? "good" : verdict.includes("风险") ? "warn" : "danger";
  const deadline = period === "本月" ? "2026-08-31" : period === "本季度" ? "2026-09-30" : "2026-12-31";
  const dir = formatTargetDir(eff.direction);
  const targetLabel = isRange
    ? `${fmt(targetLower ?? 0, d)}～${fmt(target, d)}`
    : `${dir}${fmt(target, d)}`;
  const gapLabel = isRange
    ? forecastEnd > target
      ? `高于上限 ${fmt(gap, d)}`
      : targetLower !== undefined && forecastEnd < targetLower
        ? `低于下限 ${fmt(targetLower - forecastEnd, d)}`
        : `位于目标区间内（${fmt(forecastEnd - (targetLower ?? 0), d)}）`
    : `${gap >= 0 ? "高出" : "低于"} ${fmt(Math.abs(gap), d)}`;
  const headline = `${period === "本年度" ? "年末" : period === "本季度" ? "季度末" : "月末"}${m.name}预计 ${fmt(forecastEnd, d)} ${m.unit}，目标${targetLabel} ${m.unit}，预计${gapLabel}，${verdict}`;

  // 周期曲线：本月=日度（9 实际 + 22 预测），本季度=月度（2+1），本年度=月度（8+4）
  const points: ChartPoint[] = [];
  const pushPoint = (date: string, value: number, isActual: boolean) => {
    const p: ChartPoint = { date, target: round(target, d) };
    if (isActual) p.actual = value;
    else {
      p.predict = value;
      p.upper = round(value * 1.02, d);
      p.lower = round(value * 0.98, d);
    }
    points.push(p);
  };
  if (period === "本月") {
    for (let i = 1; i <= 31; i++) {
      const v = round(m.base * (1 + Math.sin(m.seed + i) * 0.02 + (i > 9 ? (forecastEnd / m.base - 1) * ((i - 9) / 22) : 0)), d);
      pushPoint(`8/${i}`, v, i <= 9);
    }
  } else {
    const months = period === "本季度" ? [7, 8, 9] : Array.from({ length: 12 }, (_, i) => i + 1);
    const actualCount = period === "本季度" ? 2 : 8;
    months.forEach((mo, idx) => {
      const v = round(m.base * (1 + Math.sin(m.seed + mo) * 0.015 + (idx >= actualCount ? (forecastEnd / m.base - 1) * ((idx - actualCount + 1) / (months.length - actualCount)) : 0)), d);
      pushPoint(`${mo}月`, v, idx < actualCount);
    });
  }

  return {
    headline,
    fields: [
      { label: "周期末预测值", value: `${fmt(forecastEnd, d)} ${m.unit}`, tone: verdictTone },
      { label: `目标值${isTemp ? "（临时测算值）" : ""}`, value: `${targetLabel} ${m.unit}`, tone: "muted" },
      { label: "预计差距", value: `${gap >= 0 ? "+" : ""}${fmt(gap, d)} ${m.unit}`, tone: verdictTone },
      { label: "达成判断", value: verdict, tone: verdictTone },
    ],
    chart: { kind: "target", points },
    conclusions: buildConclusions(m, model2(m, input), [
      `当前累计实际值：${m.targetCtx!.currentAcc}；剩余生产计划：${m.targetCtx!.remainingPlan.toLocaleString()} 箱（系统自动加载）。`,
      `预测截止时间：${deadline}；预测区间：${fmt(forecastEnd * 0.98, d)}～${fmt(forecastEnd * 1.02, d)} ${m.unit}。`,
      isTemp
        ? `本次按临时测算目标 ${targetLabel} ${m.unit} 判断，不修改正式目标配置。`
        : `正式目标（${eff.version}，${eff.status}）：${targetLabel} ${m.unit}。`,
    ], verdict === "预计超标" || verdict === "预计超出区间上限"
      ? [
          `建议立即启动节能管控：优先压降辅助系统空转与待机能耗，复核高耗能工序运行参数。`,
          `如需明确剩余周期的量化控制值，请使用「达标条件反推」测算具体控制要求。`,
        ]
      : verdict === "预计低于区间下限"
        ? [
            `预测值低于目标区间下限，建议核实数据口径与计量准确性后持续跟踪。`,
            `如需明确剩余周期的量化控制值，请使用「达标条件反推」测算。`,
          ]
        : [
          `当前态势可控，建议维持既有运行策略并按周跟踪累计值与预测差距。`,
          `关注季节性负荷变化对趋势的影响，如需量化控制值可配合「达标条件反推」使用。`,
    ]),
    meta,
  };
}

// ----- 3. 工况情景测算 -----
function scenarioForecast(m: ForecastMetric, input: ForecastInput, meta: ForecastResult["meta"]): ForecastResult {
  const d = m.decimals;
  const conds = input.conditions ?? {};
  // 情景系数 = 1 + Σ(输入偏离默认值 × 敏感度)
  let factor = 1;
  const snapshot: string[] = [];
  for (const c of m.conditions) {
    const def = CONDITION_DICT[c.code];
    const label = c.label ?? def.name;
    const val = conds[c.code] !== undefined ? conds[c.code] : c.default;
    snapshot.push(`${label} ${val}${def.unit}`);
    if (def.type === "number" && typeof val === "number" && c.sensitivity) {
      factor += (val - (c.default as number)) * c.sensitivity;
    } else if (def.type === "enum" && typeof val === "string" && c.sensitivityMap) {
      factor += c.sensitivityMap[val] ?? 0;
    }
  }
  factor = clamp(factor, 0.5, 2.5);
  const scenario = round(m.base * factor, d);
  const baseline = round(m.base, d); // 系统当前计划工况的预测结果
  const diff = round(scenario - baseline, d);
  const diffPct = (diff / baseline) * 100;
  const compare = input.compareBaseline === true; // 对比基准开关（默认关闭）
  const headline = compare
    ? `预计${m.name} ${fmt(scenario, d)} ${m.unit}，预测区间 ${fmt(scenario * 0.97, d)}～${fmt(scenario * 1.03, d)} ${m.unit}；较系统当前计划工况的预测结果${diff >= 0 ? "增加" : "减少"} ${fmt(Math.abs(diff), d)} ${m.unit}（${fmt(Math.abs(diffPct), 1)}%）`
    : `预计${m.name} ${fmt(scenario, d)} ${m.unit}，预测区间 ${fmt(scenario * 0.97, d)}～${fmt(scenario * 1.03, d)} ${m.unit}`;

  // 图表：多日（period）→ 双折线；单日 → 对比柱状图
  let chart: ForecastResult["chart"];
  if (input.calcMode === "period") {
    const points: ChartPoint[] = [];
    for (let j = 1; j <= 7; j++) {
      points.push({
        date: futureLabel(j),
        baseline: round(baseline * (1 + Math.sin(m.seed + j) * 0.02), d),
        scenario: round(scenario * (1 + Math.sin(m.seed + j) * 0.02), d),
      });
    }
    chart = { kind: "scenario-line", points };
  } else {
    chart = {
      kind: "scenario-bar",
      bars: [
        { name: "当前计划工况（基准）", value: baseline, tone: "muted" },
        { name: "测算工况", value: scenario, tone: compare ? "actual" : undefined },
      ],
      unit: m.unit,
    };
  }

  return {
    headline,
    fields: [
      { label: "情景预测值", value: `${fmt(scenario, d)} ${m.unit}`, tone: Math.abs(diffPct) > 5 ? "warn" : undefined },
      { label: "预测区间", value: `${fmt(scenario * 0.97, d)} ～ ${fmt(scenario * 1.03, d)} ${m.unit}`, tone: "muted" },
      ...(compare ? [
        { label: "基准值（当前计划工况）", value: `${fmt(baseline, d)} ${m.unit}`, tone: "muted" as const },
        { label: "情景变化", value: `${diff >= 0 ? "+" : ""}${fmt(diff, d)} ${m.unit}（${diff >= 0 ? "+" : ""}${fmt(diffPct, 1)}%）`, tone: diff > 0 ? ("warn" as const) : ("good" as const) },
      ] : []),
    ],
    chart,
    conclusions: buildConclusions(m, model2(m, input), [
      `本次工况条件：${snapshot.join("、")}。`,
      `基准条件：系统当前计划工况（${m.name}基准 ${fmt(baseline, d)} ${m.unit}）。`,
    ], [
      `建议对比其他工况组合（如调整设定值或运行时长），寻找更优的运行方案。`,
      `本测算结果仅用于情景分析，不回写生产计划或业务系统。`,
    ]),
    meta,
  };
}

// ----- 4. 达标条件反推 -----
function reverseForecast(m: ForecastMetric, input: ForecastInput, meta: ForecastResult["meta"]): ForecastResult {
  const d = m.decimals;
  const eff = effectiveTargetOf(m)!; // 调用前已保证存在（无目标值指标不支持本类型）
  const isRange = eff.direction === "处于目标区间";
  const formalValue = isRange ? eff.upper! : eff.value!;
  const target = isRange ? input.targetUpper ?? formalValue : input.targetValue ?? formalValue;
  const dir = formatTargetDir(eff.direction);
  const item = input.reverseItem ?? reverseItemsOf(m.name)[0] ?? "剩余周期平均指标控制值";
  const remainingPlan = input.remainingPlan ?? m.targetCtx!.remainingPlan;
  const isTotal = item.includes("允许"); // 允许总量类 vs 平均控制类
  const ratio = 0.961; // 控制值占目标比例（确定性）
  const controlAvg = round(target * ratio, d); // 剩余周期平均控制值
  const current = m.targetCtx!.currentLevel;
  const delta = round(current - controlAvg, d);
  const controlTotal = Math.round(remainingPlan * controlAvg);

  const headline = isTotal
    ? `按目标${dir}${fmt(target, d)} ${m.unit}测算，剩余周期允许${m.name.replace("单箱", "").replace("单位产值", "")}总量 ${controlTotal.toLocaleString()}（按剩余计划 ${remainingPlan.toLocaleString()} 箱）`
    : `剩余周期平均${m.name}需控制在 ${fmt(controlAvg, d)} ${m.unit} 以内，需较当前值 ${fmt(current, d)} ${delta >= 0 ? "降低" : "提高"} ${fmt(Math.abs(delta), d)} ${m.unit}`;

  const currentTotal = Math.round(remainingPlan * current);
  return {
    headline,
    fields: [
      { label: `反推结果（${item}）`, value: isTotal ? `${controlTotal.toLocaleString()}（${fmt(controlAvg, d)} ${m.unit}×${remainingPlan.toLocaleString()} 箱）` : `≤ ${fmt(controlAvg, d)} ${m.unit}`, tone: "danger" },
      { label: "当前值（计划水平）", value: `${fmt(current, d)} ${m.unit}`, tone: "muted" },
      { label: "所需调整量", value: `${delta >= 0 ? "-" : "+"}${fmt(Math.abs(delta), d)} ${m.unit}`, tone: delta > 0 ? "warn" : "good" },
      { label: "目标值", value: `${dir} ${fmt(target, d)} ${m.unit}`, tone: "muted" },
    ],
    chart: {
      kind: "reverse",
      bars: isTotal
        ? [
            { name: `当前计划水平（${currentTotal.toLocaleString()}）`, value: currentTotal, tone: "actual" },
            { name: `达标允许总量（${controlTotal.toLocaleString()}）`, value: controlTotal, tone: "target" },
          ]
        : [
            { name: `当前计划水平（${fmt(current, d)}）`, value: current, tone: "actual" },
            { name: `达标控制值（${fmt(controlAvg, d)}）`, value: controlAvg, tone: "target" },
          ],
      unit: m.unit,
    },
    conclusions: buildConclusions(m, model2(m, input), [
      `目标值 ${dir} ${fmt(target, d)} ${m.unit}；当前累计 ${m.targetCtx!.currentAcc}；已完成产量 ${m.targetCtx!.doneOutput}。`,
      `反推假设：剩余周期生产计划 ${remainingPlan.toLocaleString()} 箱，能耗与产量近似线性，忽略极端工况影响。`,
    ], [
      `建议将控制值分解到班组与日班执行，并按周复盘实际累计与控制曲线的偏差。`,
      `反推结果基于剩余计划产量假设，若排产计划调整，请重新测算。`,
    ]),
    meta,
  };
}

// 模型（目标达成 / 反推场景下优先取目标分析模型）
function model2(m: ForecastMetric, _input: ForecastInput): ForecastModel {
  return m.models.find((x) => x.id === "target-ga") ?? m.models[0];
}

// ----- 三段式结论组装 -----
function buildConclusions(
  m: ForecastMetric,
  model: ForecastModel,
  coreFacts: string[],
  actions: string[]
): ConclusionSection[] {
  return [
    { icon: "", title: "核心预测结论", lines: coreFacts },
    {
      icon: "",
      title: "预测逻辑与可信度评估",
      lines: [
        `预测模型：${model.name}；历史预测误差 ${model.accuracy}（近 90 天回测）。`,
        `主要影响因素：${m.influencers[0]}；${m.influencers[1]}。`,
        `适用限制：模型基于近 30 天运行数据训练，遇重大工艺变更或设备改造需重新训练；预测区间为 90% 置信水平。`,
      ],
    },
    { icon: "", title: "策略建议与后续行动", lines: actions },
  ];
}
