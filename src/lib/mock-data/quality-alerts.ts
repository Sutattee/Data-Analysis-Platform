// 工艺质量 · 告警中心数据层
// 口径：
//  · 告警指标 = 12 个质量指标（9 个稳定性指标 SF01~SF09 + 包装卷制加权平均 + 优质品率成品/制丝），
//    机台/单位/统计周期与稳定性预测页（quality-stability-forecast）对齐，等级阈值按告警策略体系独立配置；
//    另有 5 个缺陷预测指标（QUALITY_DEFECT_METRICS，预测风险类型专属），与缺陷预测页
//    （quality-defect-forecast）同源：3 个风险评分（仅指标定义保留）+ 预测成品水分 + 预测箱储总存储时长
//  · 等级判定（产品规则）：指标越过基准阈值（上限/下限）后，按相对基准的偏离比例划分五级 ——
//    偏离比例 =（实际值 − 基准）÷ |基准| × 100%。以松散回潮非稳态指数为例（产品示例，基准 4%）：
//    ≥0%且＜5% 提示 / ≥5%且＜10% 关注 / ≥10%且＜20% 预警 / ≥20%且＜50% 告警 / ≥50% 危险
//    （即 指数≥4.00% 提示 / ≥4.20% 关注 / ≥4.40% 预警 / ≥4.80% 告警 / ≥6.00% 危险）
//  · 各指标等级边界沿用实际阈值配置（与稳定性预测页对齐）；基准 = 最轻级边界，
//    各级偏离比例区间由边界相对基准换算得出（见 qualityDeviationBandOf）
//  · 告警记录 = 实测异常（已越界）+ 预测风险（预计越界）两类；稳定性/结果类按 (指标, 机台) 生成，
//    等级分布按列表首屏调优（危险/告警各 4 条 → 首屏 4危+4告+2预，其余降档分散，五级仍全覆盖）；
//    另含 2 条缺陷预测记录（buildDefectAlertRecords，2026-10-19 最新一轮，全部「预测风险」，预测值与管控值对比口径；风险评分类预测记录已删除）
//  · 板块标记：记录 id 前缀 ZL、策略 id 前缀 QAS（能源告警中心按前缀排除，避免误伤同名旧数据）
//  · 本模块不依赖 alerts.ts（ALERT_RECORDS 由 alerts.ts 反向聚合，避免循环依赖）
import { LEVEL_RANK } from "./alert-levels";
import type { AlertRecord, AlertLevel, AlertType } from "@/types";

/* ---------------- 告警类型展示映射（需求文案「实测异常」↔ 全站枚举「当前异常」） ---------------- */

export const TYPE_DISPLAY: Record<AlertType, string> = { 当前异常: "实测异常", 预测风险: "预测风险" };

// 展示文案 → 存储枚举（表单保存时映射）
export function alertTypeOfDisplay(display: string): AlertType {
  return display === "预测风险" ? "预测风险" : "当前异常";
}

export const QUALITY_TYPE_OPTIONS = ["实测异常", "预测风险"];

/* ---------------- 12 个数据指标主数据 ---------------- */

export type QualityCycle = "每批次" | "每班次" | "每月" | "每日";

// 缺陷预测指标形态（预测风险类型专属的 5 个缺陷指标）：
// score = 风险评分（0—100 分，判预测时间窗口内最高评分）/ moistureDev = 预测成品水分 /
// storageTotal = 预测箱储总存储时长（与储存时长上限比较）
export type QualityDefectKind = "score" | "moistureDev" | "storageTotal";

// 等级阈值（单侧型；levels 按严重度降序，末位（最轻级）阈值 = 基准值，即偏离比例 0% 点）
export interface QualityLevelRule {
  op: ">=" | "<=";
  levels: { level: AlertLevel; threshold: number }[];
}

export interface QualityAlertMetric {
  name: string;        // 指标名称（需求文案）
  sfCode?: string;     // 对应稳定性预测页指标编码（机台/阈值来源；结果类指标无）
  defectCode?: string; // 对应缺陷预测页缺陷编码（CPSFBH/YZCB/XCCG；缺陷预测指标专用）
  defectKind?: QualityDefectKind; // 缺陷预测指标形态（表单联动；稳定性/结果类指标无）
  process?: string;    // 来源工序（SF 稳定性指标关联，如「松散回潮」；结果类指标无 → 详情不展示）
  unit: string;        // % / mg / 次 / 分 / pct / 小时
  decimals: number;    // 数值展示小数位
  cycle: QualityCycle; // 检测周期（表单联动）
  objects: string[];   // 告警对象（机台）；结果类指标 = ["全厂"]
  rule: QualityLevelRule | null; // null = 未配置阈值（阈值由策略条件配置，不走偏离比例分级）
}

