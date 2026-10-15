// 预测总览 — 模拟数据（确定性生成：固定锚点 2026-08-09 + sin 扰动，无 Date.now / Math.random）
// 4 张指标预测卡（单箱综合能耗 / 单箱电耗 / 蒸汽耗总量 / 天然气单耗）横向四行平铺，每张卡内左指标信息 + 右趋势预测图（未来 7/15/30 日）

// ===== 指标卡 =====
export interface CardRow {
  label: string;
  value: string;
  tone?: "orange" | "green" | "danger" | "muted";
}

// 万支口径展示变体（1 箱 = 5 万支，数值 = 箱口径 × 0.2）；存在即表示该卡支持「万支｜箱」切换
export interface WanZhiVariant {
  title: string;
  main: { label: string; value: string };
  rows: CardRow[];
}

export interface OverviewCardData {
  key: string;
  title: string;
  predTime: string; // 预测时间（本轮预测生成时间）
  main: { label: string; value: string }; // 突出显示的预测主值
  rows: CardRow[];
  wanZhi?: WanZhiVariant;
}

const round = (v: number, d: number) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);

// 蒸汽耗 7 日预测序列（手调：累计 286.4，峰值 46.5 出现在 8/13，周末回落）
const STEAM_7D = [42.8, 40.1, 41.2, 46.5, 40.3, 39.4, 36.1];
const isWeekend = (y: number, m: number, d: number) => {
  const w = new Date(y, m, d).getDay();
  return w === 0 || w === 6;
};

export function getOverviewCards(): OverviewCardData[] {
  return [
    {
      key: "comprehensive",
      title: "单箱综合能耗",
      predTime: "2026-10-12 10:52:50",
      main: { label: "未来7日预测均值", value: "31.6 kgce/箱" },
      rows: [
        { label: "年度目标值", value: "≤ 31.0 kgce/箱", tone: "orange" },
        { label: "预测差值", value: "+0.6 kgce/箱（+1.9%）", tone: "danger" },
        { label: "预测区间", value: "30.9 ～ 32.3 kgce/箱", tone: "muted" },
      ],
      wanZhi: {
        title: "万支综合能耗",
        main: { label: "未来7日预测均值", value: "6.32 kgce/万支" },
        rows: [
          { label: "年度目标值", value: "≤ 6.2 kgce/万支", tone: "orange" },
          { label: "预测差值", value: "+0.12 kgce/万支（+1.9%）", tone: "danger" },
          { label: "预测区间", value: "6.18 ～ 6.46 kgce/万支", tone: "muted" },
        ],
      },
    },
    {
      key: "packPower",
      title: "单箱电耗",
      predTime: "2026-10-12 10:53:01",
      main: { label: "未来7日预测均值", value: "24.9 kWh/箱" },
      rows: [
        { label: "最新实际值", value: "24.6 kWh/箱", tone: "muted" },
        { label: "预测差值", value: "-0.1 kWh/箱（-0.4%）", tone: "green" },
        { label: "预测区间", value: "24.2 ～ 25.6 kWh/箱", tone: "muted" },
      ],
      wanZhi: {
        title: "万支电耗",
        main: { label: "未来7日预测均值", value: "4.98 kWh/万支" },
        rows: [
          { label: "最新实际值", value: "4.92 kWh/万支", tone: "muted" },
          { label: "预测差值", value: "-0.02 kWh/万支（-0.4%）", tone: "green" },
          { label: "预测区间", value: "4.84 ～ 5.12 kWh/万支", tone: "muted" },
        ],
      },
    },
    {
      key: "steam",
      title: "蒸汽耗（总量）",
      predTime: "2026-10-12 10:53:10",
      main: { label: "未来7日预测累计", value: "286.4 t" },
      rows: [
        { label: "预测峰值", value: "46.5 t", tone: "orange" },
        { label: "预测区间", value: "39.6 ～ 48.3 t", tone: "muted" },
      ],
    },
    {
      key: "gas",
      title: "天然气单耗",
      predTime: "2026-10-12 10:53:10",
      main: { label: "未来7日预测均值", value: "8.6 Nm³/箱" },
      rows: [
        { label: "最新实际值", value: "8.4 Nm³/箱", tone: "muted" },
        { label: "预测差值", value: "+0.4 Nm³/箱（+4.9%）", tone: "orange" },
        { label: "预测区间", value: "8.1 ～ 9.0 Nm³/箱", tone: "muted" },
      ],
      wanZhi: {
        title: "万支天然气单耗",
        main: { label: "未来7日预测均值", value: "1.72 Nm³/万支" },
        rows: [
          { label: "最新实际值", value: "1.68 Nm³/万支", tone: "muted" },
          { label: "预测差值", value: "+0.08 Nm³/万支（+4.9%）", tone: "orange" },
          { label: "预测区间", value: "1.62 ～ 1.80 Nm³/万支", tone: "muted" },
        ],
      },
    },
  ];
}

