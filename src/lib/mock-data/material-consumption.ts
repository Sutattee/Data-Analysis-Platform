// 辅料消耗（生产管理） — 模拟数据：确定性生成，数据锚点与能源总览一致（2026-08-09）
// 指标：单箱耗盘纸量（米/箱）/ 单箱耗商标纸小盒量（张/箱）/ 单箱耗烟叶量（公斤/箱）/ 单箱耗嘴棒量（支/箱）
import {
  GRADE_TO_LEVEL,
  type AnomalyDetail,
  type EvalGrade,
  type MaterialAnomalyRows,
  type MaterialBrandRow,
} from "./grid-forecast";
import { genDaily, genMonthly, lastDays, type HistPoint } from "./energy-overview";
import { ALERT_RECORDS } from "./alerts";

export const LATEST_ISO = "2026-08-09"; // 数据锚点（与能源总览 END_DATE 一致）

export type MaterialKey = "tipPaper" | "boxLabel" | "tobacco" | "filterRod";

// 异常自动标注：按规则扫描越线点，按超出幅度定级（不覆盖手动注入的等级）
// 超出 <1% 视为正常波动（提示级，不标点）；≥1% 一般 / ≥3% 预警 / ≥6% 告警 / ≥10% 危险
function autoMark(pts: HistPoint[], rule: "avg" | "target"): HistPoint[] {
  return pts.map((p) => {
    if (p.anomaly) return p;
    const base = rule === "target" ? p.target : p.avg;
    if (base === undefined || p.actual <= base) return p;
    const over = (p.actual - base) / base;
    if (over < 0.01) return p;
    const grade: EvalGrade = over >= 0.10 ? "危险" : over >= 0.06 ? "告警" : over >= 0.03 ? "预警" : "一般";
    return { ...p, anomaly: grade };
  });
}

// ===== 序列（日 / 月；无趋势性改善，drift=0）=====
// 异常点：日/月粒度均展示。盘纸无目标值，实际值高于历史均值时标记；其余指标实际值高于目标值时标记；
// 月度基线距目标较远的指标（烟叶/嘴棒）额外注入确定性异常点保证可见性
const TIP_PAPER_DAILY = autoMark(
  genDaily({
    base: 29.7, avgBase: 30.0, seed: 23, decimals: 1, drift: 0, waveAmp: 0.012,
    anomalies: [{ offset: 12, grade: "一般" }, { offset: 26, grade: "告警" }, { offset: 61, grade: "预警" }],
  }),
  "avg"
);
const TIP_PAPER_MONTHLY = autoMark(
  genMonthly({ base: 29.7, avgBase: 30.0, seed: 23, decimals: 1, drift: 0, waveAmp: 0.02 }),
  "avg"
);

// 商标纸（小盒）：实际值高于目标值时标记异常
const BOX_LABEL_DAILY = autoMark(
  genDaily({
    base: 2495, avgBase: 2520, target: 2480, seed: 29, decimals: 0, drift: 0, waveAmp: 0.006,
    anomalies: [{ offset: 18, grade: "危险" }, { offset: 47, grade: "预警" }],
    emptyCauseOffset: 47, // 演示：该异常点无 AI 原因，走人工补录
  }),
  "target"
);
const BOX_LABEL_MONTHLY = autoMark(
  genMonthly({
    base: 2495, avgBase: 2520, target: 2480, seed: 29, decimals: 0, drift: 0, waveAmp: 0.015,
    anomalies: [{ offset: 8, grade: "预警" }],
  }),
  "target"
);

// 烟叶：实际值高于目标值时标记异常
const TOBACCO_DAILY = autoMark(
  genDaily({
    base: 38.5, avgBase: 39.5, target: 40.0, seed: 31, decimals: 1, drift: 0, waveAmp: 0.025,
    anomalies: [{ offset: 9, grade: "告警" }, { offset: 55, grade: "一般" }],
  }),
  "target"
);
const TOBACCO_MONTHLY = autoMark(
  genMonthly({
    base: 38.5, avgBase: 39.5, target: 40.0, seed: 31, decimals: 1, drift: 0, waveAmp: 0.02,
    anomalies: [{ offset: 14, grade: "告警" }, { offset: 27, grade: "一般" }],
  }),
  "target"
);

