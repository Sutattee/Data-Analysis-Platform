"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HIGH_THRESHOLD,
  MID_THRESHOLD,
  levelOf,
  levelRankOf,
  type DefectForecast,
  type DefectLevel,
} from "@/lib/mock-data/quality-defect-forecast";

// 风险预测趋势（规格 §8）：横轴批次号（历史已产批次 + 有排产计划的未来批次，以实际返回批次为准）；
// 纵轴取业务预测值 —— 成品水分不合格 → 成品水分(%)、箱储存储时间超上限 → 储存时长(h)，
// 烟支刺破（深链兜底）无业务值时退回风险评分轴；管控值上下限用橙色虚线（箱储仅有储存上限一条）。
// 历史蓝色实线 + 预测蓝色虚线（首点 = 基准批次 = 预测起点），预测区浅蓝底 + 基准批次竖向参考线；
// 等级变化标记（白心 + 等级色描边 + 等级名标注）：升级点逐点标注、基准点评分触发等级时同样标注、
// 首次达到窗口最高等级的点重点显示；曲线不带常规数据点，不补造数据点（箱储出库后断线）。
// 悬浮提示与稳定性预测页同口径：实际值/预测值、超出量、告警等级、批次、牌号、班次、班组；未知显示"—"。

type Mode = "moist" | "hours" | "score";

interface Row {
  batch: string;
  hist: number | null; // 历史值（业务值；评分兜底模式下为历史评分）
  future: number | null; // 预测值（评分兜底模式下为预测评分）
  histScore?: number; // 告警等级判定用
  futureScore?: number;
  full?: string; // 完整批次表述（悬浮「批次」字段）
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: Row;
}

const MODE_CFG: Record<Mode, { unit: string; names: [string, string] }> = {
  moist: { unit: "%", names: ["历史水分(%)", "预测水分(%)"] },
  hours: { unit: "h", names: ["历史储存时长(h)", "预测储存时长(h)"] },
  score: { unit: "", names: ["历史评分", "预测评分"] },
};

// 业务值取值（评分兜底模式退回评分）
function valOfPoint(
  p: { moist?: number; hours?: number; score: number } | undefined,
  mode: Mode
): number | undefined {
  if (!p) return undefined;
  return p.moist ?? p.hours ?? (mode === "score" ? p.score : undefined);
}

// 等级变化标记：升级点（等级高于前一点）+ 触发等级的基准点；prominent = 首次达到窗口最高等级
interface Mark {
  batch: string;
  full: string; // 完整批次表述（点击回传 / 抽屉批次字段）
  value: number;
  score: number; // 该点风险评分（点击回传）
  level: DefectLevel;
  color: string;
  prominent: boolean;
}

