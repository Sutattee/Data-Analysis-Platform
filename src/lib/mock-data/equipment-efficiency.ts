// 设备运行效率（生产管理） — 模拟数据：确定性生成，数据锚点与全站一致（2026-08-09）
// 指标：包装/卷接设备运行效率、设备运行净效率（仅指标卡）；台时产量（趋势图，16 机组 × 班次下钻）
import { GRADE_TO_LEVEL, type AnomalyDetail, type EvalGrade } from "./grid-forecast";
import { genDaily, lastDays, lastWeeks, byMonth, round, type HistPoint } from "./energy-overview";
import { ALERT_RECORDS } from "./alerts";

export const EFFICIENCY_LATEST_ISO = "2026-08-09"; // 数据锚点（与能源总览 END_DATE 一致）

// ===== 16 台卷接包装机组 =====
export const EQUIPMENT_UNITS = Array.from({ length: 16 }, (_, i) => `${i + 1}#卷接包装机组`);

// 班次（台时产量下钻口径）：全天为班次聚合默认档（下拉展示「全部班次」）
export type Shift = "全天" | "早班" | "中班" | "晚班";
export const SHIFTS: Shift[] = ["全天", "早班", "中班", "晚班"];

// 班组（人员班组）：影响机组操作水平的确定性系数（丙班略高 / 乙班略低）
export type Team = "甲班" | "乙班" | "丙班";
export const TEAMS: Team[] = ["甲班", "乙班", "丙班"];
const TEAM_FACTOR: Record<Team, number> = { 甲班: 1.0, 乙班: 0.975, 丙班: 1.015 };

// ===== 顶部指标卡（昨日口径，效率类）=====
// 括号百分比 =（实际值 − 对比值）÷ 对比值；箭头仅表示数值升降（实际高 ↑ / 低 ↓）
// 着色：效率类 ↓ 橙 / ↑ 绿（产出口径，上升为好）
export interface EfficiencyCard {
  key: "pack" | "roll" | "net" | "hourly";
  label: string;
  value: number; // 昨日实际值
  unit: string;
  decimals: number;
  target?: number; // 目标值
  avg?: number; // 历史均值
  yoy: number; // 同比（%）
  mom: number; // 环比（%）
}

export const EFFICIENCY_CARDS: EfficiencyCard[] = [
  {
    key: "hourly", label: "台时产量",
    value: 1000, unit: "箱/台", decimals: 0,
    target: 1100, avg: 986,
    yoy: -4.2, mom: 1.3,
  },
  {
    key: "pack", label: "包装设备运行效率",
    value: 94, unit: "%", decimals: 1,
    avg: 95.2,
    yoy: -3.5, mom: -1.8,
  },
  {
    key: "roll", label: "卷接设备运行效率",
    value: 96, unit: "%", decimals: 1,
    avg: 95.6,
    yoy: -2.7, mom: -0.9,
  },
  {
    key: "net", label: "设备运行净效率",
    value: 95, unit: "%", decimals: 1,
    avg: 95.6,
    yoy: -3.1, mom: -1.2,
  },
];

// ===== 台时产量日度序列（16 机组）=====
// 与单耗类相反：实际值低于目标值（欠产）时标记异常
export const HOURLY_TARGET = 1100; // 台时产量目标（箱/台，各机组一致）

// 异常自动标注（欠产方向）：低于目标 ≥1% 标记，按缺口幅度定级（不覆盖手动注入的等级）
// 缺口 <1% 视为正常波动；≥1% 一般 / ≥3% 预警 / ≥6% 告警 / ≥10% 危险
function autoMarkLow(pts: HistPoint[]): HistPoint[] {
  return pts.map((p) => {
    if (p.anomaly) return p;
    const base = p.target;
    if (base === undefined || p.actual >= base) return p;
    const gap = (base - p.actual) / base;
    if (gap < 0.01) return p;
    const grade: EvalGrade = gap >= 0.10 ? "危险" : gap >= 0.06 ? "告警" : gap >= 0.03 ? "预警" : "一般";
    return { ...p, anomaly: grade };
  });
}

