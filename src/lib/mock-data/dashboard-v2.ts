// ============================================================
// 卷烟厂 — 评价模型（生产管理 / 工艺质量管控 / 能源消耗管理）模拟数据
// ============================================================

export interface KpiItem {
  code: string;
  label: string;
  value: number;
  unit: string;
  change: number;
  trend: "up" | "down" | "flat";
  target?: number;
}

// 趋势序列生成：{ date, actual, target, predict }
export function genTrend(days: number, base: number, variance: number, upward = true) {
  const data: { date: string; actual: number; target: number; predict: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const bias = upward ? (days - i) * (variance / days) : -(days - i) * (variance / days);
    const r = () => (Math.random() - 0.5) * variance;
    data.push({
      date: dateStr,
      actual: +(base + bias + r()).toFixed(2),
      target: +(base + bias * 0.5).toFixed(2),
      predict: +(base + bias + r() * 0.5).toFixed(2),
    });
  }
  return data;
}

// ========== 生产运行模块 P1–P9 ==========
export const productionKpi: KpiItem[] = [
  { code: "P1", label: "包装设备运行效率", value: 87.5, unit: "%", change: 1.2, trend: "up", target: 90 },
  { code: "P2", label: "单箱可控费用", value: 385, unit: "元/箱", change: -1.5, trend: "down", target: 380 },
  { code: "P3", label: "卷接设备运行效率", value: 89.2, unit: "%", change: 0.8, trend: "up", target: 90 },
  { code: "P4", label: "库存周转率", value: 4.2, unit: "次", change: 0.3, trend: "up", target: 4.5 },
  { code: "P5", label: "全员劳动生产率", value: 12.5, unit: "万元/人", change: 2.1, trend: "up", target: 13 },
  { code: "P6", label: "设备运行净效率", value: 82.3, unit: "%", change: -0.5, trend: "down", target: 85 },
  { code: "P7", label: "生产效率", value: 96.8, unit: "%", change: 1.5, trend: "up", target: 98 },
  { code: "P8", label: "运营成本", value: 12580, unit: "万元", change: 3.2, trend: "up", target: 12000 },
  { code: "P9", label: "在岗职工人均劳动生产率", value: 263, unit: "箱/人", change: 1.8, trend: "up", target: 270 },
];

// ========== 工艺质量模块 Q1–Q7 ==========
export const qualityKpi: KpiItem[] = [
  { code: "Q1", label: "百小时停机断料率", value: 1.2, unit: "次/百小时", change: -0.1, trend: "down", target: 1.0 },
  { code: "Q2", label: "包装与卷制质量检验加权平均值", value: 92.5, unit: "分", change: 0.5, trend: "up", target: 95 },
  { code: "Q3", label: "烘丝机出口水分偏差", value: 0.3, unit: "%", change: -0.05, trend: "down", target: 0.5 },
  { code: "Q4", label: "加香出口水分不达标次数", value: 3, unit: "次", change: -1, trend: "down", target: 2 },
  { code: "Q5", label: "烟支单支克重偏差", value: 2.1, unit: "毫克", change: -0.2, trend: "down", target: 5 },
  { code: "Q6", label: "优质品率（成品）", value: 92.3, unit: "%", change: 1.2, trend: "up", target: 95 },
  { code: "Q7", label: "优质品率（制丝）", value: 94.8, unit: "%", change: 0.8, trend: "up", target: 96 },
];

