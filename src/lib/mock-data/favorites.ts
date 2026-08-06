// 个人中心「我的收藏」模拟数据
// 说明：仅「智能问数」使用真实收藏(state.favorites)，其余三类为模拟展示数据

export type FavoriteType = "qa" | "report" | "dashboard" | "template";

export interface FavoriteItem {
  id: string;
  type: FavoriteType;
  title: string;
  content: string;
  href: string;       // 点击跳转的详情页
  timestamp: number;
}

// 收藏分类 Tab 配置
export const FAVORITE_TABS: { key: FavoriteType; label: string; icon: string }[] = [
  { key: "qa",        label: "智能问数", icon: "💬" },
  { key: "report",    label: "报告",     icon: "📄" },
  { key: "dashboard", label: "仪表盘",   icon: "📊" },
  { key: "template",  label: "分析模板", icon: "🧩" },
];

// 报告类模拟收藏
const MOCK_REPORT_FAVORITES: FavoriteItem[] = [
  {
    id: "fav-report-1",
    type: "report",
    title: "月度生产运营分析报告",
    content: "涵盖高炉、热轧、冷轧等工序的产量、能耗、OEE 综合分析，附归因结论与改进建议。",
    href: "/reports",
    timestamp: 1720000000000,
  },
  {
    id: "fav-report-2",
    type: "report",
    title: "高炉工序能耗周报",
    content: "对比本周与历史能耗趋势，识别焦比、风温等关键参数的异常波动。",
    href: "/reports",
    timestamp: 1719900000000,
  },
  {
    id: "fav-report-3",
    type: "report",
    title: "热轧产线质量月报",
    content: "统计轧制合格率、缺陷分布及主要原因，输出质量改进重点。",
    href: "/reports",
    timestamp: 1719800000000,
  },
];

// 仪表盘类模拟收藏
const MOCK_DASHBOARD_FAVORITES: FavoriteItem[] = [
  {
    id: "fav-dash-1",
    type: "dashboard",
    title: "生产总览仪表盘",
    content: "6 项核心 KPI 实时监控，含日产量、能耗、OEE 趋势与产线状态。",
    href: "/dashboard",
    timestamp: 1720100000000,
  },
  {
    id: "fav-dash-2",
    type: "dashboard",
    title: "能耗分布看板",
    content: "按工序展示能耗占比与同比变化，支持按时间维度下钻。",
    href: "/panel",
    timestamp: 1720000000000,
  },
];

// 分析模板类模拟收藏
const MOCK_TEMPLATE_FAVORITES: FavoriteItem[] = [
  {
    id: "fav-tpl-1",
    type: "template",
    title: "质量异常归因模板",
    content: "标准化质量异常分析流程：现象 → 多维下钻 → 根因 → 改进措施。",
    href: "/settings/report-templates",
    timestamp: 1720050000000,
  },
  {
    id: "fav-tpl-2",
    type: "template",
    title: "设备效率(OEE)分析模板",
    content: " availability × performance × quality 三维度拆解设备综合效率。",
    href: "/settings/report-templates",
    timestamp: 1719950000000,
  },
  {
    id: "fav-tpl-3",
    type: "template",
    title: "能耗同比环比模板",
    content: "对比不同周期、不同工序的能耗水平，定位节能空间。",
    href: "/settings/report-templates",
    timestamp: 1719850000000,
  },
];

// 按类型聚合的模拟收藏
export const MOCK_FAVORITES: Record<Exclude<FavoriteType, "qa">, FavoriteItem[]> = {
  report: MOCK_REPORT_FAVORITES,
  dashboard: MOCK_DASHBOARD_FAVORITES,
  template: MOCK_TEMPLATE_FAVORITES,
};
