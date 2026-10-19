"use client";

import type { Contribution } from "@/lib/mock-data/quality-defect-forecast";

// 条形配色：车间环境单独用青色，其余来源用主色（沿用缺陷预测页既有配色约定）
const barClsOf = (source: string) => (source === "车间环境" ? "bg-cyan-500" : "bg-primary-600");

// 贡献占比展示：整数不带小数位（如 42%），非整数据 1 位小数（如 42.5%）
const pctText = (pct: number) => (pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1));

// 风险贡献度：仅正向贡献、按占比降序（数据层已按 p_i = max(c_i,0) ÷ Σ max(c_j,0) × 100% 排序）；
// 行悬浮展示贡献分 / 来源分类 / 数据来源
export function RiskContributionChart({ items }: { items: Contribution[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="space-y-3">
        {items.map((c) => (
          <div
            key={c.key}
            className="flex items-center gap-3"
            title={`${c.name}：贡献 +${c.score.toFixed(1)} 分｜来源分类：${c.source}｜数据来源：${c.origin}`}
          >
            <div className="w-28 shrink-0 truncate text-xs text-gray-600">{c.name}</div>
            <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
              <div className={`h-full rounded ${barClsOf(c.source)}`} style={{ width: `${Math.max(c.pct, 2)}%` }} />
            </div>
            <div className="w-24 shrink-0 text-right text-xs tabular-nums text-gray-700">
              ＋{c.score.toFixed(1)}分 {pctText(c.pct)}%
            </div>
            <span className="w-16 shrink-0 truncate rounded bg-gray-100 px-1.5 py-0.5 text-center text-[10px] text-gray-500">
              {c.source}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 来源分布：来源分类正向贡献占比汇总（降序）。
// props 沿用旧签名 breakdown（稳定性预测页跨目录复用），value 字段仅占位不展示
export interface BreakdownRow {
  name: string;
  pct: number;
  value?: number;
}

export function SourceBreakdownChart({ breakdown }: { breakdown: BreakdownRow[] }) {
  if (breakdown.length === 0) return null;
  return (
    <div className="space-y-3">
      {breakdown.map((s) => (
        <div key={s.name} className="flex items-center gap-3">
          <div className="w-20 shrink-0 truncate text-xs text-gray-600">{s.name}</div>
          <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
            <div className={`h-full rounded ${barClsOf(s.name)}`} style={{ width: `${Math.max(s.pct, 2)}%` }} />
          </div>
          <div className="w-12 shrink-0 text-right text-xs tabular-nums text-gray-700">{pctText(s.pct)}%</div>
        </div>
      ))}
    </div>
  );
}
