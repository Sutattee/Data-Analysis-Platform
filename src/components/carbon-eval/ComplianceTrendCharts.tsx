"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from "recharts";
import { Card } from "@/components/ui/Card";
import { getComplianceTrend, complianceMeta, COMPLIANCE_TYPES } from "@/lib/mock-data/carbon-eval";
import { GRADE_STYLE, type AnomalyDetail } from "@/lib/mock-data/grid-forecast";

const OBJECTS = ["全厂", "动力车间", "制丝车间", "卷包车间"];
const selectCls =
  "px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";

function buildComplianceAnomaly(meta: { label: string; unit: string; limit: number; lowerIsBetter: boolean }, p: any): AnomalyDetail {
  const over = meta.lowerIsBetter ? p.actual > meta.limit : p.actual < meta.limit;
  return {
    title: `${meta.label}异常`,
    metricName: meta.label,
    current: `${p.actual} ${meta.unit}`,
    baseline: `${meta.limit} ${meta.unit}`,
    deviation: `${over ? (meta.lowerIsBetter ? "超出上限" : "低于标准") : "符合方向"} ${Math.abs(p.actual - meta.limit).toFixed(2)}${meta.unit}`,
    triggerTime: p.date,
    duration: "1小时10分钟",
    cause: `${meta.label}偏离标准区间，需排查相关工序与处理设施。`,
    suggestion: "核查排放处理设施运行状态，调整工艺参数以恢复合规。",
    level: "告警",
  };
}

export function ComplianceTrendCharts({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  const [object, setObject] = useState("全厂");

  function handleClick(type: "perBoxCOD" | "waterReuse" | "cod", data: any[], e: any) {
    if (!e?.activeLabel) return;
    const pt = data.find((d) => d.date === e.activeLabel);
    if (pt?.anomaly) onAnomaly(buildComplianceAnomaly(complianceMeta(type), pt));
  }

  return (
    <Card
      title="📊 环保合规指标趋势"
      headerRight={
        <select className={selectCls} value={object} onChange={(e) => setObject(e.target.value)}>
          {OBJECTS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {COMPLIANCE_TYPES.map((type) => {
          const meta = complianceMeta(type);
          const data = getComplianceTrend(type);
          return (
            <div key={type}>
              <div className="mb-1 text-xs text-gray-500">
                {meta.label}（{meta.unit}）
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} onClick={(e: any) => handleClick(type, data, e)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={1} />
                  <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" width={40} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} labelFormatter={(label) => `${label}`} formatter={(v: any, n: any) => [v, ({ actual: "实际值", limit: "目标值" } as Record<string, string>)[n as string] ?? n]} />
                  <ReferenceLine y={meta.limit} stroke="#f97316" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                  {/* 当前异常点：一般/预警/危险 → 黄/橙/红 */}
                  {data
                    .filter((d) => d.anomalyGrade)
                    .map((d) => (
                      <ReferenceDot key={d.date} x={d.date} y={d.actual} r={4} fill={GRADE_STYLE[d.anomalyGrade!].color} stroke="#fff" strokeWidth={1} ifOverflow="extendDomain" />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        E6/E8/E9 近12月趋势，橙色虚线为标准上限/下限；点击异常点查看详情。
      </p>
    </Card>
  );
}