// 嘴棒：实际值高于目标值时标记异常
const FILTER_ROD_DAILY = autoMark(
  genDaily({
    base: 47000, avgBase: 51000, target: 48000, seed: 37, decimals: 0, drift: 0, waveAmp: 0.035,
    anomalies: [{ offset: 22, grade: "预警" }, { offset: 70, grade: "危险" }],
  }),
  "target"
);
const FILTER_ROD_MONTHLY = autoMark(
  genMonthly({
    base: 47000, avgBase: 51000, target: 48000, seed: 37, decimals: 0, drift: 0, waveAmp: 0.02,
    anomalies: [{ offset: 5, grade: "一般" }, { offset: 20, grade: "告警" }],
  }),
  "target"
);

export const MATERIAL_DAILY: Record<MaterialKey, HistPoint[]> = {
  tipPaper: TIP_PAPER_DAILY,
  boxLabel: BOX_LABEL_DAILY,
  tobacco: TOBACCO_DAILY,
  filterRod: FILTER_ROD_DAILY,
};
export const MATERIAL_MONTHLY: Record<MaterialKey, HistPoint[]> = {
  tipPaper: TIP_PAPER_MONTHLY,
  boxLabel: BOX_LABEL_MONTHLY,
  tobacco: TOBACCO_MONTHLY,
  filterRod: FILTER_ROD_MONTHLY,
};

// 图表「日」档取近 90 天
export function materialDailyView(key: MaterialKey): HistPoint[] {
  return lastDays(MATERIAL_DAILY[key], 90);
}

// ===== 异常详情构造 =====
interface MaterialMeta {
  label: string;
  unit: string;
  dept: string;
  summary: string; // 「主要受 X 和 Y 共同影响」
  reasons: [string, string, string]; // 首要 / 其次 / 此外（含影响程度与可信度）
  suggestion: string;
}

export const MATERIAL_META: Record<MaterialKey, MaterialMeta> = {
  tipPaper: {
    label: "单箱耗盘纸量", unit: "米/箱", dept: "卷包车间",
    summary: "换牌号损耗和高速机组张力波动",
    reasons: [
      "卷接机组换牌号频繁，盘纸接头与引带损耗增加，影响程度高、可信度高",
      "高速机组实际车速高于额定值，盘纸张力波动导致退纸损耗上升，影响程度中、可信度高",
      "盘纸批次定量偏上限，同等长度下实际消耗上升，影响程度低、可信度中",
    ],
    suggestion: "复核换牌号作业标准与接头损耗定额，跟踪高速机组张力控制与盘纸批次定量。",
  },
  boxLabel: {
    label: "单箱耗商标纸（小盒）量", unit: "张/箱", dept: "卷包车间",
    summary: "商标纸印刷套准偏差和模切损耗",
    reasons: [
      "商标纸印刷套准偏差超差，剔除不合格品增加，影响程度高、可信度高",
      "模切刀版磨损，毛边与粘连剔除率上升，影响程度中、可信度高",
      "车间温湿度波动导致纸张变形，输送卡纸损耗增加，影响程度低、可信度中",
    ],
    suggestion: "安排商标纸印刷套准与模切刀版点检，稳定车间温湿度并复核剔除定额。",
  },
  tobacco: {
    label: "单箱耗烟叶量", unit: "公斤/箱", dept: "制丝车间",
    summary: "配方批配比波动和切丝损耗",
    reasons: [
      "配方结构中上等烟比例上调，单箱耗叶量上升，影响程度高、可信度高",
      "切丝宽度超差，烟丝整丝率下降、损耗增加，影响程度中、可信度高",
      "回潮水分控制偏低，加工过程造碎增加，影响程度低、可信度中",
    ],
    suggestion: "复核配方批配比执行与切丝宽度控制，跟踪回潮水分与造碎率。",
  },
  filterRod: {
    label: "单箱耗嘴棒量", unit: "支/箱", dept: "卷包车间",
    summary: "嘴棒成型废支和接装损耗",
    reasons: [
      "嘴棒成型机胶孔堵塞，棒体重量波动导致剔除增加，影响程度高、可信度高",
      "滤棒固化时间不足，分切废支率上升，影响程度中、可信度高",
      "接装纸换卷拼接损耗增加，影响程度低、可信度中",
    ],
    suggestion: "清理嘴棒成型机胶孔并校准棒重，复核固化时间与换卷拼接定额。",
  },
};

