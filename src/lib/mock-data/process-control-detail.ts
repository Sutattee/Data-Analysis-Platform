// 过程管控详情 —— 模拟数据层
// 覆盖 11 项过程管控指标（SF01~SF09 + 优质品率成品/制丝），确定性生成监测记录
// （批 / 班 / 月三种周期形态），支持牌号/机台/班组/批次等维度筛选与多维对比。
// 口径约定：
//  · 管控值 = 各指标等级规则最轻级边界（越管控值即至少提示级），
//    「超管控值 ⟺ 命中等级」——摘要超限比例 / 对比异常占比 / 趋势点着色同口径；
//    未配置规则（SF03）不参与判定，超限比例与状态显示「—」
//  · SF02 最新记录与总览过程管控列表一致（4.8%｜批次20260817-02、≤4.0%、+20%）
//  · 数据窗口：批指标近 30 日（2026-07-19 ~ 08-17，3 机台 66 个批次单元，支持近60批次）、
//    班指标近 60 日（2026-06-19 ~ 08-17，每日一条，支持近60班次）、
//    月度指标近 6 个月（2026-03 ~ 08，支持近6个月）
//  · 数据截至 2026-08-17 16:00（总览口径时间 2026-08）
import { BRAND_OPTIONS, SHIFT_OPTIONS } from "@/lib/mock-data/quality-defect";
import {
  PARAM_SPECS,
  STABILITY_METRICS,
  levelOfValue,
  type AlertRule,
  type StabilityParamDef,
} from "@/lib/mock-data/quality-stability-forecast";
import type { AlertLevel } from "@/types";

export const DATA_AS_OF = "2026-08-17 16:00"; // 页面「数据截至时间」

/* ---------------- 指标定义 ---------------- */

export type DetailCycle = "批" | "班" | "日" | "月";
export type DetailDim = "batch" | "machine" | "shift" | "brand" | "material" | "env" | "spec";
export type CompareDim = "brand" | "machine" | "shift";

export interface ProcessDetailMetric {
  id: string; // SF01~SF09 / QC-10 / QC-11
  name: string;
  unit: string;
  decimals: number;
  cycle: DetailCycle; // 统计周期 → 时间范围选项与横轴形态
  dims: DetailDim[]; // 支持的统计维度（筛选项按此展示，未支持的不展示）
  compareDims: CompareDim[]; // 对比页签能力（牌号/机台/班组，按指标能力开放）
  machines: string[];
  control: { kind: "upper" | "lower" | "range"; text: string; upper?: number; lower?: number };
  nominal: [number, number]; // 正常波动区间（确定性生成的取值范围）
  rule: AlertRule | null; // 等级判定（复用稳定性预测页 AlertRule；null = 待配置）
  sfCode?: string; // 关联稳定性预测指标（抽屉关联参数定义来源）
}

