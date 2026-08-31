"use client";

import {
  ComposedChart, Line, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import type { ForecastResult } from "@/lib/mock-data/forecast";

const TONE_CLS: Record<string, string> = {
  good: "text-green-600",
  warn: "text-orange-600",
  danger: "text-red-600",
  muted: "text-gray-500",
};

// 核心预测结果：一句话结论 + 字段卡 + 类型专属图表
export function ForecastResultView({ result }: { result: ForecastResult }) {
  const { chart } = result;

  return (
    <div className="space-y-4">
      {/* 一句话核心结论：加粗展示，宽度减半 */}
      <div className="w-full lg:w-1/2 rounded-lg border border-primary-100 bg-primary-50 p-4 text-sm font-bold leading-relaxed text-gray-800">
        {result.headline}
      </div>

      {/* 核心结果字段：同一卡片内竖排展示，数值加大加粗凸显（不展示预测模型） */}
      <div className="w-full lg:w-1/2 rounded-lg border border-gray-100 bg-white p-4">
        <div className="divide-y divide-gray-50">
          {result.fields
            .filter((f) => f.label !== "预测模型")
            .map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-gray-500 flex-shrink-0">{f.label}</span>
                <span className={`text-xl font-bold ${f.tone ? TONE_CLS[f.tone] : "text-gray-900"}`}>{f.value}</span>
              </div>
            ))}
        </div>
      </div>

      {/* 类型专属图表：宽度减半 */}
      <div className="w-full lg:w-1/2 rounded-lg border border-gray-100 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">预测图表</h4>
          <span className="text-xs text-gray-400">
            模型：{result.meta.model}｜历史数据：{result.meta.historyRange}
          </span>
        </div>

        {(chart.kind === "trend" || chart.kind === "target") && (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chart.points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={chart.points.length > 20 ? 4 : 0} />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={56} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {/* 预测区间：上界浅蓝填充 + 下界白色覆盖 */}
              <Area type="monotone" dataKey="upper" stroke="none" fill="#bfdbfe" fillOpacity={0.5} name="预测区间上界" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} legendType="none" />
              {chart.kind === "target" && (
                <Line type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="4 4" dot={false} name="目标值" />
              )}
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls name="实际值" />
              <Line
                type="monotone"
                dataKey="predict"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
                name="预测值"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {chart.kind === "scenario-line" && (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chart.points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={56} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="baseline" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 4" dot={false} name="当前计划工况（基准）" />
              <Line type="monotone" dataKey="scenario" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="测算工况" />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {chart.kind === "scenario-bar" && (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart.bars} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={64} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="value" name={`预测值(${chart.unit})`} radius={[4, 4, 0, 0]} barSize={64}>
                {chart.bars.map((b, i) => (
                  <Cell key={i} fill={b.tone === "actual" ? "#3b82f6" : "#93c5fd"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {chart.kind === "reverse" && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chart.bars} layout="vertical" margin={{ top: 8, right: 32, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={180} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="value" name={chart.unit} radius={[0, 4, 4, 0]} barSize={20}>
                {chart.bars.map((b, i) => (
                  <Cell key={i} fill={b.tone === "target" ? "#f97316" : "#3b82f6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
