// 工艺质量板块 —— 模拟数据（场景：什邡卷烟厂，口径时间 2026-08）

// ============ 顶部指标卡 ============

// 缺陷率卡：支持按等级切换（全部/A类/B类/C类/D类），value 单位 %，mom 为环比变化（百分点）
export interface DefectRateItem {
  key: string;
  label: string;
  value: number;
  mom: number;
}

export const DEFECT_RATE_OPTIONS: DefectRateItem[] = [
  { key: "all", label: "缺陷率", value: 1.84, mom: 0.4 },
  { key: "A", label: "A类缺陷率", value: 0.42, mom: -0.05 },
  { key: "B", label: "B类缺陷率", value: 0.68, mom: 0.12 },
  { key: "C", label: "C类缺陷率", value: 0.51, mom: 0.08 },
  { key: "D", label: "D类缺陷率", value: 0.23, mom: -0.02 },
];

// 成品优质品率（当前批次 + 同比/环比，pct：同比 vs 去年同期 / 环比 vs 上一批次，正 = 上升）
export const FINISHED_PREMIUM = { value: 98.6, yoy: 0.4, mom: 0.2 };

// 制丝优质品率（当前批次 + 同比/环比，pct；环比小幅回落）
export const SILK_PREMIUM = { value: 98.6, yoy: 0.3, mom: -0.1 };

// 包装与卷制质量检验加权平均值（分，本月 + 近10批区间）
export const PACKING_SCORE = { value: 96.8, rangeLow: 95.1, rangeHigh: 97.9 };

// ============ 模块一：缺陷（近1个月） ============

export const DEFECT_TOTAL = 58; // 缺陷总条数（近1个月）

export interface DefectSlice {
  name: string;
  value: number;
  color: string;
}

// 缺陷等级分布（饼图）：A/B/C/D 四级数量（多色系，右侧图例引用同色块）
export const DEFECT_GRADES: DefectSlice[] = [
  { name: "A类", value: 13, color: "#2563eb" },
  { name: "B类", value: 5, color: "#f59e0b" },
  { name: "C类", value: 34, color: "#10b981" },
  { name: "D类", value: 6, color: "#8b5cf6" },
];

// 缺陷部位分布（环形图）：真实部位口径 Top5 + 其他（多色系）
export const DEFECT_PARTS: DefectSlice[] = [
  { name: "小盒杂项", value: 17, color: "#f59e0b" },
  { name: "卷烟搭口", value: 9, color: "#6366f1" },
  { name: "商标纸", value: 8, color: "#10b981" },
  { name: "条装杂项", value: 6, color: "#06b6d4" },
  { name: "箱装杂项", value: 4, color: "#8b5cf6" },
  { name: "其他", value: 14, color: "#94a3b8" },
];

// Top5 缺陷排名（横向条形图，占比 = count / DEFECT_TOTAL）
export const TOP_DEFECTS = [
  { name: "爆口", count: 9 },
  { name: "小盒轧皱", count: 5 },
  { name: "小盒外部粘连", count: 3 },
  { name: "小盒内夹杂", count: 3 },
  { name: "小盒内部未粘牢", count: 3 },
];

// 新冒头缺陷列表（按日期倒序，滚动展示；批次号与发生日期对应，机台为卷接包机组）
export interface EmergingDefect {
  id: string;
  name: string;
  batch: string; // 发生批次号（如 20260816-03）
  machine: string; // 发生机台
  date: string;
}

export const EMERGING_DEFECTS: EmergingDefect[] = [
  { id: "ed-1", name: "透明纸烫皱", batch: "20260816-03", machine: "2#卷接包机组", date: "2026-08-16" },
  { id: "ed-2", name: "条盒纸压痕", batch: "20260815-01", machine: "5#卷接包机组", date: "2026-08-15" },
  { id: "ed-3", name: "爆口", batch: "20260814-02", machine: "3#卷接包机组", date: "2026-08-14" },
  { id: "ed-4", name: "商标纸色差", batch: "20260813-05", machine: "1#卷接包机组", date: "2026-08-13" },
  { id: "ed-5", name: "封签翘折", batch: "20260811-04", machine: "4#卷接包机组", date: "2026-08-11" },
  { id: "ed-6", name: "接装纸皱", batch: "20260810-02", machine: "2#卷接包机组", date: "2026-08-10" },
  { id: "ed-7", name: "钢印模糊", batch: "20260808-01", machine: "5#卷接包机组", date: "2026-08-08" },
  { id: "ed-8", name: "卷烟表面污", batch: "20260806-03", machine: "1#卷接包机组", date: "2026-08-06" },
];

// ============ 模块二：过程管控 ============

// 摘要：半年评价达标项 / 当日异常批次
export const PROCESS_SUMMARY = { halfYearPass: 7, halfYearTotal: 9, todayAbnormal: 3, todayBatches: 28 };

// 过程管控指标（9 项）：管控值为 null 且无 tolRange 表示「待配置」（不参与超差判定）；
// tolRange = 区间型管控（值落在区间内达标，如 12.50%～13.50%），设置时优先于 toleranceNum 判定
export interface ProcessMetric {
  id: string;
  stage: string; // 工序
  name: string; // 指标
  halfYearValue: string; // 半年均值评价值（如 1.36%）
  halfYearPass: boolean; // 半年均值评价：达标 / 未达标
  latestValue: string; // 最新监测值（如 4.8%）
  latestNum: number; // 最新监测数值（与管控值比较，超标准标红）
  latestNote: string; // 最新监测口径（批次/班组/本月）
  recent: string; // 近期均值展示
  recentNum: number; // 近期均值数值
  recentNote: string; // 近期均值统计周期（近10批次 / 近3个月 / 近10班次）
  deviation: string; // 超限比例展示（相对管控值；如 +20% / +15% / 0% / -，- = 待配置无基准）
  tolerance: string; // 管控值展示（如 ≤4.0% / ≤3次 / 12.50%～13.50% / 待配置）
  toleranceNum: number | null; // 上限型管控值数值（null = 非上限型或待配置）
  tolRange?: [number, number]; // 区间型管控 [下限, 上限]
}

