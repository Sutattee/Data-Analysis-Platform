// 指标溯源 - 模拟数据（卷烟/包装制造场景）
import { CalcNode, CalcNodeType, CalcDetail } from "@/lib/mock-data/calc-process";

export type ViewMode = "business" | "technical";

export interface BreakdownItem { label: string; value: string; }

// 指标概览（业务）
export interface MetricOverview {
  result?: string;
  period?: string;
  scope?: string;
  dataAsOf?: string;
  evalCycle?: string;
}
// 结果及查询上下文（技术）
export interface TechContext {
  numerator?: string;
  denominator?: string;
  timeRange?: string;
  orgScope?: string;
  dataAsOf?: string;
  calcTime?: string;
  taskId?: string;
}

export interface TraceDetail {
  name: string;
  value?: string;
  unit?: string;
  period?: string;
  definition?: string;
  // —— 业务视角 ——
  overview?: MetricOverview;
  formationDescription?: string;
  calcSteps?: string[];
  calcBreakdown?: BreakdownItem[];
  calcBreakdownTotal?: string;
  calcFormula?: string;
  formationPath?: string[];
  influenceFactors?: string[];
  application?: string;
  // —— 技术视角 ——
  context?: TechContext;
  formula?: string;
  calcRules?: string[];
  queryConditions?: string[];
  sqlLogic?: string;
  dslLogic?: string;
  execParams?: BreakdownItem[];
  executionResult?: string;
  sourceSystem?: string;
  sourceSystemEn?: string;
  db?: string;
  dbEn?: string;
  sourceTable?: string;
  coreField?: string;
  dataFlow?: string[];
  upstream?: string;
  updateFreq?: string;
  calcScope?: string;
}

export interface TraceMetric {
  id: string;
  name: string;
  nameEn?: string;       // 指标英文名称
  domain?: string;       // 业务域
  theme: string;
  metricType: "原子指标" | "衍生指标" | "派生指标";
  businessTree: CalcNode;
  technicalTree: CalcNode;
  businessDetail: TraceDetail;
  technicalDetail: TraceDetail;
  // 指标定义溯源（不展示具体数值，metrics 列表用）
  businessTreeDefine?: CalcNode;
  technicalTreeDefine?: CalcNode;
  businessDetailDefine?: TraceDetail;
  technicalDetailDefine?: TraceDetail;
}

export interface TraceHistoryRecord {
  id: string;
  question: string;
  time: string;
  involvedMetrics: { name: string; value: string }[];
}

function chain(items: Array<{ id: string; label: string; type: CalcNodeType; detail?: CalcDetail }>): CalcNode {
  const nodes = items.map((it) => ({ ...it, detail: it.detail || {}, children: undefined as CalcNode[] | undefined }));
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].children = [nodes[i + 1]];
  return nodes[0];
}

// 从含数值的描述中提取数值（如 "实际运行时间 2,100 小时" → "2,100"）
function extractNum(s: string): string {
  const m = s.match(/[\d,]+(\.\d+)?/);
  return m ? m[0] : "";
}

// 字段 → 数据表 → 数据库 → 业务系统 链（技术拓扑分叉用）
function techLink(p: string, field: string, table: string, db: string, sys: string): CalcNode {
  return {
    id: `${p}_f`, label: field, type: "value", detail: {},
    children: [{ id: `${p}_t`, label: table, type: "record", detail: {},
      children: [{ id: `${p}_d`, label: db, type: "value", detail: {},
        children: [{ id: `${p}_s`, label: sys, type: "system", detail: {} }] }] }],
  };
}

// 二级指标 → 业务对象 → 业务活动 链（业务拓扑分叉用）
function bizLink(p: string, name: string, object: string, activity: string): CalcNode {
  return {
    id: `${p}_n`, label: name, type: "value", detail: {},
    children: [{ id: `${p}_o`, label: object, type: "value", detail: {},
      children: [{ id: `${p}_a`, label: activity, type: "system", detail: {} }] }],
  };
}

// 字段 → 表 → 数据模型 → 数据库 → 来源系统 的纵向链（技术拓扑分叉用，使上下游关系更清晰）
function fieldChain(p: string, field: string, table: string, model: string, db: string, sys: string): CalcNode {
  return {
    id: `${p}_f`, label: field, type: "value", detail: {},
    children: [{
      id: `${p}_t`, label: table, type: "record", detail: { sourceTable: table },
      children: [{
        id: `${p}_m`, label: model, type: "submetric", detail: {},
        children: [{
          id: `${p}_d`, label: db, type: "value", detail: {},
          children: [{ id: `${p}_s`, label: sys, type: "system", detail: {} }],
        }],
      }],
    }],
  };
}

// ========== 通用默认值 ==========
const DATA_AS_OF = "2026-07-31 23:59";
const TIME_RANGE = "2026-07-01 00:00:00 ~ 2026-08-01 00:00:00";
const CALC_TIME = "2026-08-01 08:10";
const ORG_SCOPE = "当前用户有权访问的企业组织范围";

// ========== 指标元数据 ==========
type MetricCategory =
  | "efficiency" | "consumption" | "cost" | "turnover"
  | "productivity" | "productionEfficiency" | "operationCost";

interface MetricMeta {
  id: string;
  name: string;
  unit: string;
  theme: string;
  metricType: TraceMetric["metricType"];
  category: MetricCategory;
  meaning: string;
  formulaBiz: string;
  formulaTech: string;
  value: string;
  numerator: string;
  denominator: string;
  sources: string;
  table: string;
  field: string;
  model: string;
  db: string;
  period: string;
  object: string;
  activity: string;
  breakdown: BreakdownItem[];
  breakdownTotal: string;
  sql: string;
  execResult: string;
}