// ========== 能源消耗模块 E1–E9 ==========
export const energyKpi: KpiItem[] = [
  { code: "E1", label: "单位产值碳排放量", value: 0.1444, unit: "吨/万元", change: -0.5, trend: "down", target: 0.14 },
  { code: "E2", label: "单箱耗盘纸量", value: 1850, unit: "米/箱", change: -12, trend: "down", target: 1800 },
  { code: "E3", label: "单箱耗商标纸量", value: 2500, unit: "张/箱", change: -8, trend: "down", target: 2450 },
  { code: "E4", label: "单箱耗烟叶量", value: 38.5, unit: "公斤/箱", change: -0.3, trend: "down", target: 38 },
  { code: "E5", label: "单箱耗嘴棒量", value: 12000, unit: "支/箱", change: -50, trend: "down", target: 11900 },
  { code: "E6", label: "单箱化学需氧量排放量", value: 8.5, unit: "克/箱", change: -0.3, trend: "down", target: 8 },
  { code: "E7", label: "单箱卷烟综合能耗", value: 12.8, unit: "公斤标煤/箱", change: -0.4, trend: "down", target: 12 },
  { code: "E8", label: "水资源重复利用率", value: 86.5, unit: "%", change: 2.1, trend: "up", target: 90 },
  { code: "E9", label: "污水排放COD", value: 48, unit: "mg/L", change: -3, trend: "down", target: 50 },
];

// ========== 趋势序列（实际/预测/目标） ==========
export const equipmentEffTrend = genTrend(30, 87, 3);
export const productionEffTrend = genTrend(30, 96, 2);
export const operationCostTrend = genTrend(30, 410, 40, true);
export const premiumYieldTrend = genTrend(30, 92, 2);
export const energyConsumeTrend = genTrend(30, 12.8, 1, false);
export const carbonTrend = genTrend(30, 0.144, 0.01, false);
export const codTrend = genTrend(30, 48, 5, false);

// 烘丝机出口水分偏差（带控制上下限）
export const moistureDevTrend = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - 29 + i);
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    actual: +(0.3 + (Math.random() - 0.5) * 0.4).toFixed(2),
    target: 0.3,
    upper: 0.5,
    lower: -0.5,
  };
});

// ========== 辅助数据 ==========
// 机台运行效率排行
export const machineEffRank = [
  { name: "卷接机1号", eff: 90.1 },
  { name: "卷接机3号", eff: 89.0 },
  { name: "卷接机2号", eff: 88.4 },
  { name: "包装机1号", eff: 88.2 },
  { name: "包装机3号", eff: 87.6 },
  { name: "包装机2号", eff: 86.8 },
];

// 生产异常 Pareto
export const productionAnomalyPareto = [
  { name: "设备故障", count: 45, pct: 36 },
  { name: "换牌调试", count: 30, pct: 60 },
  { name: "物料短缺", count: 20, pct: 76 },
  { name: "质量返工", count: 15, pct: 88 },
  { name: "人员不足", count: 9, pct: 95 },
  { name: "其他", count: 6, pct: 100 },
];

// 缺陷类型 Pareto（工艺质量）
export const defectPareto = [
  { name: "空头", count: 48, pct: 35 },
  { name: "漏气", count: 36, pct: 61 },
  { name: "皱褶", count: 22, pct: 77 },
  { name: "长短烟", count: 16, pct: 89 },
  { name: "端部脱落", count: 9, pct: 96 },
  { name: "其他", count: 5, pct: 100 },
];

// 工序质量得分
export const processQualityScore = [
  { name: "制丝工序", score: 94.8 },
  { name: "卷接工序", score: 92.5 },
  { name: "包装工序", score: 91.2 },
  { name: "成型工序", score: 93.6 },
];

// 单箱物耗对比（实际 vs 目标，达标率）
export const materialConsumeCompare = [
  { name: "单箱耗盘纸量", value: 1850, target: 1800, unit: "米/箱" },
  { name: "单箱耗商标纸量", value: 2500, target: 2450, unit: "张/箱" },
  { name: "单箱耗烟叶量", value: 38.5, target: 38, unit: "公斤/箱" },
  { name: "单箱耗嘴棒量", value: 12000, target: 11900, unit: "支/箱" },
];

// 能源消耗结构
export const energyStructure = [
  { name: "电力", value: 55, color: "#3b82f6" },
  { name: "天然气", value: 25, color: "#f59e0b" },
  { name: "水", value: 12, color: "#06b6d4" },
  { name: "蒸汽", value: 8, color: "#ef4444" },
];
