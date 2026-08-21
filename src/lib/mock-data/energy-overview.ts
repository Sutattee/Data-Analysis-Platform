// 能源总览 — 模拟数据（确定性生成：固定锚点，无 Date.now / Math.random）
// 数据从 2024-01 起至当前；单位：单箱综合能耗 kgce/箱、电耗 kWh/箱、蒸汽 t、天然气 Nm³、碳排放 kg CO₂（口径 kg CO₂/万支）
import { GRADE_TO_LEVEL, pickAlertRecordId, type AnomalyDetail, type EvalGrade } from "./grid-forecast";

// ===== 时间锚点（固定，保证刷新稳定）=====
const END_DATE = new Date(2026, 7, 9); // 日度末点 2026-08-09
const MONTH_START = new Date(2024, 0, 1); // 月度起点 2024-01
const TOTAL_MONTHS = 32; // 2024-01 ~ 2026-08

export interface HistPoint {
  date: string; // x 轴显示（月度 "2024/1"、日度 "8/9"）
  iso: string; // 完整日期 "2026-08-09"
  actual: number; // 实际值
  avg?: number; // 历史均值
  target?: number; // 目标值
  anomaly?: EvalGrade; // 异常等级（异常点标记）
  causeEmpty?: boolean; // 演示「数据不足 → 补录异常原因」的点
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const round = (v: number, decimals: number) => {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
};

// 异常等级 → 实际值抬升幅度（能耗类指标：高于基准即异常）
const GRADE_LIFT: Record<EvalGrade, number> = { 优秀: 1, 良好: 1, 一般: 1.04, 预警: 1.08, 危险: 1.13 };
const GRADE_ORDER: EvalGrade[] = ["优秀", "良好", "一般", "预警", "危险"];
const pickHighestGrade = (grades: EvalGrade[]): EvalGrade | undefined =>
  grades.length ? grades.reduce((a, b) => (GRADE_ORDER.indexOf(b) > GRADE_ORDER.indexOf(a) ? b : a)) : undefined;

interface GenCfg {
  base: number; // 实际值基准（带缓慢下降的节能趋势）
  avgBase?: number; // 历史均值基准
  target?: number;
  seed: number;
  waveAmp?: number; // 波动幅度比例（默认月 0.03 / 日 0.05）
  drift?: number; // 每期缓慢下降比例
  decimals?: number;
  anomalies?: { offset: number; grade: EvalGrade }[]; // 自末尾的偏移
  emptyCauseOffset?: number; // 该异常点不带 AI 原因（演示补录）
}

// 按「自末尾偏移」注入异常点并抬升实际值
function applyAnomalies(pts: HistPoint[], cfg: GenCfg, decimals: number) {
  for (const a of cfg.anomalies ?? []) {
    const pt = pts[pts.length - 1 - a.offset];
    if (!pt) continue;
    pt.anomaly = a.grade;
    pt.actual = round(pt.actual * GRADE_LIFT[a.grade], decimals);
    if (cfg.emptyCauseOffset === a.offset) pt.causeEmpty = true;
  }
}

// 月度序列：2024-01 起 32 个点
function genMonthly(cfg: GenCfg): HistPoint[] {
  const { base, avgBase, target, seed, decimals = 1 } = cfg;
  const waveAmp = cfg.waveAmp ?? 0.03;
  const drift = cfg.drift ?? 0.0018;
  const pts: HistPoint[] = [];
  for (let i = 0; i < TOTAL_MONTHS; i++) {
    const d = new Date(MONTH_START.getFullYear(), MONTH_START.getMonth() + i, 1);
    const actual = base * (1 - drift * i) + Math.sin((seed + i) * 0.9) * base * waveAmp;
    pts.push({
      date: `${d.getFullYear()}/${d.getMonth() + 1}`,
      iso: iso(d),
      actual: round(actual, decimals),
      avg: avgBase !== undefined ? round(avgBase * (1 + Math.sin((seed + i) * 0.5) * 0.008), decimals) : undefined,
      target,
    });
  }
  applyAnomalies(pts, cfg, decimals);
  return pts;
}

// 日度序列：2024-01-01 ~ 2026-08-09
function genDaily(cfg: GenCfg): HistPoint[] {
  const { base, avgBase, target, seed, decimals = 1 } = cfg;
  const waveAmp = cfg.waveAmp ?? 0.05;
  const drift = cfg.drift ?? 0.00006;
  const pts: HistPoint[] = [];
  const d = new Date(MONTH_START);
  let i = 0;
  while (d <= END_DATE) {
    const actual = base * (1 - drift * i) + Math.sin((seed + i) * 0.7) * base * waveAmp;
    pts.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      iso: iso(d),
      actual: round(actual, decimals),
      avg: avgBase !== undefined ? round(avgBase * (1 + Math.sin((seed + i) * 0.3) * 0.01), decimals) : undefined,
      target,
    });
    d.setDate(d.getDate() + 1);
    i++;
  }
  applyAnomalies(pts, cfg, decimals);
  return pts;
}

