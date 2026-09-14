// 费用预算执行 — 费用总览模拟数据
// 数据处理规则：
//  · 「全部费用」口径直接使用锚定值（年度预算 15,652 万 / 累计执行 13,304 万 / 执行率 85.0% / 计划进度 66.4%）
//  · 科目级数据由叶子科目 path 哈希权重确定性生成（不做严格勾稽，叶子汇总 ≈ 总额）
//  · 偏差告警等级：|dev|≥20 危险 / ≥15 告警 / ≥10 预警 / ≥5 关注 / ≥2 提示 / <2 不标
import type { AlertLevel } from "@/types";
// 等级常量取自零依赖的 alert-levels（不经 grid-forecast → alerts，避免 mock-data 循环依赖）
import { ALERT_LEVEL_COLOR, LEVEL_RANK } from "./alert-levels";

/* ---------------- 基础工具 ---------------- */

// 数值四舍五入（d 位小数）
function round(v: number, d = 0): number {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

// 字符串哈希（确定性扰动源）
function hash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* ---------------- 科目树（照业务科目表原样录入） ---------------- */

interface ExpenseTreeNode {
  name: string;
  children?: ExpenseTreeNode[];
}

export const EXPENSE_TREE: ExpenseTreeNode = {
  name: "全部费用",
  children: [
    { name: "管理费用", children: [
      { name: "劳动保护费" }, { name: "折旧费" }, { name: "无形资产摊销" }, { name: "水电费" },
      { name: "业务招待费" }, { name: "办公费" }, { name: "差旅费" }, { name: "会议费" },
      { name: "燃料费" }, { name: "车杂费" },
      { name: "修理费", children: [{ name: "车辆维修费" }, { name: "其他维修费" }] },
      { name: "中介费", children: [{ name: "咨询费" }, { name: "法律服务" }, { name: "其他中介费" }, { name: "审计费" }] },
      { name: "运杂费" },
      { name: "职工薪酬", children: [
        { name: "短期薪酬", children: [
          { name: "工资" }, { name: "工会经费" }, { name: "职工教育经费" },
          { name: "员工福利", children: [{ name: "在岗员工福利" }, { name: "离退休人员支出" }] },
          { name: "社会保险费", children: [{ name: "医疗保险费" }, { name: "工伤保险费" }, { name: "补充医疗保险费" }] },
          { name: "住房公积金" },
        ] },
        { name: "离职后福利", children: [{ name: "养老保险费" }, { name: "失业保险费" }, { name: "企业年金" }] },
      ] },
      { name: "警卫消防费" },
      { name: "政府性基金", children: [{ name: "残疾人就业保障金" }] },
      { name: "党组织工作经费" }, { name: "仓储费" }, { name: "租赁费" }, { name: "信息系统维护费" },
      { name: "绿化费" }, { name: "物业管理费" },
      { name: "保险费", children: [{ name: "房屋保险费" }] },
      { name: "企业研发费用" },
    ] },
    { name: "在建工程" }, { name: "低值易耗品" }, { name: "职工教育经费" },
    { name: "其他业务成本", children: [{ name: "其他", children: [{ name: "租赁" }, { name: "其他" }] }] },
    { name: "财务费用", children: [{ name: "利息收入" }, { name: "手续费" }] },
    { name: "营业外收入", children: [{ name: "其他" }] },
    { name: "个税手续费返还" },
    { name: "税金及附加", children: [{ name: "消费税" }, { name: "印花税" }, { name: "房产税" }, { name: "土地使用税" }, { name: "车船税" }] },
    { name: "未交增值税" }, { name: "当期所得税费用" }, { name: "应交城建税" }, { name: "应交教育费附加" }, { name: "应交地方教育费附加" },
    { name: "其他应付款", children: [{ name: "个人所得税" }, { name: "单位往来" }] },
    { name: "其他应收款", children: [{ name: "单位往来" }] },
    { name: "个人往来" }, { name: "罚款支出" }, { name: "其他" }, { name: "工资支出数" }, { name: "离退休人员支出" },
    { name: "养老保险费" }, { name: "医疗保险费" }, { name: "失业保险费" }, { name: "住房公积金" }, { name: "企业年金" }, { name: "媒介费" },
    { name: "其他业务收入", children: [{ name: "其他", children: [{ name: "租赁" }, { name: "其他" }] }] },
    { name: "工会经费" }, { name: "工资" }, { name: "劳动保护费" }, { name: "折旧费用" }, { name: "外购电费" },
    { name: "在岗员工福利" }, { name: "工伤保险费" }, { name: "补充医疗保险费" },
    { name: "辅助生产成本", children: [{ name: "燃料动力", children: [{ name: "制造费用", children: [{ name: "办公费" }] }] }] },
    { name: "差旅费" }, { name: "外购燃油" }, { name: "外购水费" }, { name: "外购气费" },
    { name: "销售费用", children: [
      { name: "折旧费" }, { name: "办公费" }, { name: "差旅费" }, { name: "燃料费" }, { name: "车杂费" },
      { name: "修理费", children: [{ name: "房屋修理费" }] },
      { name: "租赁费" },
      { name: "国内市场营销费", children: [{ name: "媒介费" }] },
    ] },
    { name: "制造费用", children: [
      { name: "职工薪酬", children: [
        { name: "短期薪酬", children: [
          { name: "工资" }, { name: "工会经费" }, { name: "职工教育经费" },
          { name: "员工福利", children: [{ name: "在岗员工福利" }] },
          { name: "社会保险费", children: [{ name: "医疗保险费" }, { name: "工伤保险费" }, { name: "补充医疗保险费" }] },
          { name: "住房公积金" },
        ] },
        { name: "离职后福利", children: [{ name: "养老保险费" }, { name: "失业保险费" }, { name: "企业年金" }] },
      ] },
      { name: "劳动保护费" }, { name: "其他" }, { name: "折旧费" }, { name: "无形资产摊销" },
      { name: "办公费" }, { name: "差旅费" }, { name: "车间搬运费" },
    ] },
    { name: "基本生产成本", children: [{ name: "职工薪酬" }, { name: "燃料动力" }] },
    { name: "研发支出", children: [
      { name: "费用化支出", children: [
        { name: "研发人员费用", children: [
          { name: "短期薪酬", children: [
            { name: "工资" }, { name: "工会经费" }, { name: "职工教育经费" }, { name: "员工福利" },
            { name: "社会保险费", children: [{ name: "医疗保险费" }, { name: "工伤保险费" }, { name: "补充医疗保险费" }] },
            { name: "住房公积金" },
          ] },
          { name: "离职后福利", children: [{ name: "养老保险费" }, { name: "失业保险费" }, { name: "企业年金" }] },
        ] },
      ] },
    ] },
  ],
};

/* ---------------- 展开为扁平节点 ---------------- */

export interface ExpenseNode {
  id: string;           // "all" 或 "e1"...（确定性自增）
  name: string;
  path: string;         // 全路径，「\」连接（根为「全部费用」）
  depth: number;        // 根 0，顶层科目 1
  isLeaf: boolean;
  childIds: string[];
  ancestorIds: string[]; // 自顶向下含自身（用于子树过滤）
}

export const EXPENSE_NODES: ExpenseNode[] = (() => {
  const out: ExpenseNode[] = [];
  let seq = 0;
  function walk(node: ExpenseTreeNode, parent: ExpenseNode | null): ExpenseNode {
    const id = parent ? `e${++seq}` : "all";
    const cur: ExpenseNode = {
      id,
      name: node.name,
      // 根自身显示「全部费用」；子级路径从顶层科目起（不含根名），与异常科目键一致
      path: !parent ? node.name : parent.depth === 0 ? node.name : `${parent.path}\\${node.name}`,
      depth: parent ? parent.depth + 1 : 0,
      isLeaf: !node.children?.length,
      childIds: [],
      ancestorIds: parent ? [...parent.ancestorIds, id] : [id],
    };
    out.push(cur);
    for (const c of node.children ?? []) cur.childIds.push(walk(c, cur).id);
    return cur;
  }
  walk(EXPENSE_TREE, null);
  return out;
})();

const NODE_MAP = new Map(EXPENSE_NODES.map((n) => [n.id, n]));
const ROOT_NODE = EXPENSE_NODES[0];

export function expenseNodeOf(id: string): ExpenseNode {
  return NODE_MAP.get(id) ?? ROOT_NODE;
}

// 收集 id 及其全部子孙的 id 集合（筛选联动：异常科目只显示子树内的）
export function subtreeIds(id: string): Set<string> {
  const ids = new Set<string>();
  const queue = [expenseNodeOf(id).id];
  while (queue.length) {
    const cur = queue.shift()!;
    if (ids.has(cur)) continue;
    ids.add(cur);
    queue.push(...expenseNodeOf(cur).childIds);
  }
  return ids;
}

/* ---------------- 锚定口径（全部费用） ---------------- */

const TOTAL_BUDGET = 15652;   // 年度预算（万元）
const TOTAL_EXECUTED = 14401; // 累计执行（万元，1-8 月指定演示形状合计）
const TOTAL_PLAN_PROGRESS = 66.4; // 计划执行进度（8/12 时间口径）
const ACTUAL_MONTHS = 8;      // 实际数据截至 8 月

export const EXPENSE_PERIOD = {
  period: "2026年度",
  dataEnd: "8月31日",
  frequency: "按月更新",
};

export const OPERATING_COST = { value: 15652, yoy: 4.2, mom: 1.6 };   // 运营成本（万元，全厂；yoy 同比 / mom 环比 %）
export const PER_BOX_COST = { value: 4089, yoy: -0.8, mom: -0.4 };    // 单箱可控费用（元/箱）

// 运营成本（随科目筛选联动：按所选科目子树执行金额占全厂比例折算；同比/环比为全厂口径）
export function operatingCostOf(subjectId: string): number {
  const all = expenseDataOf("all").executed;
  const cur = expenseDataOf(subjectId).executed;
  return all > 0 ? Math.round(OPERATING_COST.value * (cur / all)) : OPERATING_COST.value;
}

/* ---------------- 偏差等级与状态 ---------------- */

// 执行进度偏差 → 告警等级（<2pct 不标）
export function deviationLevel(dev: number): AlertLevel | null {
  const a = Math.abs(dev);
  if (a >= 20) return "危险";
  if (a >= 15) return "告警";
  if (a >= 10) return "预警";
  if (a >= 5) return "关注";
  if (a >= 2) return "提示";
  return null;
}

export type ExpenseStatus = "正常" | "超计划" | "滞后";

// 执行状态：偏差 ±3pct 内视为正常（触警等级由偏差卡单独展示）
export function expenseStatus(dev: number): ExpenseStatus {
  if (dev < -3) return "滞后";
  if (dev > 3) return "超计划";
  return "正常";
}

// 健康度等级色（与用户口径一致：优秀≥90 绿 / 良好≥80 浅绿 / 一般≥70 黄 / 预警≥60 橙 / 危险<60 红）
export function healthGradeOf(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "优秀", color: "#16a34a" };
  if (score >= 80) return { label: "良好", color: "#4ade80" };
  if (score >= 70) return { label: "一般", color: "#eab308" };
  if (score >= 60) return { label: "预警", color: "#f97316" };
  return { label: "危险", color: "#ef4444" };
}

