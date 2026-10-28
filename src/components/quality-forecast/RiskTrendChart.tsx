"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HIGH_THRESHOLD,
  MID_THRESHOLD,
  UPDATED_AT,
  levelOf,
  type DefectForecast,
} from "@/lib/mock-data/quality-defect-forecast";

// 风险预测趋势（规格 §8）：横轴批次号（历史已产批次 + 有排产计划的未来批次，以实际返回批次为准）；
// 纵轴取业务预测值 —— 成品水分不合格 → 成品水分(%)、箱储存储时间超上限 → 储存时长(h)，
// 烟支刺破（深链兜底）无业务值时退回风险评分轴；管控值上下限用橙色虚线（箱储仅有储存上限一条）。
// 历史蓝色实线 + 预测蓝色虚线（首点 = 基准批次 = 预测起点），预测区浅蓝底 + 基准批次竖向参考线；
// 曲线不带常规数据点（仅窗口最高风险红点与预测起点白心蓝边强调），不补造数据点（箱储出库后断线）。
// 悬浮提示逐字段纵向排列：业务值 / 风险等级 / 评分 / 关联批次 / 牌号 / 班次 / 班组 / 预测时间；未知显示"—"。

type Mode = "moist" | "hours" | "score";

interface Row {
  batch: string;
  hist: number | null; // 历史值（业务值；评分兜底模式下为历史评分）
  future: number | null; // 预测值（评分兜底模式下为预测评分）
  histScore?: number; // Tooltip 风险等级 / 评分用
  futureScore?: number;
  full?: string; // 完整批次表述
  biz?: string; // 业务预测值（仅预测点携带）
  planned?: boolean; // 未来信息来自排产/出库计划
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: Row;
}

const MODE_CFG: Record<Mode, { unit: string; valueLabel: string; histLabel: string; names: [string, string] }> = {
  moist: { unit: "%", valueLabel: "预测成品水分", histLabel: "成品水分", names: ["历史水分(%)", "预测水分(%)"] },
  hours: { unit: "h", valueLabel: "预测储存时长", histLabel: "储存时长", names: ["历史储存时长(h)", "预测储存时长(h)"] },
  score: { unit: "", valueLabel: "", histLabel: "", names: ["历史评分", "预测评分"] },
};

function TrendTooltip({
  active,
  payload,
  forecast,
  mode,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  forecast: DefectForecast;
  mode: Mode;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const isFuture = row.future !== null;
  const value = isFuture ? row.future : row.hist;
  if (value === null || value === undefined) return null;
  const score = isFuture ? row.futureScore : row.histScore;
  const cfg = MODE_CFG[mode];
  const ctx = forecast.context;
  const items: [string, string][] = [];
  if (mode !== "score")
    items.push([isFuture ? cfg.valueLabel : cfg.histLabel, `${value.toFixed(1)}${cfg.unit}`]);
  items.push(["风险等级", score !== undefined ? levelOf(score).label : "—"]);
  items.push(["评分", score !== undefined ? score.toFixed(1) : "—"]);
  if (row.biz) items.push(["业务预测", row.biz]);
  items.push(
    ["关联批次", forecast.batch || "—"],
    ["牌号", ctx.brand || "—"],
    ["班次", ctx.shift || "—"],
    ["班组", ctx.shiftGroup || "—"],
    ["预测时间", UPDATED_AT],
  );
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg">
      {items.map(([k, v]) => (
        <div key={k} className="flex gap-3 text-xs leading-5">
          <span className="w-20 shrink-0 text-gray-400">{k}</span>
          <span className={k === "评分" ? "font-medium text-gray-800" : "text-gray-700"}>{v}</span>
        </div>
      ))}
    </div>
  );
}