// ===== 序列键 =====
export type SeriesKey =
  | "comprehensive" // 单箱综合能耗（月 + 周聚合用日度）
  | "electricity" // 单箱电耗（月 + 日）
  | "carbon" // 单位产值碳排放（月）
  | "silkPower" // 制丝车间每公斤电耗（日）
  | "packPower" // 卷包车间单箱电耗（日，支持万支口径切换）
  | "steamTotal" // 蒸汽耗总量（日）
  | "steamSilk" // 制丝车间单位产量蒸汽耗（日）
  | "steamHvac" // 空调系统每日蒸汽耗（日）
  | "gasUnit" // 天然气单耗（日）
  | "gasBoiler" // 锅炉天然气总能耗（日）
  | "gasSilk"; // 制丝车间天然气总能耗（日）

// ===== 序列 =====
// 单箱综合能耗：月度（实际 / 历史均值 / 目标 31.0）
export const COMPREHENSIVE_MONTHLY = genMonthly({
  base: 30.5, avgBase: 30.6, target: 31.0, seed: 3, decimals: 1,
  anomalies: [
    { offset: 6, grade: "预警" },
    { offset: 15, grade: "危险" },
    { offset: 24, grade: "一般" },
  ],
  emptyCauseOffset: 6,
});
// 单箱综合能耗日度（仅供「近12周」聚合，不直接展示）
const COMPREHENSIVE_DAILY = genDaily({
  base: 30.3, avgBase: 30.6, seed: 3, decimals: 1,
  anomalies: [{ offset: 70, grade: "预警" }, { offset: 31, grade: "一般" }],
});

// 单箱电耗：月度 + 日度
export const ELECTRICITY_MONTHLY = genMonthly({
  base: 24.95, avgBase: 25.0, seed: 7, decimals: 1,
  anomalies: [{ offset: 7, grade: "一般" }, { offset: 18, grade: "预警" }],
});
export const ELECTRICITY_DAILY = genDaily({
  base: 24.7, avgBase: 25.0, seed: 7, decimals: 1,
  anomalies: [{ offset: 9, grade: "一般" }, { offset: 33, grade: "预警" }, { offset: 58, grade: "一般" }],
});

// 单位产量碳排放：月度（口径 kg CO₂/万支；实际 + 目标 0.035，无均值线）
export const CARBON_MONTHLY = genMonthly({
  base: 0.0338, target: 0.035, seed: 11, decimals: 3,
  drift: 0.002, waveAmp: 0.02,
  anomalies: [{ offset: 5, grade: "一般" }, { offset: 20, grade: "预警" }],
});

// 车间单位电耗（日 + 月）
const SILK_POWER_DAILY = genDaily({ base: 0.46, avgBase: 0.47, seed: 13, decimals: 2, anomalies: [{ offset: 12, grade: "预警" }, { offset: 42, grade: "一般" }] });
const PACK_POWER_DAILY = genDaily({ base: 20.4, avgBase: 20.8, seed: 17, decimals: 1, anomalies: [{ offset: 21, grade: "一般" }, { offset: 50, grade: "危险" }] });
// 月度序列（供「电耗趋势」月档：制丝车间每公斤电耗 / 卷包车间单位电耗）
export const SILK_POWER_MONTHLY = genMonthly({ base: 0.462, avgBase: 0.47, seed: 13, decimals: 2, anomalies: [{ offset: 6, grade: "预警" }, { offset: 17, grade: "一般" }] });
export const PACK_POWER_MONTHLY = genMonthly({ base: 20.5, avgBase: 20.8, seed: 17, decimals: 1, anomalies: [{ offset: 9, grade: "一般" }, { offset: 20, grade: "危险" }] });

