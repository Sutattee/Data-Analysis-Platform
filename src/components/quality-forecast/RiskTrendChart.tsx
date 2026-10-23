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
  levelOf,
  type DefectForecast,
  type TrendPoint,
} from "@/lib/mock-data/quality-defect-forecast";

// 风险预测趋势：横轴按实际日期时间的小时制刻度（本窗口不跨日；跨日时需在刻度补日期），
// 纵轴 0—100 固定 + 中/高风险阈值参考线；历史实线 + 预测虚线（首点 = 基准点衔接），
// 曲线不带常规数据点（仅峰值红点与基准点强调），基准时刻竖向参考线（标签置于区内顶部避免裁剪），
// 预测区浅蓝底，窗口最高风险点红点重点标记；标记点可点击滑出异常详情抽屉（峰值点恒可点，
// 基准点已达中风险阈值才可点）；数据不足时不编造曲线，直接展示空态。

interface Row {
  t: string;
  hist: number | null;
  future: number | null;
  full?: string; // 完整时刻（Tooltip 展示）
  biz?: string; // 业务预测值（仅预测点携带）
  planned?: boolean; // 未来信息来自计划 → Tooltip 标注"（计划）"
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: Row;
}

function TrendTooltip({ active, payload, forecast }: { active?: boolean; payload?: { payload: Row }[]; forecast: DefectForecast }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const score = row.future ?? row.hist;
  if (score === null) return null;
  const lv = levelOf(score);
  const items: [string, string][] = [
    ["预测时间", row.full ?? row.t],
    ["风险评分", `${score.toFixed(1)}（${lv.label}）`],
    ["对象", forecast.objectKey],
    ["关联批次", forecast.batch],
    ["牌号", forecast.context.brand],
    ["班次", forecast.context.shift],
    ["班组", forecast.context.shiftGroup],
    ["业务预测值", row.biz ? `${row.biz}${row.planned ? "（计划）" : ""}` : "—"],
  ];
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg">
      {items.map(([k, v]) => (
        <div key={k} className="flex gap-3 text-xs leading-5">
          <span className="w-20 shrink-0 text-gray-400">{k}</span>
          <span className={k === "风险评分" ? "font-medium text-gray-800" : "text-gray-700"}>{v}</span>
        </div>
      ))}
    </div>
  );
}

export function RiskTrendChart({
  forecast: f,
  onPointClick,
}: {
  forecast: DefectForecast;
  // 标记点点击：peak = 窗口最高风险点；base = 已达中风险阈值的基准点
  onPointClick?: (point: TrendPoint, kind: "peak" | "base") => void;
}) {
  const { data, baseLabel, endLabel, peakLabel } = useMemo(() => {
    // 历史与预测共用同一横轴：基准点（14:00）同时出现在两条曲线上保证衔接（数组去重，避免 Set 迭代受 target 限制）
    const labels: string[] = [];
    for (const p of f.hist) if (!labels.includes(p.t)) labels.push(p.t);
    for (const p of f.future) if (!labels.includes(p.t)) labels.push(p.t);
    const rows: Row[] = labels.map((t) => {
      const h = f.hist.find((p) => p.t === t);
      const u = f.future.find((p) => p.t === t);
      return {
        t,
        hist: h ? h.score : null,
        future: u ? u.score : null,
        full: (u ?? h)?.full,
        biz: u?.biz,
        planned: u?.planned,
      };
    });
    // 窗口最高风险点（多同分取最早）→ 红点重点标记
    const peak = f.future.length > 0 ? f.future.reduce((a, b) => (b.score > a.score ? b : a)) : null;
    return {
      data: rows,
      baseLabel: f.future[0]?.t ?? f.hist[f.hist.length - 1]?.t ?? "",
      endLabel: labels[labels.length - 1] ?? "",
      peakLabel: peak?.t,
    };
  }, [f]);

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-gray-400">数据不足，暂无预测曲线</div>;
  }

  // 标记点判定：窗口最高风险点恒可点击（红点，预测风险）；基准点已达中风险阈值时可点击
  // （橙点，当前异常），未达阈值仅白心蓝边强调不可点
  const markOf = (t?: string): { point: TrendPoint; kind: "peak" | "base" } | undefined => {
    if (!t) return undefined;
    const pt = f.future.find((x) => x.t === t);
    if (peakLabel && t === peakLabel && pt) return { point: pt, kind: "peak" };
    if (t === baseLabel) {
      const base = pt ?? f.hist[f.hist.length - 1];
      if (base && base.score >= MID_THRESHOLD) return { point: base, kind: "base" };
    }
    return undefined;
  };

  // 数据点：可点击标记点着色强调，基准点未达阈值白心蓝边，其余不渲染（保持曲线简洁）
  const futureDot = (props: DotProps) => {
    const { cx, cy, payload } = props;
    const m = markOf(payload?.t);
    if (m)
      return (
        <circle
          cx={cx}
          cy={cy}
          r={m.kind === "peak" ? 5 : 4.5}
          fill={m.kind === "peak" ? "#ef4444" : "#f97316"}
          stroke="#fff"
          strokeWidth={2}
          style={{ cursor: "pointer" }}
          onClick={() => onPointClick?.(m.point, m.kind)}
        />
      );
    if (payload?.t === baseLabel)
      return <circle cx={cx} cy={cy} r={4.5} fill="#fff" stroke="#2563eb" strokeWidth={2} />;
    return null;
  };

  // hover 光晕：标记点携带点击（默认 activeDot 渲染在上层会拦截热区点击，参考稳定性预测趋势图）
  const activeDot = (props: DotProps) => {
    const { cx, cy, payload } = props;
    const m = markOf(payload?.t);
    if (m && Number.isFinite(cx) && Number.isFinite(cy))
      return (
        <circle
          cx={cx}
          cy={cy}
          r={7}
          fill={m.kind === "peak" ? "#ef4444" : "#f97316"}
          fillOpacity={0.3}
          stroke={m.kind === "peak" ? "#ef4444" : "#f97316"}
          strokeWidth={1.5}
          style={{ cursor: "pointer" }}
          onClick={() => onPointClick?.(m.point, m.kind)}
        />
      );
    return <circle cx={cx} cy={cy} r={4.5} fill="#2563eb" fillOpacity={0.3} />;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#6b7280" }} interval={1} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip content={<TrendTooltip forecast={f} />} />
        <Legend verticalAlign="bottom" height={24} iconSize={14} wrapperStyle={{ fontSize: 11, color: "#6b7280" }} />

        {/* 预测区（基准时刻 → 窗口末点）与阈值参考线 */}
        <ReferenceArea x1={baseLabel} x2={endLabel} fill="#eff6ff" />
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
        <ReferenceLine
          x={baseLabel}
          stroke="#9ca3af"
          strokeDasharray="3 3"
          label={{ value: "基准时刻", position: "insideTop", fontSize: 10, fill: "#6b7280" }}
        />

        <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
          type="monotone"
          dataKey="hist"
          name="历史评分"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          activeDot={false}
          connectNulls={false}
        />
        <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
          type="monotone"
          dataKey="future"
          name="预测评分"
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
