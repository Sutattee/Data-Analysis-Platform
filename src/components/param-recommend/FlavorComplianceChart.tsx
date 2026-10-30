"use client";

// 右图 · 加香出口水分：实际与建议（与左图同一组历史批次，不含未来点）
// 蓝实线=检测值；绿实线+方点=建议值（开工时锁定的推荐版本，无推荐空缺不连线）；
// 检测值超上限/低于下限的批次点为橙红色（异常）；浅绿 ReferenceArea=按连续同标准版本分段的合格区间（无版本标注）。
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import {
  batchLabelOf,
  fmt2,
  historyOf,
  resultOf,
  stdOf,
  type BatchRecord,
} from "@/lib/mock-data/param-recommend";

interface Row {
  label: string;
  flavor: number | null;
  advice: number | null; // 建议值（该批开工时锁定的推荐版本，无历史推荐为 null）
  record: BatchRecord;
}

/** 连续同标准版本段（用于分段绘制合格区间） */
interface Segment {
  key: string;
  x1: string;
  x2: string;
  low: number;
  high: number;
}

const BLUE = "#2563eb";
const GREEN = "#16a34a";
const ORANGE = "#ea580c";

export function FlavorComplianceChart({
  line,
  brand,
  range,
  onRecordClick,
}: {
  line: string;
  brand: string;
  range: number;
  onRecordClick: (b: BatchRecord) => void;
}) {
  const history = historyOf(line, brand, range);
  const rows: Row[] = history.map((b) => ({
    label: batchLabelOf(b.batch),
    flavor: b.flavorActual,
    advice: b.dryingAdvice,
    record: b,
  }));

  // 连续同标准段（标准缺失批不参与成段）
  const segments: Segment[] = [];
  let cur: { key: string; low: number; high: number; x1: string; x2: string } | null = null;
  for (const r of rows) {
    const std = stdOf(r.record.brand, (r.record.startAt ?? r.record.planStart).slice(0, 10));
    const key = std ? `${r.record.brand}|${std.ver}` : null;
    if (std && key && cur && cur.key === key) {
      cur.x2 = r.label;
    } else {
      if (cur) segments.push(cur);
      cur = std && key ? { key, low: std.low, high: std.high, x1: r.label, x2: r.label } : null;
    }
  }
  if (cur) segments.push(cur);

  // 纵轴：检测值 + 建议值 + 各段上下限自适应
  const values = [
    ...rows.map((r) => r.flavor).filter((v): v is number => v !== null),
    ...rows.map((r) => r.advice).filter((v): v is number => v !== null),
    ...segments.flatMap((s) => [s.low, s.high]),
  ];
  const hasData = values.length > 0;
  const vMin = hasData ? Math.min(...values) : 0;
  const vMax = hasData ? Math.max(...values) : 1;
  const span = vMax - vMin || 1;

  return (
    <Card title="加香出口水分：实际与建议（%）">
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">当前筛选下暂无历史批次</p>
      ) : !hasData ? (
        <p className="py-12 text-center text-sm text-gray-400">当前筛选下暂无水分数据</p>
      ) : (
        <>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 24, right: 20, left: -4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={44}
                />
                <YAxis
                  domain={[vMin - span * 0.15, vMax + span * 0.15]}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const row: Row = payload[0].payload;
                    const b = row.record;
                    const std = stdOf(b.brand, (b.startAt ?? b.planStart).slice(0, 10));
                    return (
                      <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
                        <p className="font-medium text-gray-800">批次：{b.batch}</p>
                        <p className="mt-0.5 text-gray-600">牌号：{b.brand}</p>
                        <p className="mt-0.5 text-gray-600">
                          生产时间：{b.startAt ?? `${b.planStart}（计划）`}
                        </p>
                        <p className="mt-0.5 text-gray-600">
                          检测值：{b.flavorActual !== null ? `${fmt2(b.flavorActual)}%` : "待回传"}
                        </p>
                        <p className="mt-0.5 text-gray-600">
                          建议值：
                          {b.dryingAdvice !== null ? `${fmt2(b.dryingAdvice)}%` : (b.adviceReason ?? "无有效推荐")}
                        </p>
                        <p className="mt-0.5 text-gray-600">
                          合格范围：{std ? `${fmt2(std.low)}%～${fmt2(std.high)}%` : "—"}
                        </p>
                      </div>
                    );
                  }}
                />
                {/* 分段合格区间：浅绿底（标准换版处分段，无版本标注） */}
                {segments.map((s) => (
                  <ReferenceArea
                    key={`${s.key}-${s.x1}`}
                    x1={s.x1}
                    x2={s.x2}
                    y1={s.low}
                    y2={s.high}
                    fill={GREEN}
                    fillOpacity={0.08}
                  />
                ))}
                {/* 建议值：绿实线 + 方点（开工时锁定的推荐版本）；无历史推荐的批次空缺不连线 */}
                <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
                  dataKey="advice"
                  stroke={GREEN}
                  strokeWidth={2}
                  connectNulls={false}

                  dot={(props: { cx?: number; cy?: number; payload?: Row }) => {
                    const v = props.payload?.advice;
                    if (v === null || v === undefined || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) {
                      return <g key={props.payload?.label} />;
                    }
                    return (
                      <g key={props.payload?.label}>
                        <rect
                          x={(props.cx ?? 0) - 3}
                          y={(props.cy ?? 0) - 3}
                          width={6}
                          height={6}
                          fill={GREEN}
                          stroke="#fff"
                          strokeWidth={1}
                        />
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={10}
                          fill="transparent"
                          style={{ cursor: "pointer" }}
                          onClick={() => onRecordClick(props.payload!.record)}
                        />
                      </g>
                    );
                  }}
                />
                {/* 检测值：蓝实线；超上限/低于下限异常点橙红；标准缺失灰点；待回传无点不连线 */}
                <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
                  dataKey="flavor"
                  stroke={BLUE}
                  strokeWidth={2}
                  connectNulls={false}
                 
                  dot={(props: { cx?: number; cy?: number; payload?: Row }) => {
                    const v = props.payload?.flavor;
                    if (v === null || v === undefined || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) {
                      return <g key={props.payload?.label} />;
                    }
                    const b = props.payload!.record;
                    const result = resultOf(b);
                    const fill = result === "标准缺失" ? "#9ca3af" : result === "未达标" ? ORANGE : BLUE;
                    return (
                      <g key={props.payload?.label}>
                        <circle cx={props.cx} cy={props.cy} r={3} fill={fill} stroke="#fff" strokeWidth={1} />
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={10}
                          fill="transparent"
                          style={{ cursor: "pointer" }}
                          onClick={() => onRecordClick(props.payload!.record)}
                        />
                      </g>
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* 图例 */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-5" style={{ backgroundColor: BLUE }} />
              检测值
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-5" style={{ backgroundColor: GREEN }} />
              建议值
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-5 rounded-sm" style={{ backgroundColor: "rgba(22,163,74,0.15)" }} />
              合格区间
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ORANGE }} />
              异常
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
