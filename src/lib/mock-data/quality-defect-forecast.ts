// 缺陷预测 —— 模拟数据（会话内静态，本期仅展示最新预测结果）
// 基于机台生产参数及车间环境数据对指定缺陷做滚动风险预测：
// 两组参数映射（包装组 / 卷接组），同组缺陷共用展示参数，各缺陷独立模型与判定规则；
// 风险评分 0-1，等级：低 <0.40（黄）/ 中 0.40-0.70（橙）/ 高 ≥0.70（红）；
// 参考范围 / 基准值原表标注「待提供」，此处预置模拟值供演示，可直接替换。
import { BRAND_OPTIONS, DEFECT_RECORDS, SHIFT_OPTIONS, catalogOf } from "@/lib/mock-data/quality-defect";

// ============ 参数映射 ============

export type GroupKey = "pack" | "roll"; // 包装组 / 卷接组

export interface ForecastParamDef {
  key: string;
  name: string;
  unit: string;
  source: "process" | "env"; // 来源分类：工序参数 / 车间环境
}

export const PARAM_GROUPS: Record<GroupKey, { process: string; params: ForecastParamDef[] }> = {
  pack: {
    process: "包装",
    params: [
      { key: "heatSeal", name: "热封温度", unit: "℃", source: "process" },
      { key: "packPress", name: "包装压力", unit: "MPa", source: "process" },
      { key: "cartonSpeed", name: "小盒成型速度", unit: "包/分", source: "process" },
      { key: "envTemp", name: "环境温度", unit: "℃", source: "env" },
      { key: "envHum", name: "环境湿度", unit: "%", source: "env" },
    ],
  },
  roll: {
    process: "卷接",
    params: [
      { key: "rollSpeed", name: "卷接速度", unit: "支/分", source: "process" },
      { key: "fillValue", name: "烟丝填充值", unit: "cm³/g", source: "process" },
      { key: "filterPress", name: "滤棒成型压力", unit: "MPa", source: "process" },
      { key: "envTemp", name: "环境温度", unit: "℃", source: "env" },
      { key: "envHum", name: "环境湿度", unit: "%", source: "env" },
    ],
  },
};

// 参考范围（模拟值，待正式提供后替换）
export const PARAM_RANGES: Record<string, { low: number; high: number }> = {
  heatSeal: { low: 150, high: 168 },
  packPress: { low: 0.3, high: 0.45 },
  cartonSpeed: { low: 350, high: 400 },
  rollSpeed: { low: 6500, high: 7000 },
  fillValue: { low: 4.3, high: 4.8 },
  filterPress: { low: 0.24, high: 0.32 },
  envTemp: { low: 18, high: 28 },
  envHum: { low: 40, high: 65 },
};

// 启用预测模型的缺陷（同组共用展示参数；档案带出名称 / 部位）
export const FORECAST_DEFECTS: { code: string; group: GroupKey }[] = [
  { code: "HAZZC", group: "pack" }, // 小盒轧皱
  { code: "HAZPB", group: "pack" }, // 小盒轧破
  { code: "TAZZC", group: "pack" }, // 条轧皱
  { code: "JKKTB", group: "roll" }, // 空头
  { code: "JZSTC", group: "roll" }, // 滤嘴缩头
];

export function groupOf(code: string): GroupKey {
  return FORECAST_DEFECTS.find((d) => d.code === code)?.group ?? "pack";
}

// ============ 预测结果 ============

export interface TrendPoint {
  label: string; // 批次号（横轴刻度，如 97684）
  score: number; // 风险评分 0-1
  brand: string; // 牌号
  shiftGroup: string; // 班组（甲班/乙班/丙班）
  shiftLabel: string; // 班次（如 10-9白班）
}

export interface ForecastParamValue {
  key: string;
  value: number | null; // null = 参数缺失，展示 —
  phi: number; // 模型解释贡献：>0 增险 / <0 降险 / 0 无贡献
}

export interface DefectForecast {
  code: string;
  machine: string;
  score: number; // 当前风险评分（= 历史末点 = 未来首点）
  confidence: number; // 模型置信度 0-1
  updatedAt: string; // 预测更新时间（本次预测生成时刻）
  windowBatches: 10; // 预测窗口（未来批次数）
  hist: TrendPoint[]; // 历史风险（近5个批次 … 当前批次，实线）
  future: TrendPoint[]; // 未来预测（当前批次 … 未来10个批次，虚线）
  params: ForecastParamValue[]; // 本轮预测实际使用的参数
  insufficient?: boolean; // 必需输入不满足模型要求 → 整次预测标「数据不足」
}

