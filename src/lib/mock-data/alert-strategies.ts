import type {
  AlertStrategy,
  AlertCondition,
  AlertOperator,
  AlertBaselineType,
  AlertDetectCycle,
  AlertScope,
  AlertType,
  AlertDomain,
} from "@/types";
import { metricList } from "./metric-management";
import { activeTargetOf } from "./metric-targets";
import { PRODUCTION_MATERIAL_METRICS } from "./alerts";
import {
  EXPENSE_ALERT_METRIC_NAMES, EXPENSE_ALERT_METRIC_SUFFIX, expenseDeptsOfMetric, expenseMetricDefOf,
} from "./expense-alerts";
import type { MetricTargetVersion } from "@/types";

// ========== 选项常量（供表单下拉） ==========
export const ALERT_OPERATORS: AlertOperator[] = ["<", "≤", ">", "≥", "≠", "=", "超出正常区间"];
export const ALERT_BASELINE_TYPES: AlertBaselineType[] = ["目标值", "基准值", "上限", "下限", "历史均值", "正常区间"];

// 判断方式 → 合适的基准类型候选（触发条件联动筛选）
// 单值比较可搭配 目标值/基准值/上限/下限/历史均值；「超出正常区间」仅搭配正常区间。
export const OPERATOR_BASELINE_MAP: Record<AlertOperator, AlertBaselineType[]> = {
  "<": ["目标值", "基准值", "上限", "下限", "历史均值"],
  "≤": ["目标值", "基准值", "上限", "下限", "历史均值"],
  ">": ["目标值", "基准值", "上限", "下限", "历史均值"],
  "≥": ["目标值", "基准值", "上限", "下限", "历史均值"],
  "≠": ["目标值", "基准值", "上限", "下限", "历史均值"],
  "=": ["目标值", "基准值", "上限", "下限", "历史均值"],
  "超出正常区间": ["正常区间"],
  "处于区间": ["正常区间"], // 仅费用口径表单使用（落入选定区间即触发）
};
export const ALERT_DETECT_CYCLES: AlertDetectCycle[] = ["每小时", "每日", "每月"];
export const ALERT_SCOPE_OPTIONS: AlertScope[] = ["全部适用对象", "指定对象"]; // 保留常量供历史数据展示
export const NOTIFY_METHOD_OPTIONS = ["邮件"];
export const FORECAST_RANGES = ["未来3天", "未来7天", "未来15天", "未来1个月", "未来2个月", "未来3个月"];

// 指标候选（指标管理同源，支持关键字搜索）；能源板块口径：不含生产辅料指标
export const METRIC_OPTIONS: string[] = metricList
  .map((m) => m.nameCn)
  .filter((name) => !PRODUCTION_MATERIAL_METRICS.includes(name));
// 支持预测模型的指标（预测风险类型仅可选这些）
export const FORECAST_METRIC_OPTIONS: string[] = [
  "单箱综合能耗",
  "单位产值碳排放量",
  "包装设备运行效率",
  "卷接设备运行效率",
];

// 指标定义（id + 单位），供触发条件按指标带出单位 / 带入目标值
// 费用预算执行告警指标（如「日常差旅费-执行进度偏差」）单位固定 pct
export function metricDefOf(name: string): { id: string; unit: string } | undefined {
  const expense = expenseMetricDefOf(name);
  if (expense) return expense;
  const m = metricList.find((x) => x.nameCn === name);
  return m ? { id: m.id, unit: m.unit } : undefined;
}

// 有效目标值（目标值管理「生效中」版本；无配置返回 null）
export function activeTargetForMetric(name: string): MetricTargetVersion | null {
  const def = metricDefOf(name);
  if (!def) return null;
  return activeTargetOf(def.id) ?? null;
}

// 各指标最新历史均值（模拟统计：近30个统计周期日均值，位数与指标小数位数一致）
export const METRIC_HISTORICAL_AVG: Record<string, string> = {
  单位产量碳排放量: "0.0338",
  包装设备运行效率: "88.5",
  卷接设备运行效率: "91.2",
  单箱耗烟叶量: "7.2",
  单箱耗嘴棒量: "2515",
  优质品率: "96.8",
  单箱综合能耗: "30.6",
  生产效率: "94.3",
  烘丝机出口水分偏差: "0.32",
  百小时停机断料率: "4.15",
  台时产量: "1085",
};