// 按 category 的文案模板
const TEMPLATES: Record<MetricCategory, {
  steps: (m: MetricMeta) => string[];
  path: (m: MetricMeta) => string[];
  factors: () => string[];
  app: () => string;
  rules: () => string[];
}> = {
  efficiency: {
    steps: () => ["采集设备实际运行时间与计划运行时间数据；", "按工序、设备归集运行时长；", "计算实际运行时间 ÷ 计划时间，得到运行效率。"],
    path: () => ["设备按生产计划与工单执行运行", "采集设备实际运行时长与计划时长", "计算运行时间占计划时间的比例", "形成设备运行效率"],
    factors: () => ["设备故障停机时长", "换牌/调试时间", "设备运行节拍", "生产排程合理性"],
    app: () => "用于评估设备利用水平，识别效率损失环节，指导设备维护与生产优化。",
    rules: () => ["分子分母使用相同统计周期与组织范围；", "计划时间需剔除计划停机时段；", "结果按配置小数位展示。"],
  },
  consumption: {
    steps: () => ["采集统计周期内物料消耗量；", "采集同期合格产量（箱）；", "消耗量 ÷ 产量，得到单箱消耗。"],
    path: () => ["生产过程持续消耗物料", "按物料类型归集消耗量", "除以合格产量得到单箱消耗"],
    factors: () => ["物料损耗率", "设备运行稳定性", "工艺参数控制", "产品规格结构"],
    app: () => "用于物料消耗监控、成本核算与降耗改进。",
    rules: () => ["消耗量与产量必须同周期同口径；", "产量以合格入库箱数为准；", "单位换算在计算前完成。"],
  },
  cost: {
    steps: () => ["归集可控费用各项目；", "汇总可控费用总额；", "采集同期产量；", "费用总额 ÷ 产量，得到单箱可控费用。"],
    path: () => ["归集制造、人工、辅料等可控费用", "汇总费用总额", "除以产量得到单位费用"],
    factors: () => ["费用预算执行", "产量规模", "辅料价格波动", "人工效率"],
    app: () => "用于费用管控、成本分析与定价参考。",
    rules: () => ["费用与产量同周期；", "仅统计可控费用项目；", "产量为0时返回无法计算。"],
  },
  turnover: {
    steps: () => ["采集统计周期内物料消耗金额；", "计算平均库存金额；", "消耗金额 ÷ 平均库存金额，得到周转率。"],
    path: () => ["生产持续消耗库存物料", "计算周期内平均库存", "消耗量与平均库存的比值"],
    factors: () => ["库存结构", "采购到货及时性", "消耗节奏", "安全库存设置"],
    app: () => "用于库存效率分析、资金占用评估与采购优化。",
    rules: () => ["消耗量与库存量同口径同周期；", "平均库存按日均库存计算；", "结果保留一位小数。"],
  },
  productivity: {
    steps: () => ["采集统计周期内企业产值；", "采集同期在岗职工平均人数；", "产值 ÷ 人数，得到全员劳动生产率。"],
    path: () => ["企业生产经营创造产值", "统计在岗职工人数", "产值与人数的比值"],
    factors: () => ["产值规模", "人员配置", "自动化水平", "工时利用"],
    app: () => "用于人力资源效率评估与产能配置决策。",
    rules: () => ["产值与人数同周期；", "人数取在岗平均人数；", "兼职借调人员按规则折算。"],
  },
  productionEfficiency: {
    steps: () => ["采集实际完成产量；", "采集计划产量；", "实际产量 ÷ 计划产量，得到生产效率。"],
    path: () => ["按生产计划组织生产", "统计实际产出", "与计划目标对比"],
    factors: () => ["设备产能", "原料供应", "排程合理性", "突发事件"],
    app: () => "用于评估生产执行情况、预警交付风险。",
    rules: () => ["实际与计划同口径；", "计划产量取已下达订单；", "结果按小数位展示。"],
  },
  operationCost: {
    steps: () => ["归集统计周期内各项运营成本；", "按成本项汇总，得到运营总成本。"],
    path: () => ["归集原料、能源、人工、制造等成本", "按周期汇总", "形成运营总成本"],
    factors: () => ["原料价格", "能源消耗", "人工成本", "制造费用"],
    app: () => "用于运营成本分析、预算执行监控与降本决策。",
    rules: () => ["按权责发生制归集；", "仅统计运营范畴成本；", "历史结果绑定当时成本版本。"],
  },
};