// 蒸汽（日）
const STEAM_TOTAL_DAILY = genDaily({ base: 126, avgBase: 129, seed: 19, decimals: 0, waveAmp: 0.06, anomalies: [{ offset: 11, grade: "危险" }, { offset: 37, grade: "预警" }, { offset: 63, grade: "一般" }] });
const STEAM_SILK_DAILY = genDaily({ base: 0.32, avgBase: 0.33, seed: 23, decimals: 2, anomalies: [{ offset: 28, grade: "一般" }] });
const STEAM_HVAC_DAILY = genDaily({ base: 27.5, avgBase: 29.0, seed: 29, decimals: 1, waveAmp: 0.08, anomalies: [{ offset: 8, grade: "一般" }, { offset: 45, grade: "预警" }] });

// 天然气（日）
const GAS_UNIT_DAILY = genDaily({ base: 0.027, avgBase: 0.029, seed: 31, decimals: 3, anomalies: [{ offset: 19, grade: "预警" }, { offset: 52, grade: "一般" }] });
const GAS_BOILER_DAILY = genDaily({ base: 2650, avgBase: 2720, seed: 37, decimals: 0, waveAmp: 0.06, anomalies: [{ offset: 30, grade: "危险" }, { offset: 66, grade: "一般" }] });
const GAS_SILK_DAILY = genDaily({ base: 540, avgBase: 560, seed: 41, decimals: 0, anomalies: [{ offset: 14, grade: "一般" }] });

// 日度展示序列（页签类图表按 key 取用，统一渲染近 90 天窗口）
export const DAILY_SERIES: Record<Exclude<SeriesKey, "comprehensive" | "electricity" | "carbon">, HistPoint[]> = {
  silkPower: SILK_POWER_DAILY,
  packPower: PACK_POWER_DAILY,
  steamTotal: STEAM_TOTAL_DAILY,
  steamSilk: STEAM_SILK_DAILY,
  steamHvac: STEAM_HVAC_DAILY,
  gasUnit: GAS_UNIT_DAILY,
  gasBoiler: GAS_BOILER_DAILY,
  gasSilk: GAS_SILK_DAILY,
};

// ===== 窗口 / 聚合工具 =====
// 近 n 天
export function lastDays(pts: HistPoint[], n: number): HistPoint[] {
  return pts.slice(-n);
}

// 近 n 周聚合（每 7 天一组，自末端对齐；组内异常取最高等级）
export function lastWeeks(pts: HistPoint[], n: number, decimals = 1): HistPoint[] {
  const out: HistPoint[] = [];
  const win = pts.slice(-(n * 7));
  for (let w = 0; w < n; w++) {
    const group = win.slice(w * 7, w * 7 + 7);
    if (group.length === 0) continue;
    const first = group[0];
    out.push({
      date: first.date,
      iso: first.iso,
      actual: round(group.reduce((s, p) => s + p.actual, 0) / group.length, decimals),
      avg: round(group.reduce((s, p) => s + (p.avg ?? 0), 0) / group.length, decimals),
      target: first.target,
      anomaly: pickHighestGrade(group.filter((p) => p.anomaly).map((p) => p.anomaly!)),
      causeEmpty: group.some((p) => p.causeEmpty),
    });
  }
  return out;
}

// 近12周（综合能耗周档）
export const COMPREHENSIVE_WEEKLY = lastWeeks(COMPREHENSIVE_DAILY, 12);

// 按年聚合月度序列（年档：每年均值）
export function byYear(pts: HistPoint[], decimals = 1): HistPoint[] {
  const map = new Map<string, HistPoint[]>();
  for (const p of pts) {
    const y = p.iso.slice(0, 4);
    map.set(y, [...(map.get(y) ?? []), p]);
  }
  const out: HistPoint[] = [];
  map.forEach((list, y) => {
    out.push({
      date: y,
      iso: `${y}-01-01`,
      actual: round(list.reduce((s, p) => s + p.actual, 0) / list.length, decimals),
      avg: round(list.reduce((s, p) => s + (p.avg ?? 0), 0) / list.length, decimals),
      target: list[0].target,
    });
  });
  return out;
}

// ===== 异常详情构造 =====
interface SeriesMeta {
  label: string;
  unit: string;
  dept: string;
  summary: string; // 「主要受 X 和 Y 共同影响」
  reasons: [string, string, string]; // 首要 / 其次 / 此外（含影响程度与可信度）
  suggestion: string;
}