// 最新历史均值（基准类型=历史均值时系统自动带入，不支持编辑；无数据返回空串）
export function historicalAvgForMetric(name: string): string {
  return METRIC_HISTORICAL_AVG[name] ?? "";
}

// 通知预览模板：按告警类型区分
// 当前异常
export const NOTIFY_TEMPLATE_ANOMALY = `检测时间：{检测时间}
您关注的指标已触发告警，请及时处理。
{告警标题}
告警等级：{告警等级}
告警对象：{对象名称}（{对象编号}）
指标名称：{指标名称}
实际值：{实际值}
基准／阈值：{基准或阈值}
偏离程度：{偏离程度}
异常发生时间：{发生时间}
持续时间：{持续时间}
原因摘要：{原因摘要}
处置建议：{处置建议}`;

// 预测风险
export const NOTIFY_TEMPLATE_FORECAST = `检测时间：{检测时间}
您关注的指标已触发告警，请及时处理。
{告警标题}
告警等级：{告警等级}
告警对象：{对象名称}（{对象编号}）
指标名称：{指标名称}
当前值：{当前值}
预测值：{预测值}
告警阈值：{阈值}
风险概率：{风险概率}
置信区间：{置信区间}
预计越界时间：{预计越界时间}
风险摘要：{风险摘要}
处置建议：{处置建议}`;

// 通知预览统一模板（仅一种样式）
export function defaultNotifyTemplate(): string {
  return NOTIFY_TEMPLATE_ANOMALY;
}

// ========== 触发条件格式化 ==========
// 示例：设备OEE ≤ 基准值 85%，且偏离比例达到10% / 单箱综合能耗 > 上限 31.0 kgce/箱 / 烘丝机出口水分偏差 超出正常区间 12.5%～13.5%
// 单位拼接：% 类单位紧跟数值（85%），其余单位空一格（31.0 公斤标煤/箱）
function joinUnit(unit: string): string {
  if (!unit) return "";
  return unit.startsWith("%") ? unit : ` ${unit}`;
}

export function formatCondition(c: AlertCondition): string {
  // 费用口径：区间类（处于区间 / 超出正常区间）数值拆分各自紧跟 pct（如 处于区间 15 pct - 20 pct）；单值比较直接 `> 20 pct`
  if (EXPENSE_ALERT_METRIC_NAMES.has(c.metric)) {
    const name = c.metric.endsWith(EXPENSE_ALERT_METRIC_SUFFIX)
      ? c.metric.slice(0, -EXPENSE_ALERT_METRIC_SUFFIX.length)
      : c.metric;
    if (c.operator === "处于区间" || c.operator === "超出正常区间") {
      const [lo = "", hi = ""] = c.baselineValue.split("～");
      return `${name} 执行进度偏差 ${c.operator} ${lo} pct - ${hi} pct`;
    }
    return `${name} 执行进度偏差 ${c.operator} ${c.baselineValue} pct`;
  }
  const unit = metricDefOf(c.metric)?.unit ?? "";
  let base: string;
  if (c.baselineType === "正常区间") {
    base = `${c.metric} ${c.operator} ${c.baselineValue}`;
  } else if (c.baselineType === "目标值") {
    // 目标值由系统带入（含单位），不支持编辑
    base = `${c.metric} ${c.operator} 目标值 ${c.baselineValue}${joinUnit(unit)}`;
  } else {
    base = `${c.metric} ${c.operator} ${c.baselineType} ${c.baselineValue}${joinUnit(unit)}`;
  }
  const dev = c.deviation ? `，且偏离比例达到${c.deviation}%` : "";
  return c.forecastRange
    ? `${c.metric} 未来${c.forecastRange}预测值 ${c.operator} ${c.baselineType} ${c.baselineValue}${joinUnit(unit)}${dev}`
    : `${base}${dev}`;
}

export function formatConditions(s: { conditions: AlertCondition[]; relation: "且" | "或" }): string {
  return s.conditions.map(formatCondition).join(` ${s.relation} `);
}