// 元数据 → TraceMetric
function generateMetric(m: MetricMeta): TraceMetric {
  const hasDen = !!m.denominator;
  const tpl = TEMPLATES[m.category];
  // 指标组成（定义溯源用，无数值）：将口径中的 ÷ 替换为 ＋，得到组成项
  const composition = m.formulaBiz.includes("÷") ? m.formulaBiz.replace(/\s*÷\s*/g, " ＋ ") : m.formulaBiz;
  // 中英文补充
  const ex = METRIC_EXTRA[m.id] || { nameEn: m.id, domain: m.theme, fieldCn: m.field, tableCn: m.table, modelEn: m.model, dbEn: m.db, sourcesEn: m.sources };
  // 生成多行执行结果（字段值 + 计算结果）
  const numFields = m.field.split(" / ").map((f) => f.trim());
  const numValues = [m.numerator, m.denominator].map((s) => extractNum(s || ""));
  const execResultText = numFields.length > 1 && numValues[1]
    ? `${numFields[0]}_total：${numValues[0]}\n${numFields[1]}_total：${numValues[1]}\nresult：${m.value}${m.unit}`
    : `${numFields[0]}：${numValues[0] || m.value}\nresult：${m.value}${m.unit}`;
  // 二级指标拆分（业务用组成项，技术用字段）
  const compParts = composition.split(" ＋ ");
  const fieldCnParts = ex.fieldCn.split(" / ");
  const fieldEnParts = m.field.split(" / ");

  const businessTree: CalcNode = {
    id: `${m.id}_b1`, label: `${m.name}（${m.value}${m.unit}）`, type: "metric", detail: {},
    children: [{
      id: `${m.id}_b2`, label: m.formulaBiz, type: "value", detail: {},
      children: compParts.map((name, i) => bizLink(`${m.id}_b${i + 3}`, name, m.object, m.activity)),
    }],
  };

  const technicalTree: CalcNode = {
    id: `${m.id}_t1`, label: `${m.name}（${ex.nameEn}，${m.value}${m.unit}）`, type: "metric", detail: {},
    children: fieldEnParts.map((fe, i) => techLink(
      `${m.id}_t${i + 2}`,
      `${fieldCnParts[i] || fe}（${fe}）`,
      `${ex.tableCn}（${m.table}）`,
      `${m.db}（${ex.dbEn}）`,
      m.sources
    )),
  };

  const calcFormula = hasDen
    ? `${m.name} = ${m.formulaBiz}\n即：${m.value}${m.unit} = ${m.numerator} ÷ ${m.denominator}`
    : `${m.name} = ${m.formulaBiz}\n即：${m.value}${m.unit} = ${m.numerator}`;
  const formationDescription = hasDen
    ? `${m.period}${m.name}为 ${m.value}${m.unit}，由${m.numerator}除以${m.denominator}得到。`
    : `${m.period}${m.name}为 ${m.value}${m.unit}，${m.numerator}。`;

  // ===== 指标定义溯源（不展示具体数值）=====
  const businessTreeDefine: CalcNode = {
    id: `${m.id}_bd1`, label: m.name, type: "metric", detail: {},
    children: [{
      id: `${m.id}_bd2`, label: m.formulaBiz, type: "value", detail: {},
      children: compParts.map((name, i) => bizLink(`${m.id}_bd${i + 3}`, name, m.object, m.activity)),
    }],
  };
  const technicalTreeDefine: CalcNode = {
    id: `${m.id}_td1`, label: `${m.name}（${ex.nameEn}）`, type: "metric", detail: {},
    children: fieldEnParts.map((fe, i) => techLink(
      `${m.id}_td${i + 2}`,
      `${fieldCnParts[i] || fe}（${fe}）`,
      `${ex.tableCn}（${m.table}）`,
      `${m.db}（${ex.dbEn}）`,
      m.sources
    )),
  };
  const businessDetailDefine: TraceDetail = {
    name: m.name, unit: m.unit, period: m.period,
    overview: { period: m.period, scope: ORG_SCOPE, dataAsOf: DATA_AS_OF, evalCycle: m.period },
    definition: m.meaning,
    formula: m.formulaBiz,
    calcSteps: tpl.steps(m),
    calcFormula: `${m.name} = ${m.formulaBiz}`,
    formationPath: tpl.path(m),
    influenceFactors: tpl.factors(),
    application: tpl.app(),
  };
  const technicalDetailDefine: TraceDetail = {
    name: m.name, unit: m.unit, period: m.period,
    context: { timeRange: TIME_RANGE, orgScope: ORG_SCOPE, dataAsOf: DATA_AS_OF, calcTime: CALC_TIME, taskId: `${m.id.toUpperCase()}-20260731` },
    formula: m.formulaTech,
    calcRules: tpl.rules(),
    queryConditions: [`时间范围：${TIME_RANGE}`, `统计对象：${m.object}`, `指标字段：${m.field}`],
    sqlLogic: m.sql,
    dslLogic: `① 按时间范围与组织范围过滤 ${m.table}；\n② 对 ${m.field} 执行聚合计算（${m.formulaTech}）；\n③ 计算 ${m.formulaBiz} 得到 ${m.name}。`,
    sourceSystem: m.sources, sourceSystemEn: ex.sourcesEn, db: m.db, dbEn: ex.dbEn, sourceTable: m.table, coreField: `${m.field}（指标字段）`,
    dataFlow: [`${m.sources} → ${m.table}（${m.model}）→ ${m.name} 计算`],
    updateFreq: m.period, calcScope: `按${m.object}维度聚合`,
  };

  return {
    id: m.id, name: m.name, nameEn: ex.nameEn, domain: ex.domain, theme: m.theme, metricType: m.metricType,
    businessTree, technicalTree,
    businessTreeDefine, technicalTreeDefine, businessDetailDefine, technicalDetailDefine,
    businessDetail: {
      name: m.name, value: m.value, unit: m.unit, period: m.period,
      overview: { result: `${m.value}${m.unit}`, period: m.period, scope: ORG_SCOPE, dataAsOf: DATA_AS_OF, evalCycle: m.period },
      definition: m.meaning,
      formula: m.formulaBiz,
      formationDescription,
      calcSteps: tpl.steps(m),
      calcBreakdown: m.breakdown,
      calcBreakdownTotal: m.breakdownTotal,
      calcFormula,
      formationPath: tpl.path(m),
      influenceFactors: tpl.factors(),
      application: tpl.app(),
    },
    technicalDetail: {
      name: m.name, value: m.value, unit: m.unit, period: m.period,
      context: { numerator: m.numerator, denominator: m.denominator || "—", timeRange: TIME_RANGE, orgScope: ORG_SCOPE, dataAsOf: DATA_AS_OF, calcTime: CALC_TIME, taskId: `${m.id.toUpperCase()}-20260731` },
      formula: m.formulaTech,
      calcRules: tpl.rules(),
      queryConditions: [`时间范围：${TIME_RANGE}`, `统计对象：${m.object}`, `指标字段：${m.field}`],
      sqlLogic: m.sql,
      dslLogic: `① 按时间范围与组织范围过滤 ${m.table}；\n② 对 ${m.field} 执行聚合计算（${m.formulaTech}）；\n③ 计算 ${m.formulaBiz} 得到 ${m.name}。`,
      execParams: [
        { label: "时间范围", value: TIME_RANGE },
        { label: "组织范围", value: "当次用户数据权限范围" },
      ],
      executionResult: execResultText,
      sourceSystem: m.sources, sourceSystemEn: ex.sourcesEn, db: m.db, dbEn: ex.dbEn, sourceTable: m.table, coreField: `${m.field}（指标字段）`,
      dataFlow: [`${m.sources} → ${m.table}（${m.model}）→ ${m.name} 计算`],
      updateFreq: m.period, calcScope: `按${m.object}维度聚合`,
    },
  };
}

