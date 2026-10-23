// 缺陷风险滚动预测（工艺质量 · 缺陷预测页） — mock 预测引擎
// 规格口径：3 个重点缺陷（成品水分不合格 / 烟支刺破 / 箱储存储时间超上限），
// 风险评分 0—100 分制（保留 1 位小数，表示风险高低，不代表发生概率或模型置信度），
// 预测窗口按时间展示（默认未来 8 小时，横轴小时制）。
// 本期仅展示最新一轮预测：预测基准时间（数据截止时刻）与预测更新时间（后端生成时刻）
// 为固定常量，刷新页面不改变预测更新时间。

// ===== 评分分级（0≤x<40 低风险 / 40≤x<70 中风险 / 70≤x≤100 高风险）=====
export const MID_THRESHOLD = 40;
export const HIGH_THRESHOLD = 70;

export interface RiskLevel {
  label: string;
  color: string;
  badgeCls: string;
  textCls: string;
}

export function levelOf(score: number): RiskLevel {
  if (score >= HIGH_THRESHOLD) {
    return { label: "高风险", color: "#ef4444", badgeCls: "bg-red-50 text-red-600 border-red-100", textCls: "text-red-600" };
  }
  if (score >= MID_THRESHOLD) {
    return { label: "中风险", color: "#f97316", badgeCls: "bg-orange-50 text-orange-600 border-orange-100", textCls: "text-orange-600" };
  }
  return { label: "低风险", color: "#eab308", badgeCls: "bg-yellow-50 text-yellow-600 border-yellow-100", textCls: "text-yellow-600" };
}

// ===== 时间模型（确定性固定值，与真实当前时间无关）=====
const DAY = "2026-10-19";
export const BASE_TIME = `${DAY} 14:00`; // 预测基准时间：本轮预测使用的数据截止时刻
export const UPDATED_AT = `${DAY} 14:06`; // 预测更新时间：本轮后端结果生成时刻（刷新页面不变）
export const WINDOW_HOURS = 8;

const hm = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
// "2026-10-19 19:00" → "10-19 19:00"（摘要 / 贡献度解释时间等展示格式）
const shortOf = (full: string) => full.slice(5);

// ===== 缺陷与预测对象 =====
export type DefectCode = "CPSFBH" | "YZCB" | "XCCG";

export interface ForecastDefectMeta {
  code: DefectCode;
  name: string;
  qualityClass: string; // 质量类别（规格书 §2 映射：A类 / C/D类 / B类）
  process: string;
  part: string;
}

export const FORECAST_DEFECTS: ForecastDefectMeta[] = [
  { code: "CPSFBH", name: "成品水分不合格", qualityClass: "A类", process: "烘丝", part: "成品" },
  { code: "YZCB", name: "烟支刺破", qualityClass: "C/D类", process: "卷制", part: "烟支" },
  { code: "XCCG", name: "箱储存储时间超上限", qualityClass: "B类", process: "仓储", part: "箱储" },
];

export function forecastDefectOf(code: string): ForecastDefectMeta {
  return FORECAST_DEFECTS.find((d) => d.code === code) ?? FORECAST_DEFECTS[0];
}

// 预测对象：成品水分 / 烟支刺破按机台；箱储超时切换为箱储对象（可含多个在储烟丝批次）
interface ObjectDef {
  key: string;
  code: string;
  batches: string[];
}

const OBJECTS: Record<DefectCode, ObjectDef[]> = {
  CPSFBH: [
    { key: "3#烘丝机", code: "HS-03", batches: ["P20261019-03"] },
    { key: "1#烘丝机", code: "HS-01", batches: ["P20261019-01"] },
    { key: "5#烘丝机", code: "HS-05", batches: ["P20261019-05"] },
  ],
  YZCB: [
    { key: "ZJ17-02卷接机组", code: "ZJ17-02", batches: ["P20261019-06"] },
    { key: "ZJ19-01卷接机组", code: "ZJ19-01", batches: ["P20261019-08"] },
    { key: "ZJ17-04卷接机组", code: "ZJ17-04", batches: ["P20261019-11"] },
    { key: "5#卷接包机组", code: "JB-05", batches: ["P20261019-12"] },
  ],
  XCCG: [
    { key: "1#储丝柜", code: "CG-01", batches: ["YS-1026A", "YS-1027B"] },
    { key: "2#储丝柜", code: "CG-02", batches: ["YS-1028C"] },
    { key: "3#储丝柜", code: "CG-03", batches: ["YS-1029D"] },
  ],
};

// ===== 数据结构 =====
export interface TrendPoint {
  t: string; // 横轴刻度（小时制，如 "14:00"；本窗口不跨日，跨日时需补日期）
  full: string; // 完整时刻（Tooltip / 摘要引用）
  score: number; // 风险评分（0—100，1 位小数）
  biz?: string; // 业务预测值（如 "预测成品水分 13.2%"、"预计出库 21:00"）
  planned?: boolean; // 未来信息来自计划 → Tooltip 标注"（计划）"
}

