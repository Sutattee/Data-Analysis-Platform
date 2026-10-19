"use client";

// 风险来源 / 来源工序分布：横向条形图（纯 CSS 实现，每行需并排展示贡献值、占比、来源分类）

interface ContributionItem {
  key: string;
  name: string;
  unit: string;
  phi: number;
  pct: number;
  sourceLabel: string;
}
interface BreakdownItem {
  name: string;
  pct: number;
  value: number;
}

type Contribution = ContributionItem[];
type Breakdown = BreakdownItem[];

// 来源分类配色：工序参数 = primary / 车间环境 = cyan
const barCls = (sourceLabel: string) => (sourceLabel === "车间环境" ? "bg-cyan-500" : "bg-primary-600");

// 风险来源：各参数风险贡献从高到低（仅 φ>0 进入排序；行内展示 贡献值 / 占比 / 来源分类）
export function RiskContributionChart({ contributions }: { contributions: Contribution }) {
  if (contributions.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">本轮无增险参数贡献</div>;
  }
  return (
    <div className="space-y-2.5">
      {contributions.map((c) => (
        <div key={c.key} className="flex items-center gap-2">
          <span className="w-20 flex-shrink-0 truncate text-xs text-gray-600" title={c.name}>
            {c.name}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-md bg-gray-100">
            <div
              className={`h-full rounded-md ${barCls(c.sourceLabel)} transition-all`}
              style={{ width: `${Math.max(c.pct, 2)}%` }}
            />
          </div>
          <span className="w-28 flex-shrink-0 text-right text-xs whitespace-nowrap">
            <span className="font-medium text-gray-800">＋{c.phi.toFixed(3)}</span>
            <span className="ml-1 text-gray-400">{c.pct}%</span>
          </span>
          <span className="w-14 flex-shrink-0 rounded bg-gray-50 px-1 py-0.5 text-center text-[10px] text-gray-500">
            {c.sourceLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

// 来源工序分布：按来源分类汇总正向贡献占比（包装 / 卷接 + 车间环境）
export function SourceBreakdownChart({ breakdown }: { breakdown: Breakdown }) {
  return (
    <div className="space-y-3">
      {breakdown.map((b) => (
        <div key={b.name} className="flex items-center gap-3">
          <span className="w-16 flex-shrink-0 text-xs text-gray-600">{b.name}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-md bg-gray-100">
            <div
              className={`h-full rounded-md ${barCls(b.name)} transition-all`}
              style={{ width: `${Math.max(b.pct, 2)}%` }}
            />
          </div>
          <span className="w-20 flex-shrink-0 text-right text-xs whitespace-nowrap">
            <span className="font-medium text-gray-800">{b.pct}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// 风险降低因素：φ<0 的参数（不进来源排序，单独文字展示）
export function ReducingFactors({ factors }: { factors: { key: string; name: string; phi: number }[] }) {
  if (factors.length === 0) return null;
  return (
    <p className="text-xs text-green-600">
      风险降低因素：{factors.map((r) => `${r.name}（${r.phi.toFixed(3)}）`).join("、")}
    </p>
  );
}