// 风险等级：低 <0.40 黄 / 中 0.40-0.70 橙 / 高 ≥0.70 红
export function levelOf(score: number): {
  label: "低风险" | "中风险" | "高风险";
  color: string;
  badgeCls: string;
  textCls: string;
} {
  if (score >= 0.7)
    return { label: "高风险", color: "#ef4444", badgeCls: "bg-red-50 text-red-600", textCls: "text-red-500" };
  if (score >= 0.4)
    return { label: "中风险", color: "#f97316", badgeCls: "bg-orange-50 text-orange-600", textCls: "text-orange-500" };
  return { label: "低风险", color: "#eab308", badgeCls: "bg-yellow-50 text-yellow-600", textCls: "text-yellow-500" };
}

// ---- 原始组合定义（values / phis 与组参数顺序一一对应）----

interface ForecastSeed {
  code: string;
  machine: string;
  score: number;
  conf: number;
  updatedAt: string;
  // 趋势形态（生成 hist / future 序列）；surgeMid / surgeHigh = 当前低风险、
  // 预测窗口内分别越过中风险阈值 0.40 / 高风险阈值 0.70 的演示形态
  shape: "rising" | "falling" | "flat" | "surgeMid" | "surgeHigh";
  values: (number | null)[];
  phis: number[];
  insufficient?: boolean;
}

const SEEDS: ForecastSeed[] = [
  // ===== 小盒轧皱 =====
  {
    code: "HAZZC", machine: "5#卷接包机组", score: 0.84, conf: 0.86, updatedAt: "2026-10-09 08:00", shape: "rising",
    values: [172, 0.47, 410, 26, 68],
    phis: [0.21, 0.135, 0.095, 0, 0.06],
  },
  {
    code: "HAZZC", machine: "2#卷接包机组", score: 0.55, conf: 0.82, updatedAt: "2026-10-09 09:30", shape: "flat",
    values: [160, 0.44, 395, 25, 61],
    phis: [0.08, 0.06, 0, 0, 0.03],
  },
  {
    code: "HAZZC", machine: "4#卷接包机组", score: 0.32, conf: 0.88, updatedAt: "2026-10-09 08:30", shape: "falling",
    values: [155, 0.36, 370, 24, 55],
    phis: [0.012, -0.025, 0, 0, 0.008],
  },
  // ===== 小盒轧破 =====
  {
    code: "HAZPB", machine: "1#卷接包机组", score: 0.76, conf: 0.84, updatedAt: "2026-10-09 08:00", shape: "rising",
    values: [174, 0.46, 405, 27, 66],
    phis: [0.18, 0.12, 0.09, 0, 0.05],
  },
  {
    code: "HAZPB", machine: "3#卷接包机组", score: 0.48, conf: 0.8, updatedAt: "2026-10-09 09:00", shape: "flat",
    values: [162, 0.41, 388, 25, 58],
    phis: [0.07, 0.05, 0, 0, 0.02],
  },
  {
    // 环境湿度测点离线 → 必需输入不满足，整次预测「数据不足」
    code: "HAZPB", machine: "5#卷接包机组", score: 0, conf: 0, updatedAt: "2026-10-09 08:10", shape: "flat",
    values: [168, 0.43, 396, 26, null],
    phis: [0, 0, 0, 0, 0],
    insufficient: true,
  },
  // ===== 条轧皱 =====
  {
    code: "TAZZC", machine: "5#卷接包机组", score: 0.71, conf: 0.83, updatedAt: "2026-10-09 08:00", shape: "rising",
    values: [170, 0.46, 408, 26, 67],
    phis: [0.16, 0.11, 0.08, 0, 0.04],
  },
  {
    code: "TAZZC", machine: "4#卷接包机组", score: 0.62, conf: 0.81, updatedAt: "2026-10-09 09:15", shape: "rising",
    values: [166, 0.44, 398, 25, 63],
    phis: [0.12, 0.09, 0.06, 0, 0.03],
  },
  {
    code: "TAZZC", machine: "2#卷接包机组", score: 0.35, conf: 0.87, updatedAt: "2026-10-09 08:40", shape: "flat",
    values: [158, 0.38, 365, 24, 54],
    phis: [0, -0.02, 0.008, 0.012, 0],
  },
  // ===== 空头 =====
  {
    code: "JKKTB", machine: "3#卷接包机组", score: 0.81, conf: 0.85, updatedAt: "2026-10-09 08:00", shape: "rising",
    values: [7200, 4.1, 0.3, 26, 69],
    phis: [0.17, 0.15, 0.07, 0, 0.06],
  },
  {
    code: "JKKTB", machine: "1#卷接包机组", score: 0.58, conf: 0.79, updatedAt: "2026-10-09 09:20", shape: "flat",
    values: [6800, 4.4, 0.28, 25, 60],
    phis: [0.09, 0.06, 0, 0, 0.03],
  },
  {
    // 示例二：当前低风险（0.28）→ 预测窗口内越过高风险阈值 0.70（第9个批次 0.73）
    code: "JKKTB", machine: "5#卷接包机组", score: 0.28, conf: 0.86, updatedAt: "2026-10-09 08:50", shape: "surgeHigh",
    values: [7300, 4.0, 0.33, 28, 70],
    phis: [0.16, 0.14, 0.06, 0.01, 0.08],
  },
  // ===== 滤嘴缩头 =====
  {
    code: "JZSTC", machine: "2#卷接包机组", score: 0.66, conf: 0.82, updatedAt: "2026-10-09 08:00", shape: "rising",
    values: [7000, 4.3, 0.34, 25, 64],
    phis: [0.14, 0, 0.12, 0, 0.04],
  },
  {
    // 示例一：当前低风险（0.32）→ 预测窗口内越过中风险阈值 0.40（第4个批次 0.40，峰值 0.44 不及高风险）
    code: "JZSTC", machine: "4#卷接包机组", score: 0.32, conf: 0.84, updatedAt: "2026-10-09 09:10", shape: "surgeMid",
    values: [7100, 4.2, 0.33, 26, 66],
    phis: [0.11, 0.07, 0.05, 0, 0.03],
  },
  {
    code: "JZSTC", machine: "3#卷接包机组", score: 0.44, conf: 0.8, updatedAt: "2026-10-09 08:20", shape: "flat",
    values: [6900, 4.4, 0.3, 25, 58],
    phis: [0.06, 0.04, 0.03, 0, 0],
  },
];

