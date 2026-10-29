"use client";

// 指标预测趋势图：历史实测实线 + 预测虚线 + 管控值线（橙色虚线，双侧型两条 + 区间底色）+ 等级升级标记
// + 基准竖线（灰色虚线，标注「基准批次」/「基准日期」）；管控值 = 等级规则最轻级边界（仅一条橙线
// 标注数值，不逐等级画线）；首达预测最高等级的点重点标注；纵轴为指标实际数值及单位；
// 横轴展示批号 / 月份 / 日期（班周期指标同为批次刻度，班次信息在悬浮提示）
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  LEVEL_COLOR,
  controlTextOf,
  currentLevelOf,
  exceedDeltaOfValue,
  exceedUnitOf,
  levelOfValue,
  maxFutureLevelOf,
  metricOf,
  severityOf,
  type AlertRule,
  type StabilityForecast,
  type TrendPoint,
} from "@/lib/mock-data/quality-stability-forecast";
import type { AlertLevel } from "@/types";

const CONTROL_COLOR = "#f97316"; // 管控值线（橙）
const BASELINE_COLOR = "#9ca3af"; // 基准竖线（灰）

interface Row {
  label: string;
  histValue: number | null;
  futureValue: number | null;
  point?: TrendPoint; // 点位生产上下文（批次 / 班次 / 班组 / 牌号；Tooltip 展示）
}

// 超出量：越出最轻级边界（= 管控值）的绝对差（带方向符号，% 指标以 pct 计，如 +0.35pct）；
// 未越界返回 null（Tooltip 不展示该行）
function exceedTextOfValue(v: number, rule: AlertRule, decimals: number, unit: string): string | null {
  const delta = exceedDeltaOfValue(v, rule);
  if (delta === null) return null;
  return `${delta >= 0 ? "+" : "-"}${Math.abs(delta).toFixed(decimals)}${exceedUnitOf(unit)}`;
}

// 等级升级点：future[i]（i≥1）等级高于前一点（首点对比当前实测等级）；prominent = 首次达到预测最高等级
interface UpgradeMark {
  label: string;
  value: number;
  level: AlertLevel;
  prominent: boolean;
}