export type DevDir = "up" | "down" | "in" | "none";

export interface ParamCell {
  name: string;
  source: string; // 来源工序及系统
  value: string | null; // 数值（null → "—"）；非数值参数（配方 / 时间型）直接放文本
  unit?: string;
  time: string; // 取值时间或统计周期
  ref: string; // 基准值 / 参考范围
  dev: { text: string; dir: DevDir }; // 偏差及方向（超上限 ↑ / 低于下限 ↓ / 范围内 → / 不适用 —）
}

export interface Contribution {
  key: string;
  name: string;
  score: number; // 贡献分（0—100 分制下的正向贡献，1 位小数）
  pct: number; // 正向贡献占比 p_i = max(c_i,0) ÷ Σ max(c_j,0) × 100%
  source: string; // 来源分类（制丝 / 卷接 / 质检 / 仓储 / 原料配方 / 车间环境…）
  origin: string; // 数据来源系统（MES / 卷包数采 / 质检平台）
}

export interface SourceItem {
  name: string;
  pct: number;
}

export interface ForecastContext {
  brand: string;
  shift: string; // 班次
  shiftGroup: string; // 班组
  process: string;
  part: string;
  qualityClass: string;
}

// 成品水分业务依据：模型支持时输出预测成品水分 / 允差 / 预测偏差（规格 §6）
export interface MoistureBasis {
  predicted: string;
  tolerance: string;
  dev: string;
  atTime: string; // 引用点时间（存在多个未来点时注明）
  range: string; // 允差范围（标准水分 ± 允差，如 "12.2%～12.8%"）
  std: string; // 标准水分（如 "12.5%"）
  overText: string; // 与允差范围的对比结论（新口径：预测值 − 允差上限，如 "超上限 0.4 pct"）
  overKind: "over" | "in" | "under"; // 超上限 / 范围内（含恰达上限）/ 低于下限
}

// 箱储业务依据：时长公式组（规格 §3；数值口径，remainingHours 0 = 恰达上限 / 负值 = 已超时；
// 数据不足或不编造的预计字段缺省）
export interface StorageBasis {
  storedHours: number; // 已储存时长 = 基准时间 − 入库时间（小时）
  limitHours: number; // 储存时长上限（小时）
  remainingHours: number; // 剩余可储存（小时）
  deadline: string; // 允许储存截止时间 = 入库时间 + 上限（MM-DD HH:mm）
  totalHours?: number; // 预计总储存时长 = 预计出库时间 − 入库时间（小时）
  outbound?: string; // 预计出库 / 耗用时间（含"（计划）"标注）
}

export interface DefectForecast {
  code: DefectCode;
  objectKey: string;
  objectCode: string;
  batch: string;
  status: "ok" | "insufficient"; // 数据不足：评分 / 曲线 / 解读均不编造
  confidence?: number; // 模型置信度（0—1）；缺省 = 摘要隐藏该字段（不由 AI 生成）
  modelVer: string; // 模型版本（预测详情抽屉展示）
  hist: TrendPoint[]; // 历史评分曲线（末点 = 基准点）
  future: TrendPoint[]; // 预测曲线（首点 = 基准点；单点对象仅含基准点；数据不足为空）
  params: ParamCell[];
  contributions: Contribution[]; // 仅正向贡献，按占比降序
  sources: SourceItem[]; // 来源分布汇总（工序 + 车间环境）
  context: ForecastContext;
  explainTime: string; // 贡献度解释时间 = 窗口最高分对应预测点
  moisture?: MoistureBasis;
  storage?: StorageBasis;
}

// ===== 参数构造（按缺陷差异化，数量按实际模型输入动态展示）=====

// 范围偏差：超上限 ↑ / 低于下限 ↓ / 范围内 →（百分数绝对差用 pct，规格 §9）
function rangeDev(value: number | null, lo: number | undefined, hi: number | undefined, pct: boolean): ParamCell["dev"] {
  if (value === null) return { text: "—", dir: "none" };
  const fmt = (d: number) => (pct ? `${d.toFixed(1)}pct` : `${d}`);
  if (hi !== undefined && value > hi) return { text: `+${fmt(value - hi)} ↑`, dir: "up" };
  if (lo !== undefined && value < lo) return { text: `-${fmt(lo - value)} ↓`, dir: "down" };
  return { text: "0 →", dir: "in" };
}

const num = (v: number | null, d = 1) => (v === null ? null : v.toFixed(d));