/* ---------------- 月度序列 ---------------- */

export interface ExpenseMonth {
  month: string;             // 1月 ~ 12月
  plan: number;              // 预算计划（万元）
  actual: number | null;     // 实际执行（万元，9-12 月无）
  cumRate: number | null;    // 累计消耗度（%，累计实际 ÷ 年度预算）
}

// 12 个月基础形状（前 8 月合计占全年 66.4%，与计划进度锚定一致）
export const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
export const BASE_MONTH_SHAPE = [1.08, 0.92, 1.05, 0.98, 1.02, 1.1, 0.95, 1.06, 1.0, 1.03, 0.97, 1.04];

// 全局月度序列（严格锚定：Σplan=15,652、前8月 Σplan=10,393、Σactual=25,477）
const TOTAL_MONTHLY: ExpenseMonth[] = (() => {
  const s8 = BASE_MONTH_SHAPE.slice(0, ACTUAL_MONTHS).reduce((s, v) => s + v, 0);
  const s4 = BASE_MONTH_SHAPE.slice(ACTUAL_MONTHS).reduce((s, v) => s + v, 0);
  const w = [
    ...BASE_MONTH_SHAPE.slice(0, ACTUAL_MONTHS).map((v) => (v / s8) * (TOTAL_PLAN_PROGRESS / 100)),
    ...BASE_MONTH_SHAPE.slice(ACTUAL_MONTHS).map((v) => (v / s4) * (1 - TOTAL_PLAN_PROGRESS / 100)),
  ];
  // 取整 + 尾差修正（保证锚定合计）
  const plan = w.map((x) => round(TOTAL_BUDGET * x));
  plan[ACTUAL_MONTHS - 1] += round(TOTAL_BUDGET * (TOTAL_PLAN_PROGRESS / 100)) - sum(plan.slice(0, ACTUAL_MONTHS));
  plan[11] += TOTAL_BUDGET - sum(plan);

  // 1-8 月实际执行（万元，指定演示形状）：1 月常规，2/3 月节后回落，4/5 月低位平稳，
  // 6/7 月年中集中执行冲高，8 月回落 → 累计消耗度折线前段平缓、中后段陡升
  const actual = [1811, 932, 650, 890, 1298, 4620, 2800, 1400];

  return MONTH_LABELS.map((month, m) => ({
    month,
    plan: plan[m],
    actual: m < ACTUAL_MONTHS ? actual[m] : null,
    cumRate:
      m < ACTUAL_MONTHS
        ? round((sum(actual.slice(0, m + 1)) / TOTAL_BUDGET) * 100, 1)
        : null,
  }));
})();

