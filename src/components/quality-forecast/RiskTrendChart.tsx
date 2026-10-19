"use client";

// 风险预测趋势图：历史实线 + 未来虚线 + 中/高风险阈值参考线 + 预测区标注
// 评分 0-1；横轴为批次号（近5个批次 … 基准批次 … 未来10个批次）
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { catalogOf } from "@/lib/mock-data/quality-defect";
import { PARAM_GROUPS, groupOf, levelOf, type DefectForecast, type TrendPoint } from "@/lib/mock-data/quality-defect-forecast";

interface Row {
  label: string; // 批次号（横轴刻度）
  histScore: number | null;
  futureScore: number | null;
  point?: TrendPoint; // 点位生产上下文（牌号 / 班组 / 班次；Tooltip 展示）
}

export function RiskTrendChart({ forecast }: { forecast: DefectForecast }) {
  // 工序 = 组工序；部位 = 缺陷档案部位（Tooltip 展示）
  const process = PARAM_GROUPS[groupOf(forecast.code)].process;
  const part = catalogOf(forecast.code)?.part ?? "—";
  // 历史点（含基准批次）走实线；基准批次同时携带 futureScore 使虚线自此衔接；未来点走虚线
  const data: Row[] = [
    ...forecast.hist.map((p, i) => ({
      label: p.label,
      histScore: p.score,
      futureScore: i === forecast.hist.length - 1 ? p.score : null,
      point: p,
    })),
    ...forecast.future.slice(1).map((p) => ({
      label: p.label,
      histScore: null,
      futureScore: p.score,
      point: p,
    })),
  ];
  const baseLabel = forecast.hist[forecast.hist.length - 1]?.label ?? "";
  const lastLabel = data[data.length - 1]?.label ?? baseLabel;

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={0} minTickGap={20} />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
            tickFormatter={(v: number) => v.toFixed(1)}
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
          />
          {/* 预测区（基准批次 → 窗口末）浅色底标注 */}
          <ReferenceArea x1={baseLabel} x2={lastLabel} fill="#2563eb" fillOpacity={0.04} label={{ value: "预测区", position: "insideTopLeft", fontSize: 10, fill: "#93c5fd" }} />
          {/* 阈值参考线：中风险 0.40 橙 / 高风险 0.70 红（说明文字统一放在线上方） */}
          <ReferenceLine
            y={0.4}
            stroke="#f97316"
            strokeDasharray="4 4"
            label={{ value: "中风险阈值 0.40", position: "insideTopRight", fontSize: 10, fill: "#f97316" }}
          />
          <ReferenceLine
            y={0.7}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: "高风险阈值 0.70", position: "insideTopRight", fontSize: 10, fill: "#ef4444" }}
          />
          {/* 历史风险：实线；基准批次点用蓝圈（白心蓝边）放大；值为 null 的点不渲染 dot（避免半圆残影） */}
          <Line
            dataKey="histScore"
            stroke="#2563eb"
            strokeWidth={2}
            dot={(props: { cx?: number; cy?: number; payload?: Row }) => {
              const v = props.payload?.histScore;
              if (v === null || v === undefined || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) {
                return <g key={props.payload?.label} />;
              }
              const isBase = props.payload?.label === baseLabel;
              return (
                <circle
                  key={props.payload?.label}
                  cx={props.cx}
                  cy={props.cy}
                  r={isBase ? 5 : 3}
                  fill={isBase ? "#fff" : "#2563eb"}
                  stroke={isBase ? "#1d4ed8" : "#fff"}
                  strokeWidth={isBase ? 2 : 1}
                />
              );
            }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          {/* 未来预测：虚线（首点=基准批次，与历史衔接）；值为 null 的点不渲染 dot */}
          <Line
            dataKey="futureScore"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={(props: { cx?: number; cy?: number; payload?: Row }) => {
              const v = props.payload?.futureScore;
              if (v === null || v === undefined || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) {
                return <g key={props.payload?.label} />;
              }
              return (
                <circle
                  key={props.payload?.label}
                  cx={props.cx}
                  cy={props.cy}
                  r={3}
                  fill="#2563eb"
                  stroke="#fff"
                  strokeWidth={1}
                />
              );
            }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const row: Row = payload[0].payload;
              const score = row.histScore ?? row.futureScore ?? 0;
              const lv = levelOf(score);
              const pt = row.point;
              return (
                <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-gray-800">风险评分：{score.toFixed(2)}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-gray-600">
                    风险等级：
                    <span className="font-medium" style={{ color: lv.color }}>
                      {lv.label}
                    </span>
                  </p>
                  <p className="mt-0.5 text-gray-500">批次：{row.label}</p>
                  {pt?.brand && <p className="mt-0.5 text-gray-500">牌号：{pt.brand}</p>}
                  {pt?.shiftGroup && <p className="mt-0.5 text-gray-500">班组：{pt.shiftGroup}</p>}
                  {pt?.shiftLabel && <p className="mt-0.5 text-gray-500">班次：{pt.shiftLabel}</p>}
                  <p className="mt-0.5 text-gray-500">工序：{process}</p>
                  <p className="mt-0.5 text-gray-500">部位：{part}</p>
                </div>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      {/* 图例 */}
      <div className="mt-1 flex items-center justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-primary-600" />
          历史风险
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-primary-600" />
          预测趋势
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border-2 border-blue-700 bg-white" />
          基准批次
        </span>
      </div>
    </div>
  );
}