// 成品水分不合格参数（5 项）：材料水分（质检平台）+ 加香水分均值 / 上游工序水分 /
// 卷包生产效率停机时长（MES）+ 环境温湿度合格率（车间环境）
function moistureParams(v: {
  mat: number | null;
  flavor: number | null;
  upstream: number | null;
  downtime: number | null;
  env: number | null;
}): ParamCell[] {
  return [
    { name: "材料水分", source: "质检平台", value: num(v.mat), unit: "%", time: "10-19 08:30", ref: "11.5%~12.5%", dev: rangeDev(v.mat, 11.5, 12.5, true) },
    { name: "加香水分均值", source: "制丝·MES", value: num(v.flavor), unit: "%", time: "近2小时均值", ref: "12.5%~13.0%", dev: rangeDev(v.flavor, 12.5, 13.0, true) },
    { name: "上游工序水分", source: "烘丝·MES", value: num(v.upstream), unit: "%", time: "10-19 13:00", ref: "12.0%~13.0%", dev: rangeDev(v.upstream, 12.0, 13.0, true) },
    { name: "卷包生产效率（停机时长）", source: "卷包·MES", value: num(v.downtime, 0), unit: "min/h", time: "10-19 13:00", ref: "≤15", dev: rangeDev(v.downtime, undefined, 15, false) },
    { name: "环境温湿度合格率", source: "车间环境", value: num(v.env), unit: "%", time: "10-19 13:00", ref: "≥95%", dev: rangeDev(v.env, 95, undefined, true) },
  ];
}

// 烟支刺破参数（4 项）：柔性风选剔除量 / 梗及梗中含丝量（MES）+
// 卷烟机剔梗量（卷包数采）+ 原料配方（MES，非数值：名称 / 编码 / 版本，不计偏差）
function punctureParams(v: {
  winnowing: number | null;
  stemTrash: number | null;
  stemReject: number | null;
  recipe: string;
}): ParamCell[] {
  return [
    { name: "制丝柔性风选剔除量", source: "制丝·MES", value: num(v.winnowing), unit: "kg", time: "当日累计", ref: "≤45", dev: rangeDev(v.winnowing, undefined, 45, false) },
    { name: "梗及梗中含丝量", source: "制丝·MES", value: num(v.stemTrash), unit: "%", time: "10-19 12:00", ref: "≤3.2%", dev: rangeDev(v.stemTrash, undefined, 3.2, true) },
    { name: "卷烟机剔梗量", source: "卷接·卷包数采", value: num(v.stemReject, 0), unit: "支/箱", time: "近1小时", ref: "≤130", dev: rangeDev(v.stemReject, undefined, 130, false) },
    { name: "原料配方", source: "MES", value: v.recipe, time: "10-19 06:00", ref: "当前生效配方", dev: { text: "—", dir: "none" } },
  ];
}

// 箱储超时参数（9 项）：计划投料 → 制丝产出 → 箱储入库 → 卷包领用/消耗关联字段（均 MES）
function storageParams(v: {
  inbound: string;
  limit: number;
  stock: number | null;
  dryingActual: number | null;
  packingActual: number | null;
  outboundInfo: string | null;
}): ParamCell[] {
  return [
    { name: "制丝车间计划投料量", source: "制丝·MES", value: "12000", unit: "kg", time: "10-19 日计划", ref: "12000", dev: { text: "0 →", dir: "in" } },
    { name: "制丝计划产出", source: "制丝·MES", value: "9600", unit: "kg", time: "10-19 日计划", ref: "9600", dev: { text: "0 →", dir: "in" } },
    { name: "制丝实际产出", source: "制丝·MES", value: num(v.dryingActual, 0), unit: "kg", time: "截至 14:00", ref: "≥9000", dev: rangeDev(v.dryingActual, 9000, undefined, false) },
    { name: "卷包计划产量", source: "卷包·MES", value: "8500", unit: "kg", time: "10-19 日计划", ref: "8500", dev: { text: "0 →", dir: "in" } },
    { name: "卷包实际产量", source: "卷包·MES", value: num(v.packingActual, 0), unit: "kg", time: "截至 14:00", ref: "≥8000", dev: rangeDev(v.packingActual, 8000, undefined, false) },
    { name: "当前库存", source: "仓储·MES", value: num(v.stock, 0), unit: "kg", time: "10-19 14:00", ref: "≤40000", dev: rangeDev(v.stock, undefined, 40000, false) },
    { name: "入库时间", source: "仓储·MES", value: v.inbound, time: "批次入库记录", ref: "—", dev: { text: "—", dir: "none" } },
    { name: "领用/出库信息", source: "仓储·MES", value: v.outboundInfo, time: "截至 14:00", ref: "按先进先出", dev: { text: "—", dir: "none" } },
    { name: "储存时长上限", source: "仓储·MES", value: String(v.limit), unit: "h", time: "批次工艺配置", ref: "工艺标准", dev: { text: "—", dir: "none" } },
  ];
}

// ===== 种子（最新一轮预测，形状手工锚定）=====
const pt = (hour: number, score: number): TrendPoint => ({ t: hm(hour), full: `${DAY} ${hm(hour)}`, score });
const series = (startHour: number, scores: number[]): TrendPoint[] => scores.map((s, i) => pt(startHour + i, s));

