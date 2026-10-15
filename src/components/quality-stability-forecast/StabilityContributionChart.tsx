"use client";

// 风险来源：横向条形图（纯 CSS），仅展示增险因素（φ>0）按占比降序；贡献值单位 = 指标单位

interface ContributionItem {
  key: string;
  name: string;
  phi: number;
  unit: string;
  pct: number;
  sourceLabel: string;
}

// 来源分类配色：车间环境 = cyan，其余（关联工序）= primary
const barCls = (sourceLabel: string) => (sourceLabel === "车间环境" ? "bg-cyan-500" : "bg-primary-600");

export function StabilityContributionChart({
  contributions,
  unit,
  decimals,
}: {
  contributions: ContributionItem[];
  unit: string;
  decimals: number;
}) {
  return (
    <div>
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
              <span className="font-medium text-gray-800">
                ＋{c.phi.toFixed(Math.max(decimals, 1))}
                {c.unit}
              </span>
              <span className="ml-1 text-gray-400">{c.pct}%</span>
            </span>
            <span className="w-14 flex-shrink-0 rounded bg-gray-50 px-1 py-0.5 text-center text-[10px] text-gray-500">
              {c.sourceLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
