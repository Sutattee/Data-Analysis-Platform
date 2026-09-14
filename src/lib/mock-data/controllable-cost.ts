// 可控费用 — 全部预算指标中可通过控费措施进一步压降的部分（页面与「全部费用」同构）
// 数据处理规则：
//  · 主数据为用户「可控费用指标表」：指标编码｜预算指标｜部门（多值）｜所属费用科目（多值）
//  · 数值口径与「全部费用」页保持一致：按 (编码, 部门) 引用主数据 463 行（expense-indicators）
//  · 部门名展开：无后缀名 X → 主数据所有 X / X-* 前缀部门中该编码的行聚合（如 fs1010@工艺质量科 = 本科室+检验）；
//    「供汽班组/供电班组」→ 动力部-供汽/供电班组 精确匹配
//  · 聚合口径：budget/executed/月度 Σ 后重算 rate/deviation/status（单源行数值与全部费用页完全一致）
//  · 缺口补录（模块内，不动主数据，共 9 条 — 保证用户表全部 (编码, 部门) 组合都展示）：
//    zc05050299@制丝车间、zc051105@党建办公室、zc020608@动力车间、fs1010@卷包车间、
//    zc040601@企业管理科/安全管理科/工程设备科、zc040708@厂部办公室、zc05050101@厂部办公室；
//    zc041002 物业管理费 = 主数据 zc04100201 + zc04100202 聚合
//  · 状态：偏差触发五级告警（|偏差| > 3pct）→ 异常（与全部费用同一告警口径）
import {
  EXPENSE_INDICATORS, indicatorDataOf, monthlyOf, targetRateOf,
  type IndicatorData, type IndicatorStatus,
} from "./expense-indicators";
import { MONTH_LABELS, EXPENSE_NODES, PER_BOX_COST, type ExpenseMonth } from "./expense-overview";

const PLAN_PROGRESS = 66.4; // 资金计划应执行（%）
const ACTUAL_MONTHS = 8;    // 实际数据截至 8 月

/* ---------------- 基础工具 ---------------- */

// 数值四舍五入（d 位小数）
function round(v: number, d = 0): number {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

function sum(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0);
}

// 状态：与全部费用同一告警口径（偏差触发五级告警 |偏差| > 3pct → 异常）
function statusOf(deviation: number): IndicatorStatus {
  return Math.abs(deviation) > 3 ? "异常" : "正常";
}

// 主数据部门清单（首现顺序，用于前缀展开时保持稳定顺序）
const MASTER_DEPTS: string[] = (() => {
  const out: string[] = [];
  for (const n of EXPENSE_INDICATORS) if (!out.includes(n.dept)) out.push(n.dept);
  return out;
})();

// 展示部门名 → 主数据部门集合（前缀展开 / 班组精确）
function deptExpand(dept: string): string[] {
  if (dept === "供汽班组") return ["动力部-供汽班组"];
  if (dept === "供电班组") return ["动力部-供电班组"];
  if (dept === "动力车间") return MASTER_DEPTS.filter((d) => d.startsWith("动力部-")); // 供汽/供电/公共三班组
  return MASTER_DEPTS.filter((d) => d === dept || d.startsWith(dept + "-"));
}

// 编码特例：用户表的 zc041002 物业管理费在主数据拆为两行
const MERGE_CODES: Record<string, string[]> = {
  zc041002: ["zc04100201", "zc04100202"],
};

// 缺口补录（仅本模块）：主数据中不存在的 (编码, 部门) 组合，预算批复参照同类指标量级
const CONTROLLABLE_EXTRA: { code: string; name: string; dept: string; budget: number }[] = [
  { code: "zc05050299", name: "其他非生产类计划项修费", dept: "制丝车间", budget: 60.0 },
  { code: "zc051105",   name: "印刷发行费",             dept: "党建办公室", budget: 12.0 },
  { code: "zc020608",   name: "外购库存能源",           dept: "动力车间",   budget: 200.0 },
  { code: "fs1010",     name: "质检耗用物料",           dept: "卷包车间",   budget: 90.0 },
  { code: "zc040601",   name: "参加会议会务费",         dept: "企业管理科", budget: 12.0 },
  { code: "zc040601",   name: "参加会议会务费",         dept: "安全管理科", budget: 8.0 },
  { code: "zc040601",   name: "参加会议会务费",         dept: "工程设备科", budget: 9.5 },
  { code: "zc040708",   name: "车辆租赁费",             dept: "厂部办公室", budget: 36.0 },
  { code: "zc05050101", name: "信息类设备日常修理费",   dept: "厂部办公室", budget: 48.0 },
];