function sum(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0);
}

/* ---------------- 科目级确定性生成 ---------------- */

// 叶子年预算：path 哈希权重归一化 × 年度预算（不做严格勾稽）
const LEAF_BUDGET = (() => {
  const leaves = EXPENSE_NODES.filter((n) => n.isLeaf);
  const w = new Map<string, number>();
  let total = 0;
  for (const l of leaves) {
    const v = 0.6 + (hash(l.path) % 140) / 100; // 0.60 ~ 1.99
    w.set(l.id, v);
    total += v;
  }
  const out = new Map<string, number>();
  w.forEach((v, id) => out.set(id, (TOTAL_BUDGET * v) / total));
  return out;
})();

// 进度异常科目覆盖值（确定性哈希不保证高等级，预置保证等级覆盖 危险×1/告警×2/预警×1/关注×1/提示×1）
const ABNORMAL_OVERRIDES: Record<string, { rate: number; planProgress: number; level: AlertLevel; triggeredAt: string; reason: string }> = {
  "管理费用\\修理费\\车辆维修费": { rate: 92.4, planProgress: 70.6, level: "危险", triggeredAt: "2026-08-28 09:12", reason: "车辆大修集中结算，执行率远超时间进度" },
  "制造费用\\职工薪酬\\离职后福利\\企业年金": { rate: 84.8, planProgress: 66.2, level: "告警", triggeredAt: "2026-08-30 10:05", reason: "年金缴费基数调整，累计执行超计划进度" },
  "销售费用\\国内市场营销费\\媒介费": { rate: 81.9, planProgress: 65.4, level: "告警", triggeredAt: "2026-08-25 15:40", reason: "新品上市媒介投放提前执行" },
  "管理费用\\业务招待费": { rate: 78.7, planProgress: 66.4, level: "预警", triggeredAt: "2026-08-31 08:30", reason: "招待费执行节奏偏快，接近年度预算上限" },
  "制造费用\\车间搬运费": { rate: 73.2, planProgress: 66.4, level: "关注", triggeredAt: "2026-08-27 11:20", reason: "搬运业务量增加，月度执行连续超预算" },
  "管理费用\\修理费\\其他维修费": { rate: 69.6, planProgress: 66.4, level: "提示", triggeredAt: "2026-08-20 14:00", reason: "零星维修结算集中，累计略超时间进度" },
};

