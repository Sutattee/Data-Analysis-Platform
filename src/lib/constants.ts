import { NavItem } from "@/types";

// 能源消耗 - 二级导航（左侧纵向，含原智能应用板块全部模块）
const ENERGY_NAV: NavItem[] = [
  { label: "能源总览",       href: "/energy/overview",     icon: "📊" },
  { label: "网格监控",       href: "/energy/grid-monitor", icon: "🖥️" },
  { label: "预测分析", href: "/energy/forecast", icon: "📈", children: [
    { label: "预测总览", href: "/energy/forecast/overview", icon: "📊" },
    { label: "模拟测算", href: "/energy/forecast/scenario", icon: "🧪" },
    { label: "预测记录", href: "/energy/forecast/records",  icon: "📑" },
  ]},
  { label: "重大事件年鉴", href: "/energy/yearbook", icon: "🗓️", children: [
    { label: "事件列表", href: "/energy/yearbook/events",  icon: "📋" },
    { label: "年鉴报告", href: "/energy/yearbook/reports", icon: "📚" },
  ]},
  { label: "告警中心",     href: "/alert", icon: "⚠️", children: [
    { label: "告警记录", href: "/alert/records",    icon: "📋" },
    { label: "告警管理", href: "/alert/management", icon: "🛠️" },
  ]},
  { label: "智能问数", href: "/qa",          icon: "💬" },
  { label: "指标溯源", href: "/metric-trace", icon: "🔗" },
  { label: "报告生成", href: "/reports",     icon: "📄" },
];

// 一级导航（顶部横向）
export const PRIMARY_NAV: NavItem[] = [
  { label: "首页",       href: "/home",         icon: "🏠" },
  { label: "费用预算执行", href: "/expense", icon: "💰", children: [
    { label: "费用总览", href: "/expense/overview", icon: "📊" },
    { label: "费用分析", href: "/expense/analysis", icon: "📈", children: [
      { label: "费用科目", href: "/expense/analysis/all", icon: "🗂️" },
      { label: "部门费用", href: "/expense/analysis/operating-cost", icon: "🏭" },
      { label: "可控费用", href: "/expense/analysis/per-box-cost", icon: "📦" },
    ]},
    { label: "业务构成", href: "/expense/business-composition", icon: "🧾" },
    { label: "告警中心", href: "/expense/alert", icon: "⚠️", children: [
      { label: "告警记录", href: "/expense/alert/records",    icon: "📋" },
      { label: "告警管理", href: "/expense/alert/management", icon: "🛠️" },
    ]},
    { label: "智能问数", href: "/expense/qa", icon: "💬" },
  ], matchPrefixes: ["/expense"] },
  { label: "智能驾驶舱", href: "/cockpit",      icon: "🛰️" },
  { label: "生产管理",   href: "/production",   icon: "🏭", children: [
    { label: "设备运行效率", href: "/production/equipment-efficiency", icon: "⚙️" },
    { label: "辅料消耗", href: "/production/materials", icon: "🧵" },
    { label: "预测分析", href: "/production/forecast",  icon: "📈" },
    { label: "告警中心", href: "/production/alert", icon: "⚠️", children: [
      { label: "告警记录", href: "/production/alert/records",    icon: "📋" },
      { label: "告警管理", href: "/production/alert/management", icon: "🛠️" },
    ]},
    { label: "智能问数", href: "/production/qa", icon: "💬" },
  ], matchPrefixes: ["/production"] },
  { label: "工艺质量",   href: "/quality",      icon: "✅", children: [
    { label: "总览", href: "/quality/overview", icon: "📊" },
    { label: "质量风险预测", href: "/quality/forecast", icon: "📈", children: [
      { label: "稳定性预测", href: "/quality/forecast/stability", icon: "📉" },
      { label: "缺陷预测",   href: "/quality/forecast/defect",    icon: "🔮" },
    ]},
    { label: "工艺参数推荐", href: "/quality/parameter-recommend", icon: "🎚️" },
    { label: "告警中心", href: "/quality/alert", icon: "⚠️" },
    { label: "诊断", href: "/quality/diagnosis", icon: "🩺", children: [
      { label: "缺陷诊断",   href: "/quality/diagnosis/defect",   icon: "🔍" },
      { label: "稳定性诊断", href: "/quality/diagnosis/stability", icon: "📐" },
      { label: "诊断记录",   href: "/quality/diagnosis/records",   icon: "📋" },
    ]},
    { label: "智能问数", href: "/quality/qa", icon: "💬" },
  ], matchPrefixes: ["/quality"] },
  {
    label: "能源消耗",
    href: "/energy",
    icon: "⚡",
    children: ENERGY_NAV,
    matchPrefixes: ["/energy", "/dashboard/energy", "/alert", "/qa", "/metric-trace", "/reports"],
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
      { label: "业务术语",   href: "/settings/biz-term" },
      { label: "业务逻辑",   href: "/settings/biz-logic" },
      { label: "折标系数",   href: "/settings/energy-coefficient" },
      { label: "指标值维护", href: "/settings/metric-value" },
      { label: "标准问答",   href: "/settings/standard-qa" },
      { label: "对话管理",   href: "/settings/conversation" },
    ],
  },
  {
    group: "归因配置",
    items: [
      { label: "归因配置", href: "/settings/attribution" },
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

// 部门管理员演示账号（业务构成页按 dept 过滤本部门预算指标）
export const DEPT_USERS = [
  { id: "u2", username: "bangong", password: "123456", phone: "13800000002", role: "部门管理员", nickname: "厂部办公室管理员", alias: "", email: "bangong@yongshan.com", dept: "厂部办公室" },
  { id: "u3", username: "caiwu",   password: "123456", phone: "13800000003", role: "部门管理员", nickname: "财务科管理员",   alias: "", email: "caiwu@yongshan.com",   dept: "财务科" },
  { id: "u4", username: "juanbao", password: "123456", phone: "13800000004", role: "部门管理员", nickname: "卷包车间管理员", alias: "", email: "juanbao@yongshan.com", dept: "卷包车间" },
];

// 主题色
export const PRIMARY_COLOR = "#2563eb";
