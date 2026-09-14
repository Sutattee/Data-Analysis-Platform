// 费用预算执行 · 告警中心数据层
// 口径：
//  · 告警指标 = 全部预算指标（expense-indicators 主数据，按指标名去重）×「执行进度偏差」属性，
//    指标全名形如「日常差旅费-执行进度偏差」；执行进度偏差 = 预算执行率 − 计划执行进度（deviation，计划进度 66.4%）
//  · 阈值（产品示例，实际应支持按费用类型或部门配置）：|偏差| ≤ 3pct 正常不告警；
//    3～5 提示 / 5～10 关注 / 10～15 预警 / 15～20 告警 / ＞20 危险，正向=超计划、负向=滞后
//  · 告警对象 = 指标关联的多个部门（主数据行部门，最细粒度）；告警记录按 (指标, 部门) 生成
//  · 本模块不依赖 alerts.ts（ALERT_RECORDS 由 alerts.ts 反向聚合，避免循环依赖）
import { EXPENSE_INDICATORS, indicatorDataOf } from "./expense-indicators";
import { LEVEL_RANK } from "./alert-levels";
import type { AlertRecord, AlertLevel } from "@/types";

const PLAN_PROGRESS = 66.4; // 资金计划应执行（%）

/* ---------------- 阈值规则（产品示例） ---------------- */

export interface ExpenseDevRule {
  min: number;                    // 区间下限（不含）
  max: number;                    // 区间上限（含；999 视为 ∞）
  level: AlertLevel;              // 告警等级
  status: "超计划" | "滞后";       // 业务状态（偏差方向）
}

export const EXPENSE_DEV_RULES: ExpenseDevRule[] = [
  { min: 3, max: 5, level: "提示", status: "超计划" },
  { min: 3, max: 5, level: "提示", status: "滞后" },
  { min: 5, max: 10, level: "关注", status: "超计划" },
  { min: 5, max: 10, level: "关注", status: "滞后" },
  { min: 10, max: 15, level: "预警", status: "超计划" },
  { min: 10, max: 15, level: "预警", status: "滞后" },
  { min: 15, max: 20, level: "告警", status: "超计划" },
  { min: 15, max: 20, level: "告警", status: "滞后" },
  { min: 20, max: 999, level: "危险", status: "超计划" },
  { min: 20, max: 999, level: "危险", status: "滞后" },
];

// 偏差 → 阈值规则（|偏差| ≤ 3pct 返回 null = 正常不告警）
export function expenseDevRuleOf(deviation: number): ExpenseDevRule | null {
  const abs = Math.abs(deviation);
  const status = deviation > 0 ? "超计划" : "滞后";
  return EXPENSE_DEV_RULES.find((r) => r.status === status && abs > r.min && abs <= r.max) ?? null;
}

/* ---------------- 告警指标（全部预算指标 × 执行进度偏差） ---------------- */

export const EXPENSE_ALERT_METRIC_SUFFIX = "-执行进度偏差";

export interface ExpenseAlertMetric {
  name: string;      // 预算指标名（如「日常差旅费」）
  code: string;      // 指标编码
  depts: string[];   // 关联部门（主数据行部门，首现顺序去重）
  subjectPath: string; // 预算科目全路径（费用科目筛选用）
}

// 主数据按指标名去重（同 code 同名同科目；同名跨 code 已验证为 0）
export const EXPENSE_ALERT_METRICS: ExpenseAlertMetric[] = (() => {
  const out: ExpenseAlertMetric[] = [];
  const idx = new Map<string, ExpenseAlertMetric>();
  for (const n of EXPENSE_INDICATORS) {
    let m = idx.get(n.name);
    if (!m) {
      m = { name: n.name, code: n.code, depts: [], subjectPath: n.subjectPath };
      idx.set(n.name, m);
      out.push(m);
    }
    if (!m.depts.includes(n.dept)) m.depts.push(n.dept);
  }
  return out;
})();

const METRIC_MAP = new Map(EXPENSE_ALERT_METRICS.map((m) => [m.name, m]));

// 指标全名（新建告警触发条件的下拉候选）
export const EXPENSE_ALERT_METRIC_OPTIONS: string[] = EXPENSE_ALERT_METRICS.map(
  (m) => m.name + EXPENSE_ALERT_METRIC_SUFFIX
);

// 全名集合（能源/生产告警中心排除过滤用）
export const EXPENSE_ALERT_METRIC_NAMES = new Set(EXPENSE_ALERT_METRIC_OPTIONS);

// 指标全名 → 关联部门（告警对象自动带入）
export function expenseDeptsOfMetric(fullName: string): string[] {
  if (!fullName.endsWith(EXPENSE_ALERT_METRIC_SUFFIX)) return [];
  return METRIC_MAP.get(fullName.slice(0, -EXPENSE_ALERT_METRIC_SUFFIX.length))?.depts ?? [];
}