export function MetricTrendChart({
  forecast,
  onAnomalyClick,
}: {
  forecast: StabilityForecast;
  // 升级点/告警基准点点击回传：等级 + 点位数值 + 生产上下文（视图据此匹配告警记录并覆写数值字段）；
  // measured = 基准点（最新实测值，实测异常口径），否则为预测趋势上的点（预测风险口径）
  onAnomalyClick?: (info: {
    level: AlertLevel;
    label: string;
    value: number;
    point?: TrendPoint;
    measured?: boolean;
  }) => void;
}) {
  const metric = metricOf(forecast.code)!;
  const rule = metric.rule;
  // 历史点（含基准）走实线；基准点同时携带 futureValue 使虚线自此衔接；未来点走虚线
  const data: Row[] = [
    ...forecast.hist.map((p, i) => ({
      label: p.label,
      histValue: p.value,
      futureValue: i === forecast.hist.length - 1 ? p.value : null,
      point: p,
    })),
    ...forecast.future.slice(1).map((p) => ({
      label: p.label,
      histValue: null,
      futureValue: p.value,
      point: p,
    })),
  ];
  const baseLabel = forecast.hist[forecast.hist.length - 1]?.label ?? "";
  const lastLabel = data[data.length - 1]?.label ?? baseLabel;

  // 等级升级标记：严重度高于前一点即标注；首次达到预测最高等级的点重点显示
  const marks: UpgradeMark[] = [];
  if (rule) {
    const maxLv = maxFutureLevelOf(forecast);
    const firstMaxLabel = forecast.future
      .slice(1)
      .find((p) => severityOf(levelOfValue(p.value, rule)) === severityOf(maxLv))?.label;
    let prev = severityOf(currentLevelOf(forecast));
    for (let i = 1; i < forecast.future.length; i += 1) {
      const p = forecast.future[i];
      const lv = levelOfValue(p.value, rule);
      const sev = severityOf(lv);
      if (lv !== null && sev > prev) {
        marks.push({ label: p.label, value: p.value, level: lv, prominent: p.label === firstMaxLabel });
      }
      prev = sev;
    }
  }
  const hasUpgrades = marks.length > 0; // 图例「等级升级」仅统计升级点（基准点当前告警不算升级）

  // 基准点（最新实测值）本身触发等级时：与升级点同样标注等级名，并支持点击滑出异常详情抽屉
  // （告警类型按实测异常处理，见 StabilityForecastView.pointAlertOf 的 measured 分支）
  const baseLevel = rule ? currentLevelOf(forecast) : null;
  const baseMark: UpgradeMark | null =
    baseLevel !== null ? { label: baseLabel, value: forecast.base, level: baseLevel, prominent: false } : null;
  if (baseMark) marks.push(baseMark);

  // 纵轴范围：数据 + 管控值边界（最轻级）自适应，两侧留 15% 裕量
  const lightest = rule ? rule.levels[rule.levels.length - 1] : undefined;
  const values = data.map((r) => r.histValue ?? r.futureValue ?? 0);
  if (lightest) {
    if (lightest.threshold !== undefined) values.push(lightest.threshold);
    if (lightest.low !== undefined) values.push(lightest.low);
    if (lightest.high !== undefined) values.push(lightest.high);
  }
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const span = vMax - vMin || Math.abs(vMax) || 1;
  const fmt = (v: number) => v.toFixed(metric.decimals);

  // 升级点查询表（label → 升级信息）：点击热区判定用
  const markMap = new Map(marks.map((m) => [m.label, m]));

  // 点击回传统一构造：基准点（label = baseLabel）为最新实测值 → measured（实测异常口径）
  const clickInfoOf = (m: UpgradeMark, point?: TrendPoint) => ({
    level: m.level,
    label: m.label,
    value: m.value,
    point,
    measured: m.label === baseLabel,
  });

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
            interval={metric.cycle === "日" ? 1 : 0} // 日周期 28 点隔一显示，避免刻度重叠
            minTickGap={20}
            height={30}
          />
          <YAxis
            domain={[vMin - span * 0.15, vMax + span * 0.15]}
            tickFormatter={fmt}
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
          />
          {/* 预测区（基准 → 窗口末）浅色底 */}
          <ReferenceArea x1={baseLabel} x2={lastLabel} fill="#2563eb" fillOpacity={0.04} />
          {/* 基准竖线：基准批次 / 基准日期（日周期）——历史与预测的分界，灰色虚线标注 */}
          <ReferenceLine
            x={baseLabel}
            stroke={BASELINE_COLOR}
            strokeDasharray="4 4"
            label={{ value: metric.cycle === "日" ? "基准日期" : "基准批次", position: "insideTop", fontSize: 10, fill: "#6b7280" }}
          />
          {/* 管控值线：最轻级边界一条橙色虚线（双侧型 = 上下两条 + 正常区间浅色底），标注管控值数值 */}
          {lightest && rule && rule.op === "between" && lightest.low !== undefined && lightest.high !== undefined && (
            <>
              <ReferenceArea y1={lightest.low} y2={lightest.high} fill={CONTROL_COLOR} fillOpacity={0.06} />
              <ReferenceLine
                y={lightest.high}
                stroke={CONTROL_COLOR}
                strokeDasharray="4 4"
                label={{ value: `管控值 ≤${fmt(lightest.high)}${metric.unit}`, position: "insideTopRight", fontSize: 10, fill: CONTROL_COLOR }}
              />
              <ReferenceLine
                y={lightest.low}
                stroke={CONTROL_COLOR}
                strokeDasharray="4 4"
                label={{ value: `管控值 ≥${fmt(lightest.low)}${metric.unit}`, position: "insideBottomRight", fontSize: 10, fill: CONTROL_COLOR }}
              />
            </>
          )}
          {lightest && rule && rule.op !== "between" && lightest.threshold !== undefined && (
            <ReferenceLine
              y={lightest.threshold}
              stroke={CONTROL_COLOR}
              strokeDasharray="4 4"
              label={{ value: `管控值 ${controlTextOf(metric)}`, position: "insideTopRight", fontSize: 10, fill: CONTROL_COLOR }}
            />
          )}
          {/* 等级标记：白心 + 等级色描边 + 等级名标注（升级点逐点标注对应等级；基准点实测触发等级时同样标注） */}
          {marks.map((m) => (
            <ReferenceDot
              key={m.label}
              x={m.label}
              y={m.value}
              r={m.prominent ? 6 : 4}
              fill="#fff"
              stroke={LEVEL_COLOR[m.level]}
              strokeWidth={m.prominent ? 2 : 1.5}
              label={{ value: m.level, position: "top", fontSize: 10, fill: LEVEL_COLOR[m.level] }}
            />
          ))}
          {/* 历史实测：实线；基准点放大（蓝圈）；值为 null 的点不渲染 dot（避免半圆残影） */}
          {/* 基准点实测触发等级时不渲染蓝圈（由等级标记 ReferenceDot + 预测线热区承接展示与点击） */}
          <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
            dataKey="histValue"
            stroke="#2563eb"
            strokeWidth={2}
            dot={(props: { cx?: number; cy?: number; payload?: Row }) => {
              const v = props.payload?.histValue;
              if (v === null || v === undefined || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) {
                return <g key={props.payload?.label} />;
              }
              if (baseMark && props.payload?.label === baseLabel) {
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
            activeDot={function renderHistActiveDot(props: { cx?: number; cy?: number; payload?: Row }) {
              // 基准点触发等级：hover 光圈携带点击（默认 activeDot 渲染在上层会拦截热区点击）
              const m = baseMark && props.payload?.label === baseLabel ? baseMark : undefined;
              if (m && onAnomalyClick && Number.isFinite(props.cx) && Number.isFinite(props.cy)) {
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={6}
                    fill={LEVEL_COLOR[m.level]}
                    fillOpacity={0.3}
                    stroke={LEVEL_COLOR[m.level]}
                    strokeWidth={1.5}
                    style={{ cursor: "pointer" }}
                    onClick={() => onAnomalyClick(clickInfoOf(m, props.payload?.point))}
                  />
                );
              }
              return <circle cx={props.cx} cy={props.cy} r={4} fill="#2563eb" fillOpacity={0.3} />;
            }}
           
          />
          {/* 预测输出：虚线（首点 = 基准，与历史衔接）；值为 null 的点不渲染 dot； */}
          {/* 等级标记点叠加透明点击热区（视觉标记由 ReferenceDot 呈现），hover 高亮点 */}
          {/* 同样携带点击（默认 activeDot 会覆盖热区拦截点击，参考过程管控趋势图修复） */}
          <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
            dataKey="futureValue"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={(props: { cx?: number; cy?: number; payload?: Row }) => {
              const v = props.payload?.futureValue;
              if (v === null || v === undefined || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) {
                return <g key={props.payload?.label} />;
              }
              const m = markMap.get(props.payload?.label ?? "");
              if (m && onAnomalyClick) {
                return (
                  <circle
                    key={`hot-${props.payload?.label}`}
                    cx={props.cx}
                    cy={props.cy}
                    r={11}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onClick={() => onAnomalyClick(clickInfoOf(m, props.payload?.point))}
                  />
                );
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
            activeDot={function renderActiveDot(props: { cx?: number; cy?: number; payload?: Row }) {
              const m = markMap.get(props.payload?.label ?? "");
              if (m && onAnomalyClick && Number.isFinite(props.cx) && Number.isFinite(props.cy)) {
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={6}
                    fill={LEVEL_COLOR[m.level]}
                    fillOpacity={0.3}
                    stroke={LEVEL_COLOR[m.level]}
                    strokeWidth={1.5}
                    style={{ cursor: "pointer" }}
                    onClick={() => onAnomalyClick(clickInfoOf(m, props.payload?.point))}
                  />
                );
              }
              return <circle cx={props.cx} cy={props.cy} r={4.5} fill="#2563eb" fillOpacity={0.3} />;
            }}
           
          />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const row: Row = payload[0].payload;
              const value = row.histValue ?? row.futureValue ?? 0;
              const isHist = row.histValue !== null && row.histValue !== undefined;
              const lv = rule ? levelOfValue(value, rule) : null;
              const exceed = rule ? exceedTextOfValue(value, rule, metric.decimals, metric.unit) : null;
              const pt = row.point;
              return (
                <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-gray-800">
                    {isHist ? "实际值" : "预测值"}：{value.toFixed(metric.decimals)}
                    {metric.unit}
                  </p>
                  {/* 信息未知显示 —（未越界 / 未配置规则 / 该周期无此字段） */}
                  <p className={`mt-0.5 font-medium ${exceed !== null ? "text-red-500" : "text-gray-400"}`}>
                    超出量：{exceed ?? "—"}
                  </p>
                  {lv ? (
                    <p className="mt-0.5 font-medium" style={{ color: LEVEL_COLOR[lv] }}>
                      告警等级：{lv}
                    </p>
                  ) : (
                    <p className={`mt-0.5 font-medium ${rule ? "text-green-600" : "text-gray-400"}`}>
                      告警等级：{rule ? "正常" : "—"}
                    </p>
                  )}
                  <p className="mt-0.5 text-gray-500">批次：{pt?.batch ? `第 ${pt.batch} 批` : "—"}</p>
                  <p className="mt-0.5 text-gray-500">牌号：{pt?.brand ?? "—"}</p>
                  <p className="mt-0.5 text-gray-500">班次：{pt?.shift ?? "—"}</p>
                  <p className="mt-0.5 text-gray-500">班组：{pt?.shiftGroup ?? "—"}</p>
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
          历史实测
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-primary-600" />
          预测趋势
        </span>
        {rule && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed" style={{ borderTopColor: CONTROL_COLOR }} />
            管控值
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border-2 border-blue-700 bg-white" />
          基准{metric.cycle === "月" ? "月份" : metric.cycle === "日" ? "日期" : "批次"}
        </span>
        {hasUpgrades && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-red-500 bg-white" />
            等级升级
          </span>
        )}
      </div>
    </div>
  );
}
