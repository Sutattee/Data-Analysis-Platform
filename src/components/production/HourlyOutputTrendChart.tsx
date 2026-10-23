"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/energy-overview/SegmentedControl";
import { AnomalyLevelLegend } from "@/components/energy-overview/AnomalyLevelLegend";
import { ALERT_LEVEL_COLOR, GRADE_TO_LEVEL, type AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import {
  EQUIPMENT_UNITS,
  TEAMS,
  buildHourlyAnomaly,
  hourlyView,
  type HourlyRange,
  type Shift,
  type Team,
} from "@/lib/mock-data/equipment-efficiency";

const NAME_MAP: Record<string, string> = { actual: "实际值", avg: "历史均值", target: "目标值" };

// 班次选项：「全天」为聚合默认档（下拉展示「全部班次」）
const SHIFT_OPTIONS: { value: Shift; label: string }[] = [
  { value: "全天", label: "全部班次" },
  { value: "早班", label: "早班" },
  { value: "中班", label: "中班" },
  { value: "晚班", label: "晚班" },
];

// 台时产量趋势图：实际值（蓝实线）/ 历史均值（蓝虚线）/ 目标值（橙色水平线，各机组一致 1100）；
// 统计粒度日/周/月均展示异常点（实际值低于目标值时标记，五色）；机组 TAB 切换 16 台机组；
// 班次（早/中/晚生产时间段）× 班组（甲/乙/丙人员班组）两个单选下拉交叉筛选
export function HourlyOutputTrendChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  const [unit, setUnit] = useState(EQUIPMENT_UNITS[0]);
  const [shift, setShift] = useState<Shift>("全天");
  const [team, setTeam] = useState<Team | undefined>(undefined); // undefined = 全部班组
  const [range, setRange] = useState<HourlyRange>("日");

  const data = useMemo(() => hourlyView(unit, shift, range, team), [unit, shift, range, team]);

  function handleClick(e: any) {
    if (!e?.activeLabel) return;
    const pt = data.find((d) => d.date === e.activeLabel);
    if (pt?.anomaly) onAnomaly(buildHourlyAnomaly(unit, pt, shift, team));
  }

  const selectCls =
    "px-2.5 py-1 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

  return (
    <Card
      title="台时产量趋势（箱/台）"
      headerRight={
        // 班次 / 班组下拉 + 统计粒度切换：标题右侧
        <div className="flex items-center gap-2">
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value as Shift)}
            className={selectCls}
          >
            {SHIFT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={team ?? ""}
            onChange={(e) => setTeam(e.target.value ? (e.target.value as Team) : undefined)}
            className={selectCls}
          >
            <option value="">全部班组</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <SegmentedControl
            options={[
              { value: "日", label: "日" },
              { value: "周", label: "周" },
              { value: "月", label: "月" },
            ]}
            value={range}
            onChange={setRange}
          />
        </div>
      }
    >
      {/* 机组 TAB：16 台卷接包装机组 */}
      <div className="mb-3 flex flex-wrap gap-1">
        {EQUIPMENT_UNITS.map((u) => {
          const active = u === unit;
          return (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`rounded-md border px-2 py-1 text-xs transition-colors duration-150 ${
                active
                  ? "border-primary-500 bg-primary-50 font-medium text-primary-600"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {u}
            </button>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={range === "日" ? 14 : range === "周" ? 1 : 3} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={56} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [v, NAME_MAP[n as string] ?? n]}
          />
          {/* 目标值恒定 1100 → 橙色水平线 */}
          <Line isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="4 4" dot={false} name="目标值" />
          <Line isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="avg" stroke="#3b82f6" strokeDasharray="5 4" strokeWidth={1.5} dot={false} name="历史均值" />
          <Line isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="实际值" />
          {/* 异常偏差点：日/周/月粒度均展示（实际值低于目标值时标记） */}
          {data
            .filter((d) => d.anomaly)
            .map((d) => (
              <ReferenceDot
                key={d.iso}
                x={d.date}
                y={d.actual}
                r={5}
                fill={ALERT_LEVEL_COLOR[GRADE_TO_LEVEL[d.anomaly!]]}
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
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-orange-500" /> 目标值
        </span>
        <AnomalyLevelLegend labels={{ 关注: "一般" }} />
      </div>
    </Card>
  );
}