// 手动注入欠产异常点：压低实际值并固定等级（genDaily 的 anomalies 参数为抬升方向，不适用于欠产）
const GRADE_DROP: Record<string, number> = { 一般: 0.97, 预警: 0.94, 告警: 0.91, 危险: 0.87 };
const INJECT_GRADES: EvalGrade[] = ["一般", "预警", "告警", "危险"];
function injectLow(pts: HistPoint[], injections: { offset: number; grade: EvalGrade }[]): void {
  for (const a of injections) {
    const pt = pts[pts.length - 1 - a.offset];
    if (!pt) continue;
    pt.anomaly = a.grade;
    pt.actual = round(pt.actual * GRADE_DROP[a.grade], 0);
  }
}

// 16 机组合计 32 个手动注入点，offset/等级按机组序号错开（覆盖一般~危险四档）
export const UNIT_HOURLY_DAILY: Record<string, HistPoint[]> = {};
EQUIPMENT_UNITS.forEach((unit, i) => {
  const base = 1092 + ((i * 7) % 17); // 1092~1108：各机组围绕目标 1100 微幅波动
  const pts = genDaily({
    base, avgBase: base + 3, target: HOURLY_TARGET,
    seed: 41 + i * 3, decimals: 0, drift: 0, waveAmp: 0.015,
  });
  injectLow(pts, [
    { offset: 15 + ((i * 11) % 50), grade: INJECT_GRADES[i % 4] },
    { offset: 62 + ((i * 13) % 38), grade: INJECT_GRADES[(i + 2) % 4] },
  ]);
  UNIT_HOURLY_DAILY[unit] = autoMarkLow(pts);
});

// 班次下钻：全天序列 × 班次系数（晚班效率偏低 → 欠产异常点更多，语义一致），avg 同步缩放、目标不变，异常重算
const SHIFT_FACTOR: Record<Shift, number> = { 全天: 1, 早班: 1.02, 中班: 1.0, 晚班: 0.96 };
export function unitShiftView(unit: string, shift: Shift): HistPoint[] {
  if (shift === "全天") return UNIT_HOURLY_DAILY[unit];
  const f = SHIFT_FACTOR[shift];
  const phase = shift === "早班" ? 0.3 : 0.6; // 班次扰动相位，保证不同班次曲线形态有差异
  return autoMarkLow(
    UNIT_HOURLY_DAILY[unit].map((p, idx) => ({
      ...p,
      actual: round(p.actual * (f + Math.sin((phase + idx) * 0.9) * 0.008), 0),
      avg: round((p.avg ?? p.actual) * f, 0),
    }))
  );
}

// 班组视图：在序列上叠加班组系数与微扰（异常等级保留、actual 缩放后重算越线点）
function teamView(pts: HistPoint[], team: Team): HistPoint[] {
  const f = TEAM_FACTOR[team];
  const phase = team === "甲班" ? 0.1 : team === "乙班" ? 0.5 : 0.9; // 班组扰动相位，保证不同班组曲线形态有差异
  return autoMarkLow(
    pts.map((p, idx) => ({
      ...p,
      actual: round(p.actual * (f + Math.sin((phase + idx) * 0.7) * 0.006), 0),
      avg: round((p.avg ?? p.actual) * f, 0),
    }))
  );
}

// 台时产量趋势图取数：日=近 90 天 / 周=近 12 周 / 月=按月聚合；支持班次 × 班组交叉筛选
export type HourlyRange = "日" | "周" | "月";
export function hourlyView(unit: string, shift: Shift, range: HourlyRange, team?: Team): HistPoint[] {
  let pts = unitShiftView(unit, shift);
  if (team) pts = teamView(pts, team);
  return range === "日" ? lastDays(pts, 90) : range === "周" ? lastWeeks(pts, 12, 0) : byMonth(pts, 0);
}

