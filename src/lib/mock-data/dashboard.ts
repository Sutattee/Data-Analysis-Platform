import { KpiData, TrendPoint, TrendSeries, ProductionLine } from "@/types";

// KPI 指标卡片
export const kpiData: KpiData[] = [
  { label: "今日产量", value: 18432, unit: "吨", change: 3.2, trend: "up" },
  { label: "综合能耗", value: 412, unit: "kWh/吨", change: -1.5, trend: "down" },
  { label: "设备OEE", value: 87.6, unit: "%", change: 0.8, trend: "up" },
  { label: "良品率", value: 98.3, unit: "%", change: 0.2, trend: "up" },
  { label: "订单完成率", value: 94.1, unit: "%", change: -2.3, trend: "down" },
  { label: "安全工时", value: 12580, unit: "小时", change: 5.0, trend: "up" },
];

// 近30天产量趋势
function generateTrend(
  label: string,
  baseValue: number,
  variance: number,
  upward: boolean
): TrendSeries {
  const data: TrendPoint[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const trendBias = upward ? (30 - i) * (variance / 30) : 0;
    const random = (Math.random() - 0.5) * variance;
    data.push({ date: dateStr, value: Math.round((baseValue + trendBias + random) * 10) / 10 });
  }
  return { name: label, data, color: "#2563eb" };
}

export const outputTrend = generateTrend("日产量(吨)", 18000, 2000, true);
export const energyTrend = generateTrend("能耗(kWh/吨)", 420, 30, false);
export const oeeTrend = generateTrend("OEE(%)", 87, 3, true);

// 产线状态
export const productionLines: ProductionLine[] = [
  { id: "pl1", name: "高炉车间",   status: "running",     output: 5230, efficiency: 92.1 },
  { id: "pl2", name: "热轧车间",   status: "running",     output: 4180, efficiency: 88.5 },
  { id: "pl3", name: "冷轧车间",   status: "running",     output: 3560, efficiency: 91.3 },
  { id: "pl4", name: "镀锌车间",   status: "maintenance", output: 0,    efficiency: 0 },
  { id: "pl5", name: "连铸车间",   status: "idle",        output: 0,    efficiency: 0 },
];

// 产线生产明细（用于图表）
export const productionByLine = [
  { name: "高炉", value: 5230, color: "#2563eb" },
  { name: "热轧", value: 4180, color: "#3b82f6" },
  { name: "冷轧", value: 3560, color: "#60a5fa" },
  { name: "镀锌", value: 2780, color: "#93c5fd" },
  { name: "连铸", value: 2682, color: "#bfdbfe" },
];

// 能耗分布
export const energyDistribution = [
  { name: "电力", value: 45, color: "#f59e0b" },
  { name: "天然气", value: 30, color: "#ef4444" },
  { name: "煤炭", value: 15, color: "#6366f1" },
  { name: "蒸汽", value: 10, color: "#14b8a6" },
];
