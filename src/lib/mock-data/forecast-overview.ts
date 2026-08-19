// 预测总览 — 模拟数据（确定性生成：固定锚点 2026-08-09 + sin 扰动，无 Date.now / Math.random）
// 顶部 4 张指标卡 + 4 张核心图表（目标达成 / 单箱电耗 / 蒸汽耗总量 / 天然气单耗）
import { DATA_END } from "./forecast";

export { DATA_END };

// ===== 指标卡 =====
export type CardTone = "good" | "warn" | "danger" | "muted";

export interface OverviewCardData {
  key: string;
  title: string;
  main: { label: string; value: string }; // 突出显示的预测主值
  tag?: { text: string; tone: CardTone }; // 预测判断标签（仅判断，非预警等级）
  rows: { label: string; value: string; tone?: "orange" | "green" | "danger" | "muted" }[];
  spark?: { kind: "line" | "bar"; points: { date: string; value: number; peak?: boolean }[] };
}

const round = (v: number, d: number) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
const fmt = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

// 日期标签（自 2026-08-10 起第 i 天，"8/10" 格式）
function futureLabel(i: number): string {
  const d = new Date(2026, 7, 10 + i - 1);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 蒸汽耗 7 日预测序列（手调：累计 286.4，峰值 46.5 出现在 8/13，周末回落）
const STEAM_7D = [42.8, 40.1, 41.2, 46.5, 40.3, 39.4, 36.1];
const isWeekend = (y: number, m: number, d: number) => {
  const w = new Date(y, m, d).getDay();
  return w === 0 || w === 6;
};

export function getOverviewCards(): OverviewCardData[] {
  // 单箱电耗：7 日预测序列（均值 24.9，历史基准 25.0）
  const power7 = Array.from({ length: 7 }, (_, j) => round(24.9 + Math.sin(17 + j * 0.8) * 0.35, 1));
  // 天然气单耗：7 日预测序列（均值 8.6，缓升）
  const gas7 = Array.from({ length: 7 }, (_, j) => round(8.4 + j * 0.06 + Math.sin(9 + j * 0.7) * 0.08, 1));

  return [
    {
      key: "comprehensive",
      title: "单箱综合能耗",
      main: { label: "本年度预测", value: "31.6 kgce/箱" },
      tag: { text: "预计超标", tone: "danger" },
      rows: [
        { label: "本年累计实际值", value: "30.9 kgce/箱", tone: "muted" },
        { label: "年度目标值", value: "≤ 31.0 kgce/箱", tone: "orange" },
        { label: "预计差距", value: "高于目标 0.6 kgce/箱（1.9%）", tone: "danger" },
        { label: "预测区间", value: "31.0 ～ 32.2 kgce/箱", tone: "muted" },
      ],
    },
    {
      key: "packPower",
      title: "单箱电耗",
      main: { label: "未来7日预测均值", value: "24.9 kWh/箱" },
      tag: { text: "预计基本稳定", tone: "muted" },
      rows: [
        { label: "最新实际值", value: "24.6 kWh/箱", tone: "muted" },
        { label: "同工况历史均值", value: "25.0 kWh/箱", tone: "muted" },
        { label: "预计差异", value: "低于基准 0.1 kWh/箱（0.4%）", tone: "green" },
        { label: "预测区间", value: "24.2 ～ 25.6 kWh/箱", tone: "muted" },
      ],
      spark: { kind: "line", points: power7.map((v, j) => ({ date: futureLabel(j + 1), value: v })) },
    },
    {
      key: "steam",
      title: "蒸汽耗（总量）",
      main: { label: "未来7日预测累计", value: "286.4 t" },
      rows: [
        { label: "明日预测值", value: "42.8 t", tone: "muted" },
        { label: "预测峰值", value: "46.5 t · 预计 8月13日出现", tone: "orange" },
        { label: "同工况历史累计", value: "279.0 t", tone: "muted" },
        { label: "预计差异", value: "增加 7.4 t（2.7%）", tone: "orange" },
        { label: "每日预测区间", value: "34.3 ～ 48.8 t", tone: "muted" },
      ],
      spark: {
        kind: "bar",
        points: STEAM_7D.map((v, j) => ({ date: futureLabel(j + 1), value: v, peak: v === 46.5 })),
      },
    },
    {
      key: "gas",
      title: "天然气单耗",
      main: { label: "未来7日预测均值", value: "8.6 Nm³/箱" },
      tag: { text: "预计有所上升", tone: "warn" },
      rows: [
        { label: "最新实际值", value: "8.4 Nm³/箱", tone: "muted" },
        { label: "同工况历史均值", value: "8.2 Nm³/箱", tone: "muted" },
        { label: "预计差异", value: "高于基准 0.4 Nm³/箱（4.9%）", tone: "orange" },
        { label: "预测区间", value: "8.1 ～ 9.0 Nm³/箱", tone: "muted" },
      ],
      spark: { kind: "line", points: gas7.map((v, j) => ({ date: futureLabel(j + 1), value: v })) },
    },
  ];
}

// ===== 趋势预测图表（单箱电耗 / 蒸汽耗总量 / 天然气单耗）=====
export interface TrendPoint {
  date: string;
  actual?: number;
  predict?: number;
  upper?: number;
  lower?: number;
  histAvg?: number;
  peak?: number; // 仅峰值点有值（蒸汽）
}

export interface TrendSeries {
  title: string;
  unit: string;
  decimals: number;
  points: TrendPoint[];
  peakInfo?: { date: string; value: number; upper: number; lower: number }; // 峰值详情（点击标记展示）
}

// 指标画像：基准 / 历史基准 / 预测趋势 / 区间幅度
const TREND_PROFILES = {
  packPower: { title: "单箱电耗趋势预测", unit: "kWh/箱", decimals: 1, base: 24.6, histAvg: 25.0, predBase: 24.9, band: 0.02, seed: 17 },
  steam: { title: "蒸汽耗总量趋势预测", unit: "t", decimals: 1, base: 40.6, histAvg: 39.9, predBase: 40.9, band: 0.05, seed: 23 },
  gas: { title: "天然气单耗趋势预测", unit: "Nm³/箱", decimals: 1, base: 8.3, histAvg: 8.2, predBase: 8.55, band: 0.045, seed: 9 },
} as const;

export type TrendMetric = keyof typeof TREND_PROFILES;

// 过去 30 日实际 + 未来 days 日预测（含区间与历史均值线）
export function getTrendSeries(metric: TrendMetric, days: 7 | 15 | 30): TrendSeries {
  const p = TREND_PROFILES[metric];
  const points: TrendPoint[] = [];

  // 历史 30 日（7/11 ~ 8/9），蒸汽周末回落
  for (let i = 30; i >= 1; i--) {
    const d = new Date(2026, 7, 9 - i + 1);
    const wk = metric === "steam" && isWeekend(2026, 7, d.getDate()) ? 0.9 : 1;
    points.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      actual: round(p.base * wk * (1 + Math.sin(p.seed + i * 0.7) * 0.05), p.decimals),
      histAvg: round(p.histAvg, p.decimals),
    });
  }

  // 未来 days 日预测
  let peakInfo: TrendSeries["peakInfo"];
  for (let j = 1; j <= days; j++) {
    const d = new Date(2026, 7, 10 + j - 1);
    const wk = metric === "steam" && isWeekend(2026, 7, d.getDate()) ? 0.9 : 1;
    // 蒸汽前 7 日使用手调序列（含 8/13 峰值 46.5）
    const v =
      metric === "steam" && j <= 7
        ? STEAM_7D[j - 1]
        : round(p.predBase * wk * (1 + Math.sin(p.seed + j * 0.6) * 0.04), p.decimals);
    const pt: TrendPoint = {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      predict: v,
      upper: round(v * (1 + p.band), p.decimals),
      lower: round(v * (1 - p.band), p.decimals),
      histAvg: round(p.histAvg, p.decimals),
    };
    if (metric === "steam" && v === 46.5) {
      pt.peak = v;
      peakInfo = { date: "8月13日", value: v, upper: pt.upper!, lower: pt.lower! };
    }
    points.push(pt);
  }

  return { title: p.title, unit: p.unit, decimals: p.decimals, points, peakInfo };
}

