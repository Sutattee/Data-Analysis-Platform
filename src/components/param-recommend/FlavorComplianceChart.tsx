"use client";

// 右图 · 加香出口水分：达标情况（与左图同一组历史批次，不含未来点）
// 蓝实线=实际值，超限点橙红并标注状态文字；橙虚线=目标线（dataKey 分段，标准换版处自然断开）；
// 浅绿 ReferenceArea=按连续同标准版本分段的合格区间；按生产时有效标准判定达标。
// 图上摘要：达标 X/Y 批 · 达标率 Z% · 待回传 M 批（Y=已有有效实际值且标准明确的批次，Y=0 不算率）。
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
  goal: number | null; // 分段目标线（dataKey 驱动；标准缺失为 null）
  record: BatchRecord;
}

/** 连续同标准版本段（用于分段绘制合格区间与版本标注） */
interface Segment {
  key: string;
  x1: string;
  x2: string;
  low: number;
  high: number;
  ver: string;
}

const BLUE = "#2563eb";
const GREEN = "#16a34a";
const OVER = "#ea580c";
const TARGET = "#f97316"; // 目标线（橙虚线）

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
  const rows: Row[] = history.map((b) => {
    const std = stdOf(b.brand, (b.startAt ?? b.planStart).slice(0, 10));
    return {
      label: batchLabelOf(b.batch),
      flavor: b.flavorActual,
      goal: std ? std.goal : null,
      record: b,
    };
  });

  // 连续同标准段（标准缺失批不参与成段）
  const segments: Segment[] = [];
  let cur: { key: string; ver: string; low: number; high: number; x1: string; x2: string } | null = null;
  for (const r of rows) {
    const std = stdOf(r.record.brand, (r.record.startAt ?? r.record.planStart).slice(0, 10));
    const key = std ? `${r.record.brand}|${std.ver}` : null;
    if (std && key && cur && cur.key === key) {
      cur.x2 = r.label;
    } else {
      if (cur) segments.push(cur);
      cur = std && key ? { key, ver: std.ver, low: std.low, high: std.high, x1: r.label, x2: r.label } : null;
    }
  }
  if (cur) segments.push(cur);

  // 摘要：Y = 已有有效实际值且标准明确（待核对不计入），X = 其中达标，M = 待回传
  const judged = rows.filter((r) => {
    const std = stdOf(r.record.brand, (r.record.startAt ?? r.record.planStart).slice(0, 10));
    return r.flavor !== null && std !== undefined && r.record.flavorLink === "已确认";
  });
  const passCount = judged.filter((r) => {
    const std = stdOf(r.record.brand, (r.record.startAt ?? r.record.planStart).slice(0, 10))!;
    return r.flavor! >= std.low && r.flavor! <= std.high;
  }).length;
  const pendingCount = rows.filter((r) => r.flavor === null).length;
  const missingStdCount = rows.filter((r) => {
    const std = stdOf(r.record.brand, (r.record.startAt ?? r.record.planStart).slice(0, 10));
    return std === undefined;
  }).length;
  const rateText = judged.length > 0 ? `达标率 ${Math.round((passCount / judged.length) * 100)}%` : "达标率 —";

  // 纵轴：实际值 + 各段上下限自适应
  const values = [
    ...rows.map((r) => r.flavor).filter((v): v is number => v !== null),
    ...segments.flatMap((s) => [s.low, s.high]),
  ];
  const hasData = values.length > 0;
  const vMin = hasData ? Math.min(...values) : 0;
  const vMax = hasData ? Math.max(...values) : 1;
  const span = vMax - vMin || 1;

  return (
    <Card title="加香出口水分：达标情况（%）">
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">当前筛选下暂无历史批次</p>
      ) : !hasData ? (
        <p className="py-12 text-center text-sm text-gray-400">当前筛选下暂无水分数据</p>
      ) : (
        <>
          <p className="mb-1 text-xs text-gray-500">
            达标 <span className="font-medium text-gray-800">{passCount}/{judged.length}</span> 批 · {rateText} · 待回传{" "}
            <span className="font-medium text-gray-800">{pendingCount}</span> 批
            {missingStdCount > 0 && (
              <>
                {" "}· 标准缺失 <span className="font-medium text-gray-800">{missingStdCount}</span> 批
              </>
            )}
          </p>
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
                    const result = resultOf(b);
                    return (
                      <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
                        <p className="font-medium text-gray-800">批次：{b.batch}</p>
                        <p className="mt-0.5 text-gray-500">
                          {b.brand} · {b.startAt ?? `${b.planStart}（计划）`}
                        </p>
                        <p className="mt-0.5 text-gray-600">
                          实际值：{b.flavorActual !== null ? `${fmt2(b.flavorActual)}%` : "待回传"}
                        </p>
                        {std ? (
                          <p className="mt-0.5 text-gray-600">
                            目标：{fmt2(std.goal)}% · 范围 {fmt2(std.low)}~{fmt2(std.high)}%（{std.ver}）
                          </p>
                        ) : (
                          <p className="mt-0.5 text-gray-500">目标：标准缺失（早于标准生效日）</p>
                        )}
                        <p
                          className={`mt-0.5 font-medium ${
                            result === "未达标" ? "text-red-600" : result === "达标" ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          达标状态：{result}
                          {b.flavorLink === "待核对" && "（物料关联待核对）"}
                        </p>
                      </div>
                    );
                  }}
                />
                {/* 分段合格区间：浅绿底 + 版本标注（标准换版处分段） */}
                {segments.map((s) => (
                  <ReferenceArea
                    key={`${s.key}-${s.x1}`}
                    x1={s.x1}
                    x2={s.x2}
                    y1={s.low}
                    y2={s.high}
                    fill={GREEN}
                    fillOpacity={0.08}
                    label={{ value: s.ver, position: "insideTop", fontSize: 9, fill: "#6b7280" }}
                  />
                ))}
                {/* 目标线：橙虚线（dataKey 分段，标准缺失处断开） */}
                <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
                  dataKey="goal"
                  stroke={TARGET}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  connectNulls={false}
                  dot={false}
                 
                />
                {/* 实际值：蓝实线；超限点橙红 + 状态文字；待核对空心琥珀；标准缺失灰点；待回传无点不连线 */}
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
                    const over = result === "未达标";
                    const unknownStd = result === "标准缺失";
                    const checking = result === "待核对";
                    const fill = over ? OVER : unknownStd ? "#9ca3af" : BLUE;
                    const r = over ? 4 : 3;
                    return (
                      <g key={props.payload?.label}>
                        {checking ? (
                          <circle cx={props.cx} cy={props.cy} r={4} fill="#fff" stroke="#d97706" strokeWidth={2} />
                        ) : (
                          <circle cx={props.cx} cy={props.cy} r={r} fill={fill} stroke="#fff" strokeWidth={1} />
                        )}
                        {over && (
                          <text x={props.cx} y={(props.cy ?? 0) - 10} textAnchor="middle" fontSize={10} fill={OVER}>
                            未达标
                          </text>
                        )}
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
              <span className="inline-block h-0.5 w-5 border-t-2 border-dashed" style={{ borderTopColor: TARGET }} />
              目标线（分段）
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-5 rounded-sm" style={{ backgroundColor: "rgba(22,163,74,0.15)" }} />
              合格区间
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: OVER }} />
              未达标
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-400">
            该图用于观察最终目标达标情况，达标率不等于「推荐有效率」。
          </p>
        </>
      )}
    </Card>
  );
}
