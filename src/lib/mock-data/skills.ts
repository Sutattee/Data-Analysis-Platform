// 技能管理 - 模拟数据
export type SkillCategory = "builtin" | "mine";

export interface Skill {
  id: string;
  name: string;        // 技能标题
  desc: string;        // 一句话简介
  icon: string;        // 卡通图标（emoji）
  color: string;       // 卡通图背景（tailwind 类）
  category: SkillCategory;
  enabled: boolean;
}

// 系统内置：默认全部开启，仅管理员可开关
export const builtinSkills: Skill[] = [
  { id: "b1", name: "智能问数Skill", desc: "用自然语言直接查询业务数据，秒级获得指标与明细结果。", icon: "🔢", color: "bg-blue-50 text-blue-600", category: "builtin", enabled: true },
  { id: "b2", name: "归因分析Skill", desc: "多维下钻定位指标波动的根本原因，层层剖析业务逻辑。", icon: "🔍", color: "bg-purple-50 text-purple-600", category: "builtin", enabled: true },
  { id: "b3", name: "趋势预测Skill", desc: "基于历史数据与模型预测产量、能耗等关键指标未来走势。", icon: "📈", color: "bg-green-50 text-green-600", category: "builtin", enabled: true },
  { id: "b4", name: "知识问答Skill", desc: "基于企业知识库智能检索，快速获取工艺标准与操作规程。", icon: "🧠", color: "bg-teal-50 text-teal-600", category: "builtin", enabled: true },
  { id: "b5", name: "报告生成Skill", desc: "按模板自动撰写专业数据分析报告，一键生成周报月报。", icon: "📝", color: "bg-orange-50 text-orange-600", category: "builtin", enabled: true },
  { id: "b6", name: "仪表盘生成Skill", desc: "根据分析需求自动搭建可视化仪表盘，开箱即用。", icon: "🎛️", color: "bg-pink-50 text-pink-600", category: "builtin", enabled: true },
  { id: "b7", name: "技能生成Skill", desc: "通过自然语言描述自动生成自定义技能，零代码扩展能力。", icon: "🛠️", color: "bg-indigo-50 text-indigo-600", category: "builtin", enabled: true },
];

// 我的技能：用户自建，可创建/编辑/删除/开关
export const mySkills: Skill[] = [
  { id: "m1", name: "销售复盘助手", desc: "按月自动汇总销售数据并生成复盘要点。", icon: "📊", color: "bg-amber-50 text-amber-600", category: "mine", enabled: true },
  { id: "m2", name: "能耗预警技能", desc: "监控能耗指标异常并主动推送预警通知。", icon: "⚡", color: "bg-rose-50 text-rose-600", category: "mine", enabled: false },
  { id: "m3", name: "质量巡检技能", desc: "定时拉取质检数据并生成巡检报告。", icon: "✅", color: "bg-emerald-50 text-emerald-600", category: "mine", enabled: true },
];

export const allSkills: Skill[] = [...builtinSkills, ...mySkills];

// 新建/编辑我的技能时可选的图标与配色
export const SKILL_ICON_OPTIONS = [
  { icon: "🛠️", color: "bg-indigo-50 text-indigo-600" },
  { icon: "📊", color: "bg-amber-50 text-amber-600" },
  { icon: "⚡", color: "bg-rose-50 text-rose-600" },
  { icon: "✅", color: "bg-emerald-50 text-emerald-600" },
  { icon: "🔔", color: "bg-blue-50 text-blue-600" },
  { icon: "📦", color: "bg-purple-50 text-purple-600" },
];
