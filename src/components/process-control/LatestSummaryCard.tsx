"use client";

// 最新监测摘要卡：展示 4 项口径（实际值 / 管控值 / 超限比例 / 期间最高等级），全部随
// 筛选条件（统计周期/牌号/机台/班组等）联动。实际值 = 筛选范围内全部记录的均值；
// 超限比例 = 均值相对管控值的偏离比例（与单条记录同公式）；
// 期间最高等级 = 范围内出现过的最高告警等级（不代表全部批次或当前仍异常），
// 全部正常时显示绿色「正常」；未配置管控规则或无记录时对应项显示「—」。
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { severityOf } from "@/lib/mock-data/quality-stability-forecast";
import type { AlertLevel } from "@/types";
import { overPctOf, type MonitorRecord, type ProcessDetailMetric } from "@/lib/mock-data/process-control-detail";

export function LatestSummaryCard({ metric, records }: { metric: ProcessDetailMetric; records: MonitorRecord[] }) {
  const hasRule = metric.rule !== null;
  // 实际值 = 范围内记录均值（不同统计周期/维度筛选下数值不同）
  const avg = records.length ? records.reduce((s, r) => s + r.value, 0) / records.length : null;
  const overPct = avg !== null ? overPctOf(avg, metric) : "—";
  const pctCls = overPct === "—" ? "text-gray-300" : overPct === "0%" ? "text-gray-900" : "text-red-600";
  // 期间最高等级：范围内命中过的最高等级（severityOf 比较），全部正常为 null
  const maxLevel: AlertLevel | null = records.reduce<AlertLevel | null>((acc, r) => {
    if (!r.level) return acc;
    return !acc || severityOf(r.level) > severityOf(acc) ? r.level : acc;
  }, null);

  const items = [
    {
      label: "实际值",
      node: avg !== null ? (
        <p className="text-lg font-semibold text-gray-900">
          {avg.toFixed(metric.decimals)}
          {metric.unit}
        </p>
      ) : (
        <p className="text-lg font-semibold text-gray-300">—</p>
      ),
    },
    {
      label: "管控值",
      node: (
        <p className={`text-lg font-semibold ${metric.control.text === "待配置" ? "text-gray-300" : "text-gray-900"}`}>
          {metric.control.text}
        </p>
      ),
    },
    {
      label: "超限比例",
      node: <p className={`text-lg font-semibold ${pctCls}`}>{overPct}</p>,
    },
    {
      label: "期间最高等级",
      node: !hasRule ? (
        <p className="text-lg font-semibold text-gray-300">—</p>
      ) : records.length === 0 ? (
        <p className="text-lg font-semibold text-gray-300">—</p>
      ) : maxLevel ? (
        <AlertLevelBadge level={maxLevel} />
      ) : (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
          正常
        </span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">{it.label}</p>
          <div className="mt-1.5">{it.node}</div>
        </div>
      ))}
    </div>
  );
}