// ========== 12 个卷烟指标元数据 ==========
const METRIC_METAS: MetricMeta[] = [
  {
    id: "packagingEff", name: "包装设备运行效率", unit: "%", theme: "设备指标", metricType: "衍生指标", category: "efficiency",
    meaning: "反映包装工序设备的运行效率，即实际运行时间占计划时间的比例，是衡量包装设备利用水平的关键指标。",
    formulaBiz: "实际运行时间 ÷ 计划时间", formulaTech: "SUM(run_time) / NULLIF(SUM(plan_time), 0) × 100",
    value: "87.5", numerator: "实际运行时间 2,100 小时", denominator: "计划时间 2,400 小时",
    sources: "MES、数采系统", table: "dwd_device_runtime", field: "run_time / plan_time", model: "设备运行数据模型", db: "MES数据库",
    period: "日", object: "包装工序设备", activity: "包装设备运行活动",
    breakdown: [{ label: "包装机1号", value: "88.2%" }, { label: "包装机2号", value: "86.8%" }, { label: "包装机3号", value: "87.6%" }],
    breakdownTotal: "加权 87.5%",
    sql: "SELECT\n    SUM(run_time) / NULLIF(SUM(plan_time), 0) * 100 AS rate\nFROM dwd_device_runtime\nWHERE process = '包装'\n  AND record_date = :day;",
    execResult: "rate = 87.5",
  },
  {
    id: "controllableCost", name: "单箱可控费用", unit: "元/箱", theme: "成本指标", metricType: "派生指标", category: "cost",
    meaning: "单位产量的可控费用，反映每生产一箱产品所分摊的可控成本，是成本管控的核心指标。",
    formulaBiz: "可控费用总额 ÷ 产量", formulaTech: "SUM(controllable_amount) / NULLIF(SUM(output_qty), 0)",
    value: "385", numerator: "可控费用总额 9,625,000 元", denominator: "产量 25,000 箱",
    sources: "财务系统", table: "dwd_controllable_cost", field: "controllable_amount / output_qty", model: "成本数据模型", db: "财务数据库",
    period: "月度", object: "可控费用", activity: "费用归集活动",
    breakdown: [{ label: "制造费用", value: "152 元/箱" }, { label: "人工费用", value: "98 元/箱" }, { label: "辅料费用", value: "87 元/箱" }, { label: "其他费用", value: "48 元/箱" }],
    breakdownTotal: "合计 385 元/箱",
    sql: "SELECT\n    SUM(controllable_amount) / NULLIF(SUM(output_qty), 0) AS unit_cost\nFROM dwd_controllable_cost\nWHERE cost_month = '2026-07';",
    execResult: "unit_cost = 385",
  },
  {
    id: "rollingEff", name: "卷接设备运行效率", unit: "%", theme: "设备指标", metricType: "衍生指标", category: "efficiency",
    meaning: "反映卷接工序设备的运行效率，即实际运行时间占计划时间的比例，是衡量卷接设备利用水平的关键指标。",
    formulaBiz: "实际运行时间 ÷ 计划时间", formulaTech: "SUM(run_time) / NULLIF(SUM(plan_time), 0) × 100",
    value: "89.2", numerator: "实际运行时间 2,145 小时", denominator: "计划时间 2,405 小时",
    sources: "MES、数采系统", table: "dwd_device_runtime", field: "run_time / plan_time", model: "设备运行数据模型", db: "MES数据库",
    period: "日", object: "卷接工序设备", activity: "卷接设备运行活动",
    breakdown: [{ label: "卷接机1号", value: "90.1%" }, { label: "卷接机2号", value: "88.4%" }, { label: "卷接机3号", value: "89.0%" }],
    breakdownTotal: "加权 89.2%",
    sql: "SELECT\n    SUM(run_time) / NULLIF(SUM(plan_time), 0) * 100 AS rate\nFROM dwd_device_runtime\nWHERE process = '卷接'\n  AND record_date = :day;",
    execResult: "rate = 89.2",
  },
  {
    id: "inventoryTurnover", name: "库存周转率", unit: "次", theme: "成本指标", metricType: "派生指标", category: "turnover",
    meaning: "备件、辅料库存的周转效率，反映一定周期内库存消耗与平均库存的比值，衡量库存资金占用与周转水平。",
    formulaBiz: "消耗量 ÷ 平均库存量", formulaTech: "SUM(consumption_value) / NULLIF(AVG(avg_inventory), 0)",
    value: "4.2", numerator: "消耗量 8,400 万元", denominator: "平均库存量 2,000 万元",
    sources: "WMS、MES", table: "dwd_inventory", field: "consumption_value / avg_inventory", model: "库存数据模型", db: "WMS数据库",
    period: "月度", object: "备件、辅料库存", activity: "库存周转活动",
    breakdown: [{ label: "辅料库存", value: "5.1 次" }, { label: "备件库存", value: "3.3 次" }],
    breakdownTotal: "综合 4.2 次",
    sql: "SELECT\n    SUM(consumption_value) / NULLIF(AVG(avg_inventory), 0) AS turnover\nFROM dwd_inventory\nWHERE inv_month = '2026-07';",
    execResult: "turnover = 4.2",
  },
  {
    id: "laborProductivity", name: "全员劳动生产率", unit: "万元/人", theme: "生产指标", metricType: "派生指标", category: "productivity",
    meaning: "人均产值，反映企业平均每位在岗职工创造的价值，是衡量劳动效率与人力投入产出水平的重要指标。",
    formulaBiz: "产值 ÷ 在岗职工人数", formulaTech: "SUM(output_value) / NULLIF(AVG(employee_count), 0)",
    value: "12.5", numerator: "产值 312,500 万元", denominator: "在岗职工人数 25,000 人",
    sources: "生产指挥系统", table: "dwd_labor_productivity", field: "output_value / employee_count", model: "人力资源数据模型", db: "生产指挥数据库",
    period: "月度", object: "在岗职工", activity: "生产经营活动",
    breakdown: [{ label: "生产人员", value: "18.6 万元/人" }, { label: "辅助人员", value: "6.4 万元/人" }],
    breakdownTotal: "全员 12.5 万元/人",
    sql: "SELECT\n    SUM(output_value) / NULLIF(AVG(employee_count), 0) AS productivity\nFROM dwd_labor_productivity\nWHERE stat_month = '2026-07';",
    execResult: "productivity = 12.5",
  },
  {
    id: "netEquipmentEff", name: "设备运行净效率", unit: "%", theme: "设备指标", metricType: "派生指标", category: "efficiency",
    meaning: "扣除非设备因素后的设备运行效率，即实际运行时间占可用时间的比例，更真实反映设备本身的运行能力。",
    formulaBiz: "实际运行时间 ÷ 可用时间", formulaTech: "SUM(run_time) / NULLIF(SUM(available_time), 0) × 100",
    value: "82.3", numerator: "实际运行时间 1,975 小时", denominator: "可用时间 2,400 小时",
    sources: "MES、数采系统", table: "dwd_device_runtime", field: "run_time / available_time", model: "设备运行数据模型", db: "MES数据库",
    period: "日", object: "设备可用时间", activity: "扣除非设备因素后的设备运行",
    breakdown: [{ label: "包装工序", value: "84.5%" }, { label: "卷接工序", value: "80.1%" }],
    breakdownTotal: "综合 82.3%",
    sql: "SELECT\n    SUM(run_time) / NULLIF(SUM(available_time), 0) * 100 AS net_rate\nFROM dwd_device_runtime\nWHERE record_date = :day;",
    execResult: "net_rate = 82.3",
  },
  {
    id: "productionEff", name: "生产效率", unit: "%", theme: "生产指标", metricType: "派生指标", category: "productionEfficiency",
    meaning: "整体生产计划完成效率，即实际产量占计划产量的比例，反映生产计划的执行与达成水平。",
    formulaBiz: "实际产量 ÷ 计划产量", formulaTech: "SUM(output_qty) / NULLIF(SUM(plan_qty), 0) × 100",
    value: "96.8", numerator: "实际产量 18,432 吨", denominator: "计划产量 19,040 吨",
    sources: "MES、ERP", table: "dwd_output_fact", field: "output_qty / plan_qty", model: "生产数据模型", db: "MES数据库",
    period: "日", object: "生产计划", activity: "生产执行活动",
    breakdown: [{ label: "主线产量", value: "97.4%" }, { label: "辅助产量", value: "94.2%" }],
    breakdownTotal: "综合 96.8%",
    sql: "SELECT\n    SUM(o.output_qty) / NULLIF(SUM(p.plan_qty), 0) * 100 AS eff_rate\nFROM dwd_output_fact o\nJOIN dwd_production_order p ON o.order_id = p.order_id\nWHERE o.record_date = :day;",
    execResult: "eff_rate = 96.8",
  },
  {
    id: "operationCost", name: "运营成本", unit: "万元", theme: "成本指标", metricType: "原子指标", category: "operationCost",
    meaning: "工厂运营总成本，包括原料、能源、人工及制造费用等，是衡量工厂整体运营投入的核心指标。",
    formulaBiz: "直接统计", formulaTech: "SUM(total_cost)",
    value: "12,580", numerator: "运营总成本 12,580 万元", denominator: "",
    sources: "NC系统", table: "dwd_operation_cost", field: "total_cost", model: "运营成本数据模型", db: "NC数据库",
    period: "月度", object: "工厂运营", activity: "运营活动",
    breakdown: [{ label: "原料成本", value: "5,600 万元" }, { label: "能源成本", value: "2,850 万元" }, { label: "人工成本", value: "1,980 万元" }, { label: "制造费用", value: "2,150 万元" }],
    breakdownTotal: "合计 12,580 万元",
    sql: "SELECT\n    SUM(total_cost) AS operation_cost\nFROM dwd_operation_cost\nWHERE cost_month = '2026-07';",
    execResult: "operation_cost = 12580",
  },
  {
    id: "paperConsumption", name: "单箱耗盘纸量", unit: "米/箱", theme: "物耗指标", metricType: "衍生指标", category: "consumption",
    meaning: "单位产量盘纸消耗量，反映每生产一箱产品消耗的盘纸长度，是物料消耗管控的重要指标。",
    formulaBiz: "盘纸消耗量 ÷ 产量", formulaTech: "SUM(paper_consumption) / NULLIF(SUM(output_qty), 0)",
    value: "1,850", numerator: "盘纸消耗量 4,625,000 米", denominator: "产量 2,500 箱",
    sources: "MES、WMS", table: "dwd_material_consumption", field: "paper_consumption / output_qty", model: "物料消耗数据模型", db: "MES数据库",
    period: "日", object: "盘纸库存", activity: "盘纸消耗活动",
    breakdown: [{ label: "包装机1号", value: "1,820 米/箱" }, { label: "包装机2号", value: "1,880 米/箱" }],
    breakdownTotal: "平均 1,850 米/箱",
    sql: "SELECT\n    SUM(paper_consumption) / NULLIF(SUM(output_qty), 0) AS unit_paper\nFROM dwd_material_consumption\nWHERE material_type = '盘纸'\n  AND record_date = :day;",
    execResult: "unit_paper = 1850",
  },
  {
    id: "labelPaperConsumption", name: "单箱耗商标纸(小盒)量", unit: "张/箱", theme: "物耗指标", metricType: "衍生指标", category: "consumption",
    meaning: "单位产量商标纸（小盒）消耗量，反映每生产一箱产品消耗的商标纸张数，是包装物料管控指标。",
    formulaBiz: "商标纸消耗量 ÷ 产量", formulaTech: "SUM(label_paper_consumption) / NULLIF(SUM(output_qty), 0)",
    value: "2,500", numerator: "商标纸消耗量 6,250,000 张", denominator: "产量 2,500 箱",
    sources: "MES、WMS", table: "dwd_material_consumption", field: "label_paper_consumption / output_qty", model: "物料消耗数据模型", db: "MES数据库",
    period: "日", object: "商标纸库存", activity: "商标纸消耗活动",
    breakdown: [{ label: "包装机1号", value: "2,480 张/箱" }, { label: "包装机2号", value: "2,520 张/箱" }],
    breakdownTotal: "平均 2,500 张/箱",
    sql: "SELECT\n    SUM(label_paper_consumption) / NULLIF(SUM(output_qty), 0) AS unit_label\nFROM dwd_material_consumption\nWHERE material_type = '商标纸'\n  AND record_date = :day;",
    execResult: "unit_label = 2500",
  },
  {
    id: "tobaccoConsumption", name: "单箱耗烟叶量", unit: "公斤/箱", theme: "物耗指标", metricType: "衍生指标", category: "consumption",
    meaning: "单位产量烟叶消耗量，反映每生产一箱产品消耗的烟叶重量，是卷烟生产核心物料消耗指标。",
    formulaBiz: "烟叶消耗量 ÷ 产量", formulaTech: "SUM(tobacco_consumption) / NULLIF(SUM(output_qty), 0)",
    value: "38.5", numerator: "烟叶消耗量 96,250 公斤", denominator: "产量 2,500 箱",
    sources: "MES", table: "dwd_material_consumption", field: "tobacco_consumption / output_qty", model: "物料消耗数据模型", db: "MES数据库",
    period: "日", object: "烟叶库存", activity: "烟叶消耗活动",
    breakdown: [{ label: "卷接机1号", value: "38.1 公斤/箱" }, { label: "卷接机2号", value: "38.9 公斤/箱" }],
    breakdownTotal: "平均 38.5 公斤/箱",
    sql: "SELECT\n    SUM(tobacco_consumption) / NULLIF(SUM(output_qty), 0) AS unit_tobacco\nFROM dwd_material_consumption\nWHERE material_type = '烟叶'\n  AND record_date = :day;",
    execResult: "unit_tobacco = 38.5",
  },
  {
    id: "filterRodConsumption", name: "单箱耗嘴棒量", unit: "支/箱", theme: "物耗指标", metricType: "衍生指标", category: "consumption",
    meaning: "单位产量嘴棒消耗量，反映每生产一箱产品消耗的嘴棒支数，是卷烟辅料消耗管控指标。",
    formulaBiz: "嘴棒消耗量 ÷ 产量", formulaTech: "SUM(filter_rod_consumption) / NULLIF(SUM(output_qty), 0)",
    value: "12,000", numerator: "嘴棒消耗量 30,000,000 支", denominator: "产量 2,500 箱",
    sources: "MES、WMS", table: "dwd_material_consumption", field: "filter_rod_consumption / output_qty", model: "物料消耗数据模型", db: "MES数据库",
    period: "日", object: "嘴棒库存", activity: "嘴棒消耗活动",
    breakdown: [{ label: "卷接机1号", value: "11,850 支/箱" }, { label: "卷接机2号", value: "12,150 支/箱" }],
    breakdownTotal: "平均 12,000 支/箱",
    sql: "SELECT\n    SUM(filter_rod_consumption) / NULLIF(SUM(output_qty), 0) AS unit_filter\nFROM dwd_material_consumption\nWHERE material_type = '嘴棒'\n  AND record_date = :day;",
    execResult: "unit_filter = 12000",
  },
];

