"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { indicatorDataOf, type IndicatorData } from "@/lib/mock-data/expense-indicators";
import { expenseDevRuleOf, expenseAlertRecordFor } from "@/lib/mock-data/expense-alerts";
import { LEVEL_RANK } from "@/lib/mock-data/alert-levels";
import { ExpenseStatusBadge } from "@/components/expense-analysis/ExpenseStatusBadge";

// 列表行最小接口（ExpenseIndicator 结构兼容；可控费用页传 ControllableRow）
export interface IndicatorRowLike {
  id: string;
  dept: string;
  code: string;
  name: string;
}

const th = "text-left px-4 py-3";

// 偏差数值：触发五级告警（|偏差| > 3pct）标红，否则中性灰
function DeviationText({ value }: { value: number }) {
  const abnormal = Math.abs(value) > 3;
  return (
    <span className={abnormal ? "font-medium text-red-600" : "text-gray-600"}>
      {value > 0 ? `+${value}` : value} pct
    </span>
  );
}

// 预算指标 8 列表格（部门 TAB / 部门视图共用；dataOf/detailBase/returnTo 供可控费用页替换取数、详情路由与告警跳转返回页）
export function IndicatorTable({
  indicators, dataOf, detailBase = "/expense/analysis/all/indicator", returnTo,
}: {
  indicators: IndicatorRowLike[];
  dataOf?: (id: string) => IndicatorData;
  detailBase?: string;
  returnTo?: string; // 告警记录详情「返回」回此页（当前费用页完整路径含 query）
}) {
  const router = useRouter();
  const rowOf = dataOf ?? indicatorDataOf;
  // 按告警等级从高到低排序（危险→提示，正常排最后；同级按 |偏差| 大者在前，稳定排序保持同分现序）
  const rankOf = (dev: number) => {
    const rule = expenseDevRuleOf(dev);
    return rule ? LEVEL_RANK[rule.level] : 0; // 正常 = 0（低于全部告警等级）
  };
  const sorted = indicators
    .map((ind, i) => ({ ind, i, dev: rowOf(ind.id).deviation }))
    .sort((a, b) => {
      const ra = rankOf(a.dev);
      const rb = rankOf(b.dev);
      if (ra !== rb) return rb - ra;
      if (Math.abs(a.dev) !== Math.abs(b.dev)) return Math.abs(b.dev) - Math.abs(a.dev);
      return a.i - b.i;
    });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
            <th className={th}>预算指标编码</th>
            <th className={th}>预算指标</th>
            <th className={th}>预算计划（万）</th>
            <th className={th}>实际执行（万）</th>
            <th className={th}>执行率</th>
            <th className={th}>执行进度偏差</th>
            <th className={th}>状态</th>
            <th className={th}>操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map(({ ind }) => {
            const d = rowOf(ind.id);
            return (
              <tr key={ind.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{ind.code}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => router.push(`${detailBase}/${ind.id}`)}
                    className="text-gray-900 hover:text-gray-600 hover:underline"
                  >
                    {ind.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600">{d.budget.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600">{d.executed.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600">{d.rate}%</td>
                <td className="px-4 py-3">
                  <DeviationText value={d.deviation} />
                </td>
                <td className="px-4 py-3">
                  <ExpenseStatusBadge deviation={d.deviation} />
                </td>
                {/* 操作：仅异常状态展示「查看告警详情」蓝色文字链接（跳该指标记录，from 回此页）；正常显示 — */}
                <td className="px-4 py-3">
                  {expenseDevRuleOf(d.deviation) && returnTo ? (
                    <button
                      type="button"
                      className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                      onClick={() => {
                        const rec = expenseAlertRecordFor(ind.name, ind.dept);
                        if (!rec) return;
                        router.push(`/expense/alert/records/${rec.id}?from=${encodeURIComponent(returnTo)}`);
                      }}
                    >
                      查看告警详情
                    </button>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 按部门维度组织：全部部门 TAB 标签 + 点击切换该部门下的预算指标列表（整页滚动查看全部）
export function DeptIndicatorCards({
  indicators, dataOf, detailBase, returnTo,
}: {
  indicators: IndicatorRowLike[];
  dataOf?: (id: string) => IndicatorData;
  detailBase?: string;
  returnTo?: string; // 告警记录详情「返回」回此页（当前费用页完整路径含 query）
}) {
  // 按部门分组（保持首现顺序）
  const groups: { dept: string; list: IndicatorRowLike[] }[] = [];
  const idx = new Map<string, number>();
  for (const n of indicators) {
    const i = idx.get(n.dept);
    if (i === undefined) {
      idx.set(n.dept, groups.length);
      groups.push({ dept: n.dept, list: [n] });
    } else {
      groups[i].list.push(n);
    }
  }

  const [active, setActive] = useState(groups[0]?.dept ?? "");
  const cur = groups.find((g) => g.dept === active) ?? groups[0];
  const rowOf = dataOf ?? indicatorDataOf;

  // 选中部门统计（基于该科目下的指标）
  const rows = cur ? cur.list.map((n) => rowOf(n.id)) : [];
  const budget = rows.reduce((s, r) => s + r.budget, 0);
  const executed = rows.reduce((s, r) => s + r.executed, 0);
  const rate = budget > 0 ? Math.round((executed / budget) * 1000) / 10 : 0;

  if (!cur) return null;

  return (
    <div className="space-y-3">
      {/* 全部部门 TAB：点击切换展示不同部门下的预算指标列表 */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
        {groups.map(({ dept, list }) => {
          const abn = list.filter((n) => rowOf(n.id).status === "异常").length;
          const selected = dept === cur.dept;
          return (
            <button
              key={dept}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selected ? "bg-primary-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setActive(dept)}
            >
              {dept}
              {abn > 0 && (
                <span className={`ml-1 ${selected ? "text-red-100" : "text-red-500"}`}>{abn}⚠</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 选中部门的统计 + 指标列表 */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3">
          <span className="text-sm font-semibold text-gray-800">{cur.dept}</span>
          <span className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{cur.list.length} 个指标</span>
          </span>
          <span className="text-xs text-gray-500">
            合计执行率 <span className="font-medium text-gray-700">{rate}%</span>
          </span>
          <span className="text-xs text-gray-500">
            资金计划应执行 <span className="font-medium text-gray-700">{rows[0]?.planProgress ?? 66.4}%</span>
          </span>
        </div>
        <div className="border-t border-gray-50">
          <IndicatorTable indicators={cur.list} dataOf={dataOf} detailBase={detailBase} returnTo={returnTo} />
        </div>
      </div>
    </div>
  );
}