export interface ExpenseSummary {
  id: string;
  name: string;
  path: string;
  budget: number;       // 年度预算（万元）
  executed: number;     // 累计执行（万元）
  rate: number;         // 预算执行率（%）
  planProgress: number; // 计划执行进度（%）
  deviation: number;    // 执行进度偏差（pct）
  overAmount: number;   // 较计划多(+) / 少(-)执行金额（万元）
  monthly: ExpenseMonth[];
  level: AlertLevel | null; // 偏差告警等级
  status: ExpenseStatus;
}

// 节点（任意层级）→ 费用口径汇总：非叶节点为子树叶子汇总；异常科目用预置覆盖
export function expenseDataOf(id: string): ExpenseSummary {
  const node = expenseNodeOf(id);
  if (node.id === ROOT_NODE.id) {
    const rate = round((TOTAL_EXECUTED / TOTAL_BUDGET) * 100, 1);
    const deviation = round(rate - TOTAL_PLAN_PROGRESS, 1);
    return {
      id: node.id, name: node.name, path: node.path,
      budget: TOTAL_BUDGET, executed: TOTAL_EXECUTED, rate,
      planProgress: TOTAL_PLAN_PROGRESS, deviation,
      overAmount: TOTAL_EXECUTED - round(TOTAL_BUDGET * (TOTAL_PLAN_PROGRESS / 100)),
      monthly: TOTAL_MONTHLY, level: deviationLevel(deviation), status: expenseStatus(deviation),
    };
  }

  // 子树叶子集合
  const scope = subtreeIds(id);
  const leaves = EXPENSE_NODES.filter((n) => n.isLeaf && scope.has(n.id));
  const budget = sum(leaves.map((l) => LEAF_BUDGET.get(l.id) ?? 0));
  const h = hash(node.path);

  // 月度预算：全局形状 × 科目扰动后归一化（计划进度随科目在 63%~69% 波动）
  const shape = BASE_MONTH_SHAPE.map((v, m) => v * (1 + 0.15 * Math.sin((h % 97) + m * 1.9)));
  const sAll = sum(shape);
  const plan = shape.map((v) => round((budget * v) / sAll));
  plan[11] += round(budget) - sum(plan);
  const cumPlan = plan.map((_, m) => sum(plan.slice(0, m + 1)));
  const planProgress = round((cumPlan[ACTUAL_MONTHS - 1] / budget) * 100, 1);

  const override = ABNORMAL_OVERRIDES[node.path];
  if (override) {
    const executed = round((budget * override.rate) / 100);
    const deviation = round(override.rate - override.planProgress, 1);
    const oActual = plan.map((p) => round((p * override.rate) / 100));
    return {
      id: node.id, name: node.name, path: node.path,
      budget, executed, rate: override.rate, planProgress: override.planProgress, deviation,
      overAmount: round(executed - cumPlan[ACTUAL_MONTHS - 1]),
      monthly: MONTH_LABELS.map((month, m) => ({
        month, plan: plan[m],
        actual: m < ACTUAL_MONTHS ? oActual[m] : null,
        cumRate: m < ACTUAL_MONTHS ? round((sum(oActual.slice(0, m + 1)) / budget) * 100, 1) : null,
      })),
      level: override.level, status: expenseStatus(deviation),
    };
  }

  // 常规科目：执行中枢 0.90~1.31（哈希扰动）× 月度波动 → 执行率分化（含少量超 100% 的科目）
  const baseExec = 0.9 + (h % 42) / 100;
  const actual = plan.map((p, m) =>
    m < ACTUAL_MONTHS ? round(p * baseExec * (1 + 0.1 * Math.sin((h % 53) + m * 2.1))) : 0
  );
  const executed = sum(actual);
  const rate = round((executed / budget) * 100, 1);
  const deviation = round(rate - planProgress, 1);
  return {
    id: node.id, name: node.name, path: node.path,
    budget, executed: round(executed), rate, planProgress, deviation,
    overAmount: round(executed - cumPlan[ACTUAL_MONTHS - 1]),
    monthly: MONTH_LABELS.map((month, m) => ({
      month, plan: plan[m],
      actual: m < ACTUAL_MONTHS ? actual[m] : null,
      cumRate: m < ACTUAL_MONTHS ? round((sum(actual.slice(0, m + 1)) / budget) * 100, 1) : null,
    })),
    level: deviationLevel(deviation), status: expenseStatus(deviation),
  };
}