export const QUALITY_ALERT_METRICS: QualityAlertMetric[] = [
  {
    name: "松散回潮非稳态指数", sfCode: "SF02", process: "松散回潮", unit: "%", decimals: 2, cycle: "每批次",
    objects: ["1#松散回潮机", "2#松散回潮机", "3#松散回潮机"],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 6.0 }, { level: "告警", threshold: 4.8 },
      { level: "预警", threshold: 4.4 }, { level: "关注", threshold: 4.2 }, { level: "提示", threshold: 4.0 },
    ] },
  },
  {
    name: "成品水分标准偏差", sfCode: "SF01", process: "松散回潮", unit: "%", decimals: 2, cycle: "每批次",
    objects: ["1#松散回潮机", "2#松散回潮机", "3#松散回潮机"],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 2.4 }, { level: "告警", threshold: 2.2 },
      { level: "预警", threshold: 2.1 }, { level: "关注", threshold: 2.0 },
    ] },
  },
  {
    name: "烘丝工序非稳态指数", sfCode: "SF03", process: "烘丝", unit: "", decimals: 2, cycle: "每批次",
    objects: ["1#烘丝机", "3#烘丝机", "5#烘丝机"],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 1.35 }, { level: "告警", threshold: 1.2 },
      { level: "预警", threshold: 1.15 }, { level: "关注", threshold: 1.1 },
    ] },
  },
  {
    name: "烘丝机出口水分偏差", sfCode: "SF04", process: "烘丝", unit: "%", decimals: 2, cycle: "每批次",
    objects: ["1#烘丝机", "3#烘丝机", "5#烘丝机"],
    rule: { op: ">=", levels: [
      { level: "告警", threshold: 0.5 }, { level: "预警", threshold: 0.45 }, { level: "关注", threshold: 0.42 },
    ] },
  },
  {
    name: "加香出口水分不达标次数", sfCode: "SF05", process: "加香", unit: "次", decimals: 0, cycle: "每日",
    objects: ["1#加香机", "2#加香机", "3#加香机"],
    rule: { op: ">=", levels: [
      { level: "危险", threshold: 7 }, { level: "告警", threshold: 5 }, { level: "提示", threshold: 4 },
    ] },
  },
  {
    name: "烟支单支克重偏差(毫克)", sfCode: "SF07", process: "卷制", unit: "mg", decimals: 1, cycle: "每班次",
    objects: ["1#卷接包机组", "2#卷接包机组", "4#卷接包机组"],
    rule: { op: "<=", levels: [
      { level: "危险", threshold: -18 }, { level: "告警", threshold: -15 },
      { level: "预警", threshold: -13.5 }, { level: "关注", threshold: -12 },
    ] },
  },
  {
    name: "非细支单支重量偏差", sfCode: "SF06", process: "卷制", unit: "mg", decimals: 1, cycle: "每班次",
    objects: ["1#卷接包机组", "3#卷接包机组", "5#卷接包机组"],
    rule: { op: ">=", levels: [{ level: "告警", threshold: 20 }, { level: "预警", threshold: 18 }] },
  },
  {
    name: "常规烟支硬度变异系数", sfCode: "SF08", process: "卷制", unit: "%", decimals: 2, cycle: "每班次",
    objects: ["2#卷接包机组", "3#卷接包机组", "5#卷接包机组"],
    rule: { op: ">=", levels: [
      { level: "告警", threshold: 3.5 }, { level: "预警", threshold: 3.35 },
      { level: "关注", threshold: 3.2 }, { level: "提示", threshold: 3.0 },
    ] },
  },
  {
    name: "中支烟硬度变异系数", sfCode: "SF09", process: "卷制", unit: "%", decimals: 2, cycle: "每班次",
    objects: ["2#卷接包机组", "3#卷接包机组", "4#卷接包机组"],
    rule: { op: ">=", levels: [
      { level: "告警", threshold: 4.0 }, { level: "预警", threshold: 3.85 },
      { level: "关注", threshold: 3.7 }, { level: "提示", threshold: 3.5 },
    ] },
  },
  {
    name: "包装与卷制质量检验加权平均值", unit: "分", decimals: 1, cycle: "每批次",
    objects: ["全厂"],
    rule: { op: "<=", levels: [{ level: "告警", threshold: 95 }, { level: "预警", threshold: 96 }, { level: "关注", threshold: 96.5 }] },
  },
  {
    name: "优质品率（成品）", unit: "%", decimals: 1, cycle: "每批次",
    objects: ["全厂"],
    rule: { op: "<=", levels: [{ level: "告警", threshold: 96 }, { level: "预警", threshold: 97 }, { level: "关注", threshold: 98 }] },
  },
  {
    name: "优质品率（制丝）", unit: "%", decimals: 1, cycle: "每批次",
    objects: ["全厂"],
    rule: { op: "<=", levels: [{ level: "告警", threshold: 96.5 }, { level: "预警", threshold: 97.5 }, { level: "关注", threshold: 98 }] },
  },
];

export const QUALITY_ALERT_METRIC_NAMES = new Set(QUALITY_ALERT_METRICS.map((m) => m.name));

/* ---------------- 5 个缺陷预测指标（预测风险类型专属） ---------------- */
// 口径与缺陷预测页（quality-defect-forecast）对齐：风险评分 0—100 分制判窗口最高评分；
// 预测成品水分对标准水分 12.5% 的允差 ±0.3pct；预测箱储总存储时长与储存时长上限比较。
// 阈值不在指标侧分级（rule = null），由策略条件配置（如 未来8小时内最高风险评分 ≥ 80分）。