/* ---------------- 主数据（可控费用指标表） ---------------- */

// [指标编码, 预算指标, 部门（多值）, 所属费用科目（多值）]
const RAW: [string, string, string[], string[]][] = [
  ["fs1012", "基本生产维修耗物料", ["卷包车间", "制丝车间"], ["其他维修费"]],
  ["fs1013", "辅助生产维修耗物料", ["动力车间"], ["其他维修费"]],
  ["fs1014", "管理性维修耗用物料", ["物资管理科", "安全管理科", "工艺质量科"], ["其他维修费", "企业研发费用"]],
  ["zc040902", "安防设施维护费", ["工程设备科"], ["警卫消防费"]],
  ["zc05050102", "生产用房屋建筑物日常修理费", ["动力车间", "卷包车间", "制丝车间"], ["其他维修费"]],
  ["zc05050103", "非生产用房屋建筑物日常修理费", ["物资管理科", "后勤服务科"], ["其他维修费"]],
  ["zc05050104", "实验、计量及检测仪器日常修理费", ["工艺质量科"], ["企业研发费用"]],
  ["zc05050105", "生产用设备日常修理费", ["制丝车间", "卷包车间", "动力车间"], ["其他维修费"]],
  ["zc05050106", "特种设备及计量设备检验费", ["工程设备科"], ["其他维修费"]],
  ["zc05050198", "安全类其他非生产类日常修理费", ["工程设备科"], ["其他维修费"]],
  ["zc05050199", "其他非生产类日常修理费", ["物资管理科", "工程设备科", "后勤服务科"], ["其他维修费", "在岗员工福利"]],
  ["zc05050204", "实验、计量及检测仪器计划项修费", ["工艺质量科"], ["企业研发费用"]],
  ["zc05050299", "其他非生产类计划项修费", ["制丝车间"], ["其他维修费"]],
  ["zc0413", "聘请中介机构费", ["审计科"], ["其他中介费"]],
  ["zc050305", "生产环节装卸费", ["制丝车间"], ["车间搬运费"]],
  ["zc050305", "生产环节装卸费", ["卷包车间"], ["车间搬运费"]],
  ["fs1003", "劳保耗用物料", ["卷包车间", "制丝车间", "动力车间", "安全管理科", "工艺质量科"], ["劳动保护费", "企业研发费用"]],
  ["zc040901", "安防器材购置费", ["安全管理科"], ["警卫消防费"]],
  ["zc040902", "安防设施维护费", ["安全管理科"], ["警卫消防费"]],
  ["zc040903", "安防协作费", ["安全管理科"], ["警卫消防费"]],
  ["zc040905", "安全及环保监测费用", ["安全管理科"], ["警卫消防费"]],
  ["zc040906", "安全事故隐患举报奖", ["安全管理科"], ["警卫消防费"]],
  ["zc040999", "其他安防费用", ["安全管理科"], ["警卫消防费"]],
  ["zc041701", "劳动保护服装费", ["安全管理科"], ["劳动保护费"]],
  ["zc040101", "日常招待费", ["厂部办公室"], ["业务招待费"]],
  ["zc040202", "报刊杂志资料书籍", ["工会办公室"], ["办公费"]],
  ["zc040203", "邮电传真费", ["厂部办公室"], ["办公费"]],
  ["zc040204", "标牌标识制作费", ["厂部办公室", "物资管理科", "供汽班组", "制丝车间", "卷包车间", "工艺质量科"], ["办公费", "企业研发费用"]],
  ["zc040206", "饮用茶水费", ["厂部办公室", "物资管理科", "供电班组", "供汽班组", "制丝车间", "卷包车间", "工艺质量科"], ["办公费", "企业研发费用"]],
  ["zc040298", "专项办公费", ["厂部办公室"], ["办公费"]],
  ["zc040299", "其他办公费用", ["厂部办公室"], ["办公费"]],
  ["zc040401", "办公座机电话费", ["厂部办公室", "物资管理科", "供电班组", "供汽班组", "制丝车间", "卷包车间", "工艺质量科"], ["办公费", "企业研发费用"]],
  ["zc040501", "日常差旅费", ["厂部办公室", "物资管理科", "供汽班组", "制丝车间", "卷包车间", "工艺质量科", "工程设备科", "企业管理科"], ["差旅费", "企业研发费用"]],
  ["zc040505", "参加会议差旅费", ["厂部办公室"], ["差旅费"]],
  ["zc040601", "参加会议会务费", ["企业管理科", "厂部办公室", "安全管理科", "工程设备科", "工艺质量科"], ["会议费", "企业研发费用"]],
  ["zc040701", "车辆油费", ["厂部办公室", "市场营销科"], ["燃料费"]],
  ["zc040702", "过路过桥费", ["厂部办公室", "市场营销科"], ["车杂费"]],
  ["zc040703", "停车洗车费", ["厂部办公室"], ["车杂费"]],
  ["zc040705", "车辆维修费", ["厂部办公室"], ["车辆维修费"]],
  ["zc040706", "车辆年检及各种规费", ["厂部办公室"], ["车杂费"]],
  ["zc040708", "车辆租赁费", ["厂部办公室"], ["租赁费"]],
  ["zc041101", "经营管理咨询费", ["动力车间"], ["咨询费"]],
  ["zc041101", "经营管理咨询费", ["厂部办公室"], ["咨询费"]],
  ["zc041102", "法律咨询费", ["厂部办公室"], ["法律服务"]],
  ["zc0423", "代理服务费", ["厂部办公室"], ["其他中介费"]],
  ["zc050399", "其他装卸费", ["厂部办公室"], ["运杂费"]],
  ["fs59", "计提党组织工作经费", ["党建办公室"], ["党组织工作经费"]],
  ["zc051105", "印刷发行费", ["党建办公室"], ["媒介费"]],
  ["zc051106", "内部横幅版报支出", ["党建办公室"], ["媒介费"]],
  ["fs1011", "生产耗用物料", ["动力车间"], ["其他"]],
  ["zc020601", "外购水费", ["动力车间"], ["外购水费"]],
  ["zc020602", "外购电费", ["动力车间"], ["外购电费"]],
  ["zc020603", "外购气费", ["动力车间"], ["外购气费"]],
  ["zc020608", "外购库存能源", ["动力车间"], ["外购库存能源"]],
  ["zc040905", "安全及环保监测费用", ["动力车间"], ["警卫消防费"]],
  ["zc050606", "环境污染责任保险", ["动力车间"], ["房屋保险费"]],
  ["fs1010", "质检耗用物料", ["卷包车间", "工艺质量科"], ["企业研发费用"]],
  ["zc050704", "研发合作外包费", ["工艺质量科"], ["企业研发费用"]],
  ["zc0508", "评吸检测费", ["工艺质量科"], ["企业研发费用"]],
  ["fs1011", "生产耗用物料", ["卷包车间"], ["其他"]],
  ["zc041106", "审计咨询费", ["企业管理科"], ["审计费"]],
  ["fs1007", "仓储耗用物料", ["物资管理科"], ["仓储费"]],
  ["zc020599", "备品备件采购杂费", ["物资管理科"], ["运杂费"]],
  ["zc050102", "经营场所租赁费", ["物资管理科"], ["租赁费"]],
  ["zc05020201", "烟叶转库运输费", ["物资管理科"], ["运杂费"]],
  ["zc05020202", "成品转库运输费", ["物资管理科"], ["运杂费"]],
  ["zc05020203", "其他存货转库运输费", ["物资管理科"], ["运杂费"]],
  ["zc05030201", "烟叶转库装卸费", ["物资管理科"], ["运杂费"]],
  ["zc05030202", "成品转库装卸费", ["物资管理科"], ["运杂费"]],
  ["zc05030203", "其他存货转库装卸费", ["物资管理科"], ["运杂费"]],
  ["zc050402", "烟叶仓库保管费用", ["物资管理科"], ["仓储费"]],
  ["zc050404", "成品仓库保管费", ["物资管理科"], ["仓储费"]],
  ["zc050405", "烟叶仓库搬运费", ["物资管理科"], ["仓储费"]],
  ["zc050406", "成品仓库搬运费", ["物资管理科"], ["仓储费"]],
  ["zc050499", "其他仓库保管费用", ["物资管理科"], ["仓储费"]],
  ["zc040301", "信息系统维护费", ["信息科"], ["信息系统维护费"]],
  ["zc040303", "信息设备耗材", ["信息科", "卷包车间", "物资管理科", "动力车间", "工艺质量科", "制丝车间", "市场营销科"], ["办公费", "企业研发费用"]],
  ["zc040304", "通讯线路租赁费", ["信息科"], ["租赁费"]],
  ["zc05050101", "信息类设备日常修理费", ["信息科", "制丝车间", "卷包车间", "物资管理科", "动力车间", "工艺质量科", "厂部办公室"], ["其他维修费", "企业研发费用"]],
  ["fs1011", "生产耗用物料", ["制丝车间"], ["其他"]],
  ["fs1017", "培训耗用物料", ["人力资源科"], ["职工教育经费"]],
  ["zc040506", "参加培训差旅费", ["人力资源科"], ["差旅费"]],
  ["zc041707", "女工卫生保护费", ["工会办公室", "动力车间", "工艺质量科", "卷包车间", "制丝车间"], ["劳动保护费", "企业研发费用"]],
  ["zc040201", "日常办公用品", ["物资管理科", "后勤服务科", "动力车间", "制丝车间", "卷包车间", "工艺质量科"], ["办公费", "企业研发费用"]],
  ["zc041001", "绿化费", ["后勤服务科"], ["绿化费"]],
  ["zc041002", "物业管理费", ["后勤服务科"], ["物业管理费"]],
];

