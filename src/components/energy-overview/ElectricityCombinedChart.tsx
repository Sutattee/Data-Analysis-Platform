"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "./SegmentedControl";
import { GRADE_STYLE, type AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import {
  DAILY_SERIES, ELECTRICITY_DAILY, ELECTRICITY_MONTHLY,
  SILK_POWER_MONTHLY, PACK_POWER_MONTHLY,
  buildOverviewAnomaly, lastDays, round, type HistPoint,
} from "@/lib/mock-data/energy-overview";

// 电耗趋势：合并原「单箱电耗趋势（全厂）」与「车间单位电耗趋势」
// 指标页签：全厂单箱电耗 / 制丝车间每公斤电耗 / 卷包车间单位电耗；
// 均展示实际值 + 历史均值 + 异常偏差点，支持日 / 月切换；
// 卷包车间额外支持 万支｜箱 单位切换（kWh/万支 = kWh/箱 × 0.2）
type TabKey = "electricity" | "silkPower" | "packPower";
type Range = "日" | "月";

const TABS: { key: TabKey; label: string }[] = [
  { key: "electricity", label: "全厂单箱电耗" },
  { key: "silkPower", label: "制丝车间每公斤电耗" },
  { key: "packPower", label: "卷包车间单位电耗" },
];

const NAME_MAP: Record<string, string> = { actual: "实际值", avg: "历史均值" };

export function ElectricityCombinedChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  const [active, setActive] = useState<TabKey>("electricity");
  const [range, setRange] = useState<Range>("日");
  // 卷包电耗单位口径：箱（默认） / 万支（1箱 = 5万支，kWh/万支 = kWh/箱 × 0.2）
  const [packUnit, setPackUnit] = useState<"箱" | "万支">("箱");

  const isPack = active === "packPower";
  const wanZhi = isPack && packUnit === "万支";
  const displayLabel = isPack
    ? wanZhi ? "卷包车间万支电耗" : "卷包车间单箱电耗"
    : active === "electricity" ? "全厂单箱电耗" : "制丝车间每公斤电耗";
  const displayUnit = isPack
    ? wanZhi ? "kWh/万支" : "kWh/箱"
    : active === "electricity" ? "kWh/箱" : "kWh/kg";

  const data = useMemo<HistPoint[]>(() => {
    let pts: HistPoint[];
    if (active === "electricity") {
      pts = range === "日" ? lastDays(ELECTRICITY_DAILY, 90) : ELECTRICITY_MONTHLY;
    } else if (active === "silkPower") {
      pts = range === "日" ? lastDays(DAILY_SERIES.silkPower, 90) : SILK_POWER_MONTHLY;
    } else {
      pts = range === "日" ? lastDays(DAILY_SERIES.packPower, 90) : PACK_POWER_MONTHLY;
    }
    if (!wanZhi) return pts;
    // 万支口径：实际 / 均值同步换算
    return pts.map((p) => ({
      ...p,
      actual: round(p.actual * 0.2, 2),
      avg: p.avg !== undefined ? round(p.avg * 0.2, 2) : undefined,
    }));
  }, [active, range, wanZhi]);

  function handleClick(e: any) {
    if (!e?.activeLabel) return;
    const pt = data.find((d) => d.date === e.activeLabel);
    if (pt?.anomaly) {
      // 卷包电耗按当前单位口径生成异常详情（标题 / 单位 / 数值一致）
      onAnomaly(buildOverviewAnomaly(active, pt, isPack ? { label: displayLabel, unit: displayUnit } : undefined));
    }
  }

  return (
    <Card
      headerRight={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-800">电耗趋势</span>
          {/* 指标页签（标题栏内，位于 日/月 切换左侧，与之高度对齐） */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActive(t.key)}
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition-colors ${
                    active === t.key
                      ? "bg-primary-600 font-medium text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <SegmentedControl
              options={[
                { value: "日", label: "日" },
                { value: "月", label: "月" },
              ]}
              value={range}
              onChange={setRange}
            />
          </div>
        </div>
      }
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-gray-500">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "#3b82f6" }} />
          {displayLabel}（{displayUnit}）
        </span>
        {/* 卷包车间：万支｜箱单位切换（选中项蓝色高亮） */}
        {isPack && (
          <span className="flex shrink-0 items-center text-[11px] leading-none">
            <button
              type="button"
              title="按万支展示"
              onClick={() => setPackUnit("万支")}
              className={wanZhi ? "font-medium text-primary-600" : "text-gray-400 hover:text-gray-600"}
            >
              万支
            </button>
            <span className="mx-0.5 text-gray-300">｜</span>
            <button
              type="button"
              title="按箱展示"
              onClick={() => setPackUnit("箱")}
              className={!wanZhi ? "font-medium text-primary-600" : "text-gray-400 hover:text-gray-600"}
            >
              箱
            </button>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={range === "日" ? 14 : 2} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={52} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [v, NAME_MAP[n as string] ?? n]}
          />
          <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeDasharray="5 4" strokeWidth={1.5} dot={false} name="历史均值" />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="实际值" />
          {data
            .filter((d) => d.anomaly)
            .map((d) => (
              <ReferenceDot
                key={d.iso}
                x={d.date}
                y={d.actual}
                r={5}
                fill={GRADE_STYLE[d.anomaly!].color}
                stroke="#fff"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                className="cursor-pointer"
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-blue-500" /> 实际值
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-blue-500" /> 历史均值
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" /> 关注
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-orange-500" /> 告警
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" /> 危险
        </span>
      </div>
    </Card>
  );
}
