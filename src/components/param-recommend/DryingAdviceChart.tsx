"use client";

// 左图 · 烘丝出口水分：实际与建议（双折线）
// 蓝实线+圆点=实际值；绿实线+方点=建议值（该批开工时锁定的推荐版本，逐批随输入重算呈波动，无历史推荐则空缺不连线）；
// 下一批次与筛选牌号一致且有推荐值时，最右侧追加空心推荐点并以竖虚线+「待生产」与历史区分隔；
// 缺失值不填 0、不跨缺失点连线；点击历史批次点打开对应记录详情。
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import {
  absDiffOf,
  batchLabelOf,
  fmt2,
  historyOf,
  type BatchRecord,
  type NextRecommendation,
} from "@/lib/mock-data/param-recommend";

interface Row {
  label: string;
  actual: number | null;
  advice: number | null;
  next: number | null;
  record: BatchRecord;
}

const BLUE = "#2563eb";
const GREEN = "#16a34a";

export function DryingAdviceChart({
  line,
  brand,
  range,
  rec,
  onRecordClick,
}: {
  line: string;
  brand: string;
  range: number;
  rec: NextRecommendation;
  onRecordClick: (b: BatchRecord) => void;
}) {
  const history = historyOf(line, brand, range);
  // 空心推荐点仅在已生成有效值且下一批次与筛选牌号一致时追加
  const includeNext = rec.value !== undefined && rec.batch !== undefined && rec.batch.brand === brand;

  const rows: Row[] = [
    ...history.map((b) => ({
      label: batchLabelOf(b.batch),
      actual: b.dryingActual,
      advice: b.dryingAdvice,
      next: null,
      record: b,
    })),
    ...(includeNext
      ? [{ label: batchLabelOf(rec.batch!.batch), actual: null, advice: null, next: rec.value!, record: rec.batch! }]
      : []),
  ];
  const lastHistoryLabel = history.length > 0 ? batchLabelOf(history[history.length - 1].batch) : undefined;

  // 纵轴：全部有效值（实际/建议/推荐）自适应，两侧留 0.25 裕量，非零起点
  const values = rows.flatMap((r) => [r.actual, r.advice, r.next]).filter((v): v is number => v !== null);
  const hasData = rows.length > 0 && values.length > 0;
  const yMin = hasData ? Math.min(...values) - 0.25 : 0;
  const yMax = hasData ? Math.max(...values) + 0.25 : 1;

  return (
    <Card title="烘丝出口水分：实际与建议（%）">
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
                    const diff = absDiffOf(b);
                    return (
                      <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
                        <p className="font-medium text-gray-800">
                          {row.next !== null ? "下一批次（待生产）" : `批次：${b.batch}`}
                        </p>
                        <p className="mt-0.5 text-gray-500">
                          {b.brand} · {b.startAt ?? `${b.planStart}（计划）`}
                        </p>
                        {row.next !== null ? (
                          <p className="mt-0.5 font-medium text-primary-600">推荐值：{fmt2(row.next)}%</p>
                        ) : (
                          <>
                            <p className="mt-0.5 text-gray-600">
                              实际值：{b.dryingActual !== null ? `${fmt2(b.dryingActual)}%` : "待回传"}
                            </p>
                            <p className="mt-0.5 text-gray-600">
                              建议值：
                              {b.dryingAdvice !== null
                                ? `${fmt2(b.dryingAdvice)}%`
                                : (b.adviceReason ?? "无有效推荐")}
                            </p>
                            <p className="mt-0.5 text-gray-600">
                              绝对差：{diff !== null ? `${diff.toFixed(2)} pct` : "—"}
                            </p>
                            {b.adviceGeneratedAt && (
                              <p className="mt-0.5 text-gray-500">推荐生成时间：{b.adviceGeneratedAt}</p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                {/* 历史 / 待产分隔线（仅有下一批推荐点时绘制） */}
                {includeNext && lastHistoryLabel && (
                  <ReferenceLine
                    x={lastHistoryLabel}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{ value: "待生产", position: "insideTopRight", fontSize: 10, fill: "#64748b" }}
                  />
                )}
                {/* 下一批推荐：空心蓝点 */}
                {includeNext && rec.value !== undefined && (
                  <ReferenceDot
                    x={batchLabelOf(rec.batch!.batch)}
                    y={rec.value}
                    r={5}
                    fill="#fff"
                    stroke={BLUE}
                    strokeWidth={2}
                  />
                )}
                {/* 实际值：蓝实线 + 圆点；待回传批次无点不连线；点热区点击打开记录详情 */}
                <Line
                  dataKey="actual"
                  stroke={BLUE}
                  strokeWidth={2}
                  connectNulls={false}
                  isAnimationActive={false}
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
                {/* 建议值：绿实线 + 方点（锁定版本，逐批波动）；无历史推荐的批次空缺不连线 */}
                <Line
                  dataKey="advice"
                  stroke={GREEN}
                  strokeWidth={2}
                  connectNulls={false}
                  isAnimationActive={false}
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
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* 图例 */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-5" style={{ backgroundColor: BLUE }} />
              实际值
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-5" style={{ backgroundColor: GREEN }} />
              建议值（锁定版本）
            </span>
            {includeNext && (
              <>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border-2 bg-white" style={{ borderColor: BLUE }} />
                  下一批推荐
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-gray-400" />
                  待生产分隔
                </span>
              </>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
