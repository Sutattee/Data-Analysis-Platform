"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { Card } from "@/components/ui/Card";
import { ENERGY_COEFFICIENT, getEnergyTypeTrend, pickAlertRecordId, type AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import type { AlertLevel } from "@/types";

const OBJECTS = ["全厂", "动力车间", "制丝车间", "卷包车间"];
const TYPE_COLOR: Record<string, string> = {
  electric: "#3b82f6",
  gas: "#8b5cf6",
  steam: "#14b8a6",
  water: "#06b6d4",
};
const selectCls =
  "px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";

function buildTypeAnomaly(
  object: string,
  meta: { label: string; unit: string },
  p: any
): AnomalyDetail {
  return {
    title: `${object} · ${meta.label}异常`,
    metricName: meta.label,
    current: `${p.actual.toLocaleString()} ${meta.unit}`,
    baseline: `${p.target.toLocaleString()} ${meta.unit}`,
    deviation: `超出阈值 ${(((p.actual - p.target) / p.target) * 100).toFixed(1)}%`,
    triggerTime: p.time ?? p.date,
    duration: "1小时10分钟",
    cause: "用能量短期内显著超出阈值，可能由设备空转、负荷突增或计量异常引起。",
    suggestion: "排查该能源对应设备的运行状态与计量数据，必要时启动错峰或降负荷措施。",
    recordId: pickAlertRecordId(object),
    level: "告警" as AlertLevel,
  };
}

export function EnergyTypeTrendCharts({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  const [object, setObject] = useState("全厂");
  const [gran, setGran] = useState<"日" | "月" | "年">("月");

  const types = ["electric", "gas", "steam", "water"] as const;

  return (
    <Card
      title="📊 分类能源用量趋势"
      headerRight={
        <div className="flex items-center gap-2">
          <select className={selectCls} value={object} onChange={(e) => setObject(e.target.value)}>
            {OBJECTS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <select className={selectCls} value={gran} onChange={(e) => setGran(e.target.value as "日" | "月" | "年")}>
            <option value="日">日</option>
            <option value="月">月</option>
            <option value="年">年</option>
          </select>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {types.map((type) => {
          const meta = ENERGY_COEFFICIENT[type];
          const data = getEnergyTypeTrend(type, object, gran);
          const handleClick = (e: any) => {
            if (!e?.activeLabel) return;
            const pt = data.find((d) => d.date === e.activeLabel);
            if (pt?.anomaly) onAnomaly(buildTypeAnomaly(object, meta, pt));
          };
          return (
            <div key={type}>
              <div className="mb-1 text-xs text-gray-500">
                <span
                  className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: TYPE_COLOR[type] }}
                />
                {meta.label}（{meta.unit}）
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} onClick={handleClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={gran === "日" ? 4 : 0} />
                  <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" width={44} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v: any, n: any) => [v, ({ actual: "实际值", target: "目标值" } as Record<string, string>)[n as string] ?? n]} />
                  <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeDasharray="4 4" dot={false} name="目标值" />
                  <Line type="monotone" dataKey="actual" stroke={TYPE_COLOR[type]} strokeWidth={2} dot={false} />
                  {data
                    .filter((d) => d.anomaly)
                    .map((d) => (
                      <ReferenceDot
                        key={d.date}
                        x={d.date}
                        y={d.actual}
                        r={4}
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth={1}
                        ifOverflow="extendDomain"
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">各能源使用自身单位；红色异常点为超出阈值，可点击查看详情。</p>
    </Card>
  );
}