// ---- 趋势序列生成（确定性，评分与当前批次点同口径）----

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp01 = (n: number) => Math.min(0.95, Math.max(0.05, n));

// 预测更新时间偏移 n 天 → 「M-D」展示（无前导零，与班次标签格式一致）
function addDayMD(iso: string, n: number): string {
  const d = new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`));
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

// 点位生产上下文（牌号/班组/班次）：班次按每日白班/夜班两班倒推定（当前班型由预测更新
// 时间推定，8~20 点白班），偏移奇数班取相反班型、日期 = 偏移天数÷2 向下取整；
// 牌号/班组以当前批次上下文为锚，按批次偏移轮换（负偏移取模回正）
function pointMetaOf(
  g: number, // 全局批次序号：历史 0..5（末位 = 当前批次）、预测 i → 5 + i
  updatedAt: string,
  brandAnchor: number,
  shiftAnchor: number
): { brand: string; shiftGroup: string; shiftLabel: string } {
  const s = g - 5; // 相对当前批次的偏移（负 = 历史）
  const hour = Number(updatedAt.slice(11, 13));
  const baseType = hour >= 8 && hour < 20 ? "白班" : "夜班";
  const type = (((s % 2) + 2) % 2) === 0 ? baseType : baseType === "白班" ? "夜班" : "白班";
  return {
    brand: BRAND_OPTIONS[(((brandAnchor + s) % BRAND_OPTIONS.length) + BRAND_OPTIONS.length) % BRAND_OPTIONS.length],
    shiftGroup: SHIFT_OPTIONS[(((shiftAnchor + s) % SHIFT_OPTIONS.length) + SHIFT_OPTIONS.length) % SHIFT_OPTIONS.length],
    shiftLabel: `${addDayMD(updatedAt, Math.floor(s / 2))}${type}`,
  };
}

// hist 形态系数（乘 score 得各点，近5个批次 + 当前批次）与 future 增量（当前 + 未来10个批次）；
// surge* 形态 = 低风险起步、窗口内加速上冲越过对应阈值
const HIST_FACTORS: Record<ForecastSeed["shape"], number[]> = {
  rising: [0.6, 0.66, 0.72, 0.79, 0.9, 1],
  falling: [1.28, 1.24, 1.19, 1.14, 1.07, 1],
  flat: [0.97, 1.01, 0.99, 1.03, 0.99, 1],
  surgeMid: [0.5, 0.56, 0.63, 0.72, 0.86, 1],
  surgeHigh: [0.55, 0.6, 0.68, 0.78, 0.9, 1],
};
const FUTURE_DELTAS: Record<ForecastSeed["shape"], number[]> = {
  rising: [0, 0.02, 0.04, 0.05, 0.06, 0.05, 0.04, 0.03, 0.02, 0.02, 0.01],
  falling: [0, -0.02, -0.04, -0.05, -0.06, -0.08, -0.09, -0.11, -0.12, -0.13, -0.14],
  flat: [0, 0.01, -0.01, 0.01, 0, -0.01, 0.01, 0, -0.01, 0, 0.01],
  // 0.32 → 0.44（第4个批次达 0.40 中风险，峰值不及高风险）
  surgeMid: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.11, 0.12, 0.12, 0.11, 0.1],
  // 0.28 → 0.76（第3个批次达中风险，第9个批次 0.73 达高风险）
  surgeHigh: [0, 0.04, 0.08, 0.13, 0.18, 0.24, 0.3, 0.36, 0.41, 0.45, 0.48],
};

function buildTrend(
  score: number,
  shape: ForecastSeed["shape"],
  updatedAt: string,
  code: string,
  machine: string
): { hist: TrendPoint[]; future: TrendPoint[] } {
  // 当前批次生产上下文（与对象信息行同源）：批次号 + 牌号/班组锚点
  const ctx = contextOf(code, machine);
  const baseBatch = Number(ctx.batch) || 90000;
  const brandAnchor = Math.max(0, BRAND_OPTIONS.indexOf(ctx.brand));
  const shiftAnchor = Math.max(0, SHIFT_OPTIONS.indexOf(ctx.shift));
  const hist = HIST_FACTORS[shape].map((f, i) => ({
    label: String(baseBatch - 5 + i),
    score: round2(clamp01(score * f)),
    ...pointMetaOf(i, updatedAt, brandAnchor, shiftAnchor),
  }));
  const future = FUTURE_DELTAS[shape].map((d, i) => ({
    label: String(baseBatch + i),
    score: round2(clamp01(score + d)),
    ...pointMetaOf(5 + i, updatedAt, brandAnchor, shiftAnchor),
  }));
  return { hist, future };
}

// 展开为完整预测结果
const FORECASTS: DefectForecast[] = SEEDS.map((s) => {
  const group = PARAM_GROUPS[groupOf(s.code)];
  const { hist, future } = buildTrend(s.score, s.shape, s.updatedAt, s.code, s.machine);
  return {
    code: s.code,
    machine: s.machine,
    score: s.score,
    confidence: s.conf,
    updatedAt: s.updatedAt,
    windowBatches: 10,
    hist,
    future,
    params: group.params.map((p, i) => ({ key: p.key, value: s.values[i], phi: s.phis[i] })),
    insufficient: s.insufficient,
  };
});

// ============ 查询接口 ============

// 出现该缺陷风险的机台（按评分降序；含数据不足机台）
export function forecastMachinesOf(code: string): { machine: string; score: number; insufficient: boolean }[] {
  return FORECASTS.filter((f) => f.code === code)
    .map((f) => ({ machine: f.machine, score: f.score, insufficient: !!f.insufficient }))
    .sort((a, b) => (a.insufficient === b.insufficient ? b.score - a.score : a.insufficient ? 1 : -1));
}

// 默认机台：风险最高且数据充足
export function topMachineOf(code: string): string {
  return forecastMachinesOf(code)[0]?.machine ?? "";
}

export function forecastOf(code: string, machine: string): DefectForecast | undefined {
  return FORECASTS.find((f) => f.code === code && f.machine === machine);
}

// 无检验记录的组合用确定性模拟兜底（批次 9 万段避开记录池，保证生产上下文完整展示）
function fallbackContext(code: string, machine: string): { batch: string; brand: string; shift: string } {
  let h = 0;
  const s = `${code}|${machine}`;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return {
    batch: String(90000 + (h % 9999)),
    brand: BRAND_OPTIONS[h % BRAND_OPTIONS.length],
    shift: SHIFT_OPTIONS[h % SHIFT_OPTIONS.length],
  };
}

// 生产上下文：批次 / 牌号 / 班次取该缺陷 + 机台最新检验记录带出，无记录时确定性模拟兜底；工序 = 组工序；部位 = 档案部位
export function contextOf(code: string, machine: string): {
  batch: string;
  brand: string;
  shift: string;
  process: string;
  part: string;
} {
  const cat = catalogOf(code);
  const rec = DEFECT_RECORDS.filter((r) => r.code === code && r.machine === machine).sort((a, b) =>
    `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
  )[0];
  const fb = fallbackContext(code, machine);
  return {
    batch: rec?.batch ?? fb.batch,
    brand: rec?.brand ?? fb.brand,
    shift: rec?.shift ?? fb.shift,
    process: PARAM_GROUPS[groupOf(code)].process,
    part: cat?.part ?? "—",
  };
}

