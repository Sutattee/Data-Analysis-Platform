// 辅料消耗（生产管理） — 模拟数据：确定性生成，数据锚点与能源总览一致（2026-08-09）
// 指标：单箱耗盘纸量（米/箱）/ 单箱耗商标纸小盒量（张/箱）/ 单箱耗烟叶量（公斤/箱）/ 单箱耗嘴棒量（支/箱）
import { GRADE_TO_LEVEL, type AnomalyDetail, type EvalGrade } from "./grid-forecast";
import { genDaily, genMonthly, lastDays, type GenCfg, type HistPoint } from "./energy-overview";
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
// 盘纸：无目标值，实际值高于历史均值时标记异常（日/月粒度均展示异常点）
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
const BOX_LABEL_MONTHLY = genMonthly({ base: 2495, avgBase: 2520, target: 2480, seed: 29, decimals: 0, drift: 0, waveAmp: 0.015 });

// 烟叶：实际值高于目标值时标记异常
const TOBACCO_DAILY = autoMark(
  genDaily({
    base: 38.5, avgBase: 39.5, target: 40.0, seed: 31, decimals: 1, drift: 0, waveAmp: 0.025,
    anomalies: [{ offset: 9, grade: "告警" }, { offset: 55, grade: "一般" }],
  }),
  "target"
);
const TOBACCO_MONTHLY = genMonthly({ base: 38.5, avgBase: 39.5, target: 40.0, seed: 31, decimals: 1, drift: 0, waveAmp: 0.02 });

// 嘴棒：实际值高于目标值时标记异常
const FILTER_ROD_DAILY = autoMark(
  genDaily({
    base: 47000, avgBase: 51000, target: 48000, seed: 37, decimals: 0, drift: 0, waveAmp: 0.035,
    anomalies: [{ offset: 22, grade: "预警" }, { offset: 70, grade: "危险" }],
  }),
  "target"
);
const FILTER_ROD_MONTHLY = genMonthly({ base: 47000, avgBase: 51000, target: 48000, seed: 37, decimals: 0, drift: 0, waveAmp: 0.02 });

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
// brand：盘纸牌号下钻口径时传入，异常标题体现牌号
export function buildMaterialAnomaly(key: MaterialKey, pt: HistPoint, brand?: string): AnomalyDetail {
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
  // 关联告警记录：优先同指标同等级，退而取同指标第一条（供抽屉「查看告警记录详情」）
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
  };
}

// ===== 牌号体系（下钻明细 / 预测算量共用）=====
export const MATERIAL_BRANDS = ["牌号A", "牌号B", "牌号C", "牌号D"];

// ===== 盘纸牌号下钻序列（各牌号确定性生成；日序列末端锚定指标卡各牌号昨日值）=====
const BRAND_TIP_VALUES = [30.6, 29.4, 29.9, 28.8]; // 与 materialCards 盘纸卡 brandDetails[].value 一致
const BRAND_TIP_DAILY: HistPoint[][] = MATERIAL_BRANDS.map((_, i) => {
  const base = BRAND_TIP_VALUES[i];
  const pts = genDaily({ base, avgBase: base + 0.3, seed: 51 + i * 5, decimals: 1, drift: 0, waveAmp: 0.014 });
  pts[pts.length - 1].actual = base; // 末端锚定该牌号昨日值
  return autoMark(pts, "avg");
});
const BRAND_TIP_MONTHLY: HistPoint[][] = MATERIAL_BRANDS.map((_, i) => {
  const base = BRAND_TIP_VALUES[i];
  return autoMark(
    genMonthly({ base, avgBase: base + 0.3, seed: 61 + i * 5, decimals: 1, drift: 0, waveAmp: 0.02 }),
    "avg"
  );
});

// 盘纸牌号趋势取数（日=近 90 天；未知牌号回退全口径）
export function tipPaperBrandView(brand: string, range: "日" | "月"): HistPoint[] {
  const i = MATERIAL_BRANDS.indexOf(brand);
  if (i < 0) return range === "日" ? materialDailyView("tipPaper") : MATERIAL_MONTHLY.tipPaper;
  return range === "日" ? lastDays(BRAND_TIP_DAILY[i], 90) : BRAND_TIP_MONTHLY[i];
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
  brandDetails?: BrandDetail[]; // 各牌号昨日口径明细（与 MATERIAL_BRANDS 对齐，仅盘纸卡）
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
  },
  {
    key: "tobacco", label: "单箱耗烟叶量",
    value: 38.6, unit: "公斤/箱", decimals: 1,
    target: 40.0, avg: 39.5,
    yoy: -4.2, mom: 1.3,
    downGreen: true,
  },
  {
    key: "filterRod", label: "单箱耗嘴棒量",
    value: 50000, unit: "支/箱", decimals: 0,
    target: 48000, avg: 51000,
    yoy: -5.7, mom: 2.2,
    downGreen: true,
  },
  {
    key: "labor", label: "在岗职工人均劳动生产率",
    value: 200, unit: "箱/人", decimals: 0,
    avg: 210,
    yoy: 1.5, mom: -0.5,
    downGreen: false,
  },
];
