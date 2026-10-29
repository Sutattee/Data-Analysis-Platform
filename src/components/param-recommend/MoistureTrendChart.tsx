"use client";

// 左图 · 成品水分趋势（单折线，仅展示近 N 批次的实际值）
// 蓝实线+圆点=实际值；缺失（待回传）不填 0、不跨缺失点连线；点击历史批次点打开对应记录详情。
import {
  CartesianGrid,
  Line,
  LineChart,
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
  type BatchRecord,
} from "@/lib/mock-data/param-recommend";

interface Row {
  label: string;
  actual: number | null;
  record: BatchRecord;
}

const BLUE = "#2563eb";

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

  // 纵轴：实际值自适应，两侧留 0.25 裕量，非零起点
  const values = rows.map((r) => r.actual).filter((v): v is number => v !== null);
  const hasData = rows.length > 0 && values.length > 0;
  const yMin = hasData ? Math.min(...values) - 0.25 : 0;
  const yMax = hasData ? Math.max(...values) + 0.25 : 1;

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
                  domain={[yMin, yMax]}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const row: Row = payload[0].payload;
                    const b = row.record;
                    return (
                      <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
                        <p className="font-medium text-gray-800">批次：{b.batch}</p>
                        <p className="mt-0.5 text-gray-600">牌号：{b.brand}</p>
                        <p className="mt-0.5 text-gray-600">
                          生产时间：{b.startAt ?? `${b.planStart}（计划）`}
                        </p>
                        <p className="mt-0.5 text-gray-600">
                          实际值：{b.dryingActual !== null ? `${fmt2(b.dryingActual)}%` : "待回传"}
                        </p>
                      </div>
                    );
                  }}
                />
                {/* 实际值：蓝实线 + 圆点；待回传批次无点不连线；点热区点击打开记录详情 */}
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
          {/* 图例 */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-5" style={{ backgroundColor: BLUE }} />
              实际值
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