// 图表异常点 → 抽屉详情（口径同能源总览；关联同指标同等级的告警记录）
// brand：牌号下钻口径时传入（异常标题体现牌号）；period：日/月档（决定异常明细数据数值口径）
export function buildMaterialAnomaly(
  key: MaterialKey,
  pt: HistPoint,
  brand?: string,
  period?: "日" | "月"
): AnomalyDetail {
  const meta = MATERIAL_META[key];
  const grade = pt.anomaly ?? "一般";
  const level = GRADE_TO_LEVEL[grade];
  const baseVal = pt.target ?? pt.avg ?? pt.actual;
  const value = `${pt.actual} ${meta.unit}`;
  const diff = pt.actual - baseVal;
  const sign = diff >= 0 ? "+" : "-";
  const cause = pt.causeEmpty
    ? ""
    : `经分析，本次${meta.label}升至 ${value}，主要受${meta.summary}共同影响。\n首要原因是${meta.reasons[0]}；\n其次，${meta.reasons[1]}；\n此外，${meta.reasons[2]}。`;
  // 关联告警记录：优先同指标同等级，退而取同指标第一条（供抽屉「查看告警详情」）
  const recordId =
    ALERT_RECORDS.find((r) => r.metricName === meta.label && r.level === level)?.id ??
    ALERT_RECORDS.find((r) => r.metricName === meta.label)?.id;
  return {
    title: `${meta.label}异常${brand && brand !== "全部" ? `（${brand}）` : ""}`,
    dept: meta.dept,
    metricName: meta.label,
    current: value,
    baseline: pt.target !== undefined ? `目标 ≤${pt.target} ${meta.unit}` : `历史均值 ${pt.avg} ${meta.unit}`,
    deviationValue: `${sign}${Number(Math.abs(diff).toPrecision(3))} ${meta.unit}`,
    deviationRate: `${sign}${((Math.abs(diff) / baseVal) * 100).toFixed(1)}%`,
    triggerTime: `${pt.iso} 09:20`,
    cause,
    causeType: cause ? "AI生成" : undefined,
    suggestion: meta.suggestion,
    level,
    recordId,
    materialRows: period ? materialAnomalyRows(key, period) : undefined, // 异常明细数据（牌号→机台下钻）
  };
}

// ===== 牌号体系（下钻明细 / 预测算量共用）=====
export const MATERIAL_BRANDS = ["牌号A", "牌号B", "牌号C", "牌号D"];

// 牌号层异常标注规则与主序列一致（盘纸按历史均值、其余按目标值）
const BRAND_MARK_RULE: Record<MaterialKey, "avg" | "target"> = {
  tipPaper: "avg", boxLabel: "target", tobacco: "target", filterRod: "target",
};

// ===== 各牌号下钻序列（4 指标 × 4 牌号确定性生成；日序列末端锚定指标卡各牌号昨日值）=====
const BRAND_VALUES: Record<MaterialKey, number[]> = {
  tipPaper: [30.6, 29.4, 29.9, 28.8],
  boxLabel: [2540, 2485, 2505, 2455],
  tobacco: [39.2, 38.3, 38.8, 37.9],
  filterRod: [51200, 49500, 50300, 48800],
};
const BRAND_DECIMALS: Record<MaterialKey, number> = { tipPaper: 1, boxLabel: 0, tobacco: 1, filterRod: 0 };
const BRAND_TARGET: Record<MaterialKey, number | undefined> = {
  tipPaper: undefined, boxLabel: 2480, tobacco: 40.0, filterRod: 48000,
};

