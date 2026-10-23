"use client";

// 实测趋势图：横轴按周期形态（批次号 / 日期+班型 / 月份），单条折线不分机台；
// 每个横轴单元取该单元内时间最新一条监测记录（点着色 / 点击抽屉基于该具体记录），
// 点按告警等级着色，命中等级的点可点击滑出异常详情抽屉；
// 管控值为单限一条虚线 / 区间两条虚线 + 浅色底。
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
import { LEVEL_COLOR } from "@/lib/mock-data/quality-stability-forecast";
import type { AlertLevel } from "@/types";
import { processOfDetail, type MonitorRecord, type ProcessDetailMetric } from "@/lib/mock-data/process-control-detail";

const LINE_COLOR = "#2563eb"; // 实测折线主色

interface TrendRow {
  label: string; // 横轴刻度：批次号 / 班次（日期+班型）/ 月份
  time: string; // 排序键（该单元所取记录的生产时间）
  value: number; // 折线取值（该单元所取记录的实测值）
  rec: MonitorRecord; // 该单元内时间最新的一条监测记录
}

export function MeasuredTrendChart({
  metric,
  records,
  onSelect,
}: {
  metric: ProcessDetailMetric;
  records: MonitorRecord[];
  onSelect: (rec: MonitorRecord) => void;
}) {
  // 按横轴单元聚合：同单元（同批次号 / 同日期班型 / 同月份）保留时间最新一条
  const rowMap = new Map<string, TrendRow>();
  for (const r of records) {
    const row = rowMap.get(r.label);
    if (!row || r.time > row.time) rowMap.set(r.label, { label: r.label, time: r.time, value: r.value, rec: r });
  }
  const data = Array.from(rowMap.values()).sort((a, b) => a.time.localeCompare(b.time));

  // 纵轴范围：数据 + 管控边界自适应，两侧留 15% 裕量
  const values = records.map((r) => r.value);
  const { upper, lower } = metric.control;
  if (upper !== undefined) values.push(upper);
  if (lower !== undefined) values.push(lower);
  const vMin = values.length ? Math.min(...values) : 0;
  const vMax = values.length ? Math.max(...values) : 1;
  const span = vMax - vMin || Math.abs(vMax) || 1;

  // 图上出现的告警等级（图例展示点状态色）
  const shownLevels = (["危险", "告警", "预警", "关注", "提示"] as AlertLevel[]).filter((lv) =>
    records.some((r) => r.level === lv)
  );
  const pendingConfig = metric.rule === null;

  const dotOf = function renderDot(props: { cx?: number; cy?: number; payload?: TrendRow }) {
    const rec = props.payload?.rec;
    if (!rec || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) {
      return <g />;
    }
    const lv = rec.level;
    const fill = lv ? LEVEL_COLOR[lv] : LINE_COLOR;
    return (
      <circle
        key={rec.id}
        cx={props.cx}
        cy={props.cy}
        r={lv ? 4 : 3}
        fill={fill}
        stroke="#fff"
        strokeWidth={1}
        style={lv ? { cursor: "pointer" } : undefined}
        onClick={() => onSelect(rec)}
      />
    );
  };
  // hover 高亮点也需携带点击：默认 activeDot 会覆盖在自定义 dot 之上拦截点击事件，
  // 导致异常点点击无响应 —— 自定义 activeDot 复用同一点击逻辑（放大展示）
  const activeDotOf = function renderActiveDot(props: { cx?: number; cy?: number; payload?: TrendRow }) {
    const rec = props.payload?.rec;
    if (!rec || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) {
      return <g />;
    }
    const lv = rec.level;
    const fill = lv ? LEVEL_COLOR[lv] : LINE_COLOR;
    return (
      <circle
        cx={props.cx}
        cy={props.cy}
        r={lv ? 5.5 : 4.5}
        fill={fill}
        fillOpacity={0.35}
        stroke={fill}
        strokeWidth={1.5}
        style={lv ? { cursor: "pointer" } : undefined}
        onClick={() => onSelect(rec)}
      />
    );
  };

  return (
    <div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 18, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              domain={[vMin - span * 0.15, vMax + span * 0.15]}
              tickFormatter={(v: number) => v.toFixed(metric.decimals)}
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
              label={{
                value: `${metric.name}（${metric.unit}）`,
                angle: -90,
                position: "insideLeft",
                offset: 8,
                fontSize: 11,
                fill: "#6b7280",
              }}
            />
            {/* 区间型管控：两条边界虚线 + 正常区间浅色底 */}
            {metric.control.kind === "range" && lower !== undefined && upper !== undefined && (
              <ReferenceArea y1={lower} y2={upper} fill="#2563eb" fillOpacity={0.05} />
            )}
            {!pendingConfig && lower !== undefined && (
              <ReferenceLine
                y={lower}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: `下限 ${lower.toFixed(metric.decimals)}${metric.unit}`, position: "insideBottomLeft", fontSize: 10, fill: "#ef4444" }}
              />
            )}
            {!pendingConfig && upper !== undefined && (
              <ReferenceLine
                y={upper}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: `上限 ${upper.toFixed(metric.decimals)}${metric.unit}`, position: "insideTopLeft", fontSize: 10, fill: "#ef4444" }}
              />
            )}
            <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
              name="实测值"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={dotOf}
              activeDot={activeDotOf}
             
            />
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const row: TrendRow = payload[0].payload;
                const r = row.rec;
                if (!r) return null;
                const process = processOfDetail(metric);
                return (
                  <div className="max-w-[280px] rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-gray-800">
                      实际值：{r.value.toFixed(metric.decimals)}
                      {metric.unit}
                    </p>
                    {metric.cycle === "月" ? (
                      <p className="mt-0.5 text-gray-500">月份：{row.label}</p>
                    ) : (
                      <p className="mt-0.5 text-gray-500">批次：{r.batch}</p>
                    )}
                    <p className="mt-0.5 text-gray-500">机台：{r.machine}</p>
                    {r.shiftGroup && <p className="mt-0.5 text-gray-500">班组：{r.shiftGroup}</p>}
                    {r.shiftType && <p className="mt-0.5 text-gray-500">班次：{row.label}</p>}
                    <p className="mt-0.5 text-gray-500">牌号：{r.brand}</p>
                    {process && <p className="mt-0.5 text-gray-500">工序：{process}</p>}
                    {!pendingConfig && <p className="mt-0.5 text-gray-500">超限比例：{r.overPct}</p>}
                    {!pendingConfig &&
                      (r.level ? (
                        <p className="mt-0.5 font-medium" style={{ color: LEVEL_COLOR[r.level] }}>
                          告警等级：{r.level}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-green-600">告警等级：正常</p>
                      ))}
                  </div>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* 图例：实测线 / 管控值 / 点状态（数据中出现的等级） */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5" style={{ backgroundColor: LINE_COLOR }} />
          实测值
        </span>
        {!pendingConfig && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-red-500" />
            管控值
          </span>
        )}
        {shownLevels.map((lv) => (
          <span key={lv} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LEVEL_COLOR[lv] }} />
            {lv}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary-600" />
          正常
        </span>
        {metric.cycle === "月" && <span className="text-gray-300">｜末月为数据截至月，统计未结束</span>}
      </div>
    </div>
  );
}