// 指标中英文补充（技术拓扑节点与数据来源展示中英文名称）
const METRIC_EXTRA: Record<string, { nameEn: string; domain: string; fieldCn: string; tableCn: string; modelEn: string; dbEn: string; sourcesEn: string }> = {
  packagingEff: { nameEn: "packaging_equipment_efficiency", domain: "设备管理", fieldCn: "运行时间 / 计划时间", tableCn: "设备运行事实表", modelEn: "device_runtime_model", dbEn: "mes_db", sourcesEn: "MES, Data Acquisition System" },
  controllableCost: { nameEn: "controllable_cost_per_carton", domain: "成本管理", fieldCn: "可控费用金额 / 产量", tableCn: "可控费用事实表", modelEn: "cost_model", dbEn: "finance_db", sourcesEn: "Finance System" },
  rollingEff: { nameEn: "rolling_equipment_efficiency", domain: "设备管理", fieldCn: "运行时间 / 计划时间", tableCn: "设备运行事实表", modelEn: "device_runtime_model", dbEn: "mes_db", sourcesEn: "MES, Data Acquisition System" },
  inventoryTurnover: { nameEn: "inventory_turnover_rate", domain: "成本管理", fieldCn: "消耗金额 / 平均库存", tableCn: "库存事实表", modelEn: "inventory_model", dbEn: "wms_db", sourcesEn: "WMS, MES" },
  laborProductivity: { nameEn: "labor_productivity", domain: "生产管理", fieldCn: "产值 / 在岗人数", tableCn: "劳动生产率事实表", modelEn: "hr_model", dbEn: "production_command_db", sourcesEn: "Production Command System" },
  netEquipmentEff: { nameEn: "net_equipment_efficiency", domain: "设备管理", fieldCn: "运行时间 / 可用时间", tableCn: "设备运行事实表", modelEn: "device_runtime_model", dbEn: "mes_db", sourcesEn: "MES, Data Acquisition System" },
  productionEff: { nameEn: "production_efficiency", domain: "生产管理", fieldCn: "实际产量 / 计划产量", tableCn: "产量事实表", modelEn: "production_model", dbEn: "mes_db", sourcesEn: "MES, ERP" },
  operationCost: { nameEn: "operation_cost", domain: "成本管理", fieldCn: "总成本", tableCn: "运营成本事实表", modelEn: "operation_cost_model", dbEn: "nc_db", sourcesEn: "NC System" },
  paperConsumption: { nameEn: "paper_consumption_per_carton", domain: "物耗管理", fieldCn: "盘纸消耗量 / 产量", tableCn: "物料消耗事实表", modelEn: "material_consumption_model", dbEn: "mes_db", sourcesEn: "MES, WMS" },
  labelPaperConsumption: { nameEn: "label_paper_consumption_per_carton", domain: "物耗管理", fieldCn: "商标纸消耗量 / 产量", tableCn: "物料消耗事实表", modelEn: "material_consumption_model", dbEn: "mes_db", sourcesEn: "MES, WMS" },
  tobaccoConsumption: { nameEn: "tobacco_consumption_per_carton", domain: "物耗管理", fieldCn: "烟叶消耗量 / 产量", tableCn: "物料消耗事实表", modelEn: "material_consumption_model", dbEn: "mes_db", sourcesEn: "MES" },
  filterRodConsumption: { nameEn: "filter_rod_consumption_per_carton", domain: "物耗管理", fieldCn: "嘴棒消耗量 / 产量", tableCn: "物料消耗事实表", modelEn: "material_consumption_model", dbEn: "mes_db", sourcesEn: "MES, WMS" },
};