// 牌号序列确定性超线点注入值：target 口径 = max(基准, 目标)×1.05（保证超目标 ≥5%），
// avg 口径 = 历史均值×1.04（保证超均值 ≥4%）；autoMark 自动定级
function injectedActual(key: MaterialKey, base: number, avgOffset: number): number {
  const v = BRAND_MARK_RULE[key] === "target"
    ? Math.max(base, BRAND_TARGET[key] ?? base) * 1.05
    : (base + avgOffset) * 1.04;
  return Number(v.toFixed(BRAND_DECIMALS[key]));
}

// 单指标各牌号日序列（genDaily 参数随指标差异：均值偏移 / 波幅量级）
// 并在末端 90 天窗口内注入确定性超线点（各牌号均有可下钻的异常点，位置随牌号错开）
function buildBrandDaily(key: MaterialKey, i: number): HistPoint[] {
  const base = BRAND_VALUES[key][i];
  const avgOffset = key === "tipPaper" ? 0.3 : key === "tobacco" ? 0.4 : 25;
  const pts = genDaily({
    base,
    avgBase: base + avgOffset,
    target: BRAND_TARGET[key],
    seed: 51 + i * 5 + Object.keys(BRAND_VALUES).indexOf(key) * 17,
    decimals: BRAND_DECIMALS[key],
    drift: 0,
    waveAmp: 0.014,
  });
  pts[pts.length - 30 - i * 7].actual = injectedActual(key, base, avgOffset);
  pts[pts.length - 1].actual = base; // 末端锚定该牌号昨日值
  return autoMark(pts, BRAND_MARK_RULE[key]);
}

const BRAND_SERIES_DAILY: Record<MaterialKey, HistPoint[][]> = {
  tipPaper: MATERIAL_BRANDS.map((_, i) => buildBrandDaily("tipPaper", i)),
  boxLabel: MATERIAL_BRANDS.map((_, i) => buildBrandDaily("boxLabel", i)),
  tobacco: MATERIAL_BRANDS.map((_, i) => buildBrandDaily("tobacco", i)),
  filterRod: MATERIAL_BRANDS.map((_, i) => buildBrandDaily("filterRod", i)),
};
// 月序列构造 + 注入确定性超线点（保证月档异常点可见，位置随牌号错开）
function buildBrandMonthly(key: MaterialKey, i: number): HistPoint[] {
  const base = BRAND_VALUES[key][i];
  const avgOffset = key === "tipPaper" ? 0.3 : key === "tobacco" ? 0.4 : key === "filterRod" ? 300 : 25;
  const pts = genMonthly({
    base,
    avgBase: base + avgOffset,
    target: BRAND_TARGET[key],
    seed: 61 + i * 5 + Object.keys(BRAND_VALUES).indexOf(key) * 17,
    decimals: BRAND_DECIMALS[key],
    drift: 0,
    waveAmp: 0.02,
  });
  pts[pts.length - 1 - (3 + i)].actual = injectedActual(key, base, avgOffset);
  return autoMark(pts, BRAND_MARK_RULE[key]);
}

const BRAND_SERIES_MONTHLY: Record<MaterialKey, HistPoint[][]> = {
  tipPaper: MATERIAL_BRANDS.map((_, i) => buildBrandMonthly("tipPaper", i)),
  boxLabel: MATERIAL_BRANDS.map((_, i) => buildBrandMonthly("boxLabel", i)),
  tobacco: MATERIAL_BRANDS.map((_, i) => buildBrandMonthly("tobacco", i)),
  filterRod: MATERIAL_BRANDS.map((_, i) => buildBrandMonthly("filterRod", i)),
};