export const QUALITY_DEFECT_METRICS: QualityAlertMetric[] = [
  {
    name: "成品水分不合格风险评分", defectCode: "CPSFBH", defectKind: "score", process: "烘丝",
    unit: "分", decimals: 1, cycle: "每批次",
    objects: ["1#烘丝机", "3#烘丝机", "5#烘丝机"],
    rule: null,
  },
  {
    name: "烟支刺破风险评分", defectCode: "YZCB", defectKind: "score", process: "卷制",
    unit: "分", decimals: 1, cycle: "每批次",
    objects: ["ZJ17-02卷接机组", "ZJ19-01卷接机组", "ZJ17-04卷接机组", "5#卷接包机组"],
    rule: null,
  },
  {
    name: "箱储存储时间超上限风险评分", defectCode: "XCCG", defectKind: "score", process: "仓储",
    unit: "分", decimals: 1, cycle: "每批次",
    objects: ["1#储丝柜", "2#储丝柜", "3#储丝柜"],
    rule: null,
  },
  {
    name: "预测成品水分", defectCode: "CPSFBH", defectKind: "moistureDev", process: "烘丝",
    unit: "%", decimals: 1, cycle: "每批次",
    objects: ["1#烘丝机", "3#烘丝机", "5#烘丝机"],
    rule: null,
  },
  {
    name: "预测箱储总存储时长", defectCode: "XCCG", defectKind: "storageTotal", process: "仓储",
    unit: "小时", decimals: 0, cycle: "每批次",
    objects: ["1#储丝柜", "2#储丝柜", "3#储丝柜"],
    rule: null,
  },
];

export const QUALITY_DEFECT_METRIC_NAMES = new Set(QUALITY_DEFECT_METRICS.map((m) => m.name));

// 查找表覆盖全部 17 个指标（12 稳定性/结果类 + 5 缺陷预测类）：
// qualityMetricOf / qualityMetricDefOf / qualityObjectsOfMetric / qualityCycleUnitOf / qualityDefectKindOf 共用
const METRIC_MAP = new Map([...QUALITY_ALERT_METRICS, ...QUALITY_DEFECT_METRICS].map((m) => [m.name, m]));

// 风险评分指标的预测时间窗口候选（如「未来8小时内，最高风险评分≥80分 告警」）；
// 水分偏差 / 箱储总时长指标的预测窗口由模型轮次隐含（8 小时），不单独选择
export const DEFECT_FORECAST_WINDOWS = ["未来4小时", "未来8小时", "未来12小时", "未来24小时"];

// 指标 → 缺陷预测形态（非缺陷指标返回 undefined；条件构造器据此切换预测时间窗口控件）
export function qualityDefectKindOf(name: string): QualityDefectKind | undefined {
  return METRIC_MAP.get(name)?.defectKind;
}

// 表单指标候选：实测异常 = 12 个稳定性/结果类指标；预测风险仅追加 预测成品水分 / 预测箱储总存储时长
// 2 个缺陷指标（3 个风险评分指标不再开放新建；指标定义保留供历史策略展示，风险评分类告警记录已删除）
export function qualityMetricOptionsOf(type: AlertType): string[] {
  const base = QUALITY_ALERT_METRICS.map((m) => m.name);
  if (type !== "预测风险") return base;
  const selectable = new Set(["预测成品水分", "预测箱储总存储时长"]);
  return [...base, ...QUALITY_DEFECT_METRICS.map((m) => m.name).filter((n) => selectable.has(n))];
}

export function qualityMetricOf(name: string): QualityAlertMetric | undefined {
  return METRIC_MAP.get(name);
}

// 指标定义（id + 单位），供触发条件按指标带出单位（alert-strategies.metricDefOf 质量分支）；
// id 优先取稳定性编码 / 缺陷编码（用于目标值管理查询，缺陷指标无目标值配置 → 查询自然落空）
export function qualityMetricDefOf(name: string): { id: string; unit: string } | undefined {
  const m = METRIC_MAP.get(name);
  if (!m) return undefined;
  const id = m.sfCode ?? m.defectCode ?? `QC-${String(QUALITY_ALERT_METRICS.indexOf(m) + 1).padStart(2, "0")}`;
  return { id, unit: m.unit };
}

// 指标 → 告警对象（表单「告警对象」自动带入，仅展示）
export function qualityObjectsOfMetric(name: string): string[] {
  const m = METRIC_MAP.get(name);
  return m ? [...m.objects] : [];
}

// 统计周期 → 连续同向偏离单位（表单位后缀与条件文案：每批次→批次 / 每班次→班次 / 每月→月 / 每日→日）
export function qualityCycleUnitOf(name: string): string {
  const cycle = METRIC_MAP.get(name)?.cycle;
  return cycle === "每班次" ? "班次" : cycle === "每月" ? "月" : cycle === "每日" ? "日" : "批次";
}

/* ---------------- 基准与偏离比例（产品规则：等级按相对基准的偏离比例划分） ---------------- */

// 基准阈值 = 最轻级边界（偏离比例 0% 点；levels 按严重度降序故取末位）
export function qualityBaseOf(rule: QualityLevelRule): number {
  return rule.levels[rule.levels.length - 1].threshold;
}

// 偏离比例格式化（最多 2 位小数、去尾零，如 38 / 4.55 / 12.5）
function trimPct(v: number): string {
  return String(Math.round(v * 100) / 100);
}