// ========== 单位产值碳排放量（完整示例，手工） ==========
const carbonMetric: TraceMetric = {
  id: "carbon", name: "单位产值碳排放量", nameEn: "carbon_per_output_value", domain: "能源管理", theme: "能耗指标", metricType: "派生指标",
  businessTree: {
    id: "c_b1", label: "单位产值碳排放量（0.1444 吨/万元）", type: "metric", detail: {},
    children: [{
      id: "c_b2", label: "CO₂排放当量 ÷ 产值", type: "value", detail: {},
      children: [
        { id: "c_b3a", label: "各类能源碳排放汇总", type: "value", detail: {},
          children: [{ id: "c_b4a", label: "能源管理业务数据", type: "value", detail: {},
            children: [{ id: "c_b5a", label: "能源使用活动", type: "system", detail: {} }] }] },
        { id: "c_b3b", label: "月度产值汇总", type: "value", detail: {},
          children: [{ id: "c_b4b", label: "财务产值数据", type: "value", detail: {},
            children: [{ id: "c_b5b", label: "生产经营活动", type: "system", detail: {} }] }] },
      ],
    }],
  },
  technicalTree: {
    id: "c_t1", label: "单位产值碳排放量（0.1444）", type: "metric", detail: {},
    children: [
      { id: "c_t_co2", label: "CO₂排放当量（co2_equivalent）", type: "submetric", detail: {},
        children: [
          { id: "c_t_ec", label: "能源消耗量（energy_consumption）", type: "submetric", detail: {},
            children: [{ id: "c_t_ecf", label: "能源消耗字段（energy_consumption）", type: "value", detail: {},
              children: [{ id: "c_t_ect", label: "能源消耗事实表（energy_consumption_fact）", type: "record", detail: {},
                children: [{ id: "c_t_ecd", label: "能源数据库（energy_db）", type: "value", detail: {},
                  children: [{ id: "c_t_ecs", label: "能源管理系统", type: "system", detail: {} }] }] }] }] },
          { id: "c_t_ef", label: "排放因子（emission_factor）", type: "submetric", detail: {},
            children: [{ id: "c_t_eff", label: "排放因子字段（emission_factor）", type: "value", detail: {},
              children: [{ id: "c_t_eft", label: "碳排放因子表（emission_factor）", type: "record", detail: {},
                children: [{ id: "c_t_efd", label: "能源数据库（energy_db）", type: "value", detail: {},
                  children: [{ id: "c_t_efs", label: "能源管理系统", type: "system", detail: {} }] }] }] }] },
        ] },
      { id: "c_t_ov", label: "产值（output_value）", type: "submetric", detail: {},
        children: [{ id: "c_t_ovf", label: "产值字段（output_value）", type: "value", detail: {},
          children: [{ id: "c_t_ovt", label: "产值事实表（output_value_fact）", type: "record", detail: {},
            children: [{ id: "c_t_ovd", label: "财务数据库（finance_db）", type: "value", detail: {},
              children: [{ id: "c_t_ovs", label: "财务系统", type: "system", detail: {} }] }] }] }] },
    ],
  },
  businessDetail: {
    name: "单位产值碳排放量", value: "0.1444", unit: "吨/万元", period: "2026年7月",
    overview: { result: "0.1444 吨/万元", period: "2026年7月", scope: ORG_SCOPE, dataAsOf: DATA_AS_OF, evalCycle: "月度/季度" },
    definition: "单位产值碳排放量用于反映企业每创造一万元产值所产生的 CO₂排放当量，是衡量生产经营活动碳排放强度和绿色发展水平的重要指标。指标值越低，表示在相同产值下产生的碳排放越少。该指标用于描述碳排放强度，不直接代表企业碳排放总量。",
    formationDescription: "2026年7月单位产值碳排放量为 0.1444 吨/万元，由当月 CO₂排放当量除以当月产值得到。",
    calcSteps: [
      "汇总统计周期内电力、燃气、蒸汽等能源消耗数据；",
      "按照已确认并处于有效期内的碳排放因子，将不同能源消耗量折算为 CO₂排放当量；",
      "汇总各类能源产生的 CO₂排放当量，得到当月 CO₂排放当量 12,480 吨；",
      "从财务数据中获取同一统计周期和组织范围内的产值 86,400 万元；",
      "使用 CO₂排放当量除以产值，得到单位产值碳排放量。",
    ],
    calcBreakdown: [
      { label: "电力消耗", value: "8,640 吨" },
      { label: "燃气消耗", value: "2,160 吨" },
      { label: "蒸汽消耗", value: "1,200 吨" },
      { label: "其他能源", value: "480 吨" },
    ],
    calcBreakdownTotal: "合计 12,480 吨",
    calcFormula: "单位产值碳排放量\n＝ CO₂排放当量 ÷ 产值\n＝ 12,480 吨 ÷ 86,400 万元\n＝ 0.1444 吨/万元",
    formationPath: [
      "企业生产经营活动",
      "消耗电力、燃气、蒸汽等能源",
      "能源消耗量按照排放因子折算为 CO₂排放当量",
      "CO₂排放当量与同期产值进行比值计算",
      "形成单位产值碳排放量",
    ],
    influenceFactors: ["能源使用结构", "能源消耗规模", "产值规模", "生产组织范围"],
    application: "该指标可用于评价企业碳排放强度，开展不同月份、季度或组织之间的绿色生产水平对比，为节能降碳管理提供数据依据。",
  },
  technicalDetail: {
    name: "单位产值碳排放量", value: "0.1444", unit: "吨/万元", period: "2026年7月",
    context: { numerator: "CO₂排放当量 12,480 吨", denominator: "产值 86,400 万元", timeRange: TIME_RANGE, orgScope: ORG_SCOPE, dataAsOf: DATA_AS_OF, calcTime: CALC_TIME, taskId: "CARBON-20260731" },
    formula: "单位产值碳排放量 = CO₂排放当量 / 产值\n其中：CO₂排放当量 = Σ（各类能源消耗量 × 对应碳排放因子）",
    calcRules: [
      "分子和分母必须使用相同的统计周期和组织范围；",
      "碳排放因子必须处于有效期内，并与能源类型和计量单位匹配；",
      "产值为0或缺失时，不得执行除法，应返回“无法计算”并说明原因；",
      "单位换算必须在计算前完成；",
      "结果按照指标配置的小数位数进行展示；",
      "历史结果应绑定当时使用的指标版本和排放因子版本。",
    ],
    queryConditions: [`时间范围：${TIME_RANGE}`, "组织范围：当前用户数据权限范围", "指标字段：energy_consumption / emission_factor / output_value"],
    sqlLogic: "WITH carbon_result AS (\n    SELECT\n        SUM(e.energy_consumption * f.emission_factor) AS co2_equivalent\n    FROM energy_consumption_fact e\n    JOIN carbon_emission_factor f\n      ON e.energy_type = f.energy_type\n     AND e.statistic_time >= f.effective_start_time\n     AND e.statistic_time < f.effective_end_time\n    WHERE e.statistic_time >= :start_time\n      AND e.statistic_time < :end_time\n      AND e.organization_id IN (:authorized_org_ids)\n),\noutput_result AS (\n    SELECT\n        SUM(output_value) AS total_output_value\n    FROM output_value_fact\n    WHERE statistic_time >= :start_time\n      AND statistic_time < :end_time\n      AND organization_id IN (:authorized_org_ids)\n)\nSELECT\n    co2_equivalent\n    / NULLIF(total_output_value, 0)\n        AS carbon_per_output_value\nFROM carbon_result\nCROSS JOIN output_result;",
    dslLogic: `接收运行时统计周期和组织范围；\n根据统计周期及组织范围筛选能源消耗数据和产值数据；\n为各类能源匹配对应有效期内的碳排放因子；\n计算并汇总CO₂排放当量；\n汇总同期产值；\n使用CO₂排放当量除以产值，得到单位产值碳排放量。`,
    execParams: [
      { label: "start_time", value: "2026-07-01 00:00:00" },
      { label: "end_time", value: "2026-08-01 00:00:00" },
      { label: "authorized_org_ids", value: "当次用户数据权限范围" },
    ],
    executionResult: "co2_equivalent = 12,480 吨\ntotal_output_value = 86,400 万元\ncarbon_per_output_value = 0.1444 吨/万元",
    sourceSystem: "能源管理系统、财务系统", sourceSystemEn: "Energy Management System, Finance System", db: "能源数据库、财务数据库", dbEn: "energy_db, finance_db", sourceTable: "energy_consumption_fact / emission_factor / output_value_fact", coreField: "energy_consumption / emission_factor / output_value",
    dataFlow: ["能源管理系统 → energy_consumption_fact", "财务系统 → output_value_fact", "碳排放因子表 → emission_factor", "指标计算引擎 → 单位产值碳排放量"],
    updateFreq: "T+1（日级同步）", calcScope: "按统计周期、组织范围聚合计算。",
  },
  // 指标定义溯源（不展示具体数值）
  businessTreeDefine: {
    id: "c_bd1", label: "单位产值碳排放量", type: "metric", detail: {},
    children: [{
      id: "c_bd2", label: "CO₂排放当量 ÷ 产值", type: "value", detail: {},
      children: [
        { id: "c_bd3a", label: "各类能源碳排放汇总", type: "value", detail: {},
          children: [{ id: "c_bd4a", label: "能源管理业务数据", type: "value", detail: {},
            children: [{ id: "c_bd5a", label: "能源使用活动", type: "system", detail: {} }] }] },
        { id: "c_bd3b", label: "月度产值汇总", type: "value", detail: {},
          children: [{ id: "c_bd4b", label: "财务产值数据", type: "value", detail: {},
            children: [{ id: "c_bd5b", label: "生产经营活动", type: "system", detail: {} }] }] },
      ],
    }],
  },
  technicalTreeDefine: {
    id: "c_td1", label: "单位产值碳排放量", type: "metric", detail: {},
    children: [
      { id: "c_td_co2", label: "CO₂排放当量（co2_equivalent）", type: "submetric", detail: {},
        children: [
          { id: "c_td_ec", label: "能源消耗量（energy_consumption）", type: "submetric", detail: {},
            children: [{ id: "c_td_ecf", label: "能源消耗字段（energy_consumption）", type: "value", detail: {},
              children: [{ id: "c_td_ect", label: "能源消耗事实表（energy_consumption_fact）", type: "record", detail: {},
                children: [{ id: "c_td_ecd", label: "能源数据库（energy_db）", type: "value", detail: {},
                  children: [{ id: "c_td_ecs", label: "能源管理系统", type: "system", detail: {} }] }] }] }] },
          { id: "c_td_ef", label: "排放因子（emission_factor）", type: "submetric", detail: {},
            children: [{ id: "c_td_eff", label: "排放因子字段（emission_factor）", type: "value", detail: {},
              children: [{ id: "c_td_eft", label: "碳排放因子表（emission_factor）", type: "record", detail: {},
                children: [{ id: "c_td_efd", label: "能源数据库（energy_db）", type: "value", detail: {},
                  children: [{ id: "c_td_efs", label: "能源管理系统", type: "system", detail: {} }] }] }] }] },
        ] },
      { id: "c_td_ov", label: "产值（output_value）", type: "submetric", detail: {},
        children: [{ id: "c_td_ovf", label: "产值字段（output_value）", type: "value", detail: {},
          children: [{ id: "c_td_ovt", label: "产值事实表（output_value_fact）", type: "record", detail: {},
            children: [{ id: "c_td_ovd", label: "财务数据库（finance_db）", type: "value", detail: {},
              children: [{ id: "c_td_ovs", label: "财务系统", type: "system", detail: {} }] }] }] }] },
    ],
  },
  businessDetailDefine: {
    name: "单位产值碳排放量", unit: "吨/万元", period: "2026年7月",
    overview: { period: "2026年7月", scope: ORG_SCOPE, dataAsOf: DATA_AS_OF, evalCycle: "月度/季度" },
    definition: "单位产值碳排放量用于反映企业每创造一万元产值所产生的 CO₂排放当量，是衡量生产经营活动碳排放强度和绿色发展水平的重要指标。",
    calcSteps: ["汇总统计周期内电力、燃气、蒸汽等能源消耗数据；", "按照已确认的碳排放因子，将能源消耗量折算为 CO₂排放当量；", "汇总各类能源产生的 CO₂排放当量；", "从财务数据获取同一周期的产值；", "使用 CO₂排放当量除以产值，得到单位产值碳排放量。"],
    calcFormula: "单位产值碳排放量 = CO₂排放当量 ÷ 产值",
    formationPath: ["企业生产经营活动", "消耗电力、燃气、蒸汽等能源", "能源消耗量按排放因子折算为 CO₂排放当量", "与同期产值进行比值计算", "形成单位产值碳排放量"],
    influenceFactors: ["能源使用结构", "能源消耗规模", "产值规模", "生产组织范围"],
    application: "用于评价企业碳排放强度，开展绿色生产水平对比，为节能降碳管理提供数据依据。",
  },
  technicalDetailDefine: {
    name: "单位产值碳排放量", unit: "吨/万元", period: "月度/季度",
    context: { timeRange: TIME_RANGE, orgScope: ORG_SCOPE, dataAsOf: DATA_AS_OF, calcTime: CALC_TIME, taskId: "CARBON-20260731" },
    formula: "单位产值碳排放量 = CO₂排放当量 / 产值\n其中：CO₂排放当量 = Σ（各类能源消耗量 × 对应碳排放因子）",
    calcRules: ["分子分母同周期同组织范围；", "碳排放因子须在有效期内且与能源类型匹配；", "产值为0时返回无法计算；", "单位换算在计算前完成；", "结果按配置小数位展示。"],
    queryConditions: [`时间范围：${TIME_RANGE}`, "组织范围：当前用户数据权限范围", "指标字段：energy_consumption / emission_factor / output_value"],
    sqlLogic: "WITH carbon_result AS (\n    SELECT\n        SUM(e.energy_consumption * f.emission_factor) AS co2_equivalent\n    FROM energy_consumption_fact e\n    JOIN carbon_emission_factor f\n      ON e.energy_type = f.energy_type\n     AND e.statistic_time >= f.effective_start_time\n     AND e.statistic_time < f.effective_end_time\n    WHERE e.statistic_time >= :start_time\n      AND e.statistic_time < :end_time\n      AND e.organization_id IN (:authorized_org_ids)\n),\noutput_result AS (\n    SELECT\n        SUM(output_value) AS total_output_value\n    FROM output_value_fact\n    WHERE statistic_time >= :start_time\n      AND statistic_time < :end_time\n      AND organization_id IN (:authorized_org_ids)\n)\nSELECT\n    co2_equivalent\n    / NULLIF(total_output_value, 0)\n        AS carbon_per_output_value\nFROM carbon_result\nCROSS JOIN output_result;",
    dslLogic: `接收运行时统计周期和组织范围；\n根据统计周期及组织范围筛选能源消耗数据和产值数据；\n为各类能源匹配对应有效期内的碳排放因子；\n计算并汇总CO₂排放当量；\n汇总同期产值；\n使用CO₂排放当量除以产值，得到单位产值碳排放量。`,
    sourceSystem: "能源管理系统、财务系统", sourceSystemEn: "Energy Management System, Finance System", db: "能源数据库、财务数据库", dbEn: "energy_db, finance_db", sourceTable: "energy_consumption_fact / emission_factor / output_value_fact", coreField: "energy_consumption / emission_factor / output_value",
    dataFlow: ["能源管理系统 → energy_consumption_fact", "财务系统 → output_value_fact", "碳排放因子表 → emission_factor", "指标计算引擎 → 单位产值碳排放量"],
    updateFreq: "T+1（日级同步）", calcScope: "按统计周期、组织范围聚合计算。",
  },
};