// 根据数据指标推断业务域（无需用户填写，映射自指标管理的业务域）
export function domainOfMetric(metric: string): AlertDomain {
  if (!metric) return "生产管理";
  if (EXPENSE_ALERT_METRIC_NAMES.has(metric)) return "费用预算执行";
  const domain = metricList.find((m) => m.nameCn === metric)?.domain;
  if (domain === "能源管理") return "能源消耗";
  if (domain === "质量管理" || domain === "工艺质量") return "工艺质量";
  return "生产管理";
}

// ========== 数据告警策略 mock ==========
export const ALERT_STRATEGIES: AlertStrategy[] = ([
  {
    id: "AS-001",
    name: "单箱综合能耗超上限策略",
    description: "监测单箱综合能耗超出上限",
    type: "当前异常",
    domain: "能源消耗",
    scope: "指定对象",
    objects: ["什邡卷烟厂", "制丝车间", "卷包车间"],
    conditions: [
      { metric: "单箱综合能耗", operator: ">", baselineType: "上限", baselineValue: "31.0", deviation: "8" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["刘洋", "高亚东"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 5,
    enabled: true,
    updatedAt: "2026-07-27 10:20",
  },
  {
    id: "AS-002",
    name: "单箱综合能耗超目标值策略",
    description: "单箱综合能耗超出目标值（目标值自动带入，不可编辑）",
    type: "当前异常",
    domain: "能源消耗",
    scope: "指定对象",
    objects: ["什邡卷烟厂"],
    conditions: [
      { metric: "单箱综合能耗", operator: ">", baselineType: "目标值", baselineValue: "31.0", deviation: "5" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["张伟"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-07-25 16:40",
  },
  {
    id: "AS-003",
    name: "包装设备运行效率低于下限策略",
    description: "包装设备运行效率低于下限且偏离达到 3%",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["卷包车间", "包装机"],
    conditions: [
      { metric: "包装设备运行效率", operator: "<", baselineType: "下限", baselineValue: "85", deviation: "3" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["王芳"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 10,
    enabled: true,
    updatedAt: "2026-07-22 09:05",
  },
  {
    id: "AS-004",
    name: "卷接设备运行效率基准告警策略",
    description: "设备OEE类指标：≤ 基准值且偏离达到 10%",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["卷包车间", "1#卷烟机"],
    conditions: [
      { metric: "卷接设备运行效率", operator: "≤", baselineType: "基准值", baselineValue: "90", deviation: "10" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["陈静", "高亚东"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-07-20 14:30",
  },
  {
    id: "AS-005",
    name: "烘丝机出口水分偏差区间策略",
    description: "烘丝机出口水分超出正常区间",
    type: "当前异常",
    domain: "工艺质量",
    scope: "指定对象",
    objects: ["制丝车间", "1#烘丝机", "2#烘丝机"],
    conditions: [
      { metric: "烘丝机出口水分偏差", operator: "超出正常区间", baselineType: "正常区间", baselineValue: "-0.5%～0.5%" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["刘洋"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 5,
    enabled: true,
    updatedAt: "2026-07-18 11:15",
  },
  {
    id: "AS-006",
    name: "优质品率低于下限策略",
    description: "优质品率低于下限监测",
    type: "当前异常",
    domain: "工艺质量",
    scope: "指定对象",
    objects: ["卷包车间", "包装机"],
    conditions: [
      { metric: "优质品率", operator: "<", baselineType: "下限", baselineValue: "96", deviation: "2" },
    ],
    relation: "且",
    level: "关注",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["王芳"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-07-15 08:50",
  },
  {
    id: "AS-007",
    name: "单位产值碳排放量告警策略",
    description: "单位产值碳排放量超出目标值（目标值自动带入）",
    type: "当前异常",
    domain: "能源消耗",
    scope: "指定对象",
    objects: ["什邡卷烟厂"],
    conditions: [
      { metric: "单位产值碳排放量", operator: ">", baselineType: "目标值", baselineValue: "0.035", deviation: "5" },
    ],
    relation: "且",
    level: "危险",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["张伟", "刘洋"],
    repeatAlert: true,
    repeatCount: 5,
    repeatInterval: 10,
    enabled: true,
    updatedAt: "2026-07-12 17:25",
  },
  {
    id: "AS-008",
    name: "百小时停机断料率超上限策略",
    description: "百小时停机断料率超出上限监测",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["物资管理科", "高架立体库"],
    conditions: [
      { metric: "百小时停机断料率", operator: ">", baselineType: "上限", baselineValue: "5", deviation: "8" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["陈静"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-07-10 13:40",
  },
  {
    id: "AS-031",
    name: "单箱耗盘纸量超上限策略",
    description: "单箱耗盘纸量超出上限且偏离达到 3%",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["什邡卷烟厂"],
    conditions: [
      { metric: "单箱耗盘纸量", operator: ">", baselineType: "上限", baselineValue: "30", deviation: "3" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["王芳"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 10,
    enabled: true,
    updatedAt: "2026-07-26 09:40",
  },
  {
    id: "AS-032",
    name: "单箱耗商标纸（小盒）量超上限策略",
    description: "单箱耗商标纸（小盒）量超出上限监测",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["什邡卷烟厂"],
    conditions: [
      { metric: "单箱耗商标纸（小盒）量", operator: ">", baselineType: "上限", baselineValue: "2480", deviation: "3" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["陈静", "高亚东"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-07-24 15:20",
  },
  {
    id: "AS-033",
    name: "单箱耗烟叶量超上限策略",
    description: "单箱耗烟叶量超出上限且偏离达到 5%",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["什邡卷烟厂"],
    conditions: [
      { metric: "单箱耗烟叶量", operator: ">", baselineType: "上限", baselineValue: "40.0", deviation: "5" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["李强", "刘洋"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 10,
    enabled: true,
    updatedAt: "2026-07-21 10:15",
  },
  {
    id: "AS-034",
    name: "单箱耗嘴棒量超上限关注策略",
    description: "单箱耗嘴棒量超出上限即关注",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["什邡卷烟厂"],
    conditions: [
      { metric: "单箱耗嘴棒量", operator: ">", baselineType: "上限", baselineValue: "48000", deviation: "3" },
    ],
    relation: "且",
    level: "关注",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["周婷"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-07-16 14:05",
  },
  {
    id: "AS-009",
    name: "单箱综合能耗区间监测策略",
    description: "单箱综合能耗超出正常区间提示",
    type: "当前异常",
    domain: "能源消耗",
    scope: "指定对象",
    objects: ["什邡卷烟厂", "卷包车间"],
    conditions: [
      { metric: "单箱综合能耗", operator: "超出正常区间", baselineType: "正常区间", baselineValue: "29.0～31.5" },
    ],
    relation: "且",
    level: "提示",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["赵磊"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-07-08 15:20",
  },
  {
    id: "AS-010",
    name: "单位产值碳排放量超上限关注策略",
    description: "单位产值碳排放量达到上限即关注",
    type: "当前异常",
    domain: "能源消耗",
    scope: "指定对象",
    objects: ["什邡卷烟厂"],
    conditions: [
      { metric: "单位产值碳排放量", operator: "≥", baselineType: "上限", baselineValue: "0.040" },
    ],
    relation: "且",
    level: "关注",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["孙明"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 60,
    enabled: true,
    updatedAt: "2026-07-06 10:45",
  },
  {
    id: "AS-011",
    name: "单箱综合能耗快速上升策略",
    description: "单箱综合能耗超上限 32.5 高频监测",
    type: "当前异常",
    domain: "能源消耗",
    scope: "指定对象",
    objects: ["制丝车间", "卷包车间"],
    conditions: [
      { metric: "单箱综合能耗", operator: ">", baselineType: "上限", baselineValue: "32.5", deviation: "10" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["周婷", "吴敏"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 5,
    enabled: true,
    updatedAt: "2026-07-04 09:30",
  },
  {
    id: "AS-012",
    name: "单位产值碳排放量基准偏离策略",
    description: "单位产值碳排放量高于基准值提示",
    type: "当前异常",
    domain: "能源消耗",
    scope: "指定对象",
    objects: ["什邡卷烟厂"],
    conditions: [
      { metric: "单位产值碳排放量", operator: "≥", baselineType: "基准值", baselineValue: "0.033" },
    ],
    relation: "且",
    level: "提示",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["李强"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-07-02 14:10",
  },
  {
    id: "AS-013",
    name: "制丝能耗偏离基准策略",
    description: "制丝环节单箱综合能耗高于基准值关注",
    type: "当前异常",
    domain: "能源消耗",
    scope: "指定对象",
    objects: ["制丝车间"],
    conditions: [
      { metric: "单箱综合能耗", operator: ">", baselineType: "基准值", baselineValue: "30.5", deviation: "4" },
    ],
    relation: "且",
    level: "关注",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["张伟"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-06-30 16:55",
  },
  {
    id: "AS-014",
    name: "碳排放量超上限告警策略",
    description: "单位产值碳排放量超出上限 0.042 告警",
    type: "当前异常",
    domain: "能源消耗",
    scope: "指定对象",
    objects: ["什邡卷烟厂"],
    conditions: [
      { metric: "单位产值碳排放量", operator: ">", baselineType: "上限", baselineValue: "0.042", deviation: "6" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["刘洋"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 30,
    enabled: true,
    updatedAt: "2026-06-28 11:25",
  },
  {
    id: "AS-015",
    name: "全厂能耗超标危险策略",
    description: "单箱综合能耗超出目标值（目标值自动带入）即危险",
    type: "当前异常",
    domain: "能源消耗",
    scope: "指定对象",
    objects: ["什邡卷烟厂", "动力车间"],
    conditions: [
      { metric: "单箱综合能耗", operator: ">", baselineType: "目标值", baselineValue: "31.0", deviation: "12" },
    ],
    relation: "且",
    level: "危险",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["高亚东"],
    repeatAlert: true,
    repeatCount: 5,
    repeatInterval: 15,
    enabled: false,
    updatedAt: "2026-06-26 17:05",
  },
  {
    id: "AS-016",
    name: "烘丝水分偏差超上限提示策略",
    description: "烘丝机出口水分偏差超出上限提示",
    type: "当前异常",
    domain: "工艺质量",
    scope: "指定对象",
    objects: ["制丝车间", "1#烘丝机"],
    conditions: [
      { metric: "烘丝机出口水分偏差", operator: ">", baselineType: "上限", baselineValue: "0.8" },
    ],
    relation: "且",
    level: "提示",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["吴敏"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-06-24 10:15",
  },
  {
    id: "AS-017",
    name: "优质品率低限告警策略",
    description: "优质品率低于下限 94% 告警",
    type: "当前异常",
    domain: "工艺质量",
    scope: "指定对象",
    objects: ["卷包车间", "包装机"],
    conditions: [
      { metric: "优质品率", operator: "<", baselineType: "下限", baselineValue: "94", deviation: "3" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["周婷"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 10,
    enabled: true,
    updatedAt: "2026-06-22 15:40",
  },
  {
    id: "AS-018",
    name: "烘丝水分偏差基准策略",
    description: "烘丝机出口水分偏差达到基准值关注",
    type: "当前异常",
    domain: "工艺质量",
    scope: "指定对象",
    objects: ["制丝车间", "2#烘丝机"],
    conditions: [
      { metric: "烘丝机出口水分偏差", operator: "≥", baselineType: "基准值", baselineValue: "0.5" },
    ],
    relation: "且",
    level: "关注",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["陈静"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-06-20 09:50",
  },
  {
    id: "AS-019",
    name: "优质品率基准偏离提示策略",
    description: "优质品率低于基准值提示",
    type: "当前异常",
    domain: "工艺质量",
    scope: "指定对象",
    objects: ["卷包车间"],
    conditions: [
      { metric: "优质品率", operator: "<", baselineType: "基准值", baselineValue: "96", deviation: "1.5" },
    ],
    relation: "且",
    level: "提示",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["王芳"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-06-18 14:30",
  },
  {
    id: "AS-020",
    name: "烘丝水分偏差扩大区间策略",
    description: "烘丝机出口水分偏差超出正常区间告警",
    type: "当前异常",
    domain: "工艺质量",
    scope: "指定对象",
    objects: ["制丝车间", "1#烘丝机", "2#烘丝机"],
    conditions: [
      { metric: "烘丝机出口水分偏差", operator: "超出正常区间", baselineType: "正常区间", baselineValue: "-0.8%～0.8%" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["刘洋"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 10,
    enabled: true,
    updatedAt: "2026-06-16 11:05",
  },
  {
    id: "AS-021",
    name: "烘丝水分严重下偏危险策略",
    description: "烘丝机出口水分偏差低于下限即危险",
    type: "当前异常",
    domain: "工艺质量",
    scope: "指定对象",
    objects: ["制丝车间", "1#烘丝机"],
    conditions: [
      { metric: "烘丝机出口水分偏差", operator: "<", baselineType: "下限", baselineValue: "-0.9", deviation: "12" },
    ],
    relation: "且",
    level: "危险",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["高亚东"],
    repeatAlert: true,
    repeatCount: 5,
    repeatInterval: 15,
    enabled: true,
    updatedAt: "2026-06-14 16:20",
  },
  {
    id: "AS-022",
    name: "优质品率下限预警策略",
    description: "优质品率低于下限 95% 预警",
    type: "当前异常",
    domain: "工艺质量",
    scope: "指定对象",
    objects: ["卷包车间", "包装机"],
    conditions: [
      { metric: "优质品率", operator: "<", baselineType: "下限", baselineValue: "95", deviation: "1" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["李强"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-06-12 10:35",
  },
  {
    id: "AS-023",
    name: "优质品率达标监测策略",
    description: "优质品率回升至基准值以上提示",
    type: "当前异常",
    domain: "工艺质量",
    scope: "指定对象",
    objects: ["卷包车间", "质检科"],
    conditions: [
      { metric: "优质品率", operator: "≥", baselineType: "基准值", baselineValue: "97" },
    ],
    relation: "且",
    level: "提示",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["赵磊"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-06-10 15:55",
  },
  {
    id: "AS-024",
    name: "包装设备效率基准提示策略",
    description: "包装设备运行效率低于基准值提示",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["卷包车间", "包装机"],
    conditions: [
      { metric: "包装设备运行效率", operator: "<", baselineType: "基准值", baselineValue: "86", deviation: "2" },
    ],
    relation: "且",
    level: "提示",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["张伟"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-06-08 09:15",
  },
  {
    id: "AS-025",
    name: "卷接设备效率下限关注策略",
    description: "卷接设备运行效率低于下限关注",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["卷包车间", "1#卷烟机"],
    conditions: [
      { metric: "卷接设备运行效率", operator: "<", baselineType: "下限", baselineValue: "85", deviation: "5" },
    ],
    relation: "且",
    level: "关注",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["孙明"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-06-06 14:45",
  },
  {
    id: "AS-026",
    name: "生产效率下限告警策略",
    description: "生产效率低于下限 90% 告警",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["生产科", "制丝车间"],
    conditions: [
      { metric: "生产效率", operator: "<", baselineType: "下限", baselineValue: "90", deviation: "3" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["王芳"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 15,
    enabled: true,
    updatedAt: "2026-06-04 16:30",
  },
  {
    id: "AS-027",
    name: "单箱耗烟叶量超上限策略",
    description: "单箱耗烟叶量超出上限预警（物耗监测）",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["物资管理科", "制丝车间"],
    conditions: [
      { metric: "单箱耗烟叶量", operator: ">", baselineType: "上限", baselineValue: "7.5", deviation: "2" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["陈静"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-06-02 10:50",
  },
  {
    id: "AS-028",
    name: "单箱耗嘴棒量基准策略",
    description: "单箱耗嘴棒量高于基准值关注（物耗监测）",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["物资管理科", "卷包车间"],
    conditions: [
      { metric: "单箱耗嘴棒量", operator: ">", baselineType: "基准值", baselineValue: "2520", deviation: "3" },
    ],
    relation: "且",
    level: "关注",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["李强"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-05-31 15:10",
  },
  {
    id: "AS-029",
    name: "停机断料率危险策略",
    description: "百小时停机断料率达到上限即危险",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["物资管理科", "高架立体库"],
    conditions: [
      { metric: "百小时停机断料率", operator: "≥", baselineType: "上限", baselineValue: "6", deviation: "10" },
    ],
    relation: "且",
    level: "危险",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["周婷"],
    repeatAlert: true,
    repeatCount: 5,
    repeatInterval: 15,
    enabled: false,
    updatedAt: "2026-05-29 11:35",
  },
  {
    id: "AS-030",
    name: "生产效率达标提示策略",
    description: "生产效率回升至基准值以上提示",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["什邡卷烟厂", "生产科"],
    conditions: [
      { metric: "生产效率", operator: "≥", baselineType: "基准值", baselineValue: "92" },
    ],
    relation: "且",
    level: "提示",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["吴敏"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-05-27 14:20",
  },
  // ========== 费用预算执行 · 执行进度偏差策略（告警对象=指标关联部门，自动带入） ==========
  {
    id: "AS-041",
    name: "日常差旅费执行进度偏差告警策略",
    description: "日常差旅费执行进度偏差超出 ±3pct 正常区间即告警",
    type: "当前异常",
    domain: "费用预算执行",
    scope: "指定对象",
    objects: expenseDeptsOfMetric(`日常差旅费${EXPENSE_ALERT_METRIC_SUFFIX}`),
    conditions: [
      { metric: `日常差旅费${EXPENSE_ALERT_METRIC_SUFFIX}`, operator: "超出正常区间", baselineType: "正常区间", baselineValue: "-3～+3" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每月",
    notifyTemplate: "",
    notifyMethods: ["邮件"],
    receivers: ["张伟", "李强"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 10,
    enabled: true,
    updatedAt: "2026-07-28 09:30",
  },
  {
    id: "AS-042",
    name: "外购电费执行进度偏差预警策略",
    description: "外购电费执行进度偏差偏离 5-10pct 区间预警关注",
    type: "当前异常",
    domain: "费用预算执行",
    scope: "指定对象",
    objects: expenseDeptsOfMetric(`外购电费${EXPENSE_ALERT_METRIC_SUFFIX}`),
    conditions: [
      { metric: `外购电费${EXPENSE_ALERT_METRIC_SUFFIX}`, operator: "超出正常区间", baselineType: "正常区间", baselineValue: "-3～+3" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每月",
    notifyTemplate: "",
    notifyMethods: ["邮件"],
    receivers: ["王芳"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-07-23 11:05",
  },
  {
    id: "AS-043",
    name: "日常办公用品执行进度偏差提示策略",
    description: "日常办公用品执行进度偏差超出 ±3pct 提示（停用示例）",
    type: "当前异常",
    domain: "费用预算执行",
    scope: "指定对象",
    objects: expenseDeptsOfMetric(`日常办公用品${EXPENSE_ALERT_METRIC_SUFFIX}`),
    conditions: [
      { metric: `日常办公用品${EXPENSE_ALERT_METRIC_SUFFIX}`, operator: "超出正常区间", baselineType: "正常区间", baselineValue: "-3～+3" },
    ],
    relation: "且",
    level: "提示",
    detectCycle: "每月",
    notifyTemplate: "",
    notifyMethods: ["邮件"],
    receivers: ["陈静"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-07-16 15:45",
  },
] as AlertStrategy[]).map((s) => ({ ...s, notifyTemplate: defaultNotifyTemplate() }));

// ========== 可变 store（跨路由共享：列表 ↔ 新建/编辑页） ==========
// 浏览器刷新会重置为 ALERT_STRATEGIES；会话内的新增/编辑/删除/启停在此生效。
let store: AlertStrategy[] = ALERT_STRATEGIES.map((s) => ({ ...s, conditions: s.conditions.map((c) => ({ ...c })) }));

export function getAlertStrategies(): AlertStrategy[] {
  return store;
}
export function getAlertStrategy(id: string): AlertStrategy | undefined {
  return store.find((s) => s.id === id);
}
export function addAlertStrategy(s: AlertStrategy): void {
  store = [s, ...store];
}
export function updateAlertStrategy(s: AlertStrategy): void {
  store = store.map((x) => (x.id === s.id ? { ...s } : x));
}
export function removeAlertStrategy(id: string): void {
  store = store.filter((x) => x.id !== id);
}
