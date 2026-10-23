"use client";

import { useMemo, useState } from "react";
import {
  Bar, Cell, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/energy-overview/SegmentedControl";
import { getTrendSeries, type OverviewCardData, type TrendMetric, type TrendPoint } from "@/lib/mock-data/forecast-overview";

type RangeOpt = "7" | "15" | "30";

const ROW_CLS = {
  orange: "text-orange-600",
  green: "text-green-600",
  danger: "text-red-600",
  muted: "text-gray-500",
} as const;

// 自定义悬停：预测值；综合能耗含目标值（生效日起切换新目标）与预计差距，电耗/天然气含差异比例（基准 = 同工况历史均值，仅计算不绘制）
function ForecastTip({
  active,
  payload,
  label,
  metric,
  unit,
  diffBase,
}: {
  active?: boolean;
  payload?: { payload: TrendPoint }[];
  label?: string;
  metric: TrendMetric;
  unit: string;
  diffBase?: number;
}) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  // 综合能耗：差距按当日适用目标（生效日起切换为新目标）计算；其余指标按差异基准计算
  const target = pt.target;
  const base = metric === "comprehensive" ? target : diffBase;
  const diff = base !== undefined ? pt.predict - base : undefined;
  const pct = diff !== undefined && base ? (diff / base) * 100 : undefined;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-gray-700">{label}</p>
      <p className="text-primary-600">预测值：{pt.predict} {unit}</p>
      {pt.target !== undefined && (
        <p className="text-orange-600">目标值：≤ {pt.target} {unit}</p>
      )}
      {metric === "comprehensive" && diff !== undefined && pct !== undefined && (
        <p className={diff > 0 ? "text-red-600" : "text-green-600"}>
          预计差距：{diff >= 0 ? "+" : ""}{diff.toFixed(1)} {unit}（{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%）
        </p>
      )}
      {(metric === "packPower" || metric === "gas") && pct !== undefined && (
        <p className={pct > 0 ? "text-orange-600" : "text-green-600"}>
          差异比例：{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

// 指标预测卡：同一卡片内左侧为指标信息（主值 + 标签｜预测时间 + 辅助项横排并列，万支｜箱可切换），
// 右侧为对应趋势预测图（未来 7/15/30 日切换，图例置顶居中）；综合能耗含橙色实线目标值（生效日起阶梯切换新目标），
// 蒸汽为蓝色柱状（峰值柱橙色，点击峰值柱查看详情，图例含橙色「预测峰值」），其余为蓝色实线 + 峰值橙点
export function MetricForecastCard({ card }: { card: OverviewCardData }) {
  const metric = card.key as TrendMetric;
  const [range, setRange] = useState<RangeOpt>("7");
  const days = Number(range) as 7 | 15 | 30;
  const series = useMemo(() => getTrendSeries(metric, days), [metric, days]);
  // 点击峰值柱后展示的详情（蒸汽）
  const [peakDetail, setPeakDetail] = useState<string | null>(null);
  // 万支｜箱 单位切换（带 wanZhi 变体的卡片）
  const [unit, setUnit] = useState<"箱" | "万支">("箱");
  const wz = unit === "万支" ? card.wanZhi : undefined;
  const title = wz ? wz.title : card.title;
  const main = wz ? wz.main : card.main;
  const rows = wz ? wz.rows : card.rows;

  const isSteam = metric === "steam";
  const isComp = metric === "comprehensive";

  return (
    <Card padding={false} fill className="flex h-full min-h-0 flex-col">
      {/* 头部：指标名 + 万支/箱切换 + 预测周期切换 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 px-4 py-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {title}
          {card.wanZhi && (
            <span className="flex items-center text-xs font-normal leading-none">
              <button
                type="button"
                onClick={() => setUnit("万支")}
                className={unit === "万支" ? "font-medium text-primary-600" : "text-gray-400 hover:text-gray-600"}
              >
                万支
              </button>
              <span className="mx-0.5 text-gray-300">｜</span>
              <button
                type="button"
                onClick={() => setUnit("箱")}
                className={unit === "箱" ? "font-medium text-primary-600" : "text-gray-400 hover:text-gray-600"}
              >
                箱
              </button>
            </span>
          )}
        </span>
        <SegmentedControl
          options={[
            { value: "7", label: "未来7日" },
            { value: "15", label: "未来15日" },
            { value: "30", label: "未来30日" },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>

      {/* 主体：左信息右图（窄屏上下堆叠） */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* 左：指标信息（主值 + 标签｜预测时间 + 辅助项横排并列；左区占固定宽度比例，四张卡趋势图等宽） */}
        <div className="flex-shrink-0 border-b border-gray-50 px-4 py-2 md:w-[45%] md:border-b-0 md:border-r">
          <div className="text-xl font-bold text-gray-900">{main.value}</div>
          <div className="text-xs text-gray-400">
            {main.label}｜{card.predTime}
          </div>
          {/* 辅助项横排并列（窄屏自动换行） */}
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-gray-50 pt-1.5">
            {rows.map((r) => (
              <span key={r.label} className="whitespace-nowrap text-xs">
                <span className="text-gray-500">{r.label}</span>
                <span className={`ml-2 ${r.tone ? ROW_CLS[r.tone] : "text-gray-800"}`}>{r.value}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 右：趋势预测图 */}
        <div className="flex min-h-[160px] flex-1 flex-col px-4 py-2 lg:min-h-[120px]">
          {isSteam && peakDetail && (
            <p className="mb-2 rounded-lg bg-primary-50 px-3 py-2 text-xs leading-relaxed text-gray-700">{peakDetail}</p>
          )}
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series.points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                  interval={days <= 7 ? 0 : days <= 15 ? 1 : 3}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={48} domain={["auto", "auto"]} />
                <Tooltip content={<ForecastTip metric={metric} unit={series.unit} diffBase={series.diffBase} />} />
                {/* 图例统一置于图表上方正中间 */}
                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: 11, paddingBottom: 4 }} />
                {/* 预测值：蒸汽 = 蓝色柱（峰值柱橙色，点击峰值柱查看详情），其余 = 蓝色实线 */}
                {isSteam ? (
                  <Bar isAnimationActive animationDuration={900} animationEasing="ease-out"
                    dataKey="predict"
                    name="预测值"
                    fill="#3b82f6"
                    radius={[3, 3, 0, 0]}
                   
                    onClick={(data: unknown) => {
                      const pt = (data as { payload?: TrendPoint })?.payload;
                      if (pt?.peak !== undefined && series.peakInfo) {
                        setPeakDetail(`峰值详情（${series.peakInfo.date}）：预测 ${series.peakInfo.value} ${series.unit}`);
                      }
                    }}
                  >
                    {series.points.map((pt, i) => (
                      <Cell key={i} fill={pt.peak !== undefined ? "#f97316" : "#3b82f6"} />
                    ))}
                  </Bar>
                ) : (
                  <Line isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="predict" stroke="#3b82f6" strokeWidth={2} dot={false} name="预测值" />
                )}
                {/* 目标值（仅综合能耗）：同一条橙色实线，生效日起阶梯切换为新目标 */}
                {isComp && (
                  <Line isAnimationActive animationDuration={900} animationEasing="ease-out"
                    type="stepAfter"
                    dataKey="target"
                    stroke="#f97316"
                    strokeWidth={1.5}
                    dot={false}
                    name="目标值"
                   
                  />
                )}
                {/* 蒸汽峰值以橙色柱表达（不加圆点）；此处空图形仅用于生成橙色「预测峰值」图例项 */}
                {isSteam && (
                  <Scatter isAnimationActive animationDuration={900} animationEasing="ease-out"
                    dataKey="peak"
                    name="预测峰值"
                    fill="#f97316"
                    legendType="circle"
                    shape={() => <g />}
                   
                  />
                )}
                {/* 峰值标记：橙色点（仅折线图；蒸汽用橙色峰值柱表达，不加圆点） */}
                {!isSteam && (
                  <Scatter isAnimationActive animationDuration={900} animationEasing="ease-out"
                    dataKey="peak"
                    shape="circle"
                    fill="#f97316"
                    legendType="circle"
                    name="预测峰值"
                   
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}