export const SERIES_META: Record<SeriesKey, SeriesMeta> = {
  comprehensive: {
    label: "单箱卷烟综合能耗", unit: "kgce/箱", dept: "卷包车间",
    summary: "产量下降和制冷效率降低",
    reasons: [
      "卷包车间排产减少2个班次，日产量下降12%，固定能耗未同步下降，单位产量分摊能耗增加，影响程度高、可信度高",
      "AH13制冷主机COP由4.2降至3.1，设备电耗同步上升，对单箱能耗产生中等程度影响，可信度高",
      "外界温度由28℃升至35℃，可能进一步增加空调及制冷负荷，影响程度低、可信度中",
    ],
    suggestion: "复核卷包排产计划与固定负荷停机策略，安排 AH13 制冷主机维保并跟踪 COP 恢复情况。",
  },
  electricity: {
    label: "单箱电耗", unit: "kWh/箱", dept: "全厂",
    summary: "空压系统效率下降和排产波动",
    reasons: [
      "空压机频繁加卸载，系统效率下降约6%，影响程度高、可信度高",
      "卷包车间机台投运不均衡，峰时段负荷集中，影响程度中、可信度高",
      "环境温度升高导致空调制冷负荷增加，影响程度低、可信度中",
    ],
    suggestion: "检查空压机加卸载压力带宽与管网泄漏，优化机台投运排布与错峰用电。",
  },
  carbon: {
    label: "单位产量碳排放量", unit: "kg CO₂/万支", dept: "全厂",
    summary: "外购电力占比上升和产量波动",
    reasons: [
      "外购电力占比上升，电网碳排放因子季节性偏高，间接排放增加，影响程度高、可信度高",
      "当月产量较基准期下降约4%，单位产量分摊排放上升，影响程度中、可信度高",
      "天然气锅炉负荷增加，直接排放小幅上升，影响程度低、可信度中",
    ],
    suggestion: "优化外购电力的绿电采购结构，复核高碳时段负荷安排，跟踪产量与排放的联动口径。",
  },
  silkPower: {
    label: "制丝车间每公斤电耗", unit: "kWh/kg", dept: "制丝车间",
    summary: "产量下降和除尘系统长时运行",
    reasons: [
      "制丝批次减少，日产量下降，除尘、纯水等固定负荷未同步停机，影响程度高、可信度高",
      "除尘风机工频长时运行，未随线体负荷联动调频，影响程度中、可信度高",
      "车间温湿度控制要求提升，空调新风负荷增加，影响程度低、可信度中",
    ],
    suggestion: "按批次联动启停除尘与纯水系统，评估风机变频改造与运行联锁策略。",
  },
  packPower: {
    label: "卷包车间单箱电耗", unit: "kWh/箱", dept: "卷包车间",
    summary: "排产减少和设备空转",
    reasons: [
      "卷包排产减少2个班次，机台固定待机能耗未同步下降，影响程度高、可信度高",
      "包装机组换牌号频次增加，单班有效产出下降，影响程度中、可信度高",
      "车间照明与空调按班次全额投运，影响程度低、可信度中",
    ],
    suggestion: "按排产联动控制待机设备与辅助系统投运，优化换牌号排程减少空车损耗。",
  },
  steamTotal: {
    label: "蒸汽耗总量", unit: "t", dept: "动力车间",
    summary: "锅炉负荷率下降和管网损耗",
    reasons: [
      "锅炉低负荷运行，热效率下降，产汽单耗上升，影响程度高、可信度高",
      "蒸汽管网疏水阀存在内漏，管网损耗增加，影响程度中、可信度高",
      "外界温度下降伴热负荷增加，影响程度低、可信度中",
    ],
    suggestion: "评估锅炉经济负荷区间与并炉策略，排查疏水阀内漏点并安排检修。",
  },
  steamSilk: {
    label: "制丝车间单位产量蒸汽耗", unit: "kg/kg", dept: "制丝车间",
    summary: "烘丝工序负荷波动",
    reasons: [
      "烘丝批次不饱和，筒壁预热能耗分摊上升，影响程度高、可信度高",
      "烘丝工艺参数调整，排潮风量增大，影响程度中、可信度中",
      "蒸汽压力波动导致换热效率下降，影响程度低、可信度中",
    ],
    suggestion: "合并烘丝批次提高饱和度，复核工艺排潮参数与蒸汽压力稳定策略。",
  },
  steamHvac: {
    label: "空调系统每日蒸汽耗", unit: "t", dept: "动力车间",
    summary: "温湿度控制要求提升",
    reasons: [
      "外界湿度升高，除湿再热负荷显著增加，影响程度高、可信度高",
      "车间温湿度标准收紧，空调运行工况上移，影响程度中、可信度高",
      "表冷器结垢导致换热效率下降，影响程度低、可信度中",
    ],
    suggestion: "复核车间温湿度控制标准裕量，安排空调表冷器清洗，评估转轮除湿替代方案。",
  },
  gasUnit: {
    label: "天然气单耗", unit: "Nm³/箱", dept: "动力车间",
    summary: "锅炉效率下降和产量波动",
    reasons: [
      "锅炉受热面积灰，排烟温度升高，燃气利用效率下降，影响程度高、可信度高",
      "当期产量下降，固定燃气负荷分摊上升，影响程度中、可信度高",
      "燃气管网压力波动，燃烧工况偏移，影响程度低、可信度中",
    ],
    suggestion: "安排锅炉吹灰与燃烧工况调校，跟踪排烟温度与效率恢复情况。",
  },
  gasBoiler: {
    label: "锅炉天然气总能耗", unit: "Nm³", dept: "动力车间",
    summary: "采暖负荷增加和效率下降",
    reasons: [
      "气温下降致采暖与伴热负荷增加，锅炉出力上升，影响程度高、可信度高",
      "锅炉受热面积灰，产汽单耗上升，影响程度中、可信度高",
      "蒸汽管网输送损耗增加，影响程度低、可信度中",
    ],
    suggestion: "按负荷曲线优化锅炉并炉台数，安排吹灰与管网保温检查。",
  },
  gasSilk: {
    label: "制丝车间天然气总能耗", unit: "Nm³", dept: "制丝车间",
    summary: "烘丝与膨胀工序负荷上升",
    reasons: [
      "烘丝工序排产增加，燃烧负荷上升，影响程度高、可信度高",
      "膨胀线开机时长增加，影响程度中、可信度中",
      "燃气管网压力波动导致燃烧效率下降，影响程度低、可信度低",
    ],
    suggestion: "复核烘丝与膨胀工序排产的能源协同安排，跟踪燃烧效率与压力稳定性。",
  },
};

