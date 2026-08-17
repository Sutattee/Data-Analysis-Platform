// 首页 —— 问题推荐与智能能力体验配置（模拟数据）
// 热门问题：基于近 30 天平台内成功执行问题统计生成（标准化、合并相似问法后的结果集），
// 已排除 Demo 问题 / 测试数据 / 执行失败及低评价问题。

// 热门问题池（每次展示 6 条，支持换一换轮换）
export const HOT_QUESTION_POOL = [
  "本月单箱综合能耗同比变化趋势如何？",
  "制丝车间各产线近 7 天电耗对比情况？",
  "单箱耗烟叶量上升的原因是什么？",
  "卷包车间设备运行效率当前是多少？",
  "各单位产值碳排放量排名情况如何？",
  "天然气消耗与去年同期相比有何变化？",
  "近 30 天告警记录主要集中在哪些车间？",
  "预测下月单箱综合能耗趋势？",
  "优质品率低于目标值的班组有哪些？",
  "空压系统能耗波动的主要影响因素？",
];

// 为你推荐：按板块识别的推荐问题池（结合当前用户最近对话关注的业务板块/指标/分析主题）
export const RECOMMEND_POOLS: Record<"能源消耗" | "生产管理" | "工艺质量" | "default", string[]> = {
  能源消耗: [
    "如何查看单箱综合能耗的月度趋势？",
    "各车间电耗占比分布是怎样的？",
    "天然气消耗异常的原因如何排查？",
    "怎样对比不同车间的能效水平？",
    "碳排放量的计算口径是什么？",
    "预测下月蒸汽消耗量趋势？",
  ],
  生产管理: [
    "如何查看各产线的产量达成率？",
    "卷接设备运行效率如何提升？",
    "本月生产计划完成情况如何？",
    "各牌号产量占比是怎样的？",
    "高架立体库的库存周转情况？",
    "包装产线停机原因如何分析？",
  ],
  工艺质量: [
    "烘丝机出口水分偏差如何控制？",
    "优质品率近 30 天趋势如何？",
    "烟支重量偏差的主要影响因素？",
    "怎样分析切丝宽度的稳定性？",
    "工艺参数调整对质量的影响？",
    "卷接工序废品率如何降低？",
  ],
  default: [
    "如何查看单箱综合能耗的月度趋势？",
    "本月产量同比变化趋势如何？",
    "近 7 天是否有异常波动需要关注？",
    "怎样快速生成一份生产运营月报？",
    "各车间电耗占比分布是怎样的？",
    "优质品率低于标准值该如何分析？",
  ],
};

// 板块关键词（识别当前用户最近对话关注的业务板块）
const BOARD_KEYWORDS: Record<"能源消耗" | "生产管理" | "工艺质量", string[]> = {
  能源消耗: ["能耗", "电耗", "能源", "碳排", "天然气", "蒸汽", "用水"],
  生产管理: ["产量", "生产", "计划", "效率", "达成", "牌号", "库存"],
  工艺质量: ["质量", "水分", "优质品", "废品", "工艺", "偏差", "合格"],
};

// 根据最近对话识别关注的板块（无历史或无法识别时返回 default）
export function detectBoard(recentQuestions: string[]): keyof typeof RECOMMEND_POOLS {
  if (!recentQuestions.length) return "default";
  const joined = recentQuestions.join(" ");
  for (const board of ["能源消耗", "生产管理", "工艺质量"] as const) {
    if (BOARD_KEYWORDS[board].some((k) => joined.includes(k))) return board;
  }
  return "default";
}

// 智能能力体验卡片（点击进入案例演示 / 代表样例）
export interface AbilityCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string; // 图标底色
  route: string; // 演示跳转（qa 演示模式 / 告警代表记录 / 年鉴报告样例）
  demoQuery?: string; // qa 案例演示回放的预设问题
}

export const ABILITY_CARDS: AbilityCard[] = [
  {
    id: "smart-query",
    title: "智能问数",
    desc: "自然语言查询业务数据，实时生成图表与结论",
    icon: "🔢",
    color: "bg-blue-50",
    route: "/qa?demo=1&query=" + encodeURIComponent("本月各机台的卷接和包装设备运行效率分别是多少？"),
  },
  {
    id: "anomaly-alert",
    title: "异常检测与告警",
    desc: "查看具有代表性的告警记录详情",
    icon: "⚠️",
    color: "bg-orange-50",
    route: "/alert/records/YJ20260709004",
  },
  {
    id: "attribution",
    title: "归因分析",
    desc: "多维下钻定位指标波动根因",
    icon: "🔍",
    color: "bg-purple-50",
    route: "/qa?demo=1&query=" + encodeURIComponent("分析单箱耗烟叶量上升5%的原因"),
  },
  {
    id: "trend",
    title: "预测分析",
    desc: "基于历史数据预测关键指标走势",
    icon: "📈",
    color: "bg-green-50",
    route: "/qa?demo=1&query=" + encodeURIComponent("预测下个月的包装产线产量趋势"),
  },
  {
    id: "knowledge",
    title: "知识问答",
    desc: "基于企业知识库的专业知识问答",
    icon: "🧠",
    color: "bg-teal-50",
    route: "/qa?demo=1&query=" + encodeURIComponent("卷接工艺中卷烟机车速一般控制在什么范围？"),
  },
  {
    id: "yearbook",
    title: "年鉴报告",
    desc: "查看预先生成的只读报告样例",
    icon: "📚",
    color: "bg-pink-50",
    route: "/energy/yearbook/reports/YB2025001",
  },
];
