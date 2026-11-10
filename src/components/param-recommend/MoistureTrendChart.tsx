"use client";

// 左图 · 成品水分趋势（单折线，仅展示近 N 批次的检测值）
// 蓝实线+圆点=检测值；缺失（待回传）不填 0、不跨缺失点连线；点击历史批次点打开对应记录详情。
// 浅绿 ReferenceArea=按连续同标准版本分段的合格区间（与右图同一口径）；
// 烘丝工艺允许范围（12.5%~13.5%）为管控上限 / 下限两条水平虚线；图例仅列「合格区间」。
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
import { Card } from "@/components/ui/Card";
import {
  DRYING_RANGE,
  batchLabelOf,
  fmt2,
  historyOf,
  stdOf,
  type BatchRecord,
} from "@/lib/mock-data/param-recommend";

interface Row {
  label: string;
  actual: number | null;
  record: BatchRecord;
}

/** 连续同标准版本段（用于分段绘制合格区间，与右图同一逻辑） */
interface Segment {
  key: string;
  x1: string;
  x2: string;
  low: number;
  high: number;
}

const BLUE = "#2563eb";
const GREEN = "#16a34a";
const RED = "#dc2626";

export function MoistureTrendChart({
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
    actual: b.dryingActual,
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

  // 纵轴：检测值 + 合格段边界 + 管控上下限自适应，上下留 12% 裕量
  const values = [
    ...rows.map((r) => r.actual).filter((v): v is number => v !== null),
    ...segments.flatMap((s) => [s.low, s.high]),
    DRYING_RANGE.low,
    DRYING_RANGE.high,
  ];
  const hasData = rows.length > 0 && values.length > 0;
  const vMin = hasData ? Math.min(...values) : 0;
  const vMax = hasData ? Math.max(...values) : 1;
  const span = vMax - vMin || 1;

  return (
    <Card title="成品水分趋势（%）">
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
                  domain={[vMin - span * 0.12, vMax + span * 0.12]}
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
                          检测值：{b.dryingActual !== null ? `${fmt2(b.dryingActual)}%` : "待回传"}
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
                {/* 管控上限 / 下限：烘丝工艺允许范围两条水平虚线（不进图例） */}
                <ReferenceLine
                  y={DRYING_RANGE.high}
                  stroke={RED}
                  strokeDasharray="6 4"
                  strokeWidth={1}
                  label={{ value: "管控上限", position: "insideTopRight", fill: RED, fontSize: 10 }}
                />
                <ReferenceLine
                  y={DRYING_RANGE.low}
                  stroke={RED}
                  strokeDasharray="6 4"
                  strokeWidth={1}
                  label={{ value: "管控下限", position: "insideBottomRight", fill: RED, fontSize: 10 }}
                />
                {/* 检测值：蓝实线 + 圆点；待回传批次无点不连线；点热区点击打开记录详情 */}
                <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
                  dataKey="actual"
                  stroke={BLUE}
                  strokeWidth={2}
                  connectNulls={false}

                  dot={(props: { cx?: number; cy?: number; payload?: Row }) => {
                    const v = props.payload?.actual;
                    if (v === null || v === undefined || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) {
                      return <g key={props.payload?.label} />;
                    }
                    return (
                      <g key={props.payload?.label}>
                        <circle cx={props.cx} cy={props.cy} r={3} fill={BLUE} stroke="#fff" strokeWidth={1} />
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
          {/* 图例：仅列「合格区间」一项（管控上下限虚线不进图例） */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-5 rounded-sm" style={{ backgroundColor: "rgba(22,163,74,0.15)" }} />
              合格区间
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