// 指标全名 → 预算科目全路径（策略列表费用科目筛选用）
export function expenseSubjectOfMetric(fullName: string): string {
  if (!fullName.endsWith(EXPENSE_ALERT_METRIC_SUFFIX)) return "";
  return METRIC_MAP.get(fullName.slice(0, -EXPENSE_ALERT_METRIC_SUFFIX.length))?.subjectPath ?? "";
}

// 指标全名 → 指标定义（条件构造器单位显示等）
export function expenseMetricDefOf(fullName: string): { id: string; unit: string } | undefined {
  if (!fullName.endsWith(EXPENSE_ALERT_METRIC_SUFFIX)) return undefined;
  const m = METRIC_MAP.get(fullName.slice(0, -EXPENSE_ALERT_METRIC_SUFFIX.length));
  return m ? { id: m.code, unit: "pct" } : undefined;
}

/* ---------------- 告警记录生成（确定性，每等级×方向 3 条，共 30 条） ---------------- */

// 费用场景接收人（与 alerts.ts 的 ALERT_USERS 独立，避免循环依赖）
const EXPENSE_RECEIVERS = ["张伟", "李强", "王芳", "刘洋", "陈静", "赵磊"];

const EXPENSE_CAUSES: Record<"超计划" | "滞后", string[]> = {
  超计划: [
    "该指标预算执行节奏偏快，存在集中采购或提前支付情形，需核查支出合规性。",
    "当期业务量增加导致支出集中释放，执行率阶段性高于资金计划进度。",
    "部分费用项目合并结算，支付周期前移造成执行进度偏高。",
  ],
  滞后: [
    "该指标支付流程滞后，发票审批与结算周期拉长，执行率低于资金计划进度。",
    "相关业务项目进度延迟，费用尚未发生，需关注年末集中执行风险。",
    "预算细化分解较晚，部分支出未按月均衡执行，导致进度偏差扩大。",
  ],
};
const EXPENSE_SUGGESTIONS: Record<"超计划" | "滞后", string[]> = {
  超计划: [
    "核查大额支出明细与合同约定，预估年末余量并落实压降措施。",
    "按月跟踪执行节奏，对超序时进度项目实施额度管控。",
    "复核支付的合理性与必要性，必要时调减后续月份用款计划。",
  ],
  滞后: [
    "加快发票收集与结算流程，防范年末集中执行与突击花钱。",
    "对接业务部门确认项目排期，滚动更新月度用款计划。",
    "对连续滞后指标开展预算执行分析，必要时申请进度调整。",
  ],
};

// 确定性时间（与 alerts.ts 同一基准日，步进错开基础与生产辅料记录）
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

export function buildExpenseAlertRecords(): AlertRecord[] {
  // 分桶：每 等级×方向 取前 3 行（EXPENSE_INDICATORS 顺序稳定 → 结果确定）
  const quota = 3;
  const buckets = new Map<string, typeof EXPENSE_INDICATORS>();
  for (const n of EXPENSE_INDICATORS) {
    const dev = indicatorDataOf(n.id).deviation;
    const rule = expenseDevRuleOf(dev);
    if (!rule) continue;
    const key = `${rule.level}|${rule.status}`;
    const list = buckets.get(key) ?? [];
    if (list.length < quota) list.push(n);
    buckets.set(key, list);
  }

  const out: AlertRecord[] = [];
  // Array.from：tsconfig target 下 Map 迭代需降级展开
  for (const [, rows] of Array.from(buckets.entries())) {
    for (const n of rows) {
      const rec = buildOneExpenseRecord(n);
      if (rec) out.push(rec);
    }
  }
  return out;
}