// 边界相对基准的偏离比例（%）；上限/下限型统一取幅度
function pctOfEdge(threshold: number, base: number): number {
  return Math.abs(threshold / base - 1) * 100;
}

// 该级偏离比例区间文案（如 "20%-50%" / "≥50%" / "0%-5%"；上下界 = 该级与相邻更严重级边界的换算值）
export function qualityDeviationBandOf(rule: QualityLevelRule, level: AlertLevel): string {
  const base = qualityBaseOf(rule);
  const idx = rule.levels.findIndex((l) => l.level === level);
  if (idx < 0) return ""; // 等级未配置时兜底空串（不抛错）
  const lo = trimPct(pctOfEdge(rule.levels[idx].threshold, base));
  const hi = idx > 0 ? trimPct(pctOfEdge(rule.levels[idx - 1].threshold, base)) : null;
  return hi === null ? `≥${lo}%` : `${lo}%-${hi}%`;
}

// 机台筛选下拉：全厂 + 全部机台（按指标定义序去重；含缺陷预测指标的卷接机组/储丝柜）
export const QUALITY_MACHINES: string[] = (() => {
  const out = ["全厂"];
  for (const m of [...QUALITY_ALERT_METRICS, ...QUALITY_DEFECT_METRICS]) {
    for (const o of m.objects) {
      if (!out.includes(o)) out.push(o);
    }
  }
  return out;
})();

// 详情基本信息扩展字段按指标展示（需求口径：批次/机台/班组/牌号的支持组合因指标而异；
// 机台 = 告警对象；未命中指标兜底全展示）
export type QualityDetailField = "machine" | "batch" | "shift" | "brand";
const ALL_DETAIL_FIELDS: QualityDetailField[] = ["machine", "batch", "shift", "brand"];
export const QUALITY_DETAIL_FIELDS: Record<string, QualityDetailField[]> = {
  "松散回潮非稳态指数": ["batch", "machine", "shift", "brand"],
  "烘丝工序非稳态指数": ["batch", "machine", "shift", "brand"],
  "成品水分标准偏差": ["batch", "machine", "shift", "brand"],
  "非细支单支重量偏差": ["batch", "machine", "shift", "brand"],
  "常规烟支硬度变异系数": ["batch", "machine", "shift", "brand"],
  "中支烟硬度变异系数": ["batch", "machine", "shift", "brand"],
  "包装与卷制质量检验加权平均值": ["batch", "machine", "shift", "brand"],
  "烘丝机出口水分偏差": ["batch", "machine", "brand"],
  "加香出口水分不达标次数": ["machine", "batch", "brand"],
  "烟支单支克重偏差(毫克)": ["machine", "brand"],
  "优质品率（成品）": ["brand"],
  "优质品率（制丝）": ["batch", "brand", "machine"],
  // 缺陷预测指标：批次（预测页关联批次）/ 机台 / 班组 / 牌号 全展示
  "成品水分不合格风险评分": ["batch", "machine", "shift", "brand"],
  "烟支刺破风险评分": ["batch", "machine", "shift", "brand"],
  "箱储存储时间超上限风险评分": ["batch", "machine", "shift", "brand"],
  "预测成品水分": ["batch", "machine", "shift", "brand"],
  "预测箱储总存储时长": ["batch", "machine", "shift", "brand"],
};
export function qualityDetailFieldsOf(metricName: string): QualityDetailField[] {
  return QUALITY_DETAIL_FIELDS[metricName] ?? ALL_DETAIL_FIELDS;
}

// 机台编号（列表「告警对象编号」搜索字段用；从机台名解析序号 + 类型缩写）
const MACHINE_CODE: Record<string, string> = {};
{
  const PREFIX: Record<string, string> = { 松散回潮机: "SSJC", 烘丝机: "HSJ", 加香机: "JXJ", 卷接包机组: "JJB" };
  for (const m of QUALITY_ALERT_METRICS) {
    for (const o of m.objects) {
      if (o === "全厂" || MACHINE_CODE[o]) continue;
      const no = o.replace(/[^0-9]/g, "") || "1";
      const kind = Object.keys(PREFIX).find((k) => o.includes(k)) ?? "QC";
      MACHINE_CODE[o] = `${kind}-${no.padStart(2, "0")}`;
    }
  }
  MACHINE_CODE["全厂"] = "QC-ALL";
}

/* ---------------- 告警记录生成（确定性 31 条：实测约 2/3 + 预测约 1/3，五级全覆盖） ---------------- */

// 质量场景接收人（与 alerts.ts 的 ALERT_USERS 独立，避免循环依赖）
const RECEIVERS = ["苏恒", "吴敏", "周婷", "陈静", "王芳", "刘洋", "高亚东"];
const SHIFTS = ["甲班", "乙班", "丙班"];
const BRANDS = ["娇子", "宽窄", "龙凤呈祥"];

