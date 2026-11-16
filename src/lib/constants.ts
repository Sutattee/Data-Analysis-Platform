import { NavItem } from "@/types";

// 一级导航（左侧纵向菜单）
export const PRIMARY_NAV: NavItem[] = [
  { label: "智能问数", href: "/qa", icon: "💬" },
  { label: "告警中心", href: "/quality/alert", icon: "⚠️", children: [
    { label: "告警记录", href: "/quality/alert/records",    icon: "📋" },
    { label: "告警管理", href: "/quality/alert/management", icon: "🛠️" },
  ]},
  { label: "指标溯源", href: "/metric-trace", icon: "🔗" },
  { label: "仪表盘问数", href: "/energy/overview", icon: "📊" },
];

// 管理后台二级导航（配置中心）
export interface SettingsNavGroup {
  group: string;
  items: { label: string; href: string }[];
}

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    group: "数据管理",
    items: [
      { label: "数据源",     href: "/settings/data-source" },
      { label: "元数据管理", href: "/settings/metadata" },
      { label: "指标管理",   href: "/settings/metric-management" },
      { label: "业务术语",   href: "/settings/biz-term" },
      { label: "业务逻辑",   href: "/settings/biz-logic" },
      { label: "标准问答",   href: "/settings/standard-qa" },
      { label: "归因配置",   href: "/settings/attribution" },
      { label: "报告模板",   href: "/settings/report-templates" },
    ],
  },
  {
    group: "系统配置",
    items: [
      { label: "对话管理",   href: "/settings/conversation" },
    ],
  },
];

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