export function RiskTrendChart({ forecast: f }: { forecast: DefectForecast }) {
  // 纵轴模式：优先业务预测值（成品水分 / 储存时长），无业务值（烟支刺破深链）退回风险评分
  const mode: Mode = f.future.some((p) => p.moist !== undefined)
    ? "moist"
    : f.future.some((p) => p.hours !== undefined)
      ? "hours"
      : "score";
  const cfg = MODE_CFG[mode];

  const { data, baseLabel, endLabel, peakLabel } = useMemo(() => {
    // 历史与预测共用同一横轴：基准批次同时出现在两条曲线上保证衔接（数组去重，避免 Set 迭代受 target 限制）
    const valOf = (p: { moist?: number; hours?: number } | undefined) => (p ? p.moist ?? p.hours : undefined);
    const labels: string[] = [];
    for (const p of f.hist) if (!labels.includes(p.batch)) labels.push(p.batch);
    for (const p of f.future) if (!labels.includes(p.batch)) labels.push(p.batch);
    const rows: Row[] = labels.map((batch) => {
      const h = f.hist.find((p) => p.batch === batch);
      const u = f.future.find((p) => p.batch === batch);
      return {
        batch,
        hist: valOf(h) ?? (mode === "score" ? (h?.score ?? null) : null),
        future: valOf(u) ?? (mode === "score" ? (u?.score ?? null) : null),
        histScore: h?.score,
        futureScore: u?.score,
        full: (u ?? h)?.full,
        biz: u?.biz,
        planned: u?.planned,
      };
    });
    // 窗口最高风险点（多同分取最早）→ 红点重点标记
    const peak = f.future.length > 0 ? f.future.reduce((a, b) => (b.score > a.score ? b : a)) : null;
    return {
      data: rows,
      baseLabel: f.future[0]?.batch ?? f.hist[f.hist.length - 1]?.batch ?? "",
      endLabel: labels[labels.length - 1] ?? "",
      peakLabel: peak?.batch,
    };
  }, [f, mode]);

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-gray-400">数据不足，暂无预测曲线</div>;
  }

  // 纵轴刻度域：业务值模式按数据 + 管控线自适应（数值自然非零起点）；评分模式固定 0—100
  const vals = data.flatMap((r) => [r.hist, r.future]).filter((v): v is number => v !== null);
  const m = f.moisture;
  const st = f.storage;
  const domain: [number, number] =
    vals.length === 0
      ? [0, 100]
      : mode === "moist" && m
        ? [Math.min(m.lo - 0.2, ...vals), Math.max(m.hi + 0.3, ...vals)]
        : mode === "hours" && st
          ? [Math.min(...vals) - 4, Math.max(st.limitHours, ...vals) + 4]
          : [0, 100];

  // 标记点判定：窗口最高风险点（红点强调）与预测起点（基准批次，白心蓝边）；纯视觉强调，无点击交互
  const markOf = (batch?: string) =>
    peakLabel && batch === peakLabel ? "peak" : batch === baseLabel ? "base" : undefined;
  const futureDot = (props: DotProps) => {
    const { cx, cy, payload } = props;
    const mk = markOf(payload?.batch);
    if (mk === "peak") return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
    if (mk === "base") return <circle cx={cx} cy={cy} r={4.5} fill="#fff" stroke="#2563eb" strokeWidth={2} />;
    return null;
  };
  const activeDot = (props: DotProps) => {
    const { cx, cy, payload } = props;
    const color = markOf(payload?.batch) === "peak" ? "#ef4444" : "#2563eb";
    return <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1.5} />;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="batch" tick={{ fontSize: 11, fill: "#6b7280" }} interval={1} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
        <YAxis
          domain={domain}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          width={40}
          unit={cfg.unit || undefined}
        />
        <Tooltip content={<TrendTooltip forecast={f} mode={mode} />} />
        <Legend verticalAlign="bottom" height={24} iconSize={14} wrapperStyle={{ fontSize: 11, color: "#6b7280" }} />

        {/* 预测区（基准批次 → 窗口末点）与基准批次竖向参考线（预测起点） */}
        <ReferenceArea x1={baseLabel} x2={endLabel} fill="#eff6ff" />
        <ReferenceLine
          x={baseLabel}
          stroke="#9ca3af"
          strokeDasharray="3 3"
          label={{ value: "基准批次", position: "insideTop", fontSize: 10, fill: "#6b7280" }}
        />

        {/* 管控值参考线（橙色虚线）：成品水分允许上下限 / 箱储储存上限；评分兜底模式退回中/高风险阈值 */}
        {mode === "moist" && m && (
          <>
            <ReferenceLine
              y={m.hi}
              stroke="#f97316"
              strokeDasharray="6 4"
              label={{ value: `上限 ${m.hi}%`, position: "insideTopRight", fontSize: 10, fill: "#f97316" }}
            />
            <ReferenceLine
              y={m.lo}
              stroke="#f97316"
              strokeDasharray="6 4"
              label={{ value: `下限 ${m.lo}%`, position: "insideBottomRight", fontSize: 10, fill: "#f97316" }}
            />
          </>
        )}
        {mode === "hours" && st && (
          <ReferenceLine
            y={st.limitHours}
            stroke="#f97316"
            strokeDasharray="6 4"
            label={{ value: `储存上限 ${st.limitHours}h`, position: "insideTopRight", fontSize: 10, fill: "#f97316" }}
          />
        )}
        {mode === "score" && (
          <>
            <ReferenceLine
              y={MID_THRESHOLD}
              stroke="#f97316"
              strokeDasharray="4 4"
              label={{ value: `中风险阈值 ${MID_THRESHOLD}`, position: "insideTopLeft", fontSize: 10, fill: "#f97316" }}
            />
            <ReferenceLine
              y={HIGH_THRESHOLD}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: `高风险阈值 ${HIGH_THRESHOLD}`, position: "insideTopRight", fontSize: 10, fill: "#ef4444" }}
            />
          </>
        )}

        <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
          type="monotone"
          dataKey="hist"
          name={cfg.names[0]}
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          activeDot={false}
          connectNulls={false}
        />
        <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
          type="monotone"
          dataKey="future"
          name={cfg.names[1]}
          stroke="#2563eb"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={futureDot}
          activeDot={activeDot}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