/* ---------------- 展开与聚合 ---------------- */

// 可控费用行（展开为每 编码 × 展示部门 一行；数值与「全部费用」主数据同源）
export interface ControllableRow {
  id: string;            // "c0".."cN"
  code: string;          // 指标编码（展示值，如 zc041002）
  name: string;          // 预算指标名称
  dept: string;          // 展示部门名（如「动力车间」）
  subjects: string[];    // 所属费用科目（多值，详情页展示用）
  nodeIds: string[];     // 挂载的费用科目树节点（源行科目路径节点，目录树过滤用）
  data: IndicatorData;   // 数值口径（含 monthly）
}

// 补录行 → IndicatorData（月度复用全部费用同构生成器，seed = 部门\指标名）
function extraDataOf(code: string, name: string, dept: string, budget: number): IndicatorData {
  const seed = `${dept}\\${name}`;
  const monthly = monthlyOf(seed, budget, targetRateOf(seed));
  const executed = round(sum(monthly.map((m) => m.actual ?? 0)), 1);
  monthly[ACTUAL_MONTHS - 1].actual = round((monthly[ACTUAL_MONTHS - 1].actual ?? 0) + executed - sum(monthly.map((m) => m.actual ?? 0)), 1);
  const rate = round((executed / budget) * 100, 1);
  const deviation = round(rate - PLAN_PROGRESS, 1);
  return {
    budget,
    executed,
    remaining: round(budget - executed, 1),
    planProgress: PLAN_PROGRESS,
    rate,
    deviation,
    status: statusOf(deviation),
    monthly,
  };
}