// 单条记录生成（i 用主数据行号保证确定性；费用页「查看告警详情」按需生成与列表 30 条同 id 规则）
function buildOneExpenseRecord(n: (typeof EXPENSE_INDICATORS)[number]): AlertRecord | null {
  const i = EXPENSE_INDICATORS.indexOf(n);
  if (i < 0) return null;
  const data = indicatorDataOf(n.id);
  const dev = data.deviation;
  const rule = expenseDevRuleOf(dev);
  if (!rule) return null; // 正常不生成
  const level = rule.level;
  const status = rule.status;
  const sign = dev > 0 ? "+" : "";
  // 触发条件文案：危险档（|偏差|>20）语义为超出单侧阈值 → 单值比较格式（> 20 pct / < -20 pct）；
  // 其余档为「处于区间」格式（各数值紧跟 pct，连接符 - ）
  const loLabel = status === "超计划" ? `+${rule.min}` : `-${rule.max}`;
  const hiLabel = status === "超计划" ? `+${rule.max}` : `-${rule.min}`;
  const triggerMin = 1500 + i * 293; // 与基础 i*311、辅料 900+i*407 错开
  const triggerTime = tsAt(triggerMin);
  const receiver = EXPENSE_RECEIVERS[i % EXPENSE_RECEIVERS.length];
  const handled = i % 3 === 0;
  const dateStr = triggerTime.slice(0, 10).replace(/-/g, "");

  return {
    id: `FY${dateStr}${pad3(i + 1)}`,
    level,
    title: `${n.name}执行进度偏差${status}`,
    type: "当前异常",
    domain: "费用预算执行",
    objectCode: n.code,
    objectName: n.dept, // 列表「所属部门」与详情按此查看是哪个部门的该指标告警
    metricName: n.name + EXPENSE_ALERT_METRIC_SUFFIX,
    triggerTime,
    // 核心告警数据（费用口径三件套 + 兼容字段）
    metricLabel: n.name,
    subjectPath: n.subjectPath,
    executionRate: `${data.rate.toFixed(1)}%`,
    planProgress: `${data.planProgress.toFixed(1)}%`,
    deviationLabel: `${sign}${dev}pct`,
    valueLabel: `当前偏差${sign}${dev}pct`,
    baselineLabel: "正常区间 -3pct～+3pct",
    deviationValue: `${sign}${dev}pct`,
    deviationRate: `${sign}${((Math.abs(dev) / PLAN_PROGRESS) * 100).toFixed(1)}%`,
    // 判定依据
    strategyName: `${n.name}执行进度偏差${level}策略`,
    triggerCondition: rule.max === 999
      ? `${n.name} 执行进度偏差 ${status === "超计划" ? ">" : "<"} ${status === "超计划" ? "" : "-"}${rule.min} pct`
      : `${n.name} 执行进度偏差 处于区间 ${loLabel} pct - ${hiLabel} pct`,
    // 原因与建议（i%3===0 模拟暂未识别到明确原因）
    causeSummary: i % 3 === 0 ? undefined : EXPENSE_CAUSES[status][i % EXPENSE_CAUSES[status].length],
    causeType: i % 3 === 0 ? undefined : i % 3 === 1 ? "AI生成" : i % 2 === 0 ? "AI生成·人工修正" : "人工补录",
    suggestion: EXPENSE_SUGGESTIONS[status][i % EXPENSE_SUGGESTIONS[status].length],
    // 责任与处理情况
    receiver,
    notifyMethods: ["邮件"],
    notifyStatus: i % 9 === 0 ? "发送失败" : "已发送",
    handleNote: handled ? "已核查该月支出明细并跟进预算执行分析。" : undefined,
    handledAt: handled ? tsAt(triggerMin + 150) : undefined,
    handledBy: handled ? receiver : undefined,
  };
}

/* ---------------- 按需生成与定位（费用页「查看告警详情」入口） ---------------- */

// 主数据行索引（name+dept → 行），费用页按指标名+部门定位记录
const ROW_INDEX = new Map(EXPENSE_INDICATORS.map((n) => [`${n.name}|${n.dept}`, n]));

// 该 (指标名, 部门) 若偏差异常则按需生成一条记录（id 规则与列表 30 条一致；非主数据指标返回 null）
export function expenseAlertRecordFor(name: string, dept: string): AlertRecord | null {
  const n = ROW_INDEX.get(`${name}|${dept}`);
  return n ? buildOneExpenseRecord(n) : null;
}

// 按需记录缓存：id → record（详情页兜底：链接直达未入列表 30 条的按需记录）
const ON_DEMAND_CACHE = new Map<string, AlertRecord>();
for (const n of EXPENSE_INDICATORS) {
  const rec = buildOneExpenseRecord(n);
  if (rec) ON_DEMAND_CACHE.set(rec.id, rec);
}

// 详情页按 id 兜底查找（先由调用方查 ALERT_RECORDS，未命中再查按需生成池）
export function expenseAlertRecordById(id: string): AlertRecord | undefined {
  return ON_DEMAND_CACHE.get(id);
}

// 范围行中告警等级最高的异常行（危险→提示；同级按 |偏差| 大者；全部正常返回 null）
// 行结构仅需 name/dept（ExpenseIndicator 与可控费用 ControllableRow 均满足）
export function worstAbnormalRow<T extends { name: string; dept: string }>(
  rows: T[],
  deviationOf: (r: T) => number
): T | null {
  let worst: T | null = null;
  let worstRank = 0;
  let worstAbs = 0;
  for (const r of rows) {
    const rule = expenseDevRuleOf(deviationOf(r));
    if (!rule) continue;
    const rank = LEVEL_RANK[rule.level];
    const abs = Math.abs(deviationOf(r));
    if (!worst || rank > worstRank || (rank === worstRank && abs > worstAbs)) {
      worst = r;
      worstRank = rank;
      worstAbs = abs;
    }
  }
  return worst;
}
