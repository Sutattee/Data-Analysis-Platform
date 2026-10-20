// 辅料消耗预测（生产管理 · 模拟测算） — mock 预测引擎
// 复用 forecast.ts 的 ForecastResult 通用结构，产出结果可直接交给 ForecastResultView / ConclusionPanel 渲染
import type { ChartPoint, ConclusionSection, ForecastResult, MetricField } from "./forecast";
import { MATERIAL_DAILY, MATERIAL_META, type MaterialKey } from "./material-consumption";

export const MATERIAL_FORECAST_MODEL = "辅料消耗时序预测模型 v1.2";
export const MATERIAL_HISTORY_RANGE = "2024-01-01 至 2026-08-09"; // 历史数据范围（系统自动确定）
export const MATERIAL_DATA_END = "2026-08-09"; // 数据截止日
export const NEXT_MONTH_LABEL = "下个月（09-01 ~ 09-30）"; // 预测时间范围选项：下月（9/1 ~ 9/30）

// 各牌号下个月计划产量（箱），系统自动带入（与 MATERIAL_BRANDS 对齐），允许编辑
export const DEFAULT_BRAND_PLANS: number[] = [3000, 2400, 2600, 2000];

// 预测时间范围：下个月（9/1~9/30 共 30 天），对应默认各牌号计划产量（规模效应基准）
export type ForecastRange = "下个月";
const RANGE_CFG: Record<
  ForecastRange,
  {
    days: number;
    monthIdx: number;
    startDay: number;
    scope: string;
    peakDay: (idx: number) => string;
    defaultPlans: number[];
  }
> = {
  下个月: { days: 30, monthIdx: 8, startDay: 1, scope: "下月", peakDay: (i) => `9月${i + 1}日`, defaultPlans: DEFAULT_BRAND_PLANS },
};

// 三档历史单耗（最差 / 均值 / 最优），量级与辅料消耗页序列一致
interface MaterialForecastMetric {
  decimals: number;
  worst: number;
  avg: number;
  best: number;
  seed: number;
  target?: number; // 目标值（盘纸无）
}

export const MATERIAL_FORECAST_METRICS: Record<MaterialKey, MaterialForecastMetric> = {
  tipPaper:  { decimals: 1, worst: 31.0, avg: 29.8, best: 29.0, seed: 23 },
  boxLabel:  { decimals: 0, worst: 2600, avg: 2500, best: 2440, seed: 29, target: 2480 },
  tobacco:   { decimals: 1, worst: 40.2, avg: 38.6, best: 37.5, seed: 31, target: 40.0 },
  filterRod: { decimals: 0, worst: 52000, avg: 50000, best: 48500, seed: 37, target: 48000 },
};

export type ConsumeLevel = "最差" | "均值" | "最优";

// 各牌号历史单耗三档数据（与 MATERIAL_BRANDS 对齐；全厂档位值见 MATERIAL_FORECAST_METRICS）
export const BRAND_CONSUME_LEVELS: Record<MaterialKey, Record<ConsumeLevel, number[]>> = {
  tipPaper: {
    最差: [31.2, 30.6, 30.9, 30.3],
    均值: [30.0, 29.4, 29.7, 29.1],
    最优: [29.2, 28.7, 29.0, 28.5],
  },
  boxLabel: {
    最差: [2620, 2570, 2600, 2550],
    均值: [2520, 2470, 2500, 2450],
    最优: [2460, 2420, 2440, 2400],
  },
  tobacco: {
    最差: [40.5, 39.9, 40.2, 39.6],
    均值: [38.9, 38.3, 38.6, 38.0],
    最优: [37.8, 37.3, 37.6, 37.0],
  },
  filterRod: {
    最差: [52400, 51500, 52000, 51000],
    均值: [50400, 49500, 50000, 49000],
    最优: [48900, 48100, 48500, 47700],
  },
};