// 高风险预测：当前批次已达阈值 / 预计N个批次内达阈值（首次越过 0.70 的批次序数）/ 未来10个批次未达阈值 / 暂无法预测
export function etaOf(f: DefectForecast): string {
  if (f.insufficient) return "暂无法预测";
  if (f.score >= 0.7) return "已达阈值";
  const idx = f.future.slice(1).findIndex((p) => p.score >= 0.7);
  if (idx >= 0) return `预计${idx + 1}个批次内达阈值`;
  return `未来${f.windowBatches}个批次未达阈值`;
}

// ============ 参数展示派生 ============

// 数值相对参考范围的方向：超上限 ↑ / 低于下限 ↓ / 范围内 → / 无基准或数值不展示
export function paramDirection(p: ForecastParamValue): {
  dir: "up" | "down" | "in" | "none";
  deviation: string; // 偏差展示：+4 / -0.2 / 0 / —
  rangeText: string; // 参考范围展示
} {
  const range = PARAM_RANGES[p.key];
  if (p.value === null || !range) return { dir: "none", deviation: "—", rangeText: range ? `${range.low} ~ ${range.high}` : "—" };
  if (p.value > range.high) {
    const d = round2(p.value - range.high);
    return { dir: "up", deviation: `+${d}`, rangeText: `${range.low} ~ ${range.high}` };
  }
  if (p.value < range.low) {
    const d = round2(p.value - range.low);
    return { dir: "down", deviation: `${d}`, rangeText: `${range.low} ~ ${range.high}` };
  }
  return { dir: "in", deviation: "0", rangeText: `${range.low} ~ ${range.high}` };
}