// ===== 台时产量指标卡（昨日口径，按机组下钻）=====
// 所选机组昨日实际值 / 目标值（各机组一致 1100）/ 近 90 天历史均值 / 同比环比
// 同比无上年同期序列，按机组序号围绕全厂 -4.2% 确定性微调；环比由序列末端两日计算
export interface HourlyUnitCard {
  value: number;
  target: number;
  avg: number;
  yoy: number;
  mom: number;
}
export function hourlyCardOf(unit: string): HourlyUnitCard {
  const i = Math.max(0, EQUIPMENT_UNITS.indexOf(unit));
  const pts = lastDays(UNIT_HOURLY_DAILY[unit] ?? UNIT_HOURLY_DAILY[EQUIPMENT_UNITS[0]], 90);
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const avg = round(pts.reduce((s, p) => s + (p.avg ?? p.actual), 0) / pts.length, 0);
  return {
    value: last.actual,
    target: HOURLY_TARGET,
    avg,
    yoy: parseFloat((-4.2 + ((i % 5) - 2) * 0.7).toFixed(1)),
    mom: parseFloat((((last.actual - prev.actual) / prev.actual) * 100).toFixed(1)),
  };
}

// ===== 机台日计划产量月度完成率（16 机组，8月1日—8月9日口径）=====
// 月度完成率 = 月累计完成产量 ÷ 月累计计划产量（各日计划相同时等于日完成率均值）；
// 完成日期 = 当日实际 ≥ 计划的日期；未完成日期 = 当日实际 < 计划的日期
export interface UnitCompletion {
  name: string;
  rate: number; // 月度完成率（%）
  doneDays: string[]; // 完成日期（如「8月1日」）
  missedDays: string[]; // 未完成日期
}
const AUG_DAYS = 9; // 8月1日~8月9日（数据锚点 2026-08-09）
export const UNIT_COMPLETION: UnitCompletion[] = EQUIPMENT_UNITS.map((name, i) => {
  const baseRate = 90 + ((i * 37 + 13) % 16); // 90%~105% 确定性分布（各机组日完成率中枢）
  const dayRates = Array.from({ length: AUG_DAYS }, (_, d) => baseRate + Math.sin((i * 3 + d) * 1.7) * 6); // ±6% 日间波动
  const doneDays: string[] = [];
  const missedDays: string[] = [];
  dayRates.forEach((v, d) => (v >= 100 ? doneDays : missedDays).push(`8月${d + 1}日`));
  return {
    name,
    rate: Math.min(120, Math.max(60, round(dayRates.reduce((s, v) => s + v, 0) / AUG_DAYS, 1))), // 防御性夹紧
    doneDays,
    missedDays,
  };
});

// ===== 异常详情构造（趋势图异常点 → 抽屉）=====
// team：班组筛选口径时传入，标题与原因分析体现「班次·班组」
export function buildHourlyAnomaly(unit: string, pt: HistPoint, shift: Shift = "全天", team?: Team): AnomalyDetail {
  const grade = pt.anomaly ?? "一般";
  const level = GRADE_TO_LEVEL[grade];
  const baseVal = pt.target ?? pt.avg ?? pt.actual;
  const value = `${pt.actual} 箱/台`;
  const diff = pt.actual - baseVal;
  const sign = diff >= 0 ? "+" : "-";
  const segs = [shift !== "全天" ? shift : undefined, team].filter(Boolean).join("·");
  const shiftText = segs ? `（${segs}）` : "";
  const cause = pt.causeEmpty
    ? ""
    : `经分析，${unit}${shiftText}台时产量降至 ${value}，主要受设备故障停机和换牌号占用共同影响。\n首要原因是包装机故障停机频次上升，有效作业时间减少，影响程度高、可信度高；\n其次，换牌号与设备点检占用运行时段，开机时间损失增加，影响程度中、可信度高；\n此外，卷烟纸与嘴棒供料不及时导致短时待料降速，影响程度低、可信度中。`;
  return {
    title: `${unit}台时产量异常`,
    dept: "卷包车间",
    metricName: "台时产量",
    current: value,
    baseline: `目标 ≥${baseVal} 箱/台`,
    deviationValue: `${sign}${Number(Math.abs(diff).toPrecision(3))} 箱/台`,
    deviationRate: `${sign}${((Math.abs(diff) / baseVal) * 100).toFixed(1)}%`,
    triggerTime: `${pt.iso} 09:20`,
    cause,
    causeType: cause ? "AI生成" : undefined,
    suggestion: "优先恢复故障机组并压缩非计划停机，优化换牌号与点检排布，跟踪供料节奏。",
    level,
    recordId: ALERT_RECORDS.find((r) => r.metricName === "台时产量")?.id, // 模拟数据无该指标告警记录 → 不显示跳转按钮
  };
}