interface RawContrib {
  name: string;
  score: number;
  source: string;
  origin: string;
}

interface RawSeed {
  code: DefectCode;
  objectKey: string;
  batch: string;
  confidence?: number;
  modelVer?: string; // 不传时按缺陷取 MODEL_VER 默认版本
  hist: TrendPoint[];
  future: TrendPoint[]; // 数据不足为空；单点对象仅含基准点
  params: ParamCell[];
  contribs?: RawContrib[];
  context: ForecastContext;
  moisture?: MoistureBasis;
  storage?: StorageBasis;
}

// 成品水分未来点附带业务预测值（预测成品水分随评分同步抬升）
const withMoistureBiz = (future: TrendPoint[], values: number[]): TrendPoint[] =>
  future.map((p, i) => ({ ...p, biz: `预测成品水分 ${values[i].toFixed(1)}%` }));

// 箱储未来点在出库前附带预计出库信息（来自计划 → 标注"计划"）
const withOutboundBiz = (future: TrendPoint[], outboundHour: number, label: string): TrendPoint[] =>
  future.map((p, i) => (14 + i <= outboundHour ? { ...p, biz: label, planned: true } : p));

// 各缺陷预测模型版本（预测详情抽屉展示；种子可用 modelVer 覆盖）
const MODEL_VER: Record<DefectCode, string> = {
  CPSFBH: "MoistNet v2.3",
  YZCB: "PunctNet v1.8",
  XCCG: "StoreSim v3.0",
};

