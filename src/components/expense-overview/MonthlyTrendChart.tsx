"use client";

import { useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList, ReferenceDot, Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import {
  expenseDataOf, trendInterpretation, type ExpenseMonth,
} from "@/lib/mock-data/expense-overview";

// 派生图表行：1-8 月实际口径 + 9-12 月预测口径（预测执行 = 预算计划；预测累计消耗度 = 累计实际 ÷ 年度预算）
interface TrendRow extends ExpenseMonth {
  executed?: number;        // 柱系列值：1-8 月实际执行 / 9-12 月预测执行（万元，预测 = 预算计划）
  forecast?: number;        // 预测执行（9-12 月，万元；字段存在即预测月，柱样式与 Tooltip 按此区分）
  cumRateForecast?: number | null; // 预测累计消耗度（%，9-12 月延伸；8 月点带上实际值使虚线从 8 月连出）
}

// Tooltip：预算计划 / 实际执行 / 预测执行 / 累计消耗度
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as TrendRow;
  const cum = d.cumRate ?? d.cumRateForecast;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-gray-800">{label}</p>
      <p className="text-gray-500">预算计划：{d.plan.toLocaleString()} 万元</p>
      {d.forecast !== undefined ? (
        <p className="text-gray-500">预测执行：{d.forecast.toLocaleString()} 万元</p>
      ) : (
        <p className="text-gray-500">实际执行：{d.actual !== null ? `${d.actual.toLocaleString()} 万元` : "—"}</p>
      )}
      <p className="mt-0.5 border-t border-gray-100 pt-0.5 text-gray-400">
        累计消耗度：{cum !== null && cum !== undefined ? `${cum}%` : "—"}
      </p>
    </div>
  );
}

// 月度执行趋势：预算计划 / 实际执行双柱 + 9-12 月预测执行虚线柱（= 预算计划）+
// 累计消耗度折线（右轴，1-8 月实线、9-12 月蓝色虚线延伸）+ 100% 预算线 +
// 预测累计超预算时橙色标记点（首点标注「预计超预算」），随科目筛选联动
export function MonthlyTrendChart({ subjectId }: { subjectId: string }) {
  const summary = expenseDataOf(subjectId);

  // 派生预测口径：累计实际 + 预测期各月计划 → 预测累计消耗度
  const data: TrendRow[] = useMemo(() => {
    const executed = summary.monthly.reduce((s, m) => s + (m.actual ?? 0), 0);
    let acc = executed;
    return summary.monthly.map((m, i) => {
      if (m.actual !== null) {
        // 8 月点（最后一个实际月）带上 cumRateForecast，虚线从该点连出
        const isLastActual = summary.monthly[i + 1]?.actual === null || i === summary.monthly.length - 1;
        return { ...m, executed: m.actual, cumRateForecast: isLastActual ? m.cumRate : null };
      }
      acc += m.plan; // 预测执行 = 预算计划
      return {
        ...m,
        executed: m.plan,
        forecast: m.plan,
        cumRateForecast: Math.round((acc / summary.budget) * 1000) / 10,
      };
    });
  }, [summary]);

  // 预测累计超预算的月份（> 100% 预算线）
  const overPoints = data.filter((d) => d.forecast !== undefined && (d.cumRateForecast ?? 0) > 100);
  const firstOver = overPoints[0];

  return (
    <Card title="月度执行趋势（万元）" headerRight={<span className="text-xs text-gray-400">{summary.name}</span>}>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          {/* 左轴：金额（万元）；右轴：累计消耗度（%） */}
          <YAxis yAxisId="amount" tick={{ fontSize: 10 }} stroke="#9ca3af" width={56} />
          {/* 右轴上限随预测累计消耗度扩展（超 100% 时折线完整展示） */}
          <YAxis yAxisId="rate" orientation="right" tick={{ fontSize: 10 }} stroke="#9ca3af" width={44} domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]} unit="%" />
          <Tooltip content={<TrendTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.06)" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {/* 100% 预算线（右轴，橙色虚线） */}
          <ReferenceLine yAxisId="rate" y={100} stroke="#f97316" strokeDasharray="6 4" label={{ value: "100% 预算线", position: "insideTopRight", fontSize: 10, fill: "#f97316" }} />
          <Bar yAxisId="amount" dataKey="plan" name="预算计划" fill="#7dd3fc" radius={[3, 3, 0, 0]} barSize={16}>
            <LabelList dataKey="plan" position="top" formatter={(v: any) => Number(v).toLocaleString()} style={{ fontSize: 9, fill: "#0284c7" }} />
          </Bar>
          {/* 实际执行（1-8 月深蓝实心）/ 预测执行（9-12 月浅蓝虚线柱，值同预算计划）合并为同一柱系列
              共享槽位：9-12 月预测柱紧贴预算计划柱右侧、1-8 月实际柱同位，均不错位；
              预测柱不进图例（由下方蓝色虚线「预测执行」代表） */}
          <Bar yAxisId="amount" dataKey="executed" name="实际执行" fill="#1d4ed8" radius={[3, 3, 0, 0]} barSize={16}>
            {data.map((d) => (
              <Cell
                key={d.month}
                fill={d.forecast !== undefined ? "#dbeafe" : "#1d4ed8"}
                stroke={d.forecast !== undefined ? "#3b82f6" : undefined}
                strokeDasharray={d.forecast !== undefined ? "4 3" : undefined}
                strokeOpacity={d.forecast !== undefined ? 0.8 : undefined}
              />
            ))}
            <LabelList dataKey="executed" position="top" formatter={(v: any) => Number(v).toLocaleString()} style={{ fontSize: 9, fill: "#1d4ed8" }} />
          </Bar>
          <Line yAxisId="rate" type="monotone" dataKey="cumRate" name="累计消耗度" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: "#3b82f6" }} connectNulls />
          {/* 累计消耗度预测延伸（蓝色虚线，9-12 月） */}
          <Line yAxisId="rate" type="monotone" dataKey="cumRateForecast" name="预测执行" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 2, fill: "#3b82f6" }} connectNulls />
          {/* 预测累计超预算：橙色标记点（首点标注文字） */}
          {overPoints.map((p) => (
            <ReferenceDot
              key={p.month}
              yAxisId="rate"
              x={p.month}
              y={p.cumRateForecast as number}
              r={5}
              fill="#f97316"
              stroke="#fff"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={
                p === firstOver
                  ? { value: "预计超预算", position: "top", fontSize: 10, fill: "#f97316" }
                  : undefined
              }
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 大模型数据解读（每月自动更新，300 字内） */}
      <div className="mt-3 rounded-lg border border-primary-100 bg-primary-50/60 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary-700">
          <span>🤖</span>数据解读
        </div>
        <p className="text-xs leading-relaxed text-gray-600">{trendInterpretation(summary)}</p>
      </div>
    </Card>
  );
}