// 过程类指标原因/建议（贴合松散回潮、烘丝、加香、卷制工况；需求示例文案）
const PROCESS_CAUSES = [
  (metric: string) => `可能与来料水分或流量波动、加水加汽调节不稳定及开机初期工况波动有关，具体原因需结合${metric}过程数据核实。`,
  (metric: string) => `经排查，当批次来料物理指标波动叠加设备工况不稳，导致${metric}超出控制范围，具体原因需现场核实。`,
  (metric: string) => `相关工序参数漂移叠加环境温湿度变化，${metric}阶段性偏离，具体原因需结合过程数据核实。`,
];
const PROCESS_SUGGESTIONS = [
  (metric: string) => `建议核查来料水分与流量、加水加汽控制及开机工况，按工艺标准调整异常参数，并持续监测${metric}是否恢复正常。`,
  (metric: string) => `建议复核工序基准设置与测点校准状态，按工艺标准调整参数，并跟踪后续批次${metric}变化。`,
  (metric: string) => `建议排查设备运行状态与环境条件，按工艺标准校正参数，持续监测${metric}走势。`,
];
// 结果类指标（优质品率/包装卷制加权）原因/建议
const RESULT_CAUSES = [
  (metric: string) => `可能与原料批次波动、设备工况不稳及检验抽样代表性有关，具体原因需结合${metric}检验数据核实。`,
  (metric: string) => `当期缺陷集中于个别部位，叠加设备精度衰减，${metric}阶段性下滑，具体原因需现场核实。`,
];
const RESULT_SUGGESTIONS = [
  (metric: string) => `建议核查缺陷集中部位与相关设备精度，按检验标准复核抽样，并持续跟踪${metric}回升情况。`,
  (metric: string) => `建议排查相关机组运行状态与来料适配性，落实工艺标准执行，跟踪${metric}变化。`,
];

// 单条记录规格（等级分布按列表首屏调优：危险/告警各 4 条 → 首屏 4危+4告+2预，
// 其余降档分散至预警/关注/提示；值与等级区间手工锚定自洽）
interface RecordSpec {
  m: number;              // QUALITY_ALERT_METRICS 下标
  machine: string;        // 告警对象
  level: AlertLevel;      // 告警等级
  forecast?: boolean;     // 预测风险（缺省 = 实测异常）
  value: number;          // 告警值（实测=当前值 / 预测=预计值）
  shifts?: number;        // 连续同向偏离周期数（飘移类：标题/条件带「连续N个批次」，对应飘移预警策略）
  shiftBaseline?: number; // 飘移策略触发线（条件快照的基准值，如 SF04 飘移预警 = 0.50；缺省用统一基准）
}

const SPECS: RecordSpec[] = [
  // 松散回潮非稳态指数（产品示例指标：基准 4%，偏离比例 0/5/10/20/50 分五级）
  { m: 0, machine: "1#松散回潮机", level: "预警", value: 4.52 },
  { m: 0, machine: "2#松散回潮机", level: "预警", forecast: true, value: 4.45 },
  { m: 0, machine: "3#松散回潮机", level: "提示", value: 4.06 },
  { m: 0, machine: "1#松散回潮机", level: "关注", value: 4.25 },
  // 成品水分标准偏差（2#：关注实测 + 预警预测；危险级见 3# 飘移与预测条）
  { m: 1, machine: "2#松散回潮机", level: "预警", forecast: true, value: 2.15 },
  { m: 1, machine: "2#松散回潮机", level: "关注", value: 2.08 },
  { m: 1, machine: "1#松散回潮机", level: "关注", value: 2.05 },
  { m: 1, machine: "3#松散回潮机", level: "预警", forecast: true, value: 2.12 },
  // 烘丝工序非稳态指数
  { m: 2, machine: "5#烘丝机", level: "关注", value: 1.12 },
  { m: 2, machine: "1#烘丝机", level: "预警", forecast: true, value: 1.16 },
  // 烘丝机出口水分偏差
  { m: 3, machine: "3#烘丝机", level: "预警", value: 0.47 },
  { m: 3, machine: "1#烘丝机", level: "关注", value: 0.43 },
  // 烘丝机出口水分偏差 · 飘移示例（连续 3 个批次 > 上限 0.50% 触发，产生危险级记录；对应 QAS-010）
  { m: 3, machine: "5#烘丝机", level: "危险", value: 0.58, shifts: 3, shiftBaseline: 0.5 },
  // 成品水分标准偏差 · 飘移示例（连续 5 个批次 > 上限 2.20% 触发，产生危险级记录；危险等级按排序规则置顶）
  { m: 1, machine: "3#松散回潮机", level: "危险", value: 2.35, shifts: 5, shiftBaseline: 2.2 },
  // 加香出口水分不达标次数（每日）
  { m: 4, machine: "2#加香机", level: "危险", value: 8 },
  { m: 4, machine: "1#加香机", level: "告警", forecast: true, value: 5 },
  // 非细支单支重量偏差
  { m: 6, machine: "1#卷接包机组", level: "预警", value: 19.2 },
  { m: 6, machine: "5#卷接包机组", level: "预警", forecast: true, value: 18.4 },
  // 烟支单支克重偏差（2# 预警预测；告警级见 4# 实测条）
  { m: 5, machine: "2#卷接包机组", level: "预警", forecast: true, value: -14.2 },
  { m: 5, machine: "4#卷接包机组", level: "告警", value: -15.8 },
  // 常规烟支硬度变异系数
  { m: 7, machine: "2#卷接包机组", level: "告警", value: 3.58 },
  { m: 7, machine: "3#卷接包机组", level: "提示", value: 3.05 },
  // 中支烟硬度变异系数
  { m: 8, machine: "4#卷接包机组", level: "预警", forecast: true, value: 3.9 },
  { m: 8, machine: "2#卷接包机组", level: "关注", value: 3.75 },
  // 包装与卷制质量检验加权平均值
  { m: 9, machine: "全厂", level: "预警", value: 95.8 },
  { m: 9, machine: "全厂", level: "关注", forecast: true, value: 96.4 },
  // 优质品率（成品）
  { m: 10, machine: "全厂", level: "告警", value: 95.6 },
  { m: 10, machine: "全厂", level: "预警", forecast: true, value: 96.5 },
  // 优质品率（制丝）
  { m: 11, machine: "全厂", level: "预警", value: 97.5 },
  { m: 11, machine: "全厂", level: "关注", value: 97.8 },
  // 成品水分标准偏差 · 预测危险示例（预测值 2.52 越过危险线 2.40；尾部追加 = 触发时间最新，
  // 危险级 + 最新 → 非飘移组第一，排列表第三）
  { m: 1, machine: "3#松散回潮机", level: "危险", forecast: true, value: 2.52 },
];