// 多源行聚合：Σbudget/Σexecuted/月度Σ 后重算 rate/deviation/status
function mergeDataOf(datas: IndicatorData[]): IndicatorData {
  const monthly: ExpenseMonth[] = MONTH_LABELS.map((month, m) => ({
    month,
    plan: round(sum(datas.map((d) => d.monthly[m].plan)), 1),
    actual: m < ACTUAL_MONTHS ? round(sum(datas.map((d) => d.monthly[m].actual ?? 0)), 1) : null,
    cumRate: null,
  }));
  const budget = round(sum(datas.map((d) => d.budget)), 1);
  const executed = round(sum(datas.map((d) => d.executed)), 1);
  const rate = round((executed / budget) * 100, 1);
  const deviation = round(rate - PLAN_PROGRESS, 1);
  return {
    budget,
    executed,
    remaining: round(budget - executed, 1),
    planProgress: PLAN_PROGRESS,
    rate,
    deviation,
    status: statusOf(deviation),
    monthly,
  };
}

/* ---------------- 科目层级挂载（按全部费用的费用科目层级结构） ---------------- */

// 科目路径 → 节点 id（源行 subjectPath 与 EXPENSE_NODES.path 对齐，可精确定位分支）
const NODE_ID_BY_PATH = new Map(EXPENSE_NODES.map((n) => [n.path, n.id]));

