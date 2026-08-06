"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { getTopRanking, deviceTypeOf } from "@/lib/mock-data/grid-forecast";
import { ENERGY_EQUIPMENTS } from "@/lib/mock-data/alerts";

const METRICS = [
  { key: "综合", unit: "tce" },
  { key: "电", unit: "kWh" },
  { key: "气", unit: "Nm³" },
  { key: "蒸汽", unit: "t" },
  { key: "水", unit: "m³" },
];
const LEVELS: { label: string; value: "workshop" | "grid" | "equipment" }[] = [
  { label: "车间", value: "workshop" },
  { label: "网格", value: "grid" },
  { label: "设备", value: "equipment" },
];
const selectCls =
  "px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function EnergyTopRanking() {
  const [level, setLevel] = useState<"workshop" | "grid" | "equipment">("workshop");
  const [metric, setMetric] = useState("综合");
  const [deviceType, setDeviceType] = useState("全部");
  const [showAll, setShowAll] = useState(false);
  const [period, setPeriod] = useState<"今日" | "本周累计" | "本月累计">("本月累计");

  const unit = METRICS.find((m) => m.key === metric)?.unit ?? "";
  const periodScale = period === "今日" ? 1 / 30 : period === "本周累计" ? 7 / 30 : 1;
  const all = getTopRanking(level, metric, deviceType).map((d) => ({
    ...d,
    value: +(d.value * periodScale).toFixed(d.value < 10 ? 2 : 0),
  }));
  const list = showAll ? all : all.slice(0, 5);
  const maxVal = Math.max(...all.map((d) => d.value), 1);
  const deviceTypes = ["全部", ...Array.from(new Set(ENERGY_EQUIPMENTS.map(deviceTypeOf)))];

  return (
    <Card
      title={`🏆 全厂能耗 Top 排名　${period}`}
      headerRight={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-0.5">
            {LEVELS.map((lv) => (
              <button
                key={lv.value}
                onClick={() => {
                  setLevel(lv.value);
                  setShowAll(false);
                }}
                className={`rounded-md px-2 py-1 text-xs ${
                  level === lv.value ? "bg-white font-medium text-primary-700 shadow-sm" : "text-gray-500"
                }`}
              >
                {lv.label}
              </button>
            ))}
          </div>
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
      {level === "equipment" && (
        <div className="mb-3 flex items-center gap-1.5">
          <span className="text-xs text-gray-500">设备类型</span>
          <select
            className={selectCls}
            value={deviceType}
            onChange={(e) => {
              setDeviceType(e.target.value);
              setShowAll(false);
            }}
          >
            {deviceTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {list.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">暂无数据</div>
      ) : (
        <div className="space-y-2">
          {list.map((it, i) => (
            <div key={it.name} className="rounded p-2 hover:bg-gray-50">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="w-4 text-gray-400">{i + 1}</span>
                  <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                  <span className="truncate text-gray-800">{it.name}</span>
                </span>
                <span className="flex-shrink-0 text-gray-500">
                  {it.value.toLocaleString()} {unit}｜占比 {it.share}%｜环比 {sign(it.mom)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${(it.value / maxVal) * 100}%`, opacity: 0.7 }}
                  />
                </div>
                <span className="w-20 flex-shrink-0 truncate text-right text-xs text-gray-400" title={it.parent}>
                  {it.parent}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {all.length > 5 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full text-center text-xs text-primary-600 hover:underline"
        >
          {showAll ? "收起" : `查看全部 (${all.length})`}
        </button>
      )}
    </Card>
  );
}