// 等级规则：最轻级边界 ≡ 管控值（越管控值即至少提示级）
export const PROCESS_DETAIL_METRICS: ProcessDetailMetric[] = [
  {
    id: "SF01", name: "成品水分标准偏差", unit: "%", decimals: 2, cycle: "批",
    dims: ["batch", "machine", "shift", "brand", "material", "env"],
    compareDims: ["brand", "machine", "shift"],
    machines: ["1#松散回潮机", "2#松散回潮机", "3#松散回潮机"],
    control: { kind: "upper", text: "≤1.55%", upper: 1.55 },
    nominal: [1.15, 1.48],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 2.1 }, { level: "告警", threshold: 1.85 },
      { level: "预警", threshold: 1.75 }, { level: "关注", threshold: 1.65 }, { level: "提示", threshold: 1.55 },
    ] },
    sfCode: "SF01",
  },
  {
    id: "SF02", name: "松散回潮非稳态指数", unit: "%", decimals: 2, cycle: "批",
    dims: ["batch", "machine", "shift", "brand"],
    compareDims: ["brand", "machine", "shift"],
    machines: ["1#松散回潮机", "2#松散回潮机", "3#松散回潮机"],
    control: { kind: "upper", text: "≤4.0%", upper: 4.0 },
    nominal: [3.1, 3.8],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 6.0 }, { level: "告警", threshold: 4.8 },
      { level: "预警", threshold: 4.4 }, { level: "关注", threshold: 4.2 }, { level: "提示", threshold: 4.0 },
    ] },
    sfCode: "SF02",
  },
  {
    // 未配置等级规则：不判级、不判超限（摘要与对比中显示「—」）
    id: "SF03", name: "烘丝工序非稳态指数", unit: "%", decimals: 2, cycle: "批",
    dims: ["batch", "machine", "shift", "brand"],
    compareDims: ["brand", "machine", "shift"],
    machines: ["1#烘丝机", "3#烘丝机", "5#烘丝机"],
    control: { kind: "upper", text: "待配置" },
    nominal: [0.35, 1.05],
    rule: null,
    sfCode: "SF03",
  },
  {
    id: "SF04", name: "烘丝机出口水分偏差", unit: "%", decimals: 2, cycle: "批",
    dims: ["batch", "machine", "brand"],
    compareDims: ["brand", "machine"],
    machines: ["1#烘丝机", "3#烘丝机", "5#烘丝机"],
    control: { kind: "range", text: "12.50%～13.50%", lower: 12.5, upper: 13.5 },
    nominal: [12.68, 13.32],
    rule: { op: "between", levels: [
      { level: "告警", low: 12.4, high: 13.6 }, { level: "关注", low: 12.5, high: 13.5 },
    ] },
    sfCode: "SF04",
  },
  {
    id: "SF05", name: "加香出口水分不达标次数", unit: "次", decimals: 0, cycle: "日",
    dims: ["batch", "machine", "brand"],
    compareDims: ["brand", "machine"],
    machines: ["1#加香机", "2#加香机", "3#加香机"],
    control: { kind: "upper", text: "≤3次", upper: 3 },
    nominal: [0, 2],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 8 }, { level: "告警", threshold: 6 },
      { level: "预警", threshold: 5 }, { level: "关注", threshold: 4 }, { level: "提示", threshold: 3 },
    ] },
    sfCode: "SF05",
  },
  {
    id: "SF06", name: "非细支单支重量偏差", unit: "%", decimals: 2, cycle: "批",
    dims: ["batch", "machine", "shift", "brand"],
    compareDims: ["brand", "machine", "shift"],
    machines: ["1#卷接包机组", "3#卷接包机组", "5#卷接包机组"],
    control: { kind: "upper", text: "≤3.2%", upper: 3.2 },
    nominal: [2.6, 3.1],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 4.2 }, { level: "告警", threshold: 3.8 },
      { level: "预警", threshold: 3.5 }, { level: "关注", threshold: 3.3 }, { level: "提示", threshold: 3.2 },
    ] },
    sfCode: "SF06",
  },
  {
    id: "SF07", name: "烟支单支克重偏差（毫克）", unit: "mg", decimals: 1, cycle: "批",
    dims: ["machine", "brand"],
    compareDims: ["brand", "machine"],
    machines: ["1#卷接包机组", "2#卷接包机组", "4#卷接包机组"],
    control: { kind: "upper", text: "≤40mg", upper: 40 },
    nominal: [32, 39],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 55 }, { level: "告警", threshold: 48 },
      { level: "预警", threshold: 45 }, { level: "关注", threshold: 42 }, { level: "提示", threshold: 40 },
    ] },
    sfCode: "SF07",
  },
  {
    id: "SF08", name: "常规烟支硬度变异系数", unit: "%", decimals: 2, cycle: "批",
    dims: ["batch", "machine", "shift", "brand"],
    compareDims: ["brand", "machine", "shift"],
    machines: ["2#卷接包机组", "3#卷接包机组", "5#卷接包机组"],
    control: { kind: "upper", text: "≤2.6%", upper: 2.6 },
    nominal: [2.1, 2.55],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 3.3 }, { level: "告警", threshold: 3.0 },
      { level: "预警", threshold: 2.8 }, { level: "关注", threshold: 2.7 }, { level: "提示", threshold: 2.6 },
    ] },
    sfCode: "SF08",
  },
  {
    id: "SF09", name: "中支烟硬度变异系数", unit: "%", decimals: 2, cycle: "批",
    dims: ["batch", "machine", "shift", "brand"],
    compareDims: ["brand", "machine", "shift"],
    machines: ["2#卷接包机组", "3#卷接包机组", "4#卷接包机组"],
    control: { kind: "upper", text: "≤1.5%", upper: 1.5 },
    nominal: [1.1, 1.46],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 1.9 }, { level: "告警", threshold: 1.7 },
      { level: "预警", threshold: 1.6 }, { level: "关注", threshold: 1.55 }, { level: "提示", threshold: 1.5 },
    ] },
    sfCode: "SF09",
  },
  {
    id: "QC-10", name: "优质品率（成品）", unit: "%", decimals: 1, cycle: "批",
    dims: ["spec", "brand"],
    compareDims: ["brand"],
    machines: ["全厂"],
    control: { kind: "lower", text: "≥96%", lower: 96 },
    nominal: [96.5, 99.3],
    rule: { op: "<=", levels: [
      { level: "危险", threshold: 93 }, { level: "告警", threshold: 94 },
      { level: "预警", threshold: 95 }, { level: "提示", threshold: 96 },
    ] },
  },
  {
    id: "QC-11", name: "优质品率（制丝）", unit: "%", decimals: 1, cycle: "批",
    dims: ["batch", "brand", "machine"],
    compareDims: ["brand", "machine"],
    machines: ["全厂"],
    control: { kind: "lower", text: "≥98%", lower: 98 },
    nominal: [98.4, 99.6],
    rule: { op: "<=", levels: [
      { level: "危险", threshold: 95 }, { level: "告警", threshold: 96.5 },
      { level: "预警", threshold: 97.5 }, { level: "提示", threshold: 98 },
    ] },
  },
];