// 牌号趋势取数（日=近 90 天；未知牌号回退全口径；4 指标通用）
export function brandSeriesView(key: MaterialKey, brand: string, range: "日" | "月"): HistPoint[] {
  const i = MATERIAL_BRANDS.indexOf(brand);
  if (i < 0) return range === "日" ? materialDailyView(key) : MATERIAL_MONTHLY[key];
  return range === "日" ? lastDays(BRAND_SERIES_DAILY[key][i], 90) : BRAND_SERIES_MONTHLY[key][i];
}

// ===== 异常明细数据（牌号层 → 机台层下钻；日/月档数值独立生成）=====
// 机台池按车间（卷包：卷接/包装机组；制丝：制丝线）
const MACHINES_BY_DEPT: Record<string, string[]> = {
  卷包车间: ["卷接机1号", "卷接机2号", "卷接机3号", "包装机1号", "包装机2号", "包装机3号"],
  制丝车间: ["制丝线1号", "制丝线2号"],
};

// 确定性伪随机（[0,1)；key/period/序号共同决定，保证日度与月度数值不同）
function brandRnd(keyIdx: number, pIdx: number, n: number): number {
  const x = Math.sin(keyIdx * 97.3 + pIdx * 31.7 + n * 13.7) * 10000;
  return x - Math.floor(x);
}

// 异常明细：每指标 2~3 个异常牌号、每牌号 2~3 台异常机台；实际值超基线 1%~8%（仅异常行）；
// 基线口径：盘纸 = 各牌号历史均值，其余 = 目标值（与趋势图异常标注口径一致）
export function materialAnomalyRows(key: MaterialKey, period: "日" | "月"): MaterialAnomalyRows {
  const meta = MATERIAL_META[key];
  const keyIdx = (Object.keys(BRAND_VALUES) as MaterialKey[]).indexOf(key);
  const pIdx = period === "日" ? 0 : 1;
  const rnd = (n: number) => brandRnd(keyIdx, pIdx, n);
  const d = BRAND_DECIMALS[key];
  const round = (v: number) => Number(v.toFixed(d));
  // 异常牌号（2~3 个，按 rnd 从 4 个牌号中不重复抽取）
  const brandCount = 2 + Math.floor(rnd(0) * 2);
  const order = [0, 1, 2, 3].sort((a, b) => rnd(10 + a) - rnd(10 + b));
  const machines = MACHINES_BY_DEPT[meta.dept] ?? MACHINES_BY_DEPT["卷包车间"];
  const rows: MaterialBrandRow[] = order.slice(0, brandCount).map((bi, rank) => {
    // 牌号基线：盘纸取该牌号历史均值（与指标卡 brandDetails 一致），其余取目标值
    const base = BRAND_MARK_RULE[key] === "avg"
      ? (materialCards.find((c) => c.key === key)?.brandDetails?.[bi].avg ?? BRAND_VALUES[key][bi])
      : (BRAND_TARGET[key] ?? BRAND_VALUES[key][bi]);
    const actual = round(base * (1 + 0.01 + rnd(20 + rank) * 0.07)); // 超 1%~8%
    // 异常机台（2~3 台，从车间机台池抽取）
    const machineCount = Math.min(2 + Math.floor(rnd(40 + rank) * 2), machines.length);
    const mOrder = machines.map((_, i) => i).sort((a, b) => rnd(60 + rank * 10 + a) - rnd(60 + rank * 10 + b));
    return {
      name: MATERIAL_BRANDS[bi],
      actual,
      base,
      machines: mOrder.slice(0, machineCount).map((mi, mRank) => ({
        name: machines[mi],
        actual: round(base * (1 + 0.012 + rnd(80 + rank * 10 + mRank) * 0.078)), // 机台超 1.2%~9%
        base,
      })),
    };
  });
  return { baseLabel: BRAND_MARK_RULE[key] === "avg" ? "历史均值" : "目标值", rows };
}

