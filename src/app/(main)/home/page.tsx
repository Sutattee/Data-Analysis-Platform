"use client";

// 首页（重新设计）：左右布局（左约70% / 右约30%）
// 左侧：快捷入口 + 最近访问（按最近访问时间倒序，可查看/继续处理/移除）
// 右侧：智能能力体验（案例演示/代表样例）+ 问题推荐（热门问题 / 为你推荐 Tab，支持换一换）
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { ABILITY_CARDS, HOT_QUESTION_POOL, RECOMMEND_POOLS, detectBoard } from "@/lib/mock-data/home";
import type { RecentVisit } from "@/types";

// 快捷入口（进入对应功能页；不区分生产/质量/能耗入口，页面默认使用最近访问的板块）
const QUICK_ENTRIES = [
  { label: "智能问数", desc: "自然语言查询业务数据", icon: "💬", href: "/qa" },
  { label: "报告生成", desc: "AI 自动撰写分析报告", icon: "📄", href: "/reports" },
  { label: "指标溯源", desc: "追溯指标定义与数据链路", icon: "🔗", href: "/metric-trace" },
];


// 内容类型（最近访问条目仅展示文字标题，不展示图标）

const PAGE_SIZE = 6; // 每 Tab 展示 6 个问题

export default function HomePage() {
  const router = useRouter();
  const toast = useToast();
  const { state, addRecentVisit, removeRecentVisit } = useApp();

  // 问题推荐：Tab + 轮换偏移（换一换）
  const [tab, setTab] = useState<"hot" | "recommend">("hot");
  const [hotOffset, setHotOffset] = useState(0);
  const [recOffset, setRecOffset] = useState(0);

  // 为你推荐：按最近对话识别关注的业务板块（无历史时展示预设问题）
  const recommendPool = useMemo(() => {
    const recentQuestions = state.history
      .filter((h) => h.role === "user")
      .slice(0, 10)
      .map((h) => h.content);
    return RECOMMEND_POOLS[detectBoard(recentQuestions)];
  }, [state.history]);

  // 近期已提问题（与推荐/热门去重）
  const askedQuestions = useMemo(
    () => new Set(state.history.filter((h) => h.role === "user").map((h) => h.content)),
    [state.history]
  );

  // 从池中取 6 条（偏移轮换 + 与近期已提问题去重）
  function pickQuestions(pool: string[], offset: number): string[] {
    const picked: string[] = [];
    for (let i = 0; i < pool.length * 2 && picked.length < PAGE_SIZE; i++) {
      const q = pool[(offset + i) % pool.length];
      if (!askedQuestions.has(q) && !picked.includes(q)) picked.push(q);
    }
    return picked;
  }

  const hotQuestions = pickQuestions(HOT_QUESTION_POOL, hotOffset);
  const recommendQuestions = pickQuestions(recommendPool, recOffset);
  const activeQuestions = tab === "hot" ? hotQuestions : recommendQuestions;

  // 问题 → 智能问数页自动发起提问（计入业务问数历史）
  function askQuestion(q: string) {
    router.push(`/qa?query=${encodeURIComponent(q)}`);
  }

  // 打开最近访问内容：更新时间并跳转（查看 / 继续处理 / 继续对话）
  function openVisit(v: RecentVisit) {
    addRecentVisit(v);
    router.push(v.route);
  }

  // 移除：仅删除当前账号的最近访问记录，不删除原始内容
  function handleRemove(v: RecentVisit) {
    removeRecentVisit(v.id);
    toast("已从最近访问移除", "success");
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">首页</h1>
      </div>

      {/* 左右布局：左约 70%，右约 30% */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-10">
        {/* ===== 左侧（7/10） ===== */}
        <div className="space-y-4 xl:col-span-7">
          {/* 快捷入口 */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700">快捷入口</h3>
            <div className="grid grid-cols-3 gap-4">
              {QUICK_ENTRIES.map((e) => (
                <Link
                  key={e.href}
                  href={e.href}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
                >
                  <div className="mb-2 text-2xl">{e.icon}</div>
                  <div className="text-sm font-medium text-gray-800">{e.label}</div>
                  <div className="mt-0.5 text-xs text-gray-500">{e.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* 最近访问（表格式列表：标题/所属板块/内容类型/创建人/最近访问时间/操作） */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700">最近访问</h3>
            {state.recentVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-16 text-gray-400">
                <span className="mb-3 text-4xl">🕐</span>
                <p className="text-sm">暂无最近访问记录</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                      <th className="px-4 py-2.5 text-left">标题</th>
                      <th className="px-4 py-2.5 text-left whitespace-nowrap">所属板块</th>
                      <th className="px-4 py-2.5 text-left whitespace-nowrap">内容类型</th>
                      <th className="px-4 py-2.5 text-left whitespace-nowrap">创建人</th>
                      <th className="px-4 py-2.5 text-left whitespace-nowrap">最近访问时间</th>
                      <th className="px-4 py-2.5 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {state.recentVisits.map((v) => (
                      <tr
                        key={v.id}
                        // 点击条目区域直接进入详情/继续处理（操作列仅「移除」）
                        onClick={() => openVisit(v)}
                        className="group cursor-pointer transition-colors hover:bg-primary-50/40"
                      >
                        <td className="px-4 py-3">
                          <span className="block max-w-[320px] truncate font-medium text-gray-800 group-hover:text-primary-600" title={v.title}>
                            {v.title}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-800">{v.board}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{v.contentType}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{v.creator}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{v.lastVisitedAt}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation(); // 移除不触发进入详情
                              handleRemove(v);
                            }}
                            className="rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            title="仅移除访问记录，不删除原始内容"
                          >
                            移除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ===== 右侧（3/10） ===== */}
        <div className="space-y-4 xl:col-span-3">
          {/* 智能能力体验 */}
          <Card padding>
            <h3 className="mb-3 text-sm font-medium text-gray-700">智能能力体验</h3>
            <div className="grid grid-cols-2 gap-3">
              {ABILITY_CARDS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(c.route)}
                  className="rounded-xl border border-gray-100 p-3 text-left transition-all hover:border-primary-200 hover:shadow-md"
                  title="点击进入案例演示（演示不计入问数历史与最近访问）"
                >
                  <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl text-lg ${c.color}`}>
                    {c.icon}
                  </div>
                  <div className="text-xs font-medium text-gray-800">{c.title}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-gray-400">{c.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* 问题推荐（热门问题 / 为你推荐） */}
          <Card padding>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => setTab("hot")}
                  className={`text-sm font-medium transition-colors ${
                    tab === "hot" ? "text-primary-600" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  热门问题
                </button>
                <button
                  onClick={() => setTab("recommend")}
                  className={`text-sm font-medium transition-colors ${
                    tab === "recommend" ? "text-primary-600" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  为你推荐
                </button>
              </div>
              <button
                onClick={() =>
                  tab === "hot" ? setHotOffset((o) => o + PAGE_SIZE) : setRecOffset((o) => o + PAGE_SIZE)
                }
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                🔄 换一换
              </button>
            </div>
            <ul className="space-y-1">
              {activeQuestions.map((q, i) => (
                <li key={q}>
                  <button
                    onClick={() => askQuestion(q)}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
                  >
                    <span className="mt-0.5 flex-shrink-0 font-medium text-primary-400">{i + 1}.</span>
                    <span>{q}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