// ===== 趋势预测图表（未来 N 日预测：综合能耗 / 单箱电耗 / 蒸汽耗总量 / 天然气单耗）=====
export interface TrendPoint {
  date: string; // "8/13"
  predict: number; // 预测值
  target?: number; // 目标值（综合能耗；生效日起切换为新目标，同一条橙色实线阶梯过渡）
  peak?: number; // 峰值点（仅窗口内最高点有值）
}

export interface TrendSeries {
  title: string;
  unit: string;
  decimals: number;
  kind: "line" | "bar"; // 折线 / 柱状（蒸汽）
  diffBase?: number; // 差异比例基准（同工况历史均值，仅用于悬停差异计算，不绘制）
  points: TrendPoint[];
  peakInfo: { date: string; value: number }; // 峰值日期与预测值（蒸汽点击峰值查看）
}

// 指标画像：预测基准 / 波幅 / 缓升 / 目标值（生效日起切换新目标）/ 差异基准
interface TrendProfile {
  title: string;
  unit: string;
  decimals: number;
  kind: "line" | "bar";
  predBase: number;
  amp?: number; // sin 波幅（折线类）
  rise?: number; // 每日缓升（折线类）
  seed: number;
  target?: { active: number; pending: number; from: number }; // from = 待生效目标自窗口首日起的生效日序号
  diffBase?: number;
}

const TREND_PROFILES: { comprehensive: TrendProfile; packPower: TrendProfile; steam: TrendProfile; gas: TrendProfile } = {
  comprehensive: {
    title: "单箱综合能耗趋势预测", unit: "kgce/箱", decimals: 1, kind: "line",
    predBase: 31.6, amp: 0.4, rise: 0, seed: 5,
    target: { active: 31.0, pending: 30.5, from: 6 }, // 8/15 起新目标 30.5 生效
    diffBase: 31.0,
  },
  packPower: {
    title: "单箱电耗趋势预测", unit: "kWh/箱", decimals: 1, kind: "line",
    predBase: 24.9, amp: 0.35, rise: 0, seed: 17, diffBase: 25.0,
  },
  steam: {
    title: "蒸汽耗总量趋势预测", unit: "t", decimals: 1, kind: "bar",
    predBase: 40.9, seed: 23,
  },
  gas: {
    title: "天然气单耗趋势预测", unit: "Nm³/箱", decimals: 1, kind: "line",
    predBase: 8.6, amp: 0.08, rise: 0.006, seed: 9, diffBase: 8.2,
  },
};

export type TrendMetric = keyof typeof TREND_PROFILES;

// 未来 days 日预测序列：蒸汽前 7 日使用手调序列（含 8/13 峰值 46.5），其余按画像生成；峰值 = 窗口内最高点
export function getTrendSeries(metric: TrendMetric, days: 7 | 15 | 30): TrendSeries {
  const p = TREND_PROFILES[metric];
  const points: TrendPoint[] = [];

  for (let j = 1; j <= days; j++) {
    const d = new Date(2026, 7, 10 + j - 1);
    const wk = metric === "steam" && isWeekend(2026, 7, d.getDate()) ? 0.9 : 1;
    let v: number;
    if (metric === "steam" && j <= 7) {
      v = STEAM_7D[j - 1];
    } else if (metric === "steam") {
      v = round(p.predBase * wk * (1 + Math.sin(p.seed + j * 0.6) * 0.04), p.decimals);
    } else {
      v = round(p.predBase + Math.sin(p.seed + j * 0.7) * (p.amp ?? 0) + (p.rise ?? 0) * j, p.decimals);
    }
    points.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      predict: v,
      // 目标值：生效日前 = 当前目标，生效日起切换为新目标（同一条橙色实线，阶梯过渡）
      ...(p.target ? { target: j >= p.target.from ? p.target.pending : p.target.active } : {}),
    });
  }

  // 峰值 = 窗口内最高预测点
  let peakIdx = 0;
  points.forEach((pt, i) => {
    if (pt.predict > points[peakIdx].predict) peakIdx = i;
  });
  points[peakIdx].peak = points[peakIdx].predict;
  const peakPt = points[peakIdx];

  return {
    title: p.title,
    unit: p.unit,
    decimals: p.decimals,
    kind: p.kind,
    diffBase: p.diffBase,
    points,
    peakInfo: { date: `${peakPt.date.replace("/", "月")}日`, value: peakPt.predict },
  };
}