// ========== 汇总导出 ==========
export const traceMetrics: TraceMetric[] = [carbonMetric, ...METRIC_METAS.map(generateMetric)];

export const TRACE_THEMES = ["能耗指标", "生产指标", "设备指标", "成本指标", "物耗指标"];

export const traceHistory: TraceHistoryRecord[] = [
  { id: "th1", question: "本月单位产值碳排放量环比变化分析", time: "2026-08-01 09:12", involvedMetrics: [{ name: "单位产值碳排放量", value: "0.1444 吨/万元" }] },
  { id: "th2", question: "各机台包装与卷接设备运行效率对比", time: "2026-07-31 16:40", involvedMetrics: [{ name: "包装设备运行效率", value: "87.5%" }, { name: "卷接设备运行效率", value: "89.2%" }] },
  { id: "th3", question: "本月单箱耗烟叶、嘴棒、盘纸消耗分析", time: "2026-07-30 14:05", involvedMetrics: [{ name: "单箱耗烟叶量", value: "38.5 公斤/箱" }, { name: "单箱耗嘴棒量", value: "12,000 支/箱" }, { name: "单箱耗盘纸量", value: "1,850 米/箱" }] },
  { id: "th4", question: "单箱可控费用与运营成本月度情况", time: "2026-07-29 11:20", involvedMetrics: [{ name: "单箱可控费用", value: "385 元/箱" }, { name: "运营成本", value: "12,580 万元" }] },
  { id: "th5", question: "全员劳动生产率与生产效率分析", time: "2026-07-28 10:15", involvedMetrics: [{ name: "全员劳动生产率", value: "12.5 万元/人" }, { name: "生产效率", value: "96.8%" }] },
  { id: "th6", question: "备件辅料库存周转率是否健康", time: "2026-07-27 09:48", involvedMetrics: [{ name: "库存周转率", value: "4.2 次" }] },
];
