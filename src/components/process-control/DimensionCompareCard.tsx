"use client";

// 多维度对比卡：牌号/机台/班组对比页签置于卡片标题右侧（按指标能力开放，切换仅改变
// 分组维度、保留当前筛选）；正文为汇总表——按对比对象统计可判定记录数（含未判定提示）/
// 异常记录数 / 异常占比 / 指标对比值（注明结果均值口径）/ 组内最高告警等级。
// 口径：异常 = 命中等级（超管控值）；可判定 = 已配置规则；分母为 0 显示「—」；
// 按原生监测单元（单条监测记录）去重计数。
// 排序：异常占比降序（无法判定视为最低）→ 异常记录数降序 → 对比对象名称。
import { useState } from "react";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { Card } from "@/components/ui/Card";
import { severityOf } from "@/lib/mock-data/quality-stability-forecast";
import type { AlertLevel } from "@/types";
import type { CompareDim, MonitorRecord, ProcessDetailMetric } from "@/lib/mock-data/process-control-detail";

const DIM_LABEL: Record<CompareDim, string> = { brand: "牌号对比", machine: "机台对比", shift: "班组对比" };
const DIM_ORDER: CompareDim[] = ["brand", "machine", "shift"];

interface AggRow {
  name: string;
  judged: number; // 可判定记录数（已配置规则）
  unjudged: number; // 未判定记录数（未配置规则）
  abnormal: number; // 异常记录数（命中等级）
  ratio: number | null; // 异常占比 = 异常 ÷ 可判定 × 100%；分母 0 = null（—）
  avg: string; // 指标对比值 = 组内结果均值（注明口径）
  maxLevel: AlertLevel | null; // 组内最高有效告警等级
}

function aggregate(metric: ProcessDetailMetric, records: MonitorRecord[], dim: CompareDim): AggRow[] {
  const groups = new Map<string, MonitorRecord[]>();
  for (const r of records) {
    const key = dim === "shift" ? (r.shiftGroup ?? "—") : dim === "machine" ? r.machine : r.brand;
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }
  return Array.from(groups.entries())
    .map(([name, recs]) => {
      let judged = 0;
      let unjudged = 0;
      let abnormal = 0;
      let sum = 0;
      let maxLevel: AlertLevel | null = null;
      for (const r of recs) {
        sum += r.value;
        if (!metric.rule) unjudged += 1;
        else {
          judged += 1;
          if (r.level !== null) abnormal += 1;
          if (r.level && severityOf(r.level) > severityOf(maxLevel)) maxLevel = r.level;
        }
      }
      return {
        name,
        judged,
        unjudged,
        abnormal,
        ratio: judged > 0 ? Math.round((abnormal / judged) * 1000) / 10 : null,
        avg: `${(sum / recs.length).toFixed(metric.decimals)}${metric.unit}`,
        maxLevel,
      };
    })
    .sort((a, b) => {
      const ra = a.ratio ?? -1;
      const rb = b.ratio ?? -1;
      if (rb !== ra) return rb - ra;
      if (b.abnormal !== a.abnormal) return b.abnormal - a.abnormal;
      return a.name.localeCompare(b.name, "zh");
    });
}

export function DimensionCompareCard({ metric, records }: { metric: ProcessDetailMetric; records: MonitorRecord[] }) {
  const tabs = DIM_ORDER.filter((d) => metric.compareDims.includes(d));
  const [dim, setDim] = useState<CompareDim>(tabs[0] ?? "brand");
  const active = tabs.includes(dim) ? dim : (tabs[0] ?? "brand");
  const rows = aggregate(metric, records, active);
  const pendingConfig = metric.rule === null;
  const avgNote = metric.cycle === "批" ? "批次结果均值" : metric.cycle === "班" ? "班次结果均值" : "月度均值";

  return (
    <Card
      title="多维度对比"
      headerRight={
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDim(t)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                active === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {DIM_LABEL[t]}
            </button>
          ))}
        </div>
      }
    >
      {/* 汇总表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-3 py-2 font-medium whitespace-nowrap">对比对象</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">可判定记录数</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">异常记录数</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">异常占比</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">指标对比值（{avgNote}）</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">最高等级</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-gray-50/60">
                <td className="px-3 py-2 font-medium whitespace-nowrap text-gray-800">{r.name}</td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                  {r.judged}
                  {r.unjudged > 0 && (
                    <span className="ml-1 text-[11px] text-gray-400">另有未判定 {r.unjudged} 条</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-700">{r.abnormal}</td>
                <td className={`px-3 py-2 whitespace-nowrap ${r.ratio && r.ratio > 0 ? "font-medium text-red-600" : "text-gray-700"}`}>
                  {r.ratio === null ? "—" : `${r.ratio}%`}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-700">{r.avg}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.maxLevel ? <AlertLevelBadge level={r.maxLevel} /> : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">
                  当前筛选范围内无监测记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pendingConfig && (
        <p className="mt-2 text-xs text-gray-400">该指标管控规则待配置：记录均未判定，异常统计显示「—」。</p>
      )}
    </Card>
  );
}
