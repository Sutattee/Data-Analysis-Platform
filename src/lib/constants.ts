import { NavItem } from "@/types";

// 能源消耗 - 二级导航（左侧纵向）
const ENERGY_NAV: NavItem[] = [
  { label: "能源总览",       href: "/energy/overview",     icon: "📊" },
  { label: "网格监控",       href: "/energy/grid-monitor", icon: "🖥️" },
  { label: "预测分析", href: "/energy/forecast", icon: "📈", children: [
    { label: "预测总览", href: "/energy/forecast/overview", icon: "📊" },
    { label: "情景预测", href: "/energy/forecast/scenario", icon: "🧪" },
    { label: "预测记录", href: "/energy/forecast/records",  icon: "📑" },
  ]},
  { label: "告警中心",     href: "/alert", icon: "⚠️", children: [
    { label: "告警记录", href: "/alert/records",    icon: "📋" },
    { label: "告警管理", href: "/alert/management", icon: "🛠️" },
  ]},
  { label: "重大事件年鉴", href: "/energy/yearbook", icon: "🗓️", children: [
    { label: "事件列表", href: "/energy/yearbook/events",  icon: "📋" },
    { label: "年鉴报告", href: "/energy/yearbook/reports", icon: "📚" },
  ]},
  { label: "智能问数", href: "/qa",          icon: "💬" },
  { label: "指标溯源", href: "/metric-trace", icon: "🔗" },
  { label: "报告生成", href: "/reports",     icon: "📄" },
];

// 一级导航（顶部横向）
export const PRIMARY_NAV: NavItem[] = [
  { label: "首页",       href: "/home",         icon: "🏠" },
  { label: "智能驾驶舱", href: "/cockpit",      icon: "🛰️" },
  { label: "生产管理",   href: "/production",   icon: "🏭" },
  { label: "工艺质量",   href: "/quality",      icon: "✅" },
  {
    label: "能源消耗",
    href: "/energy",
    icon: "⚡",
    children: ENERGY_NAV,
    // 能源组二级路由分散在多个前缀，需显式声明用于一级激活态判断
    matchPrefixes: ["/energy", "/dashboard/energy", "/qa", "/metric-trace", "/reports", "/alert"],
  },
  { label: "大模型平台", href: "/llm-platform", icon: "🧠" },
];

// 管理后台二级导航（配置中心）
export interface SettingsNavGroup {
  group: string;
  items: { label: string; href: string }[];
}

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    group: "系统配置",
    items: [
      { label: "数据源",     href: "/settings/data-source" },
      { label: "元数据管理", href: "/settings/metadata" },
      { label: "指标管理",   href: "/settings/metric-management" },
      { label: "对象管理",   href: "/settings/object-management" },
      { label: "业务术语",   href: "/settings/biz-term" },
      { label: "业务逻辑",   href: "/settings/biz-logic" },
      { label: "折标系数",   href: "/settings/energy-coefficient" },
      { label: "对话管理",   href: "/settings/conversation" },
    ],
  },
  {
    group: "归因配置",
    items: [
      { label: "能源管理", href: "/settings/attribution/energy" },
      { label: "生产管理", href: "/settings/attribution/production" },
      { label: "工艺质量", href: "/settings/attribution/quality" },
    ],
  },
];

// AI演示卡片
export const DEMO_CARDS = [
  { id: "smart-query",  title: "智能问数",   description: "自然语言查询数据指标",       icon: "🔢", category: "smart-query" },
  { id: "attribution",  title: "归因分析",   description: "多维下钻定位波动根因",       icon: "🔍", category: "attribution" },
  { id: "trend",        title: "趋势预测",   description: "基于历史数据预测未来趋势",   icon: "📈", category: "trend" },
  { id: "anomaly",      title: "异常检测",   description: "智能识别生产数据异常波动",   icon: "⚠️", category: "anomaly" },
  { id: "report-gen",   title: "报告生成",   description: "AI自动撰写数据分析报告",     icon: "📝", category: "report-gen" },
  { id: "knowledge",    title: "知识问答",   description: "基于企业知识库的智能问答",   icon: "🧠", category: "knowledge" },
] as const;

// 默认用户
export const DEFAULT_USER = {
  username: "admin",
  password: "admin123",
  phone: "13800000001",
  role: "管理员",
  nickname: "管理员",
  alias: "",
  email: "admin@yongshan.com",
};

// 主题色
export const PRIMARY_COLOR = "#2563eb";