// 点击回传信息：等级 + 点位业务值与评分 + 生产上下文入口（视图据此匹配告警记录并覆写数值字段）；
// measured = 基准批次点（最新实测值，实测异常口径），否则为预测趋势上的点（预测风险口径）
export interface DefectAnomalyClickInfo {
  batch: string;
  full: string;
  value: number;
  score: number;
  level: DefectLevel;
  measured?: boolean;
}

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
  const lv = score !== undefined ? levelOf(score) : null;
  // 超出量：越出管控值边界的带方向差值（% 指标以 pct 计，如 +0.4pct / -0.3pct）；未越界显示 —
  const m = forecast.moisture;
  const st = forecast.storage;
  let exceed: string | null = null;
  if (mode === "moist" && m) {
    if (value > m.hi) exceed = `+${(value - m.hi).toFixed(1)}pct`;
    else if (value < m.lo) exceed = `-${(m.lo - value).toFixed(1)}pct`;
  } else if (mode === "hours" && st && value > st.limitHours) {
    exceed = `+${(value - st.limitHours).toFixed(1)}h`;
  }
  const items: { k: string; v: string; cls?: string; style?: { color: string } }[] = [
    { k: isFuture ? "预测值" : "实际值", v: `${value.toFixed(1)}${cfg.unit}`, cls: "font-medium text-gray-800" },
    { k: "超出量", v: exceed ?? "—", cls: exceed !== null ? "font-medium text-red-500" : "text-gray-400" },
    {
      k: "告警等级",
      v: lv ? lv.label : "—",
      cls: lv ? "font-medium" : "text-gray-400",
      ...(lv ? { style: { color: lv.color } } : {}),
    },
    { k: "批次", v: row.full ?? "—" },
    { k: "牌号", v: ctx.brand || "—" },
    { k: "班次", v: ctx.shift || "—" },
    { k: "班组", v: ctx.shiftGroup || "—" },
  ];
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg">
      {items.map((it) => (
        <div key={it.k} className="flex gap-3 text-xs leading-5">
          <span className="w-16 shrink-0 text-gray-400">{it.k}</span>
          <span className={`text-gray-700 ${it.cls ?? ""}`} style={it.style}>
            {it.v}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RiskTrendChart({
  forecast: f,
  onAnomalyClick,
}: {
  forecast: DefectForecast;
  // 升级点 / 触发等级的基准批次点点击回传（视图匹配告警记录后滑出异常详情抽屉）
  onAnomalyClick?: (info: DefectAnomalyClickInfo) => void;
}) {
  // 纵轴模式：优先业务预测值（成品水分 / 储存时长），无业务值（烟支刺破深链）退回风险评分
  const mode: Mode = f.future.some((p) => p.moist !== undefined)
    ? "moist"
    : f.future.some((p) => p.hours !== undefined)
      ? "hours"
      : "score";
  const cfg = MODE_CFG[mode];

  const { data, baseLabel, endLabel, marks } = useMemo(() => {
    // 历史与预测共用同一横轴：基准批次同时出现在两条曲线上保证衔接（数组去重，避免 Set 迭代受 target 限制）
    const labels: string[] = [];
    for (const p of f.hist) if (!labels.includes(p.batch)) labels.push(p.batch);
    for (const p of f.future) if (!labels.includes(p.batch)) labels.push(p.batch);
    const rows: Row[] = labels.map((batch) => {
      const h = f.hist.find((p) => p.batch === batch);
      const u = f.future.find((p) => p.batch === batch);
      return {
        batch,
        hist: valOfPoint(h, mode) ?? null,
        future: valOfPoint(u, mode) ?? null,
        histScore: h?.score,
        futureScore: u?.score,
        full: (u ?? h)?.full,
      };
    });
    // 等级变化标记：future[i]（i≥1）等级高于前一点（首点对比基准点）即标注；
    // 基准点评分触发等级（非正常）时同样标注；首次达到窗口最高等级的点重点显示
    const mk: Mark[] = [];
    const base = f.future[0];
    if (base) {
      const rest = f.future.slice(1);
      const maxLv = rest.length > 0 ? levelOf(Math.max(...rest.map((p) => p.score))).label : null;
      const firstMaxBatch =
        maxLv !== null && maxLv !== "正常" ? rest.find((p) => levelOf(p.score).label === maxLv)?.batch : undefined;
      if (levelOf(base.score).label !== "正常") {
        mk.push({
          batch: base.batch,
          full: base.full,
          value: valOfPoint(base, mode) ?? base.score,
          score: base.score,
          level: levelOf(base.score).label,
          color: levelOf(base.score).color,
          prominent: false,
        });
      }
      let prev = levelOf(base.score).label;
      for (const p of rest) {
        const lv = levelOf(p.score).label;
        if (levelRankOf(lv) > levelRankOf(prev)) {
          const v = valOfPoint(p, mode);
          if (v !== undefined) {
            mk.push({ batch: p.batch, full: p.full, value: v, score: p.score, level: lv, color: levelOf(p.score).color, prominent: p.batch === firstMaxBatch });
          }
        }
        prev = lv;
      }
    }
    return {
      data: rows,
      baseLabel: f.future[0]?.batch ?? f.hist[f.hist.length - 1]?.batch ?? "",
      endLabel: labels[labels.length - 1] ?? "",
      marks: mk,
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

  // 标记点查询表（batch → 标记）：数据点渲染与 hover 光晕取等级色
  const markMap = new Map(marks.map((mk) => [mk.batch, mk]));
  // 点击回传统一构造：基准批次点（batch = baseLabel）为最新实测值 → measured（实测异常口径）
  const clickInfoOf = (mk: Mark): DefectAnomalyClickInfo => ({
    batch: mk.batch,
    full: mk.full,
    value: mk.value,
    score: mk.score,
    level: mk.level,
    measured: mk.batch === baseLabel,
  });
  // 基准批次蓝圈（未触发等级时；触发等级由等级标记呈现）；等级标记点叠加透明点击热区
  // （视觉标记由 ReferenceDot 呈现），hover 高亮点同样携带点击（默认 activeDot 会覆盖热区拦截点击）
  const futureDot = (props: DotProps) => {
    const { cx, cy, payload } = props;
    const mk = markMap.get(payload?.batch ?? "");
    if (mk && onAnomalyClick && Number.isFinite(cx) && Number.isFinite(cy)) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={11}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onClick={() => onAnomalyClick(clickInfoOf(mk))}
        />
      );
    }
    if (mk) return null;
    if (payload?.batch === baseLabel && Number.isFinite(cx) && Number.isFinite(cy)) {
      return <circle cx={cx} cy={cy} r={4.5} fill="#fff" stroke="#2563eb" strokeWidth={2} />;
    }
    return null;
  };
  const activeDot = (props: DotProps) => {
    const { cx, cy, payload } = props;
    const mk = markMap.get(payload?.batch ?? "");
    const color = mk ? mk.color : "#2563eb";
    if (mk && onAnomalyClick && Number.isFinite(cx) && Number.isFinite(cy)) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={7}
          fill={color}
          fillOpacity={0.3}
          stroke={color}
          strokeWidth={1.5}
          style={{ cursor: "pointer" }}
          onClick={() => onAnomalyClick(clickInfoOf(mk))}
        />
      );
    }
    return <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1.5} />;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={272}>
        <ComposedChart data={data} margin={{ top: 20, right: 12, bottom: 0, left: 0 }}>
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

          {/* 预测区（基准批次 → 窗口末点）与基准批次竖向参考线（预测起点） */}
          <ReferenceArea x1={baseLabel} x2={endLabel} fill="#eff6ff" />
          <ReferenceLine
            x={baseLabel}
            stroke="#9ca3af"
            strokeDasharray="3 3"
            label={{ value: "基准批次", position: "insideTop", fontSize: 10, fill: "#6b7280" }}
          />

          {/* 管控值参考线（橙色虚线）：成品水分允许上下限 / 箱储储存上限；评分兜底模式退回阈值线 */}
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
                label={{ value: `关注阈值 ${MID_THRESHOLD}`, position: "insideTopLeft", fontSize: 10, fill: "#f97316" }}
              />
              <ReferenceLine
                y={HIGH_THRESHOLD}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: `告警阈值 ${HIGH_THRESHOLD}`, position: "insideTopRight", fontSize: 10, fill: "#ef4444" }}
              />
            </>
          )}

          {/* 等级变化标记：白心 + 等级色描边 + 等级名标注（升级点逐点标注，首达最高等级重点显示） */}
          {marks.map((mk) => (
            <ReferenceDot
              key={`mk-${mk.batch}`}
              x={mk.batch}
              y={mk.value}
              r={mk.prominent ? 6 : 4}
              fill="#fff"
              stroke={mk.color}
              strokeWidth={mk.prominent ? 2 : 1.5}
              label={{ value: mk.level, position: "top", fontSize: 10, fill: mk.color }}
            />
          ))}

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
      {/* 图例（手写，替代 recharts Legend）：历史实测 / 预测趋势 / 管控值 / 基准批次 / 告警等级 */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-primary-600" />
          历史实测
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-primary-600" />
          预测趋势
        </span>
        {mode !== "score" && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-orange-500" />
            管控值
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border-2 border-blue-700 bg-white" />
          基准批次
        </span>
        {marks.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-red-500 bg-white" />
            告警等级
          </span>
        )}
      </div>
    </div>
  );
}