/* ---------------- 进度异常科目（预置 6 条，等级降序 + 触发时间倒序） ---------------- */

export interface AbnormalSubject {
  id: string;
  path: string;
  reason: string;      // 异常原因摘要
  triggeredAt: string; // 触发时间
  color: string;       // 进度条颜色（等级色）
  level: AlertLevel;
  summary: ExpenseSummary;
}

export const ABNORMAL_SUBJECTS: AbnormalSubject[] = Object.entries(ABNORMAL_OVERRIDES)
  .map(([path, o]) => {
    const node = EXPENSE_NODES.find((n) => n.path === path)!;
    return {
      id: node.id, path, reason: o.reason, triggeredAt: o.triggeredAt,
      color: ALERT_LEVEL_COLOR[o.level], level: o.level,
      summary: expenseDataOf(node.id),
    };
  })
  .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.triggeredAt.localeCompare(a.triggeredAt));

/* ---------------- AI 数据解读（300 字内，随口径插值） ---------------- */

export function trendInterpretation(s: ExpenseSummary): string {
  const tone =
    s.deviation > 3 ? `整体呈超计划执行态势，较计划进度高出 ${s.deviation} 个百分点` :
    s.deviation < -3 ? `整体执行偏慢，较计划进度低 ${Math.abs(s.deviation)} 个百分点` :
    "执行节奏与计划进度基本一致";
  const topMonth = [...s.monthly]
    .filter((m) => m.actual !== null)
    .sort((a, b) => (b.actual ?? 0) - (a.actual ?? 0))[0];

  // 剩余预算与超预算时点测算：9-12 月按预算计划执行，累计执行首次越过年度预算的月份
  const remaining = round(s.budget - s.executed);
  const restPlan = s.monthly.filter((m) => m.actual === null).reduce((t, m) => t + m.plan, 0);
  const yearEndRate = round(((s.executed + restPlan) / s.budget) * 100, 1);
  const overActual = s.monthly.find((m) => (m.cumRate ?? 0) >= 100)?.month; // 实际已越线首月
  let acc = remaining;
  let overMonth: string | null = null;
  for (const m of s.monthly) {
    if (m.actual !== null) continue;
    acc -= m.plan;
    if (acc < 0) { overMonth = m.month; break; }
  }
  const risk =
    remaining <= 0
      ? `累计执行已于 ${overActual}超出年度预算（超出 ${Math.abs(remaining).toLocaleString()} 万元），若 9-12 月按预算计划执行，年末预计执行率将达 ${yearEndRate}%。建议立即冻结非刚性支出，启动预算调整与调剂流程，优先保障生产必需项目。`
      : overMonth
        ? `当前剩余预算 ${remaining.toLocaleString()} 万元，若 9-12 月按预算计划执行，预计在 ${overMonth}超出年度预算，年末执行率将达 ${yearEndRate}%。建议提前严控 ${overMonth}前后的支出节奏，优先保障刚性支出，并启动预算调剂或追加审批。`
        : `当前剩余预算 ${remaining.toLocaleString()} 万元，若 9-12 月按预算计划执行，年末预计执行率 ${yearEndRate}%，仍在年度预算内。建议按月跟踪执行节奏，防止年末集中突击执行。`;
  return `${s.path} 2026 年度预算 ${s.budget.toLocaleString()} 万元，截至 8 月末累计执行 ${s.executed.toLocaleString()} 万元，预算执行率 ${s.rate}%，计划执行进度 ${s.planProgress}%，${tone}。月度看，${topMonth.month}执行强度最高（${topMonth.actual?.toLocaleString()} 万元）。${risk}`;
}

/* ---------------- 总体健康度（固定锚定 85 分良好） ---------------- */

export const EXPENSE_HEALTH = {
  score: 85,
  grade: healthGradeOf(85),
  note: "基于预算执行率、执行进度偏差、异常科目占比等综合计算",
};