// ===== 顶部指标卡（昨日口径）=====
// 括号百分比 =（实际值 − 对比值）÷ 实际值；箭头仅表示数值升降（实际高 ↑ / 低 ↓），不代表业务好坏
// 着色：单耗类卡 ↓ 绿 / ↑ 橙；生产率类卡 ↓ 橙 / ↑ 绿（downGreen 区分）
export interface MaterialCard {
  key: MaterialKey | "labor";
  label: string;
  value: number; // 昨日实际值
  unit: string;
  decimals: number;
  target?: number; // 目标值
  avg?: number; // 历史均值
  yoy: number; // 同比（%）
  mom: number; // 环比（%）
  downGreen: boolean; // true = 下降着绿色（单耗类）；false = 上升着绿色（生产率类）
  brandDetails?: BrandDetail[]; // 各牌号昨日口径明细（与 MATERIAL_BRANDS 对齐，4 个单耗卡）
}

// 牌号下钻明细：实际值 / 历史均值 / 同比 / 环比（昨日口径）
export interface BrandDetail {
  value: number;
  avg: number;
  yoy: number;
  mom: number;
}

export const materialCards: MaterialCard[] = [
  {
    key: "tipPaper", label: "单箱耗盘纸量",
    value: 29.8, unit: "米/箱", decimals: 1,
    avg: 30,
    yoy: -3.5, mom: -1.8,
    downGreen: true,
    brandDetails: [
      { value: 30.6, avg: 30.9, yoy: -2.8, mom: 1.2 },
      { value: 29.4, avg: 29.3, yoy: -4.1, mom: -0.9 },
      { value: 29.9, avg: 30.1, yoy: -3.2, mom: 0.6 },
      { value: 28.8, avg: 29.0, yoy: -5.0, mom: -1.5 },
    ], // 支持下拉选择牌号查看明细
  },
  {
    key: "boxLabel", label: "单箱耗商标纸（小盒）量",
    value: 2500, unit: "张/箱", decimals: 0,
    target: 2480, avg: 2520,
    yoy: -2.7, mom: -0.9,
    downGreen: true,
    brandDetails: [
      { value: 2540, avg: 2560, yoy: -1.9, mom: 0.5 },
      { value: 2485, avg: 2500, yoy: -2.5, mom: -0.7 },
      { value: 2505, avg: 2520, yoy: -3.0, mom: 0.9 },
      { value: 2455, avg: 2475, yoy: -3.6, mom: -1.2 },
    ], // 支持下拉选择牌号查看明细
  },
  {
    key: "tobacco", label: "单箱耗烟叶量",
    value: 38.6, unit: "公斤/箱", decimals: 1,
    target: 40.0, avg: 39.5,
    yoy: -4.2, mom: 1.3,
    downGreen: true,
    brandDetails: [
      { value: 39.2, avg: 39.6, yoy: -3.8, mom: 0.8 },
      { value: 38.3, avg: 38.5, yoy: -4.4, mom: -0.6 },
      { value: 38.8, avg: 39.2, yoy: -4.0, mom: 1.1 },
      { value: 37.9, avg: 38.1, yoy: -4.7, mom: -0.9 },
    ], // 支持下拉选择牌号查看明细
  },
  {
    key: "filterRod", label: "单箱耗嘴棒量",
    value: 50000, unit: "支/箱", decimals: 0,
    target: 48000, avg: 51000,
    yoy: -5.7, mom: 2.2,
    downGreen: true,
    brandDetails: [
      { value: 51200, avg: 51400, yoy: -5.1, mom: 1.4 },
      { value: 49500, avg: 49800, yoy: -5.6, mom: -0.8 },
      { value: 50300, avg: 50600, yoy: -5.3, mom: 1.0 },
      { value: 48800, avg: 49100, yoy: -6.0, mom: -1.3 },
    ], // 支持下拉选择牌号查看明细
  },
  {
    key: "labor", label: "在岗职工人均劳动生产率",
    value: 200, unit: "箱/人", decimals: 0,
    avg: 210,
    yoy: 1.5, mom: -0.5,
    downGreen: false,
  },
];