const SEEDS: RawSeed[] = [
  // ---- 成品水分不合格（烘丝机台）----
  {
    // 高风险演示：17:00 首达高风险阈值，峰值 82.5 @ 19:00
    code: "CPSFBH", objectKey: "3#烘丝机", batch: "P20261019-03", confidence: 0.86,
    hist: series(6, [32.5, 35.8, 34.2, 41.6, 45.3, 48.9, 55.4, 61.2, 66.8]),
    future: withMoistureBiz(series(14, [66.8, 68.9, 69.6, 73.2, 78.4, 82.5, 80.2, 77.6, 74.8]), [12.7, 12.8, 12.9, 13.0, 13.1, 13.2, 13.1, 13.1, 13.0]),
    params: moistureParams({ mat: 12.8, flavor: 13.1, upstream: 12.9, downtime: 18, env: 96.5 }),
    contribs: [
      { name: "加香水分均值", score: 28.4, source: "制丝", origin: "MES" },
      { name: "材料水分", score: 22.1, source: "质检", origin: "质检平台" },
      { name: "卷包生产效率（停机时长）", score: 18.6, source: "卷包", origin: "MES" },
      { name: "环境温湿度合格率", score: 9.3, source: "车间环境", origin: "数采" },
      { name: "上游工序水分", score: 4.1, source: "制丝", origin: "MES" },
    ],
    context: { brand: "娇子", shift: "白班", shiftGroup: "甲班", process: "烘丝", part: "成品", qualityClass: "A类" },
    moisture: { predicted: "13.2%", tolerance: "±0.3%", dev: "+0.7pct", atTime: "10-19 19:00", range: "12.2%～12.8%", std: "12.5%", overText: "超上限 0.4 pct", overKind: "over" },
  },
  {
    // 中风险演示：窗口内未达高风险阈值
    code: "CPSFBH", objectKey: "1#烘丝机", batch: "P20261019-01", confidence: 0.82,
    hist: series(6, [26.4, 28.1, 27.5, 30.2, 33.8, 36.4, 38.9, 41.7, 44.2]),
    future: withMoistureBiz(series(14, [44.2, 46.5, 48.3, 50.6, 52.9, 54.8, 53.2, 51.4, 49.6]), [12.6, 12.6, 12.7, 12.7, 12.8, 12.8, 12.8, 12.7, 12.7]),
    params: moistureParams({ mat: 12.4, flavor: 12.8, upstream: 12.6, downtime: 16, env: 97.2 }),
    contribs: [
      { name: "加香水分均值", score: 24.6, source: "制丝", origin: "MES" },
      { name: "卷包生产效率（停机时长）", score: 16.2, source: "卷包", origin: "MES" },
      { name: "材料水分", score: 9.8, source: "质检", origin: "质检平台" },
      { name: "上游工序水分", score: 4.2, source: "制丝", origin: "MES" },
    ],
    context: { brand: "长城", shift: "白班", shiftGroup: "乙班", process: "烘丝", part: "成品", qualityClass: "A类" },
    moisture: { predicted: "12.8%", tolerance: "±0.3%", dev: "+0.3pct", atTime: "10-19 19:00", range: "12.2%～12.8%", std: "12.5%", overText: "恰达允差上限", overKind: "in" },
  },
  {
    // 低风险演示
    code: "CPSFBH", objectKey: "5#烘丝机", batch: "P20261019-05", confidence: 0.79,
    hist: series(6, [22.1, 23.5, 22.8, 24.6, 25.3, 26.1, 27.4, 28.2, 29.5]),
    future: withMoistureBiz(series(14, [29.5, 30.2, 31.4, 30.8, 29.7, 28.9, 28.1, 27.3, 26.5]), [12.4, 12.4, 12.5, 12.5, 12.4, 12.4, 12.4, 12.3, 12.3]),
    params: moistureParams({ mat: 11.9, flavor: 12.6, upstream: 12.3, downtime: 9, env: 98.1 }),
    contribs: [
      { name: "加香水分均值", score: 14.2, source: "制丝", origin: "MES" },
      { name: "材料水分", score: 9.8, source: "质检", origin: "质检平台" },
      { name: "上游工序水分", score: 7.2, source: "制丝", origin: "MES" },
    ],
    context: { brand: "宽窄", shift: "白班", shiftGroup: "丙班", process: "烘丝", part: "成品", qualityClass: "A类" },
    moisture: { predicted: "12.5%", tolerance: "±0.3%", dev: "0pct", atTime: "10-19 16:00", range: "12.2%～12.8%", std: "12.5%", overText: "允差范围内", overKind: "in" },
  },
  // ---- 烟支刺破（卷接机台）----
  {
    // 高风险演示：贡献度逐值对齐规格书示例（+21.0/42%、+13.5/27%、+9.5/19%、+6.0/12%）
    code: "YZCB", objectKey: "ZJ17-02卷接机组", batch: "P20261019-06", confidence: 0.84,
    hist: series(6, [28.6, 31.2, 30.4, 35.8, 40.2, 44.6, 49.3, 55.1, 62.4]),
    future: series(14, [62.4, 66.8, 71.5, 78.6, 74.2, 71.8, 69.4, 67.1, 64.5]),
    params: punctureParams({ winnowing: 52.6, stemTrash: 3.8, stemReject: 132, recipe: "宽窄（细支 97mm） R-2026-08｜v3.2" }),
    contribs: [
      { name: "制丝柔性风选剔除量", score: 21.0, source: "制丝", origin: "MES" },
      { name: "梗及梗中含丝量", score: 13.5, source: "制丝", origin: "MES" },
      { name: "卷烟机剔梗量", score: 9.5, source: "卷接", origin: "卷包数采" },
      { name: "原料配方", score: 6.0, source: "原料/配方", origin: "MES" },
    ],
    context: { brand: "宽窄", shift: "白班", shiftGroup: "丙班", process: "卷制", part: "烟支", qualityClass: "C/D类" },
  },
  {
    // 中风险演示
    code: "YZCB", objectKey: "ZJ19-01卷接机组", batch: "P20261019-08", confidence: 0.8,
    hist: series(6, [24.8, 26.2, 27.5, 29.1, 32.4, 35.2, 38.6, 41.3, 44.8]),
    future: series(14, [44.8, 46.2, 47.9, 49.5, 51.2, 52.3, 50.8, 48.6, 46.4]),
    params: punctureParams({ winnowing: 41.2, stemTrash: 2.9, stemReject: 118, recipe: "娇子（硬盒 84mm） J-2026-03｜v2.1" }),
    contribs: [
      { name: "卷烟机剔梗量", score: 23.1, source: "卷接", origin: "卷包数采" },
      { name: "制丝柔性风选剔除量", score: 17.4, source: "制丝", origin: "MES" },
      { name: "梗及梗中含丝量", score: 11.8, source: "制丝", origin: "MES" },
    ],
    context: { brand: "娇子", shift: "白班", shiftGroup: "甲班", process: "卷制", part: "烟支", qualityClass: "C/D类" },
  },
  {
    // 低风险 + 无置信度演示（摘要隐藏模型置信度字段）
    code: "YZCB", objectKey: "ZJ17-04卷接机组", batch: "P20261019-11",
    hist: series(6, [20.4, 21.6, 22.8, 23.5, 25.1, 26.4, 27.8, 28.6, 30.2]),
    future: series(14, [30.2, 31.5, 32.8, 33.6, 32.4, 31.2, 30.1, 29.2, 28.4]),
    params: punctureParams({ winnowing: 38.6, stemTrash: 2.4, stemReject: 96, recipe: "长城（软盒 84mm） C-2026-05｜v1.8" }),
    contribs: [
      { name: "制丝柔性风选剔除量", score: 18.9, source: "制丝", origin: "MES" },
      { name: "卷烟机剔梗量", score: 9.2, source: "卷接", origin: "卷包数采" },
      { name: "梗及梗中含丝量", score: 5.5, source: "制丝", origin: "MES" },
    ],
    context: { brand: "长城", shift: "白班", shiftGroup: "乙班", process: "卷制", part: "烟支", qualityClass: "C/D类" },
  },
  {
    // 仅单点评分演示：无有效时序 → 高风险预测显示"暂无达阈值时间预测"，无可信解释不展示贡献度
    code: "YZCB", objectKey: "5#卷接包机组", batch: "P20261019-12",
    hist: series(6, [30.2, 32.5, 31.8, 35.4, 38.2, 40.6, 42.9, 45.1, 47.2]),
    future: series(14, [47.2]),
    params: punctureParams({ winnowing: 44.8, stemTrash: 3.0, stemReject: 124, recipe: "娇子（硬盒 84mm） J-2026-03｜v2.1" }),
    context: { brand: "娇子", shift: "白班", shiftGroup: "甲班", process: "卷制", part: "烟支", qualityClass: "C/D类" },
  },
  // ---- 箱储存储时间超上限（箱储对象 × 烟丝批次）----
  {
    // 1#储丝柜 · 批次A：已超时演示（剩余允许时间为负 → 显示已超时时长；无出库计划不编造预计出库时间）
    code: "XCCG", objectKey: "1#储丝柜", batch: "YS-1026A", confidence: 0.83,
    hist: series(6, [82.1, 82.6, 83.2, 83.8, 84.5, 85.1, 85.8, 86.5, 88.4]),
    future: series(14, [88.4, 88.9, 89.4, 89.8, 90.3, 90.8, 91.4, 92.1, 93.5]),
    params: storageParams({ inbound: "10-15 08:00", limit: 72, stock: 46200, dryingActual: 8820, packingActual: 7260, outboundInfo: "暂无出库计划" }),
    contribs: [
      { name: "已储存时长", score: 45.3, source: "仓储", origin: "MES" },
      { name: "卷包消耗进度", score: 24.6, source: "卷包", origin: "MES" },
      { name: "库存结构", score: 12.1, source: "仓储", origin: "MES" },
      { name: "制丝投料进度", score: 11.5, source: "制丝", origin: "MES" },
    ],
    context: { brand: "长城", shift: "白班", shiftGroup: "甲班", process: "仓储", part: "箱储", qualityClass: "B类" },
    storage: { storedHours: 102, limitHours: 72, remainingHours: -30, deadline: "10-18 08:00" },
  },
  {
    // 1#储丝柜 · 批次B：预计出库来自计划（Tooltip 标注"计划"）
    code: "XCCG", objectKey: "1#储丝柜", batch: "YS-1027B", confidence: 0.78,
    hist: series(6, [32.4, 33.1, 34.2, 35.6, 37.2, 38.8, 39.5, 40.1, 40.8]),
    future: withOutboundBiz(series(14, [40.8, 42.5, 44.6, 46.2, 47.5, 48.0, 48.2, 47.6, 22.5]), 21, "预计出库 21:00"),
    params: storageParams({ inbound: "10-17 06:00", limit: 72, stock: 38500, dryingActual: 9050, packingActual: 8120, outboundInfo: "10-19 21:00 计划领用 12t" }),
    contribs: [
      { name: "已储存时长", score: 19.8, source: "仓储", origin: "MES" },
      { name: "卷包消耗进度", score: 14.6, source: "卷包", origin: "MES" },
      { name: "库存结构", score: 7.5, source: "仓储", origin: "MES" },
      { name: "制丝投料进度", score: 6.3, source: "制丝", origin: "MES" },
    ],
    context: { brand: "宽窄", shift: "白班", shiftGroup: "丙班", process: "仓储", part: "箱储", qualityClass: "B类" },
    storage: { storedHours: 56, limitHours: 72, remainingHours: 16, deadline: "10-20 06:00", totalHours: 63, outbound: "10-19 21:00（计划）" },
  },
  {
    // 2#储丝柜：中风险，预计 16:00 出库（计划）
    code: "XCCG", objectKey: "2#储丝柜", batch: "YS-1028C", confidence: 0.81,
    hist: series(6, [36.2, 37.1, 38.4, 39.8, 41.2, 43.6, 45.8, 48.2, 50.1]),
    future: withOutboundBiz(series(14, [50.1, 51.0, 51.6, 38.2, 35.4, 32.1, 29.8, 27.2, 24.6]), 16, "预计出库 16:00"),
    params: storageParams({ inbound: "10-18 00:00", limit: 72, stock: 35600, dryingActual: 9180, packingActual: 7980, outboundInfo: "10-19 16:00 计划领用 8t" }),
    contribs: [
      { name: "已储存时长", score: 22.4, source: "仓储", origin: "MES" },
      { name: "卷包消耗进度", score: 15.8, source: "卷包", origin: "MES" },
      { name: "制丝投料进度", score: 8.3, source: "制丝", origin: "MES" },
      { name: "库存结构", score: 5.1, source: "仓储", origin: "MES" },
    ],
    context: { brand: "娇子", shift: "白班", shiftGroup: "乙班", process: "仓储", part: "箱储", qualityClass: "B类" },
    storage: { storedHours: 38, limitHours: 72, remainingHours: 34, deadline: "10-20 00:00", totalHours: 64, outbound: "10-19 16:00（计划）" },
  },
  {
    // 3#储丝柜：数据不足演示（缺领用/出库计划与部分产量 → 不编造评分 / 曲线 / 解读）
    code: "XCCG", objectKey: "3#储丝柜", batch: "YS-1029D",
    hist: [],
    future: [],
    params: storageParams({ inbound: "10-18 14:00", limit: 60, stock: 41800, dryingActual: 8930, packingActual: null, outboundInfo: null }),
    context: { brand: "长城", shift: "白班", shiftGroup: "甲班", process: "仓储", part: "箱储", qualityClass: "B类" },
    storage: { storedHours: 24, limitHours: 60, remainingHours: 36, deadline: "10-20 14:00" },
  },
];