// 风险来源：φ>0 的参数按贡献降序 + 正向贡献占比（占全部增险因素份额）+ 来源分类
export function contributionsOf(f: DefectForecast): { key: string; name: string; unit: string; phi: number; pct: number; sourceLabel: string }[] {
  const group = PARAM_GROUPS[groupOf(f.code)];
  const pos = f.params.filter((p) => p.phi > 0);
  const sum = pos.reduce((s, p) => s + p.phi, 0) || 1;
  return pos
    .map((p) => {
      const def = group.params.find((d) => d.key === p.key)!;
      return {
        key: p.key,
        name: def.name,
        unit: def.unit,
        phi: p.phi,
        pct: Math.round((p.phi / sum) * 100),
        sourceLabel: def.source === "env" ? "车间环境" : group.process,
      };
    })
    .sort((a, b) => b.phi - a.phi);
}

// 风险降低因素：φ<0 的参数（不进来源排序，单独展示）
export function reducingFactorsOf(f: DefectForecast): { key: string; name: string; phi: number }[] {
  const group = PARAM_GROUPS[groupOf(f.code)];
  return f.params
    .filter((p) => p.phi < 0)
    .map((p) => ({ key: p.key, name: group.params.find((d) => d.key === p.key)?.name ?? p.key, phi: p.phi }));
}