export const PROCESS_METRICS: ProcessMetric[] = [
  {
    id: "pm-1",
    stage: "松散回潮",
    name: "松散回潮非稳态指数",
    halfYearValue: "1.36%",
    halfYearPass: true,
    latestValue: "4.8%",
    latestNum: 4.8,
    latestNote: "批次20260817-02",
    recent: "4.1%",
    recentNum: 4.1,
    recentNote: "近10批次",
    deviation: "+20%",
    tolerance: "≤4.0%",
    toleranceNum: 4.0,
  },
  {
    id: "pm-2",
    stage: "松散回潮",
    name: "成品水分标准偏差",
    halfYearValue: "1.8%",
    halfYearPass: false,
    latestValue: "1.65%",
    latestNum: 1.65,
    latestNote: "批次20260817-02",
    recent: "1.57%",
    recentNum: 1.57,
    recentNote: "近10批次",
    deviation: "+18.15%",
    tolerance: "≤1.55%",
    toleranceNum: 1.55,
  },
  {
    id: "pm-3",
    stage: "烘丝",
    name: "烘丝工序非稳态指数",
    halfYearValue: "0.43%",
    halfYearPass: true,
    latestValue: "0.41%",
    latestNum: 0.41,
    latestNote: "批次20260816-05",
    recent: "0.45%",
    recentNum: 0.45,
    recentNote: "近10批次",
    deviation: "-",
    tolerance: "待配置",
    toleranceNum: null,
  },
  {
    id: "pm-4",
    stage: "烘丝",
    name: "烘丝机出口水分偏差",
    halfYearValue: "0.46%",
    halfYearPass: true,
    latestValue: "12.4%",
    latestNum: 12.4,
    latestNote: "批次20260816-05",
    recent: "12.49%",
    recentNum: 12.49,
    recentNote: "近10批次",
    deviation: "-20%",
    tolerance: "12.50%～13.50%",
    toleranceNum: null,
    tolRange: [12.5, 13.5],
  },
  {
    id: "pm-5",
    stage: "加香",
    name: "加香出口水分不达标次数",
    halfYearValue: "0.8次",
    halfYearPass: true,
    latestValue: "0次",
    latestNum: 0,
    latestNote: "本月",
    recent: "1次",
    recentNum: 1,
    recentNote: "近3个月",
    deviation: "0%",
    tolerance: "≤3次",
    toleranceNum: 3,
  },
  {
    id: "pm-6",
    stage: "卷制",
    name: "烟支单支克重偏差（毫克）",
    halfYearValue: "44mg",
    halfYearPass: false,
    latestValue: "46mg",
    latestNum: 46,
    latestNote: "09-28 白班 乙班",
    recent: "42mg",
    recentNum: 42,
    recentNote: "近10班次",
    deviation: "+15%",
    tolerance: "≤40mg",
    toleranceNum: 40,
  },
  {
    id: "pm-7",
    stage: "卷制",
    name: "非细支单支重量偏差",
    halfYearValue: "3.05%",
    halfYearPass: true,
    latestValue: "3.1%",
    latestNum: 3.1,
    latestNote: "09-28 夜班 甲班",
    recent: "2.97%",
    recentNum: 2.97,
    recentNote: "近10班次",
    deviation: "0%",
    tolerance: "≤3.2%",
    toleranceNum: 3.2,
  },
  {
    id: "pm-8",
    stage: "卷制",
    name: "常规烟支硬度变异系数",
    halfYearValue: "2.52%",
    halfYearPass: true,
    latestValue: "2.4%",
    latestNum: 2.4,
    latestNote: "09-28 夜班 丙班",
    recent: "2.55%",
    recentNum: 2.55,
    recentNote: "近10班次",
    deviation: "0%",
    tolerance: "≤2.6%",
    toleranceNum: 2.6,
  },
  {
    id: "pm-9",
    stage: "卷制",
    name: "中支烟硬度变异系数",
    halfYearValue: "1.42%",
    halfYearPass: true,
    latestValue: "1.09%",
    latestNum: 1.09,
    latestNote: "09-28 白班 丁班",
    recent: "1.43%",
    recentNum: 1.43,
    recentNote: "近10班次",
    deviation: "0%",
    tolerance: "≤1.5%",
    toleranceNum: 1.5,
  },
];

// ============ 智能解读摘要条 + AI 助手 ============

// 智能解读核心结论（3 条短句，引用总览页真实数字）
export const QUALITY_INSIGHT = [
  "近1个月缺陷 58 条、缺陷率 1.84%（环比 ↑0.4pct），小盒杂项部位占 29.3%，Top 缺陷为爆口 9 条。",
  "成品与制丝优质品率均 98.6%，包装卷制质量加权 96.8 分，整体质量结果稳定。",
  "过程管控 7/9 项达标，松散回潮非稳态指数等 3 项近期均值超差，建议优先排查松散回潮工况。",
];

// AI 助手推荐问题（由本页数据分析情况生成，回复走 qa.ts 预设规则）
export const QUALITY_AI_QUESTIONS = [
  "松散回潮非稳态指数逐批走势如何？",
  "烘丝机出口水分偏差高于均值的原因是什么？",
  "小盒轧皱集中在哪些机台与班组？",
];
