// 辅料消耗预测（生产管理 · 模拟测算） — mock 预测引擎
// 复用 forecast.ts 的 ForecastResult 通用结构，产出结果可直接交给 ForecastResultView / ConclusionPanel 渲染
import type { ChartPoint, ConclusionSection, ForecastResult, MetricField } from "./forecast";
import { MATERIAL_DAILY, MATERIAL_META, type MaterialKey } from "./material-consumption";

export const MATERIAL_FORECAST_MODEL = "辅料消耗时序预测模型 v1.2";
export const MATERIAL_HISTORY_RANGE = "2024-01-01 至 2026-08-09"; // 历史数据范围（系统自动确定）
export const MATERIAL_DATA_END = "2026-08-09"; // 数据截止日
export const NEXT_MONTH_LABEL = "下个月（2026-09-01 ~ 2026-09-30）"; // 预测时间范围（唯一选项）
export const DEFAULT_PLAN_OUTPUT = 3200; // 各牌号下个月计划产量之和（箱），自动带入可编辑

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

// 各牌号历史单耗下拉选项：仅档位名（数值在选定档位后自动拉取展示）
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
}

const round = (v: number, d: number) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
const fmt = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

// 下月日期标签（2026-09-01 起，格式 "9/1"）
function nextMonthLabel(i: number): string {
  const d = new Date(2026, 8, i);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ===== 预测执行（async，模拟模型调用延迟）=====
export async function runMaterialForecast(input: MaterialForecastInput): Promise<ForecastResult> {
  await new Promise((r) => setTimeout(r, 1000));
  const key = input.metricKey;
  const m = MATERIAL_FORECAST_METRICS[key];
  const meta = MATERIAL_META[key];
  const d = m.decimals;

  // 历史序列：与辅料消耗页同源日度数据，取近 30 天
  const points: ChartPoint[] = MATERIAL_DAILY[key].slice(-30).map((p) => ({ date: p.date, actual: p.actual }));

  // 预测基准：所选历史单耗档位 + 计划产量规模效应（产量每偏离默认 ±10%，单耗 ∓0.5%）
  const levelBase = input.consumeLevel === "最差" ? m.worst : input.consumeLevel === "最优" ? m.best : m.avg;
  const planFactor = 1 - ((input.planOutput - DEFAULT_PLAN_OUTPUT) / DEFAULT_PLAN_OUTPUT) * 0.05;

  // 预测序列（9/1 ~ 9/30，含区间与目标线）
  const predicts: number[] = [];
  for (let j = 1; j <= 30; j++) {
    const p = round(levelBase * (1 + Math.sin(m.seed * 1.3 + j * 0.5) * 0.015 + j * 0.0008) * planFactor, d);
    predicts.push(p);
    points.push({
      date: nextMonthLabel(j),
      predict: p,
      upper: round(p * 1.03, d),
      lower: round(p * 0.97, d),
      target: m.target,
    });
  }

  // 核心结果：周期均值 / 峰值（及峰值日）/ 区间 / 较历史均值变化 / 预计总耗
  const mean = round(predicts.reduce((s, v) => s + v, 0) / predicts.length, d);
  const peakIdx = predicts.indexOf(Math.max(...predicts));
  const peak = predicts[peakIdx];
  const meanLo = round(mean * 0.97, d);
  const meanHi = round(mean * 1.03, d);
  const histAvg = MATERIAL_DAILY[key].reduce((s, p) => s + p.actual, 0) / MATERIAL_DAILY[key].length;
  const diffPct = ((mean - histAvg) / histAvg) * 100;
  const total = Math.round(mean * input.planOutput);

  const fields: MetricField[] = [
    { label: "下月单耗预测（周期均值）", value: `${fmt(mean, d)} ${meta.unit}` },
    { label: "预测峰值", value: `${fmt(peak, d)} ${meta.unit}（9月${peakIdx + 1}日）` },
    { label: "预测区间", value: `${fmt(meanLo, d)} ~ ${fmt(meanHi, d)} ${meta.unit}` },
    {
      label: "较历史均值",
      value: `${diffPct >= 0 ? "↑" : "↓"} ${Math.abs(diffPct).toFixed(1)}%`,
      tone: diffPct > 0 ? "warn" : "good",
    },
    { label: "下月预计总耗", value: `${total.toLocaleString("en-US")} ${meta.unit.split("/")[0]}` },
  ];

  const headline = `下月${meta.label}预计平均 ${fmt(mean, d)} ${meta.unit}，预测区间 ${fmt(meanLo, d)}~${fmt(meanHi, d)} ${meta.unit}，较历史均值${diffPct >= 0 ? "增加" : "下降"} ${Math.abs(diffPct).toFixed(1)}%`;

  // 三段式结论：变化趋势仅作辅助判断，峰值/目标风险与建议为主
  const conclusions: ConclusionSection[] = [
    {
      icon: "📈",
      title: "变化趋势（辅助判断）",
      lines: [
        `预测期内${meta.label}围绕 ${fmt(mean, d)} ${meta.unit} 小幅波动，整体呈${predicts[29] >= predicts[0] ? "缓慢上升" : "缓慢下降"}趋势（辅助结论，请以预测值与区间为准）。`,
        `按「${input.consumeLevel}」档历史单耗与 ${input.planOutput.toLocaleString("en-US")} 箱计划产量测算，月末预计 ${fmt(predicts[29], d)} ${meta.unit}。`,
      ],
    },
    {
      icon: "⚠️",
      title: "峰值与目标风险",
      lines: [
        `预测峰值为 ${fmt(peak, d)} ${meta.unit}（9月${peakIdx + 1}日），约为周期均值的 ${((peak / mean) * 100).toFixed(1)}%，建议关注该时段备料与机台状态。`,
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
        `结合下月 ${input.planOutput.toLocaleString("en-US")} 箱排产计划，按「${input.consumeLevel}」单耗档位备料预计总耗约 ${total.toLocaleString("en-US")} ${meta.unit.split("/")[0]}，建议预留 3%~5% 余量。`,
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
