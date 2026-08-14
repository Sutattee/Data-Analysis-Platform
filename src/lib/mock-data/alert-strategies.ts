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
import { dataMetrics } from "./data-assets";

// ========== 选项常量（供表单下拉） ==========
export const ALERT_OPERATORS: AlertOperator[] = ["高于", "低于", "超出正常区间"];
export const ALERT_BASELINE_TYPES: AlertBaselineType[] = ["目标值", "基准值", "上限", "下限", "历史均值", "正常区间"];

// 判断方式 → 合适的基准类型候选（触发条件联动筛选）
// 「高于下限 / 低于上限」属常态不告警，故分别排除；「超出正常区间」仅搭配正常区间。
export const OPERATOR_BASELINE_MAP: Record<AlertOperator, AlertBaselineType[]> = {
  "高于": ["目标值", "上限", "基准值", "历史均值"],
  "低于": ["目标值", "下限", "基准值", "历史均值"],
  "超出正常区间": ["正常区间"],
};
export const ALERT_DETECT_CYCLES: AlertDetectCycle[] = ["每5分钟", "每15分钟", "每30分钟", "每小时", "每日", "每月"];
export const ALERT_SCOPE_OPTIONS: AlertScope[] = ["全部适用对象", "指定对象"];
export const NOTIFY_METHOD_OPTIONS = ["短信", "邮件"];
export const FORECAST_RANGES = ["未来3天", "未来7天", "未来15天", "未来1个月", "未来2个月", "未来3个月"];

// 指标候选（复用数据资产的指标）
export const METRIC_OPTIONS: string[] = dataMetrics.map((m) => m.name);
// 支持预测模型的指标（预测风险类型仅可选这些）
export const FORECAST_METRIC_OPTIONS: string[] = ["综合能耗", "吨钢成本", "OEE", "日产量"];

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
export function formatCondition(c: AlertCondition): string {
  // 历史均值由系统计算，无需展示基准值
  const valPart = c.baselineType === "历史均值" ? "" : ` ${c.baselineValue}`;
  const base = c.forecastRange
    ? `${c.metric} 未来${c.forecastRange}预测值 ${c.operator} ${c.baselineType}${valPart}`
    : `${c.metric} ${c.operator} ${c.baselineType}${valPart}`;
  return c.deviation ? `${base}，偏离${c.deviation}%` : base;
}

export function formatConditions(s: { conditions: AlertCondition[]; relation: "且" | "或" }): string {
  return s.conditions.map(formatCondition).join(` ${s.relation} `);
}

// 根据数据指标推断业务域（无需用户填写）
export function domainOfMetric(metric: string): AlertDomain {
  if (!metric) return "生产管理";
  if (/能耗|电耗|煤气|水耗|能源/.test(metric)) return "能耗管理";
  const cat = dataMetrics.find((m) => m.name === metric)?.category;
  if (cat === "质量") return "质量管理";
  if (cat === "设备") return "设备管理";
  return "生产管理";
}

// ========== 数据告警策略 mock ==========
export const ALERT_STRATEGIES: AlertStrategy[] = ([
  {
    id: "AS-001",
    name: "综合能耗超限告警策略",
    description: "监测全厂综合能耗超出上限",
    type: "当前异常",
    domain: "能耗管理",
    scope: "指定对象",
    objects: ["厂区电力能源网格", "循环水能源网格"],
    conditions: [
      { metric: "综合能耗", operator: "高于", baselineType: "上限", baselineValue: "600.0 kgce/t", deviation: "8" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每15分钟",
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
    name: "单箱卷烟综合能耗超标策略",
    description: "单箱综合能耗超出目标值",
    type: "当前异常",
    domain: "能耗管理",
    scope: "全部适用对象",
    objects: [],
    conditions: [
      { metric: "单箱卷烟综合能耗", operator: "高于", baselineType: "目标值", baselineValue: "12.0 公斤标煤/箱", deviation: "5" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "短信"],
    receivers: ["张伟"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-07-25 16:40",
  },
  {
    id: "AS-003",
    name: "厂区电力消耗异常策略",
    description: "厂区电力能源网格用电量超限",
    type: "当前异常",
    domain: "能耗管理",
    scope: "指定对象",
    objects: ["厂区电力能源网格"],
    conditions: [
      { metric: "总用电量", operator: "高于", baselineType: "上限", baselineValue: "1,300,000 kWh", deviation: "3" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每30分钟",
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
    name: "高炉煤气放散率告警策略",
    description: "煤气放散率超标监测",
    type: "当前异常",
    domain: "能耗管理",
    scope: "指定对象",
    objects: ["高炉煤气能源网格"],
    conditions: [
      { metric: "煤气放散率", operator: "高于", baselineType: "上限", baselineValue: "1.5%", deviation: "0.3" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每15分钟",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "短信"],
    receivers: ["陈静", "高亚东"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-07-20 14:30",
  },
  {
    id: "AS-005",
    name: "蒸汽消耗超标策略",
    description: "蒸汽能源网格用量超限",
    type: "当前异常",
    domain: "能耗管理",
    scope: "指定对象",
    objects: ["蒸汽能源网格"],
    conditions: [
      { metric: "总蒸汽用量", operator: "高于", baselineType: "上限", baselineValue: "3,000 t", deviation: "4" },
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
    name: "循环水能耗异常策略",
    description: "循环水吨钢电耗超目标",
    type: "当前异常",
    domain: "能耗管理",
    scope: "指定对象",
    objects: ["循环水能源网格"],
    conditions: [
      { metric: "循环水吨钢电耗", operator: "高于", baselineType: "目标值", baselineValue: "32 kWh/t", deviation: "6" },
    ],
    relation: "且",
    level: "关注",
    detectCycle: "每30分钟",
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
    description: "单位产值碳排放量超标",
    type: "当前异常",
    domain: "能耗管理",
    scope: "全部适用对象",
    objects: [],
    conditions: [
      { metric: "单位产值碳排放量", operator: "高于", baselineType: "目标值", baselineValue: "0.035 tCO₂e/万元", deviation: "5" },
    ],
    relation: "且",
    level: "危险",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "短信", "邮件"],
    receivers: ["张伟", "刘洋"],
    repeatAlert: true,
    repeatCount: 5,
    repeatInterval: 10,
    enabled: true,
    updatedAt: "2026-07-12 17:25",
  },
  {
    id: "AS-008",
    name: "污水排放COD超标策略",
    description: "污水排放COD浓度超上限",
    type: "当前异常",
    domain: "能耗管理",
    scope: "全部适用对象",
    objects: [],
    conditions: [
      { metric: "污水排放COD", operator: "高于", baselineType: "上限", baselineValue: "50 mg/L", deviation: "8" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每15分钟",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["陈静"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-07-10 13:40",
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