export function metricOfDetail(id: string): ProcessDetailMetric | undefined {
  return PROCESS_DETAIL_METRICS.find((m) => m.id === id);
}

// 关联工序（取稳定性预测指标档案；结果类指标 QC-10/11 无 sfCode → 无工序，趋势图悬浮不展示该字段）
export function processOfDetail(m: ProcessDetailMetric): string | undefined {
  return m.sfCode ? STABILITY_METRICS.find((s) => s.code === m.sfCode)?.process : undefined;
}

// 总览过程管控列表（pm-*）→ 本页指标编码
export const PM_TO_DETAIL: Record<string, string> = {
  "pm-1": "SF02", "pm-2": "SF01", "pm-3": "SF03", "pm-4": "SF04", "pm-5": "SF05",
  "pm-6": "SF07", "pm-7": "SF06", "pm-8": "SF08", "pm-9": "SF09",
};

/* ---------------- 筛选选项 ---------------- */

// 材料（成品水分标准偏差「更多条件」）
export const MATERIAL_OPTIONS = ["云南C3F", "贵州B2F", "四川X2F", "津巴布韦L1"];
// 规格（优质品率成品统计维度）
export const SPEC_OPTIONS = ["常规", "细支", "中支"];
// 环境温湿度区间选项（值 = [下限, 上限]，与记录数值比较）
export const ENV_TEMP_OPTIONS: { text: string; range: [number, number] }[] = [
  { text: "18~22℃", range: [18, 22] },
  { text: "22~26℃", range: [22, 26] },
  { text: "26~28℃", range: [26, 28] },
];
export const ENV_HUM_OPTIONS: { text: string; range: [number, number] }[] = [
  { text: "40%~50%", range: [40, 50] },
  { text: "50%~60%", range: [50, 60] },
  { text: "60%~65%", range: [60, 65] },
];

/* ---------------- 记录生成（确定性） ---------------- */