// ===== 单箱综合能耗能否达标预测图（实际按周更新）=====
export interface TargetPoint {
  date: string;
  actual?: number;
  predict?: number;
  upper?: number;
  lower?: number;
  target?: number;
}

export function getTargetSeries(period: "本月" | "本年度"): { unit: string; points: TargetPoint[]; summary: string } {
  const target = 31.0;
  const base = 29.8;
  const monthEnd = 30.4; // 月末预测（本月口径）
  const yearEnd = 31.6; // 年末预测（本年度口径）
  const points: TargetPoint[] = [];

  if (period === "本月") {
    for (let i = 1; i <= 31; i++) {
      const pt: TargetPoint = { date: `8/${i}`, target };
      if (i <= 9) {
        pt.actual = round(base * (1 + Math.sin(3 + i) * 0.02), 1);
      } else {
        // 自最新实际平滑插值到月末预测值（末点精确收敛于 monthEnd）
        const t = (i - 9) / 22;
        const v = round(base * (1 + Math.sin(3 + i) * 0.02) * (1 - t) + monthEnd * t, 1);
        pt.predict = v;
        pt.upper = round(v * 1.02, 1);
        pt.lower = round(v * 0.98, 1);
      }
      points.push(pt);
    }
    return { unit: "kgce/箱", points, summary: `月末单箱综合能耗预计 ${monthEnd} kgce/箱，目标≤${target}，预计达标，剩余周期仍有约 0.6 的余量` };
  }

  for (let mo = 1; mo <= 12; mo++) {
    const pt: TargetPoint = { date: `${mo}月`, target };
    if (mo <= 8) {
      pt.actual = round(base * (1 + Math.sin(3 + mo) * 0.015), 1);
    } else {
      // 自 8 月实际平滑插值到年末预测值（末点精确收敛于 yearEnd）
      const t = (mo - 8) / 4;
      const v = round(base * (1 + Math.sin(3 + mo) * 0.015) * (1 - t) + yearEnd * t, 1);
      pt.predict = v;
      pt.upper = round(v * 1.02, 1);
      pt.lower = round(v * 0.98, 1);
    }
    points.push(pt);
  }
  return { unit: "kgce/箱", points, summary: "" };
}

export { fmt };