// 树中无同名节点的科目（如 外购库存能源）→ 虚拟顶层节点 id "x:<科目名>"
const VIRTUAL_NODE_IDS = new Map<string, string>();

// 行 → 挂载节点：源行科目路径节点（多源多分支都挂，去重）；补录行取科目名首个同名节点；
// 无同名节点的科目挂虚拟顶层节点（参照 外购水费/电费/气费 的顶层位置）
function mountedNodeIds(subjects: string[], sources: { subjectPath: string }[]): string[] {
  const ids: string[] = [];
  for (const s of sources) {
    const id = NODE_ID_BY_PATH.get(s.subjectPath);
    if (id && id !== "all" && !ids.includes(id)) ids.push(id);
  }
  if (ids.length === 0) {
    for (const name of subjects) {
      const hit = EXPENSE_NODES.find((n) => n.id !== "all" && n.name === name);
      if (hit && !ids.includes(hit.id)) ids.push(hit.id);
    }
  }
  for (const name of subjects) {
    if (EXPENSE_NODES.some((n) => n.id !== "all" && n.name === name)) continue;
    const vid = VIRTUAL_NODE_IDS.get(name) ?? `x:${name}`;
    VIRTUAL_NODE_IDS.set(name, vid);
    if (!ids.includes(vid)) ids.push(vid);
  }
  return ids;
}