export interface MonitorRecord {
  id: string;
  time: string; // 生产时间 YYYY-MM-DD HH:mm
  label: string; // 横轴刻度：批次号 / 班次（日期+班型）/ 日期（MM-DD）/ 月份
  cycleLabel: string; // 摘要口径：批次XXXX / 日期 班型 班组 / 日期 / 月份
  batch: string; // 批次号（月度指标 = 当月关联末批次；日指标 = 当日关联批次）
  shiftType?: string; // 班型（白班/夜班，仅班次指标）
  shiftGroup?: string; // 班组（甲班/乙班/丙班；批指标 = 生产该批的班组）
  machine: string;
  brand: string;
  material?: string; // SF01
  spec?: string; // QC-10
  envTemp?: number; // SF01
  envHum?: number; // SF01
  value: number;
  level: AlertLevel | null; // 等级（null = 正常或未配置规则不判定）
  overPct: string; // 超限比例：越管控值 =（值−越出侧边界）÷ 边界；未越 = 0%；未配置 = —
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

// 日期推进（2026-07-19 起 offset 天 → YYYY-MM-DD）
const BASE_DATE = new Date("2026-07-19T00:00:00").getTime();
function dateAt(offsetDays: number): string {
  const d = new Date(BASE_DATE + offsetDays * 86400000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// 超限比例与等级派生（与管控值同口径）
function derive(value: number, m: ProcessDetailMetric): { level: AlertLevel | null; overPct: string } {
  if (!m.rule || m.control.kind === "upper" && m.control.upper === undefined) {
    return { level: null, overPct: "—" };
  }
  const level = levelOfValue(value, m.rule);
  const fmt = (v: number) => `${Math.round(v * 10) / 10}`;
  let overPct = "0%";
  if (level !== null) {
    if (m.control.kind === "upper" && m.control.upper !== undefined) {
      overPct = `+${fmt(((value - m.control.upper) / m.control.upper) * 100)}%`;
    } else if (m.control.kind === "lower" && m.control.lower !== undefined) {
      overPct = `-${fmt(((m.control.lower - value) / m.control.lower) * 100)}%`;
    } else if (m.control.kind === "range") {
      const { lower, upper } = m.control;
      if (upper !== undefined && value > upper) overPct = `+${fmt(((value - upper) / upper) * 100)}%`;
      else if (lower !== undefined) overPct = `-${fmt(((lower - value) / lower) * 100)}%`;
    }
  }
  return { level, overPct };
}

// 任意数值（如筛选范围均值）相对管控值的超限比例（与单条记录同公式）
export function overPctOf(value: number, m: ProcessDetailMetric): string {
  return derive(value, m).overPct;
}

// 预置异常点：{ machine, fromEnd（0=最新）, value }——按机台从最新记录倒数定位覆盖。
// 各机台异常条数刻意错开（如 2/1/0），机台对比的异常记录数 / 异常占比有区分度
const ANOMALIES: Record<string, { machine: string; fromEnd: number; value: number }[]> = {
  SF01: [
    { machine: "3#松散回潮机", fromEnd: 2, value: 1.78 },
    { machine: "3#松散回潮机", fromEnd: 13, value: 1.68 },
    { machine: "1#松散回潮机", fromEnd: 6, value: 1.62 },
  ],
  SF02: [
    { machine: "1#松散回潮机", fromEnd: 0, value: 4.8 }, // 最新记录，与总览一致（+20%）
    { machine: "1#松散回潮机", fromEnd: 12, value: 4.35 },
    { machine: "2#松散回潮机", fromEnd: 5, value: 4.48 },
  ],
  SF03: [], // 待配置不判级
  SF04: [
    { machine: "3#烘丝机", fromEnd: 1, value: 12.4 }, // 批次 20260816-05，与总览 pm-4「12.4%」一致
    { machine: "5#烘丝机", fromEnd: 7, value: 13.66 },
  ],
  SF05: [
    { machine: "2#加香机", fromEnd: 1, value: 6 },
    { machine: "1#加香机", fromEnd: 2, value: 4 },
  ],
  SF06: [
    { machine: "1#卷接包机组", fromEnd: 3, value: 3.62 },
    { machine: "5#卷接包机组", fromEnd: 8, value: 3.36 },
  ],
  SF07: [
    { machine: "2#卷接包机组", fromEnd: 2, value: 46.4 },
    { machine: "4#卷接包机组", fromEnd: 11, value: 41.2 },
  ],
  SF08: [
    { machine: "3#卷接包机组", fromEnd: 4, value: 2.82 },
    { machine: "2#卷接包机组", fromEnd: 13, value: 2.68 },
  ],
  SF09: [
    { machine: "4#卷接包机组", fromEnd: 5, value: 1.58 },
    { machine: "3#卷接包机组", fromEnd: 17, value: 1.52 },
  ],
  "QC-10": [
    { machine: "全厂", fromEnd: 4, value: 95.6 },
    { machine: "全厂", fromEnd: 15, value: 95.9 },
  ],
  "QC-11": [{ machine: "全厂", fromEnd: 9, value: 97.6 }],
};

// 对象水平值：机台×牌号×班组组合的稳定水平（在 nominal 区间 20%~80% 分散，保证按
// 牌号/机台/班组筛选或对比时均值有明显区分），记录值围绕该水平 ±15% 区间宽度波动；
// 波动后仍落在 nominal 区间内（不自然越限，异常仅来自预置异常点）
function levelValue(
  m: ProcessDetailMetric,
  machine: string,
  brand: string,
  shiftGroup: string | undefined,
  h: number,
): number {
  const spread = m.nominal[1] - m.nominal[0];
  const key = `${m.id}|lv|${machine}|${brand}|${shiftGroup ?? ""}`;
  const level = m.nominal[0] + spread * (0.2 + 0.6 * ((hash(key) % 100) / 100));
  return level + spread * 0.3 * ((h % 100) / 100 - 0.5);
}

function buildRecords(m: ProcessDetailMetric): MonitorRecord[] {
  const out: MonitorRecord[] = [];
  m.machines.forEach((machine, mi) => {
    if (m.cycle === "月") {
      // 近 6 个月：2026-03 ~ 08，每月一条（末月 = 数据截至月）
      for (let i = 0; i < 6; i += 1) {
        const month = 3 + i;
        const h = hash(`${m.id}|${machine}|${month}`);
        const brand = BRAND_OPTIONS[h % BRAND_OPTIONS.length];
        const v = levelValue(m, machine, brand, undefined, h);
        const value = Math.round(v * 10 ** m.decimals) / 10 ** m.decimals;
        const { level, overPct } = derive(value, m);
        out.push({
          id: `${m.id}-${machine}-${month}`,
          time: `2026-${pad2(month)}-01 09:00`,
          label: `2026-${pad2(month)}`,
          cycleLabel: `2026-${pad2(month)}`,
          batch: `2026${pad2(month)}28-05`, // 当月关联末批次（明细口径）
          machine,
          brand,
          value,
          level,
          overPct,
        });
      }
      return;
    }
    const isShift = m.cycle === "班";
    const isDay = m.cycle === "日";
    // 班/日指标每日一条共 60（06-19 ~ 08-17，保证「近60班次/近60日」有足量统计单元）；批指标 22 批
    const count = isShift || isDay ? 60 : 22;
    const recs: MonitorRecord[] = [];
    for (let i = 0; i < count; i += 1) {
      const h = hash(`${m.id}|${machine}|${i}`);
      // 日期铺满窗口且不越过数据截至日 08-17：班/日指标 60 日（day = i-30 → 06-19 起）、
      // 批指标 22 批均匀铺满近 30 日（07-19 起 0~29 天）
      const day = isShift || isDay ? i - 30 : Math.round((i * 29) / (count - 1));
      const date = dateAt(day);
      const ymd = date.replaceAll("-", "");
      const night = isShift && h % 2 === 1; // 班型轮换
      // 班组：班指标随班次轮换；批指标 = 生产该批的班组（供 SF01 等批周期指标的班组维度）
      const shiftGroup = SHIFT_OPTIONS[(mi + (isShift ? i : Math.floor(i / 2))) % SHIFT_OPTIONS.length];
      // 批次号序号：按机台分段（1#: -01/-02、2#: -03/-04、3#: -05/-06），
      // 同机台相邻两批奇偶交替 → 同日最多两批不重号，全局唯一
      const batch = `${ymd}-${pad2(1 + 2 * mi + (i % 2))}`;
      // 批记录生产时间取 08:00~12:30（早于 SF02 校准点 14:30，保证摘要最新值口径稳定）
      const time = isShift
        ? `${date} ${night ? "20:30" : "08:30"}`
        : `${date} ${pad2(8 + (h % 5))}:${h % 2 === 0 ? "00" : "30"}`;
      const brand = BRAND_OPTIONS[(mi + Math.floor(i / 2)) % BRAND_OPTIONS.length];
      const v = levelValue(m, machine, brand, shiftGroup, h);
      const value = Math.round(v * 10 ** m.decimals) / 10 ** m.decimals;
      const { level, overPct } = derive(value, m);
      const label = isShift ? `${date.slice(5)} ${night ? "夜班" : "白班"}` : isDay ? date.slice(5) : batch;
      const cycleLabel = isShift
        ? `${date.slice(5)} ${night ? "夜班" : "白班"} ${shiftGroup}`
        : isDay
          ? date
          : `批次${batch}`;
      recs.push({
        id: `${m.id}-${machine}-${i}`,
        time,
        label,
        cycleLabel,
        batch,
        shiftType: isShift ? (night ? "夜班" : "白班") : undefined,
        shiftGroup,
        machine,
        brand,
        material: m.dims.includes("material") ? MATERIAL_OPTIONS[h % MATERIAL_OPTIONS.length] : undefined,
        spec: m.dims.includes("spec") ? SPEC_OPTIONS[(mi + i) % SPEC_OPTIONS.length] : undefined,
        envTemp: m.dims.includes("env") ? 20 + (h % 8) : undefined,
        envHum: m.dims.includes("env") ? 42 + (h % 22) : undefined,
        value,
        level,
        overPct,
      });
    }
    // 应用预置异常点（从最新倒数定位）
    for (const a of ANOMALIES[m.id] ?? []) {
      if (a.machine !== machine) continue;
      const rec = recs[recs.length - 1 - a.fromEnd];
      if (!rec) continue;
      const value = Math.round(a.value * 10 ** m.decimals) / 10 ** m.decimals;
      const { level, overPct } = derive(value, m);
      Object.assign(rec, { value, level, overPct });
    }
    out.push(...recs);
  });
  return out;
}

// 记录缓存（确定性生成一次）
const RECORD_CACHE = new Map<string, MonitorRecord[]>();

export function recordsOfDetail(id: string): MonitorRecord[] {
  if (!RECORD_CACHE.has(id)) {
    const m = metricOfDetail(id);
    RECORD_CACHE.set(id, m ? buildRecords(m) : []);
  }
  return RECORD_CACHE.get(id)!;
}

// SF02 最新记录口径校准：批次 20260817-02、时间 08-17 14:30（与总览列表一致）
{
  const sf02 = recordsOfDetail("SF02").find(
    (r) => r.machine === "1#松散回潮机" && r.level !== null && r.value === 4.8
  );
  if (sf02) {
    sf02.batch = "20260817-02";
    sf02.label = "20260817-02";
    sf02.cycleLabel = "批次20260817-02";
    sf02.time = "2026-08-17 14:30";
  }
}

// SF05 最新日口径校准：1#加香机 08-17 = 0 次（与总览 pm-5「0次」一致）
{
  const sf05 = recordsOfDetail("SF05").find((r) => r.machine === "1#加香机" && r.label === "08-17");
  if (sf05) {
    sf05.value = 0;
    sf05.level = null;
    sf05.overPct = "0%";
  }
}

/* ---------------- 抽屉关联信息 ---------------- */

// 关联过程参数：按稳定性预测指标参数定义生成（记录级确定性取值，参考范围内波动）
export interface RelatedParam {
  name: string;
  unit: string;
  value: string;
  inRange: boolean; // 是否处于参考范围/容差内
}

const GENERIC_PARAMS: RelatedParam[] = [
  { name: "车间环境温度", unit: "℃", value: "24.5", inRange: true },
  { name: "车间环境湿度", unit: "%", value: "54.0", inRange: true },
];

export function relatedParamsOf(metricId: string, rec: MonitorRecord): RelatedParam[] {
  const m = metricOfDetail(metricId);
  const defs: StabilityParamDef[] | undefined = m?.sfCode
    ? STABILITY_METRICS.find((s) => s.code === m.sfCode)?.params
    : undefined;
  if (!defs) return GENERIC_PARAMS;
  return defs.slice(0, 3).map((d) => {
    const spec = PARAM_SPECS[d.key];
    const h = hash(`${metricId}|${rec.id}|${d.key}`);
    let value = 0;
    let inRange = true;
    if (spec.kind === "range") {
      const mid = (spec.low + spec.high) / 2;
      value = mid + ((h % 100) / 100 - 0.5) * (spec.high - spec.low) * 0.6;
      inRange = value >= spec.low && value <= spec.high;
    } else {
      value = spec.base + ((h % 100) / 100 - 0.5) * (spec.tol ?? 1) * 1.2;
      inRange = spec.tol === undefined || Math.abs(value - spec.base) <= spec.tol;
    }
    return { name: d.name, unit: d.unit, value: String(Math.round(value * 10) / 10), inRange };
  });
}

// 异常原因（模拟 AI 归因文案，支持人工修正）
export function causeOfDetail(metricId: string): string {
  const m = metricOfDetail(metricId);
  return `经排查，当批次来料物理指标波动叠加设备工况不稳，导致${m?.name ?? "过程指标"}超出控制范围，具体原因需现场核实。`;
}

// 处置建议（支持人工修正）
export function suggestionOfDetail(metricId: string): string {
  const m = metricOfDetail(metricId);
  return `建议复核工序基准设置与测点校准状态，按工艺标准调整参数，并跟踪后续批次${m?.name ?? "过程指标"}变化。`;
}