// ===== 贡献度 / 来源分布（p_i = max(c_i,0) ÷ Σ max(c_j,0) × 100%，仅正向进入排序）=====
function buildContributions(raws: RawContrib[] | undefined): Contribution[] {
  if (!raws) return [];
  const pos = raws.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  const total = pos.reduce((s, r) => s + r.score, 0);
  if (total <= 0) return [];
  return pos.map((r) => ({
    key: r.name,
    name: r.name,
    score: r.score,
    pct: Math.round((r.score / total) * 1000) / 10,
    source: r.source,
    origin: r.origin,
  }));
}

// 来源分布：每个参数唯一来源归属后汇总正向贡献占比（数组归并，避免 Map 迭代受 target 限制）
function buildSources(raws: RawContrib[] | undefined): SourceItem[] {
  if (!raws) return [];
  const pos = raws.filter((r) => r.score > 0);
  const total = pos.reduce((s, r) => s + r.score, 0);
  if (total <= 0) return [];
  const groups: { name: string; score: number }[] = [];
  for (const r of pos) {
    const g = groups.find((x) => x.name === r.source);
    if (g) g.score += r.score;
    else groups.push({ name: r.source, score: r.score });
  }
  return groups
    .map((g) => ({ name: g.name, pct: Math.round((g.score / total) * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct);
}

// ===== 预测结果派生 =====

// 窗口最高风险评分（多同分取最早时间；与趋势图最高点一致）
export function peakOf(f: DefectForecast): { score: number; time: string; display: string } | null {
  if (f.future.length === 0) return null;
  let best = f.future[0];
  for (const p of f.future) if (p.score > best.score) best = p;
  return { score: best.score, time: best.full, display: shortOf(best.full) };
}

// 高风险预测五种判定口径（规格 §7）
export type EtaKind = "reached" | "within" | "notReached" | "noSeries" | "unavailable";

export function highRiskEta(f: DefectForecast): { kind: EtaKind; text: string } {
  if (f.status === "insufficient") return { kind: "unavailable", text: "暂无法预测" };
  const base = f.future[0];
  if (base && base.score >= HIGH_THRESHOLD) return { kind: "reached", text: "已进入高风险" };
  if (f.future.length <= 1) return { kind: "noSeries", text: "暂无达阈值时间预测" };
  const hit = f.future.slice(1).find((p) => p.score >= HIGH_THRESHOLD);
  if (hit) {
    const hours = Number(hit.full.slice(11, 13)) - Number(base.full.slice(11, 13));
    return { kind: "within", text: `预计${hours}小时内进入高风险` };
  }
  return { kind: "notReached", text: `未来${WINDOW_HOURS}小时未进入高风险` };
}

// 预测窗口：按业务配置时长展示（默认未来 8 小时）；数据不足不展示窗口
export function windowTextOf(f: DefectForecast): string {
  return f.status === "insufficient" ? "—" : `${WINDOW_HOURS}小时`;
}

// ===== AI 风险解读（三段：预测概况 / 参数关注 / 核查重点；模板拼接 ≤200 字符，不编造数值）=====
const CHECK_FOCUS: Record<DefectCode, string> = {
  CPSFBH: "建议核查加香出口水分设定、排潮风门开度及来料水分衔接",
  YZCB: "建议核查柔性风选剔除量与卷烟机剔梗量是否超出标准值",
  XCCG: "建议核查计划投料、当前库存与卷包消耗进度是否匹配",
};

export function aiInterpretation(f: DefectForecast): string[] {
  if (f.status === "insufficient") return ["数据不足，无法生成解读"];
  const peak = peakOf(f);
  if (!peak) return ["数据不足，无法生成解读"];
  const lv = levelOf(peak.score);
  const eta = highRiskEta(f);
  const s1 =
    `预测窗口内最高风险评分 ${peak.score.toFixed(1)} 分（${peak.display}），等级${lv.label}，${eta.text}` +
    (f.confidence !== undefined ? `，模型置信度 ${Math.round(f.confidence * 100)}%` : "") +
    "。";
  const top = f.contributions
    .slice(0, 2)
    .map((c) => {
      const dev = f.params.find((p) => p.name === c.name)?.dev.text ?? "偏离参考基准";
      return `${c.name}（贡献 +${c.score.toFixed(1)} 分，${dev}）`;
    })
    .join("、");
  const s2 = top ? `参数关注：${top}。` : "参数关注：本轮无显著增险参数。";
  const s3 = `${CHECK_FOCUS[f.code]}，具体原因需现场核查。`;
  return [s1, s2, s3];
}

// ===== 查询接口 =====

function finalize(seed: RawSeed): DefectForecast {
  const obj = OBJECTS[seed.code].find((o) => o.key === seed.objectKey)!;
  const contributions = buildContributions(seed.contribs);
  const peak = seed.future.length > 0 ? seed.future.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  return {
    code: seed.code,
    objectKey: seed.objectKey,
    objectCode: obj.code,
    batch: seed.batch,
    status: seed.future.length === 0 ? "insufficient" : "ok",
    confidence: seed.confidence,
    modelVer: seed.modelVer ?? MODEL_VER[seed.code],
    hist: seed.hist,
    future: seed.future,
    params: seed.params,
    contributions,
    sources: buildSources(seed.contribs),
    context: seed.context,
    explainTime: peak ? shortOf(peak.full) : "—",
    moisture: seed.moisture,
    storage: seed.storage,
  };
}

const FORECASTS: DefectForecast[] = SEEDS.map(finalize);

export function forecastOf(code: string, objectKey: string, batch: string): DefectForecast {
  return (
    FORECASTS.find((f) => f.code === code && f.objectKey === objectKey && f.batch === batch) ??
    FORECASTS.find((f) => f.code === code && f.objectKey === objectKey) ??
    FORECASTS.find((f) => f.code === code)!
  );
}

// 对象风险等级口径：按同一预测窗口内最高风险评分确定（多批次取最高风险批次）；全部批次数据不足 → "数据不足"。
// 直接并入预测对象下拉选项展示，不再单独展示标签
export function objectLevelTextOf(code: string, objectKey: string): string {
  const obj = OBJECTS[(code as DefectCode) in OBJECTS ? (code as DefectCode) : "CPSFBH"].find((o) => o.key === objectKey);
  if (!obj) return "—";
  const peaks = obj.batches
    .map((b) => forecastOf(code, objectKey, b))
    .filter((f) => f.status === "ok")
    .map((f) => peakOf(f))
    .filter((p): p is { score: number; time: string; display: string } => p !== null)
    .sort((a, b) => b.score - a.score);
  return peaks.length > 0 ? levelOf(peaks[0].score).label : "数据不足";
}

// 对象清单（含全部已配置对象；下拉展示 "名称｜编码｜风险等级"）
export interface ObjectBrief {
  key: string;
  code: string;
  label: string;
  batches: string[];
}

export function forecastObjectsOf(code: string): ObjectBrief[] {
  return OBJECTS[(code as DefectCode) in OBJECTS ? (code as DefectCode) : "CPSFBH"].map((o) => ({
    key: o.key,
    code: o.code,
    label: `${o.key}｜${o.code}｜${objectLevelTextOf(code, o.key)}`,
    batches: o.batches,
  }));
}

// 对象内默认关联批次：最高风险有效批次（无有效预测时取首个批次）
export function defaultBatchOf(code: string, objectKey: string): string {
  const obj = OBJECTS[(code as DefectCode) in OBJECTS ? (code as DefectCode) : "CPSFBH"].find((o) => o.key === objectKey);
  if (!obj) return "";
  const ok = obj.batches
    .map((b) => forecastOf(code, objectKey, b))
    .filter((f) => f.status === "ok" && peakOf(f))
    .sort((a, b) => peakOf(b)!.score - peakOf(a)!.score);
  return ok[0]?.batch ?? obj.batches[0];
}

// 默认选中：默认项目（第 1 个缺陷）下按同一预测窗口最高评分从高到低选取首个有效对象；
// 无有效预测时仍选择首个对象并展示对应状态
export function defaultTargetOf(code?: string): { code: DefectCode; objectKey: string; batch: string } {
  const defectCode = (code && FORECAST_DEFECTS.some((d) => d.code === code) ? code : FORECAST_DEFECTS[0].code) as DefectCode;
  const ok = FORECASTS.filter((f) => f.code === defectCode && f.status === "ok" && peakOf(f)).sort(
    (a, b) => peakOf(b)!.score - peakOf(a)!.score
  );
  const chosen = ok[0] ?? FORECASTS.find((f) => f.code === defectCode)!;
  return { code: defectCode, objectKey: chosen.objectKey, batch: chosen.batch };
}
