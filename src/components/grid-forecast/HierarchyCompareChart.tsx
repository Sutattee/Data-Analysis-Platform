"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { getHierarchy } from "@/lib/mock-data/grid-forecast";

const METRICS = [
  { key: "综合", unit: "tce" },
  { key: "电", unit: "kWh" },
  { key: "气", unit: "Nm³" },
  { key: "蒸汽", unit: "t" },
  { key: "水", unit: "m³" },
];
const selectCls =
  "px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function HierarchyCompareChart() {
  const [path, setPath] = useState<string[]>([]);
  const [metric, setMetric] = useState("综合");
  const [period, setPeriod] = useState<"今日" | "本周累计" | "本月累计">("本月累计");

  const level = path.length === 0 ? "workshop" : path.length === 1 ? "grid" : "equipment";
  const parent = path.length > 0 ? path[path.length - 1] : null;
  const unit = METRICS.find((m) => m.key === metric)?.unit ?? "";

  // 今日≈月/30，本周累计≈月*7/30，本月累计=原月值
  const periodScale = period === "今日" ? 1 / 30 : period === "本周累计" ? 7 / 30 : 1;
  const data = getHierarchy(level, parent, metric).map((d) => ({
    ...d,
    value: +(d.value * periodScale).toFixed(d.value < 10 ? 2 : 0),
  }));
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  function drill(name: string) {
    if (level !== "equipment") setPath([...path, name]);
  }

  return (
    <Card
      title="🔍 实际能耗分层对比"
      headerRight={
        <div className="flex gap-2">
          <select className={selectCls} value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((m) => (
              <option key={m.key}>{m.key}</option>
            ))}
          </select>
          <select className={selectCls} value={period} onChange={(e) => setPeriod(e.target.value as "今日" | "本周累计" | "本月累计")}>
            <option value="本月累计">本月累计</option>
            <option value="本周累计">本周累计</option>
            <option value="今日">今日</option>
          </select>
        </div>
      }
    >
      {/* 面包屑 */}
      <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-gray-500">
        <button className="hover:text-primary-600" onClick={() => setPath([])}>
          全厂
        </button>
        {path.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-gray-300">/</span>
            <button className="hover:text-primary-600" onClick={() => setPath(path.slice(0, i + 1))}>
              {p}
            </button>
          </span>
        ))}
        <span className="ml-2 text-gray-400">（{period}）</span>
      </div>

      <div className="space-y-2">
        {data.map((item, i) => (
          <div
            key={item.name}
            className={`rounded p-2 transition-colors ${level !== "equipment" ? "cursor-pointer hover:bg-gray-50" : ""}`}
            onClick={() => drill(item.name)}
          >
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="w-4 text-gray-400">{i + 1}</span>
                <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                <span className="truncate text-gray-800">{item.name}</span>
              </span>
              <span className="flex-shrink-0 text-gray-500">
                {item.value.toLocaleString()} {unit}｜占比 {item.share}%｜环比 {sign(item.mom)}%
                {level !== "equipment" && <span className="ml-1 text-primary-500">›</span>}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary-500"
                style={{ width: `${(item.value / maxVal) * 100}%`, opacity: 0.7 }}
              />
            </div>
          </div>
        ))}
      </div>
      {level === "equipment" && <p className="mt-3 text-xs text-gray-400">已下钻至设备（最细粒度）。</p>}
    </Card>
  );
}