// 图表异常点 → 抽屉详情（metaOverride：覆盖标题/单位口径，如卷包电耗切换「万支」展示）
export function buildOverviewAnomaly(
  key: SeriesKey,
  pt: HistPoint,
  metaOverride?: Partial<Pick<SeriesMeta, "label" | "unit">>
): AnomalyDetail {
  const meta = { ...SERIES_META[key], ...metaOverride };
  const grade = pt.anomaly ?? "一般";
  const baseVal = pt.target ?? pt.avg ?? pt.actual;
  const value = `${pt.actual} ${meta.unit}`;
  const cause = pt.causeEmpty
    ? ""
    : `经分析，本次${meta.label}升至 ${value}，主要受${meta.summary}共同影响。\n首要原因是${meta.reasons[0]}；\n其次，${meta.reasons[1]}；\n此外，${meta.reasons[2]}。`;
  return {
    title: `${meta.label}异常`,
    dept: meta.dept,
    metricName: meta.label,
    current: value,
    baseline: pt.target !== undefined ? `目标 ≤${pt.target} ${meta.unit}` : `历史均值 ${pt.avg} ${meta.unit}`,
    deviation: `超出基准 ${(((pt.actual - baseVal) / baseVal) * 100).toFixed(1)}%`,
    triggerTime: `${pt.iso} 09:20`,
    duration: "2小时40分钟",
    cause,
    suggestion: meta.suggestion,
    recordId: pickAlertRecordId(meta.dept),
    level: GRADE_TO_LEVEL[grade],
  };
}

// ===== 顶部指标卡（数值按考核口径示例）=====
export interface OverviewCard {
  key: string;
  label: string;
  period: "本月" | "本季度";
  value: number;
  unit: string;
  decimals: number;
  compare?: { label: string; text: string; good: boolean }; // 目标 / 历史均值对比行
  yoy?: number; // 同比 %
  mom?: number; // 环比 %
  goodDirection: "down" | "up"; // 值下降为好 / 上升为好（决定涨跌配色语义）
  grade?: EvalGrade; // 评价等级（色条 + 角标；预警/危险加异常图标）
  // 单位切换支持：箱 ↔ 万支
  unitToggle?: {
    altUnit: string; // 切换后的单位
    convertFactor: number; // 原值 × convertFactor = 切换后的值
    altDecimals?: number; // 切换后的小数位（可选，不指定则保持原 decimals）
    altCompare?: { label: string; text: string; good: boolean }; // 切换后的对比文案
  };
}

