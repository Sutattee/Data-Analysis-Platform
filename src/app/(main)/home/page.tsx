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
  {
    label: "智能问数",
    desc: "自然语言查询业务数据",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="3" fill="#3B82F6" />
        <circle cx="8" cy="12" r="1.5" fill="white" />
        <circle cx="12" cy="12" r="1.5" fill="white" />
        <circle cx="16" cy="12" r="1.5" fill="white" />
      </svg>
    ),
    href: "/qa",
  },
  {
    label: "年鉴报告",
    desc: "AI 自动撰写年鉴报告",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
        <rect x="4" y="2" width="16" height="20" rx="2" fill="#8B5CF6" />
        <rect x="7" y="6" width="10" height="2" rx="1" fill="white" />
        <rect x="7" y="10" width="10" height="2" rx="1" fill="white" />
        <rect x="7" y="14" width="6" height="2" rx="1" fill="white" />
      </svg>
    ),
    href: "/energy/yearbook/reports",
  },
  {
    label: "指标溯源",
    desc: "追溯指标定义与数据链路",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
        <circle cx="6" cy="12" r="3" fill="#F59E0B" />
        <circle cx="18" cy="6" r="3" fill="#10B981" />
        <circle cx="18" cy="18" r="3" fill="#EF4444" />
        <path d="M9 12L15 7" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 12L15 17" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    href: "/metric-trace",
  },
];

// 内容类型图标映射（彩色色块矢量图标）
const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  智能问数对话: (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="3" width="16" height="14" rx="2.5" fill="#3B82F6" />
      <circle cx="7" cy="10" r="1" fill="white" />
      <circle cx="10" cy="10" r="1" fill="white" />
      <circle cx="13" cy="10" r="1" fill="white" />
    </svg>
  ),
  预测分析记录: (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="2.5" fill="#8B5CF6" />
      <path d="M5 14L8 10L11 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  告警记录: (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="2.5" fill="#F59E0B" />
      <path d="M10 6V11" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="14" r="1" fill="white" />
    </svg>
  ),
  重大事件记录: (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="2.5" fill="#EF4444" />
      <path d="M10 7L10 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="15.5" r="1" fill="white" />
    </svg>
  ),
  年度报告: (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2" fill="#10B981" />
      <rect x="6" y="5" width="8" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="8" width="8" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="11" width="5" height="1.5" rx="0.75" fill="white" />
    </svg>
  ),
  普通报告: (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2" fill="#06B6D4" />
      <rect x="6" y="5" width="8" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="8" width="8" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="11" width="5" height="1.5" rx="0.75" fill="white" />
    </svg>
  ),
};

// 允许展示的内容类型（其余过滤掉）
const ALLOWED_CONTENT_TYPES = [
  "智能问数对话",
  "预测分析记录",
  "告警记录",
  "重大事件记录",
  "年度报告",
  "普通报告",
];

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
                  <div className="mb-2">{e.icon}</div>
                  <div className="text-sm font-medium text-gray-800">{e.label}</div>
                  <div className="mt-0.5 text-xs text-gray-500">{e.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* 最近访问（表格式列表：标题/所属板块/内容类型/创建人/最近访问时间/操作） */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700">最近访问</h3>
            {state.recentVisits.filter((v) => ALLOWED_CONTENT_TYPES.includes(v.contentType)).length === 0 ? (
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
                    {state.recentVisits
                      .filter((v) => ALLOWED_CONTENT_TYPES.includes(v.contentType))
                      .map((v) => (
                        <tr
                          key={v.id}
                          onClick={() => {
                            addRecentVisit(v);
                            router.push(v.route);
                          }}
                          className="group cursor-pointer transition-colors hover:bg-primary-50/40"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="flex-shrink-0">{CONTENT_TYPE_ICONS[v.contentType]}</span>
                              <span className="block max-w-[320px] truncate font-medium text-gray-800 group-hover:text-primary-600" title={v.title}>
                                {v.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-800">{v.board}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">{v.contentType}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">{v.creator}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{v.lastVisitedAt}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
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
              {ABILITY_CARDS.map((c) => {
                const iconMap: Record<string, React.ReactNode> = {
                  "smart-query": (
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                      <rect x="2" y="3" width="16" height="14" rx="2.5" fill="#3B82F6" />
                      <rect x="5" y="7" width="2" height="6" rx="0.5" fill="white" />
                      <rect x="9" y="9" width="2" height="4" rx="0.5" fill="white" />
                      <rect x="13" y="6" width="2" height="7" rx="0.5" fill="white" />
                    </svg>
                  ),
                  "anomaly-alert": (
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                      <rect x="2" y="2" width="16" height="16" rx="2.5" fill="#F59E0B" />
                      <path d="M10 5V11" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="10" cy="14" r="1.2" fill="white" />
                    </svg>
                  ),
                  attribution: (
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                      <rect x="2" y="2" width="16" height="16" rx="2.5" fill="#8B5CF6" />
                      <circle cx="10" cy="10" r="4" stroke="white" strokeWidth="1.5" fill="none" />
                      <path d="M13 13L16 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ),
                  trend: (
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                      <rect x="2" y="2" width="16" height="16" rx="2.5" fill="#10B981" />
                      <path d="M5 14L8 10L11 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="15" cy="6" r="1.2" fill="white" />
                    </svg>
                  ),
                  knowledge: (
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                      <rect x="2" y="2" width="16" height="16" rx="2.5" fill="#06B6D4" />
                      <circle cx="10" cy="8" r="3" stroke="white" strokeWidth="1.5" fill="none" />
                      <path d="M8 13L10 15L12 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  yearbook: (
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                      <rect x="3" y="2" width="14" height="16" rx="2" fill="#EC4899" />
                      <rect x="6" y="5" width="8" height="1.5" rx="0.75" fill="white" />
                      <rect x="6" y="8" width="8" height="1.5" rx="0.75" fill="white" />
                      <rect x="6" y="11" width="5" height="1.5" rx="0.75" fill="white" />
                    </svg>
                  ),
                };
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(c.route)}
                    className="rounded-xl border border-gray-100 p-3 text-left transition-all hover:border-primary-200 hover:shadow-md"
                  >
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
                      {iconMap[c.id]}
                    </div>
                    <div className="text-xs font-medium text-gray-800">{c.title}</div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-gray-400">{c.desc}</div>
                  </button>
                );
              })}
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
                    onClick={() => router.push(`/qa?query=${encodeURIComponent(q)}`)}
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