// 确定性时间（与 alerts.ts 同一基准日，步进与基础 311 / 辅料 407 / 费用 293 错开）
const BASE_TS = new Date("2026-07-09T08:00:00").getTime();
function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function pad3(n: number) {
  return n < 10 ? `00${n}` : n < 100 ? `0${n}` : `${n}`;
}
function tsAt(offsetMin: number): string {
  const d = new Date(BASE_TS + offsetMin * 60000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function buildQualityAlertRecords(): AlertRecord[] {
  return [...buildStabilityAlertRecords(), ...buildDefectAlertRecords()];
}

/* ---------------- 缺陷指标 · 预测风险告警记录（5 条，与缺陷预测页最新一轮对齐） ---------------- */
// 口径：
//  · 记录由缺陷预测结果触发 → type 固定「预测风险」；触发时间紧随本轮预测发布时刻（14:06）之后
//  · 数值与缺陷预测页（quality-defect-forecast）同源：窗口最高评分 / 预测水分偏差 / 箱储时长核算
//  · 追溯字段：对象（编码沿用预测页 HS-03/ZJ17-02/CG-01）、批次、评分或预测值、阈值、窗口、
//    模型版本（modelVersion）
//  · 剩余允许储存时间仅可用于临近截止提醒，不能直接视为必然超时：YS-1027B 剩余 16 小时但
//    预计总储存时长 63 小时＜上限 72 小时 → 不生成超时记录
//  · 同一风险事件连续满足条件时按告警中心既有规则去重，等级变化及恢复沿用既有规则
//    （mock 单轮预测无历史轮次，去重口径不在数据层展开）
//  · YS-1026A 暂无出库计划：预计总储存时长按「≥ 已储存 102 小时」下界判定超时，不编造精确值

interface DefectRecordSpec {
  id: string;
  level: AlertLevel;
  title: string;
  objectCode: string;
  objectName: string;
  metricName: string;
  triggerTime: string;
  valueLabel: string;
  baselineLabel: string;
  deviationValue: string;
  deviationRate: string;
  batch: string;
  forecastWindow: string; // 预测窗口（与缺陷预测页同源：未来 N 个已排产批次）
  shift: string;
  brand: string;
  process: string;
  strategyName: string;
  triggerCondition: string;
  causeSummary: string;
  suggestion: string;
  receiver: string;
  modelVersion: string;
}

const DEFECT_MODEL_VERSION = "缺陷风险滚动预测模型 v2.3";

const DEFECT_SPECS: DefectRecordSpec[] = [
  {
    id: "ZL20261019004",
    level: "告警",
    title: "预测成品水分 13.5%，超出上限 0.7pct",
    objectCode: "HS-03",
    objectName: "3#烘丝机",
    metricName: "预测成品水分",
    triggerTime: "2026-10-19 14:10",
    valueLabel: "预测值 13.5%",
    baselineLabel: "12.2%～12.8%",
    deviationValue: "超上限0.7pct",
    deviationRate: "+233.3%",
    batch: "P20261019-03",
    forecastWindow: "未来 10 个已排产批次",
    shift: "甲班",
    brand: "娇子",
    process: "烘丝",
    strategyName: "预测成品水分预警策略",
    triggerCondition: "预测成品水分 ≥上限12.8% 超出0.5pct 或 ＜下限12.2% 超出0.5pct",
    causeSummary:
      "预测窗口末段成品水分持续抬升（预计 13.5%），与加香水分均值偏高相关，具体原因需结合过程数据核实。",
    suggestion: "建议核查加香出口水分设定与排潮风门开度，跟踪预测偏差是否回落至允差范围内。",
    receiver: "王芳",
    modelVersion: DEFECT_MODEL_VERSION,
  },
  {
    id: "ZL20261019005",
    level: "危险",
    title: "预测箱储总存储时长超过上限72小时",
    objectCode: "CG-01",
    objectName: "1#储丝柜",
    metricName: "预测箱储总存储时长",
    triggerTime: "2026-10-19 14:11",
    valueLabel: "预测值102h",
    baselineLabel: "≤72h",
    deviationValue: "超上限30h",
    deviationRate: "+41.7%",
    batch: "YS-1026A",
    forecastWindow: "未来 14 个已排产批次",
    shift: "甲班",
    brand: "长城",
    process: "仓储",
    strategyName: "预测箱储总存储时长危险预警策略",
    triggerCondition: "预测箱储总存储时长 ＞ 储存时长上限 72小时 超出5小时",
    causeSummary:
      "该批次暂无出库计划，预计总储存时长不低于已储存的102小时、已超上限30小时，具体原因需结合领用计划核实。",
    suggestion: "建议核查计划投料、当前库存与卷包消耗进度是否匹配，尽快落实该批次出库计划。",
    receiver: "刘洋",
    modelVersion: "箱储工艺标准 v1.6（储存时长上限 72小时）",
  },
];

function buildDefectAlertRecords(): AlertRecord[] {
  return DEFECT_SPECS.map((spec) => ({
    id: spec.id,
    level: spec.level,
    title: spec.title,
    type: "预测风险" as AlertType,
    domain: "工艺质量",
    objectCode: spec.objectCode,
    objectName: spec.objectName,
    metricName: spec.metricName,
    triggerTime: spec.triggerTime,
    // 核心告警数据
    valueLabel: spec.valueLabel,
    baselineLabel: spec.baselineLabel,
    deviationValue: spec.deviationValue,
    deviationRate: spec.deviationRate,
    // 追溯字段（缺陷预测类记录专属）
    batch: spec.batch,
    forecastWindow: spec.forecastWindow,
    modelVersion: spec.modelVersion,
    shift: spec.shift,
    shiftLabel: "10-19 白班",
    brand: spec.brand,
    process: spec.process,
    // 判定依据（策略快照，与 QAS-011~015 策略条件同文案）
    strategyName: spec.strategyName,
    triggerCondition: spec.triggerCondition,
    // 原因与建议（预测解释由模型生成）
    causeSummary: spec.causeSummary,
    causeType: "AI生成" as const,
    suggestion: spec.suggestion,
    // 责任与处理情况（本轮预测刚发布，均未处理；通知方式 = 企业微信）
    receiver: spec.receiver,
    notifyMethods: ["企业微信"],
    notifyStatus: "已发送",
  }));
}

/* ---------------- 稳定性/结果类指标 · 告警记录生成（确定性 31 条，五级全覆盖） ---------------- */

function buildStabilityAlertRecords(): AlertRecord[] {
  return SPECS.map((spec, i) => {
    const metric = QUALITY_ALERT_METRICS[spec.m];
    const rule = metric.rule!;
    const base = qualityBaseOf(rule); // 基准阈值（偏离比例 0% 点）
    // 该级偏离比例区间（等级未配置时返回空串兜底，防御模块级抛错导致全站 SSR 500）
    const band = qualityDeviationBandOf(rule, spec.level);
    const isForecast = !!spec.forecast;
    const isUpper = rule.op === ">=";
    const fmt = (v: number) => v.toFixed(metric.decimals);

    // 告警值 / 基准阈值 / 偏离值 / 偏离率（基准 = 统一阈值；偏离按相对基准计算，与等级区间同口径）
    const valueLabel = `${isForecast ? "预测值" : "当前值"}${fmt(spec.value)}${metric.unit}`;
    const baselineLabel = `${isUpper ? "上限" : "下限"} ${fmt(base)}${metric.unit}`;
    const delta = spec.value - base;
    const sign = delta >= 0 ? "+" : "-";
    const absDelta = Math.abs(delta);
    const deviationValue = `${sign}${fmt(absDelta)}${metric.unit}`;
    const deviationRate = `${sign}${trimPct((absDelta / Math.abs(base)) * 100)}%`;

    // 策略快照的超出量（该级偏离比例区间下界相对基准换算的绝对量；% 指标单位记作 pct）
    const bandPct = Number(band.match(/\d+(?:\.\d+)?/)?.[0] ?? "0");
    const exceedUnit = metric.unit === "%" ? "pct" : metric.unit;
    const exceedSuffix = bandPct > 0 ? ` 超出${trimPct(base * (bandPct / 100))}${exceedUnit}` : "";

    // 标题（不含告警对象；实测=已越界 / 预测=预计越界 / 飘移=连续N个周期越界）
    const cycleUnit = qualityCycleUnitOf(metric.name); // 连续偏离单位（批次/班次/月）
    const title = spec.shifts
      ? `${metric.name}连续${spec.shifts}个${cycleUnit}${isUpper ? "超过上限" : "低于下限"}`
      : isForecast
        ? `${metric.name}${isUpper ? "持续上升，预计越过上限" : "持续下降，预计跌破下限"}`
        : `${metric.name}${isUpper ? "超过上限" : "低于下限"}`;

    // 预测风险：预计越界周期数（批次后缀如「第 2418 批（3个批次后）」）与预测窗口
    // （批周期与缺陷预测页同源口径「已排产批次」；日周期与稳定性预测页 SF05 同口径「未来已排产的22日」）
    const forecastShift = 2 + (i % 3); // 2~4 个统计周期后越界
    const windowUnit = cycleUnit === "批次" ? "已排产批次" : cycleUnit;
    const forecastWindow = isForecast
      ? cycleUnit === "日"
        ? "未来已排产的22日"
        : `未来 ${[5, 10, 15][i % 3]} 个${windowUnit}`
      : undefined;

    const triggerTime = tsAt(3300 + i * 263);
    // 班次（批/班周期指标；月度/每日指标无班次）：按触发时间推定 —— 8~20 点白班、其余夜班；
    // 日期格式与稳定性预测页班次标签一致（如「7-19 白班」）
    const triggerHour = Number(triggerTime.slice(11, 13));
    const shiftLabel =
      metric.cycle === "每批次" || metric.cycle === "每班次"
        ? `${Number(triggerTime.slice(5, 7))}-${Number(triggerTime.slice(8, 10))} ${triggerHour >= 8 && triggerHour < 20 ? "白班" : "夜班"}`
        : undefined;
    const dateStr = triggerTime.slice(0, 10).replace(/-/g, "");
    const handled = i % 3 === 1 && !spec.shifts; // 约 1/3 已处理（飘移示例保持未处理，便于演示确认操作）
    const isResult = metric.objects[0] === "全厂"; // 结果类指标（原因/建议另一套文案）
    const causeIdx = isResult ? i % RESULT_CAUSES.length : i % PROCESS_CAUSES.length;
    const noCause = i % 5 === 2 && !spec.shifts; // 少量记录演示「当前数据不足，暂无法确定异常原因」（飘移示例带原因）

    return {
      id: `ZL${dateStr}${pad3(i + 1)}`,
      level: spec.level,
      title,
      type: (isForecast ? "预测风险" : "当前异常") as AlertType,
      domain: "工艺质量",
      objectCode: MACHINE_CODE[spec.machine] ?? spec.machine,
      objectName: spec.machine,
      metricName: metric.name,
      triggerTime,
      // 核心告警数据
      valueLabel,
      baselineLabel,
      deviationValue,
      deviationRate,
      confidenceRange: isForecast
        ? `${fmt(spec.value - 0.15)}～${fmt(spec.value + 0.18)}${metric.unit}`
        : undefined,
      // 质量扩展（详情基本信息；字段按指标展示，见 qualityDetailFieldsOf）
      // 批次：实测「第 N 批」/ 预测「第 N 批（M个周期后）」；月度指标实测「本月」、
      // 预测为预计越界月份「9月（2个月后）」（触发月 + M 个月）；日周期后缀如「（3日后）」
      batch:
        metric.cycle === "每月"
          ? isForecast
            ? `${((Number(triggerTime.slice(5, 7)) - 1 + forecastShift) % 12) + 1}月（${forecastShift}个月后）`
            : "本月"
          : `第 ${2417 + i} 批${isForecast ? `（${forecastShift}${cycleUnit === "日" ? "日" : `个${cycleUnit}`}后）` : ""}`,
      forecastWindow,
      shift: SHIFTS[i % 3],
      shiftLabel, // 班次（白班/夜班，批/班周期指标生成；月度指标不生成 → 详情不展示）
      brand: BRANDS[i % 3],
      process: metric.process, // 来源工序（结果类指标无 → 详情不展示）
      consecutiveShifts: spec.shifts, // 飘移类：连续同向偏离周期数（详情「连续同向偏离」= N个批次/班次/月；列表置顶）
      // 判定依据（策略快照：历史记录展示生成时的策略与条件；飘移类另以 consecutiveShifts 字段展示连续偏离）
      strategyName: spec.shifts
        ? `${metric.name}飘移预警策略`
        : `${metric.name}${isForecast ? "风险预警策略" : "异常告警策略"}`,
      triggerCondition: spec.shifts
        ? `${metric.name} ${isUpper ? ">" : "<"} ${isUpper ? "上限" : "下限"}${fmt(spec.shiftBaseline ?? base)}${metric.unit}`
        : `${metric.name} ${isUpper ? "≥" : "≤"} ${isUpper ? "上限" : "下限"}${fmt(base)}${metric.unit}${exceedSuffix}`,
      // 原因与建议
      causeSummary: noCause
        ? undefined
        : isResult
          ? RESULT_CAUSES[causeIdx](metric.name)
          : PROCESS_CAUSES[causeIdx](metric.name),
      causeType: noCause ? undefined : i % 2 === 0 ? "AI生成" : "人工补录",
      suggestion: isResult
        ? RESULT_SUGGESTIONS[i % RESULT_SUGGESTIONS.length](metric.name)
        : PROCESS_SUGGESTIONS[i % PROCESS_SUGGESTIONS.length](metric.name),
      // 责任与处理情况（确认时间 = handledAt；约 1/3 预置已处理演示状态）
      receiver: RECEIVERS[i % RECEIVERS.length],
      notifyMethods: ["企业微信"],
      notifyStatus: i % 9 === 0 ? "发送失败" : "已发送",
      handledAt: handled ? tsAt(3300 + i * 263 + 150) : undefined,
      handledBy: handled ? RECEIVERS[i % RECEIVERS.length] : undefined,
      // 确认结果（处理情况栏）：已处理记录轮换两种确认结论
      handleResult: handled ? (i % 2 === 0 ? "确认为异常" : "判为偶发") : undefined,
    };
  });
}

/* ---------------- 等级比较（LEVEL_RANK 复用，供质量组件排序/比较） ---------------- */
export { LEVEL_RANK };