// 展开：用户表行 × 展示部门 → 可控费用行（同 编码+部门 去重）
export const CONTROLLABLE_ROWS: ControllableRow[] = (() => {
  const out: ControllableRow[] = [];
  const seen = new Set<string>(); // code|dept 去重（用户表同码分行仅部门不同，天然无重复；防御性保留）
  const extraByKey = new Map(CONTROLLABLE_EXTRA.map((e) => [`${e.code}|${e.dept}`, e]));
  for (const [code, name, depts, subjects] of RAW) {
    for (const dept of depts) {
      const key = `${code}|${dept}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const masterDepts = deptExpand(dept);
      const codes = MERGE_CODES[code] ?? [code];
      const sources = EXPENSE_INDICATORS.filter(
        (n) => codes.includes(n.code) && masterDepts.includes(n.dept)
      );
      let data: IndicatorData;
      if (sources.length === 1) {
        data = indicatorDataOf(sources[0].id); // 单源：与全部费用页数值完全一致
      } else if (sources.length > 1) {
        data = mergeDataOf(sources.map((n) => indicatorDataOf(n.id)));
      } else {
        const extra = extraByKey.get(key);
        if (!extra) continue; // 无源且无补录：跳过（理论上不存在，验证脚本兜底）
        data = extraDataOf(extra.code, extra.name, extra.dept, extra.budget);
      }
      out.push({ id: `c${out.length}`, code, name, dept, subjects, nodeIds: mountedNodeIds(subjects, sources), data });
    }
  }
  return out;
})();

const ROW_MAP = new Map(CONTROLLABLE_ROWS.map((r) => [r.id, r]));

// 行 → IndicatorData（表格/字段区取数接口，与 indicatorDataOf 同构）
export function controllableRowOf(id: string): IndicatorData {
  return ROW_MAP.get(id)!.data;
}

/* ---------------- 科目 / 部门 视图与计数 ---------------- */

// 全部行（"all"）或科目树节点子树内的行（按挂载节点过滤；多分支挂载的行在各分支都出现）
export function controllableRowsUnderSubject(node: string): ControllableRow[] {
  if (node === "all") return CONTROLLABLE_ROWS;
  const ids = SUBTREE_ID_SETS.get(node);
  if (ids) return CONTROLLABLE_ROWS.filter((r) => r.nodeIds.some((id) => ids.has(id)));
  return CONTROLLABLE_ROWS.filter((r) => r.subjects.includes(node)); // 兜底：按科目名（兼容旧值）
}

export function controllableRowsUnderDept(dept: string): ControllableRow[] {
  return CONTROLLABLE_ROWS.filter((r) => r.dept === dept);
}

// 单箱可控费用（随科目筛选联动：按所选科目子树可控费用执行额占全部比例折算全厂口径；同比/环比为全厂口径；
// 该科目子树内无可控费用行时返回 null = 指标不适用，卡片展示 —）
export function perBoxCostOf(subjectId: string): number | null {
  const rows = controllableRowsUnderSubject(subjectId);
  if (rows.length === 0) return null;
  const all = summarizeControllable(controllableRowsUnderSubject("all")).executed;
  const cur = summarizeControllable(rows).executed;
  return all > 0 ? Math.round(PER_BOX_COST.value * (cur / all)) : PER_BOX_COST.value;
}

// 可控费用科目树：按全部费用的费用科目层级结构组织（修剪树 — 仅保留挂载节点及其祖先链，
// 保持原层级与顺序；count/abnormal 为子树累计，多分支挂载的行在各分支分别计数）
export interface ControllableSubjectNode {
  id: string;         // EXPENSE_NODES 节点 id；树中无同名的科目为 "x:<科目名>"
  name: string;
  depth: number;      // 顶层科目 1（目录缩进用）
  count: number;      // 子树挂载行数
  abnormal: number;   // 子树异常行数
  children: ControllableSubjectNode[];
}

export const CONTROLLABLE_SUBJECT_TREE: ControllableSubjectNode[] = (() => {
  // 挂载节点集合（保留集 = 挂载节点 + 祖先链；虚拟节点为顶层，无祖先）
  const mounted = new Set<string>();
  for (const r of CONTROLLABLE_ROWS) for (const id of r.nodeIds) mounted.add(id);
  const kept = new Set<string>(mounted);
  for (const n of EXPENSE_NODES) {
    if (kept.has(n.id)) for (const a of n.ancestorIds) kept.add(a);
  }
  function build(id: string, depth: number): ControllableSubjectNode | null {
    const node = EXPENSE_NODES.find((n) => n.id === id);
    if (!node || !kept.has(id)) return null;
    const children = node.childIds
      .map((c) => build(c, depth + 1))
      .filter((c): c is ControllableSubjectNode => c !== null);
    return { id, name: node.name, depth, count: 0, abnormal: 0, children };
  }
  const top = EXPENSE_NODES[0].childIds
    .map((c) => build(c, 1))
    .filter((c): c is ControllableSubjectNode => c !== null);
  // 虚拟科目（外购库存能源）置于外购气费之后，修剪树中无外购气费时追加末尾
  const virtuals = Array.from(VIRTUAL_NODE_IDS.entries()).map(([name, id]) => ({
    id, name, depth: 1, count: 0, abnormal: 0, children: [] as ControllableSubjectNode[],
  }));
  const gasIdx = top.findIndex((n) => n.name === "外购气费");
  if (gasIdx >= 0) top.splice(gasIdx + 1, 0, ...virtuals);
  else top.push(...virtuals);
  // 计数按「子树内挂载 ≥1 个节点的行」去重统计（与点击节点展示的行列表一致；
  // 同一行挂多个分支时在各分支分别计数，多科目口径不变）
  (function recount(list: ControllableSubjectNode[]): void {
    for (const n of list) {
      const ids = new Set<string>([n.id]);
      (function collect(node: ControllableSubjectNode): void {
        for (const c of node.children) {
          ids.add(c.id);
          collect(c);
        }
      })(n);
      const rs = CONTROLLABLE_ROWS.filter((r) => r.nodeIds.some((id) => ids.has(id)));
      n.count = rs.length;
      n.abnormal = rs.filter((r) => r.data.status === "异常").length;
      recount(n.children);
    }
  })(top);
  return top;
})();

// 节点 id → 子树节点 id 集合（含自身）/ 节点 id → 名称（页面标题用）
const SUBTREE_ID_SETS = new Map<string, Set<string>>();
const NODE_NAMES = new Map<string, string>([["all", "可控费用"]]);
(function indexTree(list: ControllableSubjectNode[]): void {
  for (const n of list) {
    NODE_NAMES.set(n.id, n.name);
    const ids = new Set<string>([n.id]);
    (function collect(node: ControllableSubjectNode): void {
      for (const c of node.children) {
        ids.add(c.id);
        collect(c);
      }
    })(n);
    SUBTREE_ID_SETS.set(n.id, ids);
    indexTree(n.children);
  }
})(CONTROLLABLE_SUBJECT_TREE);

export function controllableSubjectNameOf(node: string): string {
  return NODE_NAMES.get(node) ?? node;
}

// 部门清单（首现顺序）+ 计数 + 异常数
export const CONTROLLABLE_DEPTS: { dept: string; count: number; abnormal: number }[] = (() => {
  const out: { dept: string; count: number; abnormal: number }[] = [];
  const idx = new Map<string, { dept: string; count: number; abnormal: number }>();
  for (const r of CONTROLLABLE_ROWS) {
    if (!idx.has(r.dept)) {
      const item = { dept: r.dept, count: 0, abnormal: 0 };
      idx.set(r.dept, item);
      out.push(item);
    }
    const item = idx.get(r.dept)!;
    item.count += 1;
    if (r.data.status === "异常") item.abnormal += 1;
  }
  return out;
})();

/* ---------------- 汇总口径（字段区 + 两图数据） ---------------- */

export interface ControllableSummary {
  budget: number;    // 预算批复合计（万）
  executed: number;  // 实际执行合计（万）
  remaining: number; // 剩余预算（万）
  planProgress: number; // 资金计划应执行（%）
  rate: number;      // 合计执行率（%）
  deviation: number; // 执行进度偏差（pct）
  monthly: ExpenseMonth[];
}

export function summarizeControllable(rows: ControllableRow[]): ControllableSummary {
  return mergeDataOf(rows.map((r) => r.data)) as ControllableSummary;
}

/* ---------------- AI 数据解读（300 字内） ---------------- */

export function controllableInterpretation(scope: string, rows: ControllableRow[], s: ControllableSummary): string {
  const abnormal = rows.filter((r) => r.data.status === "异常").length;
  const abnormalTxt = abnormal > 0 ? `其中 ${abnormal} 项指标执行进度偏差触发告警，需重点关注` : "全部指标执行进度均在正常区间";
  const advice =
    s.deviation > 5
      ? "整体执行偏快，建议核查大额支出并预估年末余量，优先对此类可控费用实施压降。"
      : s.deviation < -5
        ? "整体执行偏慢，建议关注滞后指标的资金支付节奏，防止年末集中执行。"
        : "整体执行节奏与计划基本匹配，建议按月跟踪偏差变化并滚动落实控费措施。";
  return `「${scope}」共纳入 ${rows.length} 项可控费用预算指标，年度预算批复合计 ${s.budget.toLocaleString()} 万元，截至 8 月末累计执行 ${s.executed.toLocaleString()} 万元，剩余预算 ${s.remaining.toLocaleString()} 万元，合计执行率 ${s.rate}%，较资金计划应执行 ${s.planProgress}% 偏差 ${s.deviation > 0 ? "+" : ""}${s.deviation}pct，${abnormalTxt}。${advice}`;
}