// 来源工序分布：按来源分类汇总正向贡献占比（包装 / 卷接 + 车间环境）
export function sourceBreakdownOf(f: DefectForecast): { name: string; pct: number; value: number }[] {
  const contributions = contributionsOf(f);
  const map = new Map<string, number>();
  for (const c of contributions) map.set(c.sourceLabel, (map.get(c.sourceLabel) ?? 0) + c.phi);
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: round2(value), pct: Math.round((value / (contributions.reduce((s, c) => s + c.phi, 0) || 1)) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

// ============ AI 风险解读（模板 + 数据引用，不编造预测值）============

// 各参数对应的重点核查动作
const ADVICE: Record<string, string> = {
  heatSeal: "热封温度控温精度与加热辊状态",
  packPress: "包装压力设定与压辊机构磨损",
  cartonSpeed: "小盒成型速度与换批后参数复位",
  rollSpeed: "卷接速度与机台转速稳定性",
  fillValue: "烟丝填充值及掺配均匀性",
  filterPress: "滤棒成型压力与搓板状态",
  envTemp: "车间温度测点与空调工况",
  envHum: "车间湿度测点与除湿设备运行",
};

// AI 解读段落：主题 + 正文（视图按「主题：正文」渲染）
export interface DefectAiSection {
  topic: "风险概况" | "参数关注" | "核查重点";
  text: string;
}

// 数据不足的组合由视图层拦截，不进入本函数
export function aiInterpretation(f: DefectForecast, code: string, machine: string): DefectAiSection[] {
  const name = catalogOf(code)?.name ?? code;
  const level = levelOf(f.score);
  const s0 = f.future[0]?.score ?? f.score;
  const s8 = f.future[f.future.length - 1]?.score ?? f.score;
  const trendWord = s8 > s0 + 0.01 ? "上升" : s8 < s0 - 0.01 ? "回落" : "持平";
  // 首次越过阈值的批次序数：高风险优先；当前低风险且未达高风险时，看是否将越过中风险线
  const firstHigh = f.future.slice(1).findIndex((p) => p.score >= 0.7);
  const firstMid = f.future.slice(1).findIndex((p) => p.score >= 0.4);
  const peakNote =
    f.score < 0.7 && firstHigh >= 0
      ? `，预计第${firstHigh + 1}个批次起进入高风险区间`
      : f.score < 0.4 && firstMid >= 0
        ? `，预计第${firstMid + 1}个批次起进入中风险区间`
        : "";

  // 超出参考范围的参数（偏差展示）
  const group = PARAM_GROUPS[groupOf(code)];
  const outOfRange = f.params
    .map((p) => {
      const def = group.params.find((d) => d.key === p.key)!;
      const { dir, deviation } = paramDirection(p);
      const value = p.value;
      return { def, dir, deviation, value };
    })
    .filter((x) => x.dir === "up" || x.dir === "down");
  const outOfRangeText =
    outOfRange.length > 0
      ? `${outOfRange
          .slice(0, 2)
          .map((x) => `${x.def.name}（${x.value} ${x.def.unit}，${x.dir === "up" ? "超出参考上限" : "低于参考下限"} ${x.deviation.replace("+", "")}）`)
          .join("、")}；参数方向偏离不直接视为因果证据。`
      : "各参数均在参考范围内，整体偏离较小；参数方向偏离不直接视为因果证据。";

  const top = contributionsOf(f)[0];
  const reducing = reducingFactorsOf(f);
  const reducingText = reducing.length ? `；${reducing.map((r) => `${r.name}（${r.phi}）为风险降低因素` ).join("、")}` : "";

  return [
    {
      topic: "风险概况",
      text: `当前 ${machine} ${name}风险评分 ${f.score.toFixed(2)}（${level.label}），模型置信度 ${Math.round(f.confidence * 100)}%；未来${f.windowBatches}个批次预计由 ${s0.toFixed(2)} ${trendWord}至 ${s8.toFixed(2)}${peakNote}。`,
    },
    { topic: "参数关注", text: outOfRangeText },
    {
      topic: "核查重点",
      text: top ? `建议优先核查${ADVICE[top.key]}${reducingText}。` : `本轮无显著增险参数，维持常规巡检${reducingText}。`,
    },
  ];
}
