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
export const ALERT_BASELINE_TYPES: AlertBaselineType[] = ["目标值", "基准值", "上限", "下限", "正常区间"];
export const ALERT_DETECT_CYCLES: AlertDetectCycle[] = ["每5分钟", "每15分钟", "每30分钟", "每小时", "每日", "每月"];
export const ALERT_SCOPE_OPTIONS: AlertScope[] = ["全部适用对象", "指定对象"];
export const NOTIFY_METHOD_OPTIONS = ["短信", "邮件"];
export const FORECAST_RANGES = ["未来3天", "未来7天", "未来15天", "未来1个月", "未来2个月", "未来3个月"];

// 指标候选（复用数据资产的指标）
export const METRIC_OPTIONS: string[] = dataMetrics.map((m) => m.name);
// 支持预测模型的指标（预测风险类型仅可选这些）
export const FORECAST_METRIC_OPTIONS: string[] = ["综合能耗", "吨钢成本", "OEE", "日产量"];

// 通知预览模板：按预警类型区分
// 当前异常
export const NOTIFY_TEMPLATE_ANOMALY = `检测时间：{检测时间}
您关注的指标已触发预警，请及时处理。
{预警标题}
预警等级：{预警等级}
预警对象：{对象名称}（{对象编号}）
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
您关注的指标已触发预警，请及时处理。
{预警标题}
预警等级：{预警等级}
预警对象：{对象名称}（{对象编号}）
指标名称：{指标名称}
当前值：{当前值}
预测值：{预测值}
预警阈值：{阈值}
风险概率：{风险概率}
置信区间：{置信区间}
预计越界时间：{预计越界时间}
风险摘要：{风险摘要}
处置建议：{处置建议}`;

// 按预警类型返回默认通知预览模板
export function defaultNotifyTemplate(type: AlertType): string {
  return type === "预测风险" ? NOTIFY_TEMPLATE_FORECAST : NOTIFY_TEMPLATE_ANOMALY;
}

// ========== 触发条件格式化 ==========
export function formatCondition(c: AlertCondition): string {
  const base = c.forecastRange
    ? `${c.metric} 未来${c.forecastRange}预测值 ${c.operator} ${c.baselineType} ${c.baselineValue}`
    : `${c.metric} ${c.operator} ${c.baselineType} ${c.baselineValue}`;
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

// ========== 数据预警策略 mock ==========
export const ALERT_STRATEGIES: AlertStrategy[] = ([
  {
    id: "AS-001",
    name: "设备OEE异常预警策略",
    description: "监测关键设备 OEE 下降情况",
    type: "当前异常",
    domain: "生产管理",
    scope: "指定对象",
    objects: ["卷包车间2号包装机"],
    conditions: [
      { metric: "OEE", operator: "低于", baselineType: "基准值", baselineValue: "85.0%", deviation: "10" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每5分钟",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "短信"],
    receivers: ["张伟", "高亚东"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 5,
    enabled: true,
    updatedAt: "2026-07-27 10:20",
  },
  {
    id: "AS-002",
    name: "综合能耗预测风险策略",
    description: "预测综合能耗超目标上限",
    type: "预测风险",
    domain: "能耗管理",
    scope: "全部适用对象",
    objects: [],
    conditions: [
      { metric: "综合能耗", forecastRange: "未来1个月", operator: "高于", baselineType: "上限", baselineValue: "580.0 kgce/t", deviation: "5" },
    ],
    relation: "且",
    level: "预警",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "邮件"],
    receivers: ["刘洋"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-07-25 16:40",
  },
  {
    id: "AS-003",
    name: "良品率异常预警策略",
    description: "质量指标双条件监测",
    type: "当前异常",
    domain: "质量管理",
    scope: "指定对象",
    objects: ["冷轧产线1号", "1号连铸机"],
    conditions: [
      { metric: "良品率", operator: "低于", baselineType: "基准值", baselineValue: "96.0%" },
      { metric: "良品率", operator: "低于", baselineType: "基准值", baselineValue: "95.0%", deviation: "3" },
    ],
    relation: "或",
    level: "告警",
    detectCycle: "每15分钟",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "短信", "邮件"],
    receivers: ["王芳", "陈静"],
    repeatAlert: true,
    repeatCount: 3,
    repeatInterval: 5,
    enabled: false,
    updatedAt: "2026-07-22 09:05",
  },
  {
    id: "AS-004",
    name: "设备故障率预警策略",
    description: "设备故障率超限监测",
    type: "当前异常",
    domain: "设备管理",
    scope: "全部适用对象",
    objects: [],
    conditions: [
      { metric: "设备故障率", operator: "高于", baselineType: "上限", baselineValue: "5.0%" },
    ],
    relation: "且",
    level: "告警",
    detectCycle: "每30分钟",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["赵磊"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-07-20 14:30",
  },
  {
    id: "AS-005",
    name: "吨钢成本预测风险策略",
    description: "预测吨钢成本上涨趋势",
    type: "预测风险",
    domain: "生产管理",
    scope: "全部适用对象",
    objects: [],
    conditions: [
      { metric: "吨钢成本", forecastRange: "未来15天", operator: "高于", baselineType: "目标值", baselineValue: "3800 元/吨" },
    ],
    relation: "且",
    level: "危险",
    detectCycle: "每日",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "短信", "邮件"],
    receivers: ["孙明", "周婷"],
    repeatAlert: true,
    repeatCount: 5,
    repeatInterval: 10,
    enabled: true,
    updatedAt: "2026-07-18 11:15",
  },
  {
    id: "AS-006",
    name: "良品率区间异常策略",
    description: "良品率超出正常区间",
    type: "当前异常",
    domain: "质量管理",
    scope: "指定对象",
    objects: ["镀锌线1号"],
    conditions: [
      { metric: "良品率", operator: "超出正常区间", baselineType: "正常区间", baselineValue: "95.0%～99.0%" },
    ],
    relation: "且",
    level: "关注",
    detectCycle: "每5分钟",
    notifyTemplate: "",
    notifyMethods: ["站内消息"],
    receivers: ["吴敏"],
    repeatAlert: false,
    enabled: false,
    updatedAt: "2026-07-15 08:50",
  },
  {
    id: "AS-007",
    name: "日产量异常预警策略",
    description: "日产量低于目标",
    type: "当前异常",
    domain: "生产管理",
    scope: "全部适用对象",
    objects: [],
    conditions: [
      { metric: "日产量", operator: "低于", baselineType: "目标值", baselineValue: "5000 吨" },
    ],
    relation: "且",
    level: "提示",
    detectCycle: "每小时",
    notifyTemplate: "",
    notifyMethods: ["站内消息", "短信"],
    receivers: ["张伟"],
    repeatAlert: false,
    enabled: true,
    updatedAt: "2026-07-12 17:25",
  },
  {
    id: "AS-008",
    name: "综合能耗异常预警策略",
    description: "综合能耗超上限",
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
    enabled: false,
    updatedAt: "2026-07-10 13:40",
  },
] as AlertStrategy[]).map((s) => ({ ...s, notifyTemplate: defaultNotifyTemplate(s.type) }));

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