export const overviewCards: OverviewCard[] = [
  {
    key: "comprehensive", label: "单箱卷烟综合能耗", period: "本月",
    value: 29.8, unit: "kgce/箱", decimals: 1,
    compare: { label: "目标 ≤31.0", text: "低于目标 1.2 kgce/箱（3.9%）", good: true },
    yoy: -3.5, mom: -1.8, goodDirection: "down", grade: "良好",
    unitToggle: {
      altUnit: "kgce/万支", convertFactor: 0.2, altDecimals: 2,
      altCompare: { label: "目标 ≤6.20", text: "低于目标 0.24 kgce/万支（3.9%）", good: true },
    },
  },
  {
    key: "electricity", label: "单箱电耗", period: "本月",
    value: 24.6, unit: "kWh/箱", decimals: 1,
    compare: { label: "历史均值 25.0", text: "低于历史均值 0.4 kWh/箱（-1.6%）", good: true },
    yoy: -2.7, mom: -0.9, goodDirection: "down", grade: "优秀",
    unitToggle: {
      altUnit: "kWh/万支", convertFactor: 0.2, altDecimals: 2,
      altCompare: { label: "历史均值 5.00", text: "低于历史均值 0.08 kWh/万支（1.6%）", good: true },
    },
  },
  {
    key: "steam", label: "蒸汽耗总量", period: "本月",
    value: 3860, unit: "t", decimals: 0,
    compare: { label: "历史均值 4,000", text: "低于历史均值 140 t（-3.5%）", good: true },
    yoy: -4.2, mom: 1.3, goodDirection: "down", grade: "一般",
  },
  {
    key: "gas", label: "单箱天然气耗", period: "本月",
    value: 0.82, unit: "Nm³/箱", decimals: 2,
    compare: { label: "历史均值 0.90", text: "低于历史均值 0.08 Nm³/箱（-8.9%）", good: true },
    yoy: -5.7, mom: -2.2, goodDirection: "down", grade: "优秀",
    unitToggle: {
      altUnit: "Nm³/万支", convertFactor: 0.2, altDecimals: 3,
      altCompare: { label: "历史均值 0.180", text: "低于历史均值 0.016 Nm³/万支（8.9%）", good: true },
    },
  },
  {
    key: "carbon", label: "单位产量碳排放量", period: "本季度",
    value: 0.032, unit: "kg CO₂/万支", decimals: 3,
    compare: { label: "目标 ≤0.035", text: "低于目标 0.003 kg CO₂/万支", good: true },
    yoy: -5.6, mom: -2.1, goodDirection: "down", grade: "优秀",
    unitToggle: {
      altUnit: "kg CO₂/箱", convertFactor: 5, altDecimals: 4,
      altCompare: { label: "目标 ≤0.175", text: "低于目标 0.015 kg CO₂/箱", good: true },
    },
  },
  {
    key: "waterPerOutput", label: "单位产量水耗", period: "本季度",
    value: 0.12, unit: "m³/万支", decimals: 2,
    yoy: -4.1, mom: -1.6, goodDirection: "down", grade: "优秀",
    unitToggle: {
      altUnit: "m³/箱", convertFactor: 5, altDecimals: 2,
    },
  },
  {
    key: "cod", label: "污水COD", period: "本季度",
    value: 42, unit: "mg/L", decimals: 0,
    goodDirection: "down", grade: "良好",
  },
];

// 碳排放分类卡（按月展示一 / 二 / 三 / 四类碳排放）
export const carbonBreakdown = {
  period: "本月",
  unit: "kg CO₂",
  items: [
    { label: "第一类碳排放", value: 385.6 },
    { label: "第二类碳排放", value: 1248.3 },
    { label: "第三类碳排放", value: 96.5 },
    { label: "第四类碳排放", value: 42.8 },
  ],
};

// ===== 区域电耗对比（当日，kWh；实际 vs 历史均值）=====
export const DEPT_POWER = [
  { name: "制丝车间", actual: 52300, avg: 50800 },
  { name: "卷包车间", actual: 48600, avg: 47200 },
  { name: "动力车间", actual: 38600, avg: 37200 },
  { name: "机房", actual: 12400, avg: 13100 },
  { name: "办公区域", actual: 4800, avg: 4600 },
  { name: "食堂", actual: 3200, avg: 3050 },
  { name: "原辅料仓库", actual: 2100, avg: 1980 },
];
