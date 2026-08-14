"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store/AppContext";
import { Card } from "@/components/ui/Card";

// 快捷入口（仅3个）
const QUICK_ENTRIES = [
  { label: "智能问数",   desc: "自然语言查询业务数据", icon: "💬", href: "/qa" },
  { label: "报告生成",   desc: "AI 自动撰写分析报告",   icon: "📄", href: "/reports" },
  { label: "指标溯源", desc: "追溯指标定义、计算口径与数据链路", icon: "🔗", href: "/metric-trace" },
];

// 热门问题（6条）
const HOT_QUESTIONS = [
  "本月高炉产量同比变化趋势如何？",
  "热轧产线 OEE 效率当前是多少？",
  "冷轧工序能耗与去年同期相比有何变化？",
  "连铸产线最近一周是否有异常波动？",
  "镀锌线成品合格率近 30 天趋势？",
  "各产线能耗占比分布是怎样的？",
];

// 为你推荐（6条）
const RECOMMEND_QUESTIONS = [
  "如何查看热轧工序的能耗同比数据？",
  "怎样快速生成一份生产运营月报？",
  "连铸坯合格率低于标准值该如何分析？",
  "如何对比不同产线的能耗效率？",
  "镀锌线产能利用率如何计算？",
  "怎样设置关键指标的告警阈值？",
];

// AI 能力演示案例（点击直接进入对应演示）
const DEMO_CASES = [
  {
    id: "smart-query",
    title: "智能问数",
    desc: "自然语言查询生产、质量、能耗等业务指标，AI 自动生成分析结论",
    icon: "🔢",
    color: "bg-blue-50 text-blue-600",
    route: "/qa?query=" + encodeURIComponent("本月各产线产量是多少？"),
  },
  {
    id: "attribution",
    title: "归因分析",
    desc: "多维下钻定位指标波动根因，层层剖析数据背后的业务逻辑",
    icon: "🔍",
    color: "bg-purple-50 text-purple-600",
    route: "/qa?query=" + encodeURIComponent("近期良品率下降，请进行归因分析"),
  },
  {
    id: "trend",
    title: "趋势预测",
    desc: "基于历史数据与 AI 模型，预测产量、能耗等关键指标未来走势",
    icon: "📈",
    color: "bg-green-50 text-green-600",
    route: "/qa?query=" + encodeURIComponent("预测下月热轧产线产量趋势"),
  },
  {
    id: "report-gen",
    title: "报告生成",
    desc: "输入需求或选择模板，AI 自动撰写专业数据分析报告",
    icon: "📝",
    color: "bg-orange-50 text-orange-600",
    route: "/reports",
  },
  {
    id: "knowledge",
    title: "知识问答",
    desc: "基于企业知识库的智能检索，快速获取工艺标准与操作规程",
    icon: "🧠",
    color: "bg-teal-50 text-teal-600",
    route: "/qa?query=" + encodeURIComponent("热轧工艺精轧温度如何控制？"),
  },
  {
    id: "dashboard-case",
    title: "仪表盘案例",
    desc: "预设行业数据分析模板，开箱即用的可视化仪表盘体验",
    icon: "📊",
    color: "bg-pink-50 text-pink-600",
    route: "/energy/grid-forecast",
  },
];

export default function HomePage() {
  const { state } = useApp();
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">首页</h1>
      </div>

      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-6 text-white shadow-sm">
        <h2 className="text-lg font-semibold">什邡卷烟厂数智分析平台</h2>
        <p className="text-sm text-primary-50 mt-1">
          融合大模型与企业数据，打造企业专属 AI 数据分析师，让数据真正驱动智能决策。
        </p>
      </div>

      {/* 快捷入口（3个卡片） */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">快捷入口</h3>
        <div className="grid grid-cols-3 gap-4">
          {QUICK_ENTRIES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="text-2xl mb-2">{e.icon}</div>
              <div className="text-sm font-medium text-gray-800">{e.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{e.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* 热门问题 + 为你推荐 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="🔥 热门问题">
          <ul className="space-y-0.5">
            {HOT_QUESTIONS.map((q, i) => (
              <li key={i}>
                <button
                  onClick={() => router.push("/qa")}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors flex items-start gap-2"
                >
                  <span className="text-primary-400 font-medium flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <span>{q}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="💡 为你推荐">
          <ul className="space-y-0.5">
            {RECOMMEND_QUESTIONS.map((q, i) => (
              <li key={i}>
                <button
                  onClick={() => router.push("/qa")}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors flex items-start gap-2"
                >
                  <span className="text-amber-400 font-medium flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <span>{q}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* AI 能力演示 */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">AI 能力演示</h3>
        <div className="grid grid-cols-3 gap-4">
          {DEMO_CASES.map((demo) => (
            <button
              key={demo.id}
              onClick={() => router.push(demo.route)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-primary-200 transition-all text-left"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 ${demo.color}`}
              >
                {demo.icon}
              </div>
              <div className="text-sm font-medium text-gray-800">{demo.title}</div>
              <div className="text-xs text-gray-500 mt-1 leading-relaxed">{demo.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