// 各牌号历史单耗下拉选项：仅档位名（选定档位后以表格拉取展示各牌号数值）
export const CONSUME_LEVEL_OPTIONS: { value: ConsumeLevel; label: string }[] = [
  { value: "最差", label: "最差" },
  { value: "均值", label: "均值" },
  { value: "最优", label: "最优" },
];

// 拉取所选档位的历史单耗数值（千分位 + 单位），随指标与档位联动
export function consumeLevelValue(key: MaterialKey, level: ConsumeLevel): string {
  const m = MATERIAL_FORECAST_METRICS[key];
  const v = level === "最差" ? m.worst : level === "最优" ? m.best : m.avg;
  const fmt = v.toLocaleString("en-US", { minimumFractionDigits: m.decimals, maximumFractionDigits: m.decimals });
  return `${fmt} ${MATERIAL_META[key].unit}`;
}

export interface MaterialForecastInput {
  metricKey: MaterialKey;
  planOutput: number; // 各牌号下个月计划产量之和（箱）
  consumeLevel: ConsumeLevel; // 各牌号历史单耗档位
  range?: ForecastRange; // 预测时间范围（缺省下个月）
}

const round = (v: number, d: number) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
const fmt = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

// 预测期日期标签（格式 "9/1"）
function rangeDayLabel(cfg: { monthIdx: number; startDay: number }, j: number): string {
  const d = new Date(2026, cfg.monthIdx, cfg.startDay - 1 + j);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ===== 预测执行（async，模拟模型调用延迟）=====
export async function runMaterialForecast(input: MaterialForecastInput): Promise<ForecastResult> {
  await new Promise((r) => setTimeout(r, 1000));
  const key = input.metricKey;
  const m = MATERIAL_FORECAST_METRICS[key];
  const meta = MATERIAL_META[key];
  const d = m.decimals;
  const range = input.range ?? "下个月";
  const cfg = RANGE_CFG[range];
  const { days, scope, peakDay } = cfg;

  // 历史序列：与辅料消耗页同源日度数据，取近 30 天
  const points: ChartPoint[] = MATERIAL_DAILY[key].slice(-30).map((p) => ({ date: p.date, actual: p.actual }));

  // 预测基准：所选历史单耗档位 + 计划产量规模效应（产量每偏离该档默认 ±10%，单耗 ∓0.5%）
  const levelBase = input.consumeLevel === "最差" ? m.worst : input.consumeLevel === "最优" ? m.best : m.avg;
  const defaultOutput = cfg.defaultPlans.reduce((s, v) => s + v, 0);
  const planFactor = 1 - ((input.planOutput - defaultOutput) / defaultOutput) * 0.05;

  // 预测序列（下月 9/1~9/30，含区间与目标线）
  const predicts: number[] = [];
  for (let j = 1; j <= days; j++) {
    const p = round(levelBase * (1 + Math.sin(m.seed * 1.3 + j * 0.5) * 0.015 + j * 0.0008) * planFactor, d);
    predicts.push(p);
    points.push({
      date: rangeDayLabel(cfg, j),
      predict: p,
      upper: round(p * 1.03, d),
      lower: round(p * 0.97, d),
      target: m.target,
    });
  }

  // 核心结果：周期均值 / 峰值（及峰值日）/ 区间 / 较历史均值变化 / 预计总耗（按预测期天数占下月比例折算）
  const mean = round(predicts.reduce((s, v) => s + v, 0) / predicts.length, d);
  const peakIdx = predicts.indexOf(Math.max(...predicts));
  const peak = predicts[peakIdx];
  const meanLo = round(mean * 0.97, d);
  const meanHi = round(mean * 1.03, d);
  const histAvg = MATERIAL_DAILY[key].reduce((s, p) => s + p.actual, 0) / MATERIAL_DAILY[key].length;
  const diffPct = ((mean - histAvg) / histAvg) * 100;
  const total = Math.round((mean * input.planOutput * days) / 30);

  const fields: MetricField[] = [
    { label: `${scope}单耗预测（周期均值）`, value: `${fmt(mean, d)} ${meta.unit}` },
    { label: "预测峰值", value: `${fmt(peak, d)} ${meta.unit}（${peakDay(peakIdx)}）` },
    { label: "预测区间", value: `${fmt(meanLo, d)} ~ ${fmt(meanHi, d)} ${meta.unit}` },
    {
      label: "较历史均值",
      value: `${diffPct >= 0 ? "↑" : "↓"} ${Math.abs(diffPct).toFixed(1)}%`,
      tone: diffPct > 0 ? "warn" : "good",
    },
    { label: `${scope}预计总耗`, value: `${total.toLocaleString("en-US")} ${meta.unit.split("/")[0]}` },
  ];

  const headline = `${scope}${meta.label}预计平均 ${fmt(mean, d)} ${meta.unit}，预测区间 ${fmt(meanLo, d)}~${fmt(meanHi, d)} ${meta.unit}，较历史均值${diffPct >= 0 ? "增加" : "下降"} ${Math.abs(diffPct).toFixed(1)}%`;

  // 三段式结论：变化趋势仅作辅助判断，峰值/目标风险与建议为主
  const conclusions: ConclusionSection[] = [
    {
      icon: "📈",
      title: "变化趋势（辅助判断）",
      lines: [
        `预测期内${meta.label}围绕 ${fmt(mean, d)} ${meta.unit} 小幅波动，整体呈${predicts[days - 1] >= predicts[0] ? "缓慢上升" : "缓慢下降"}趋势（辅助结论，请以预测值与区间为准）。`,
        `按「${input.consumeLevel}」档历史单耗与 ${input.planOutput.toLocaleString("en-US")} 箱计划产量测算，预测期末预计 ${fmt(predicts[days - 1], d)} ${meta.unit}。`,
      ],
    },
    {
      icon: "⚠️",
      title: "峰值与目标风险",
      lines: [
        `预测峰值为 ${fmt(peak, d)} ${meta.unit}（${peakDay(peakIdx)}），约为周期均值的 ${((peak / mean) * 100).toFixed(1)}%，建议关注该时段备料与机台状态。`,
        m.target !== undefined
          ? mean > m.target
            ? `周期均值 ${fmt(mean, d)} 高于目标值 ${fmt(m.target, d)} ${meta.unit}，存在超标风险，建议提前干预。`
            : `周期均值 ${fmt(mean, d)} 低于目标值 ${fmt(m.target, d)} ${meta.unit}，预计可达成目标。`
          : `周期均值较历史均值${diffPct >= 0 ? "偏高" : "偏低"} ${Math.abs(diffPct).toFixed(1)}%，请结合排产节奏持续跟踪。`,
      ],
    },
    {
      icon: "💡",
      title: "建议",
      lines: [
        `结合${scope} ${Math.round((input.planOutput * days) / 30).toLocaleString("en-US")} 箱排产计划，按「${input.consumeLevel}」单耗档位备料预计总耗约 ${total.toLocaleString("en-US")} ${meta.unit.split("/")[0]}，建议预留 3%~5% 余量。`,
        input.consumeLevel === "最差"
          ? "当前选用最差档单耗，测算偏保守；建议排查高耗机台与批次损耗后按均值档复核。"
          : input.consumeLevel === "最优"
            ? "当前选用最优档单耗，达成依赖工艺与设备状态保持最优，建议按均值档做备料兜底。"
            : "当前选用均值档单耗，与近期实际水平一致，测算结果可作为备料与管控基准。",
      ],
    },
  ];

  return {
    headline,
    fields,
    chart: { kind: m.target !== undefined ? "target" : "trend", points },
    conclusions,
    meta: { model: MATERIAL_FORECAST_MODEL, historyRange: MATERIAL_HISTORY_RANGE, dataEnd: MATERIAL_DATA_END },
  };
}
