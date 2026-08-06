// 智能问数结构化回答案例（4 段式：查询结果 / 基础数据解读 / 推荐图表 / 数据说明）—— 卷烟厂
export type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "table";

export interface SmartQueryCase {
  id: string;
  keywords: string[];
  title: string;
  summary: string;                 // 简短摘要（用于历史/收藏展示）
  queryResult: string;             // 1. 查询结果（markdown 表格）
  interpretation: string;          // 2. 基础数据解读
  chartReason: string;             // 3. 推荐图表理由
  dataNotes: string;               // 4. 数据说明
  recommendedChart: ChartType;
  availableCharts: ChartType[];
  followUps: string[];
}

export const smartQueryCases: SmartQueryCase[] = [
  {
    id: "equipment-eff",
    title: "各机台设备运行效率",
    keywords: ["运行效率", "设备", "机台", "卷接", "包装"],
    summary: "📊 已为您查询各机台设备运行效率数据（共 6 条），详见下方结构化结果。",
    queryResult: `| 机台 | 工序 | 运行效率(%) |
|------|------|------------|
| 卷接机1号 | 卷接 | 90.1 |
| 卷接机3号 | 卷接 | 89.0 |
| 卷接机2号 | 卷接 | 88.4 |
| 包装机1号 | 包装 | 88.2 |
| 包装机3号 | 包装 | 87.6 |
| 包装机2号 | 包装 | 86.8 |`,
    interpretation:
      "各机台设备运行效率整体处于 86.8%~90.1% 区间。卷接机1号最高（90.1%），包装机2号偏低（86.8%），建议关注其运行状态与停机原因。",
    chartReason:
      "推荐柱状图：适合直观对比各机台运行效率，快速识别高低差异；也可切换为折线图查看趋势。",
    dataNotes:
      "统计口径：实际运行时间 / 计划时间 × 100%；时间范围：今日；筛选条件：卷接、包装工序全部机台；数据更新时间：每班次（8 小时）同步。",
    recommendedChart: "bar",
    availableCharts: ["line", "pie", "table"],
    followUps: ["各机台运行效率近一周趋势如何？", "包装机2号运行效率偏低的原因？", "卷接与包装工序效率对比如何？"],
  },
  {
    id: "material-consume",
    title: "单箱物耗",
    keywords: ["物耗", "消耗", "烟叶", "嘴棒", "盘纸", "商标纸", "单箱"],
    summary: "📦 已为您查询单箱物料消耗数据（共 4 类），详见下方结构化结果。",
    queryResult: `| 物料类型 | 单箱消耗 | 单位 |
|---------|---------|------|
| 烟叶 | 38.5 | 公斤/箱 |
| 嘴棒 | 12,000 | 支/箱 |
| 盘纸 | 1,850 | 米/箱 |
| 商标纸 | 2,500 | 张/箱 |`,
    interpretation:
      "各物料单箱消耗均在目标值附近。烟叶 38.5 公斤/箱（目标 38），略高于目标，建议关注切丝宽度与烟支重量控制。",
    chartReason:
      "推荐柱状图：适合对比各类物料单箱消耗；因各单位不同，建议结合目标值评估达标情况。",
    dataNotes:
      "统计口径：物料消耗量 / 合格产量（箱）；时间范围：今日；筛选条件：主要原辅材料；数据更新时间：每日 08:00 同步前一日数据。",
    recommendedChart: "bar",
    availableCharts: ["line", "pie", "table"],
    followUps: ["单箱耗烟叶量近一月趋势如何？", "各牌号物耗差异如何？", "有哪些降低物耗的改进措施？"],
  },
  {
    id: "quality",
    title: "优质品率",
    keywords: ["优质品", "质量", "良品", "合格", "优质"],
    summary: "✅ 已为您查询各工序优质品率数据（共 3 条），详见下方结构化结果。",
    queryResult: `| 工序 | 优质品率(%) |
|------|-----------|
| 制丝 | 94.8 |
| 卷接 | 92.5 |
| 包装 | 91.2 |`,
    interpretation:
      "各工序优质品率均在 91% 以上，制丝工序最高（94.8%），包装工序相对偏低（91.2%），主要受空头、漏气等缺陷影响。",
    chartReason:
      "推荐柱状图：适合横向对比各工序优质品率高低；也可切换折线图查看趋势（需选择时间维度）。",
    dataNotes:
      "统计口径：优质品数 / 总产品数 × 100%；时间范围：今日；筛选条件：按工序汇总；数据更新时间：每批次同步。",
    recommendedChart: "bar",
    availableCharts: ["line", "pie", "table"],
    followUps: ["主要缺陷类型有哪些？", "包装工序优质品率偏低的原因？", "近一周优质品率趋势如何？"],
  },
  {
    id: "energy",
    title: "单箱综合能耗",
    keywords: ["能耗", "能源", "标煤", "电", "综合能耗"],
    summary: "⚡ 已为您查询各工序单箱综合能耗数据（共 5 条），详见下方结构化结果。",
    queryResult: `| 工序 | 单箱能耗(公斤标煤/箱) | 占比(%) |
|------|---------------------|--------|
| 制丝 | 4.5 | 35.2 |
| 卷接 | 3.6 | 28.1 |
| 包装 | 2.3 | 18.0 |
| 动力 | 1.5 | 11.7 |
| 其他 | 0.9 | 7.0 |`,
    interpretation:
      "全厂单箱综合能耗 12.8 公斤标煤/箱，较上月下降 0.4。制丝工序能耗占比最高（35.2%），是节能重点。",
    chartReason:
      "推荐饼图：适合展示各工序能耗占比构成；也可切换柱状图对比单箱能耗数值。",
    dataNotes:
      "统计口径：综合能耗（各类能源折标煤）/ 合格产量（箱）；时间范围：本月累计；筛选条件：全厂各工序汇总；数据更新时间：每日 08:00 同步。",
    recommendedChart: "pie",
    availableCharts: ["bar", "table", "line"],
    followUps: ["各工序能耗占比如何？", "近 30 天单箱能耗趋势如何？", "有哪些节能优化措施？"],
  },
  {
    id: "production-eff",
    title: "生产效率",
    keywords: ["生产效率", "产量", "计划", "完成", "达成"],
    summary: "🏭 已为您查询今日生产效率数据，详见下方结构化结果。",
    queryResult: `| 指标 | 数值 |
|------|------|
| 实际产量 | 6,580 箱 |
| 计划产量 | 6,800 箱 |
| 生产效率 | 96.8% |
| 达成率排名 | 卷接 > 包装 |`,
    interpretation:
      "今日生产效率 96.8%，实际产量 6,580 箱，较计划少 220 箱，主要因包装机2号短暂停机影响。整体达成情况良好。",
    chartReason:
      "推荐饼图：适合展示实际/计划占比；也可切换柱状图对比产量数值。",
    dataNotes:
      "统计口径：实际产量 / 计划产量 × 100%；时间范围：今日 00:00 至当前；筛选条件：全厂卷接+包装合计；数据更新时间：每 5 分钟同步。",
    recommendedChart: "pie",
    availableCharts: ["bar", "table"],
    followUps: ["未完成计划的原因是什么？", "本月生产效率趋势如何？", "各机台产量贡献如何？"],
  },
];

// 归因/预测类关键词（这类问题不走智能问数 4 段结构，交给原有逻辑）
const NON_SMART_KEYWORDS = ["归因", "预测", "原因", "为什么", "分析", "下钻", "根因", "趋势"];

/**
 * 匹配智能问数案例：返回命中的案例；归因/预测类问题不匹配。
 */
export function matchSmartQuery(input: string): SmartQueryCase | null {
  const lower = input.toLowerCase();
  if (NON_SMART_KEYWORDS.some((kw) => lower.includes(kw))) return null;

  let best: { score: number; case: SmartQueryCase } | null = null;
  for (const c of smartQueryCases) {
    let score = 0;
    for (const kw of c.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, case: c };
    }
  }
  return best?.case ?? null;
}
