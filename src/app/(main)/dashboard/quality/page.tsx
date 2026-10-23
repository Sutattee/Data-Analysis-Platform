"use client";

import {
  ComposedChart, LineChart, Line, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import * as D from "@/lib/mock-data/dashboard-v2";
import type { KpiItem } from "@/lib/mock-data/dashboard-v2";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function KpiCard({ k }: { k: KpiItem }) {
  const tc = k.trend === "up" ? "text-green-600" : k.trend === "down" ? "text-red-500" : "text-gray-400";
  const ar = k.trend === "up" ? "↑" : k.trend === "down" ? "↓" : "→";
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all duration-200">
      <div className="text-xs text-gray-500 mb-1">
        <span className="text-gray-400 font-mono mr-1">{k.code}</span>{k.label}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold text-gray-900">{k.value.toLocaleString()}</span>
        <span className="text-sm text-gray-400">{k.unit}</span>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${tc}`}>
        <span>{ar} {Math.abs(k.change)}{k.unit === "%" ? "pp" : ""}</span>
        {k.target !== undefined && <span className="text-gray-400 font-normal ml-1">目标 {k.target.toLocaleString()}{k.unit}</span>}
      </div>
    </div>
  );
}

function TrendChart({ data, domain }: { data: { date: string; actual: number; target: number; predict: number }[]; domain?: [number, number] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={4} />
        <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" domain={domain} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="predict" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.08} name="预测值" strokeDasharray="4 4" />
        <Line isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="3 3" name="目标值" dot={false} />
        <Line isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} name="实际值" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function QualityPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">工艺质量管控</h1>
        <p className="text-sm text-gray-500 mt-1">工艺质量模块关键 KPI（Q1–Q7）</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {D.qualityKpi.map((k) => <KpiCard key={k.code} k={k} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="📈 优质品率趋势"><TrendChart data={D.premiumYieldTrend} domain={[88, 98]} /></Card>

        {/* 烘丝机出口水分偏差（带控制上下限） */}
        <Card title="💧 烘丝机出口水分偏差趋势">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={D.moistureDevTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={4} />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" domain={[-0.8, 0.8]} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="upper" stroke="none" fill="#10b981" fillOpacity={0.06} name="控制上限" />
              <Area isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="lower" stroke="none" fill="#10b981" fillOpacity={0.06} name="控制下限" />
              <Line isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="3 3" name="目标值" dot={false} />
              <Line isAnimationActive animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} name="实际偏差" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="⚠️ 缺陷类型分析（Pareto）">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={D.defectPareto}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar isAnimationActive animationDuration={900} animationEasing="ease-out" yAxisId="left" dataKey="count" fill="#ef4444" name="缺陷数" radius={[4, 4, 0, 0]} />
              <Line isAnimationActive animationDuration={900} animationEasing="ease-out" yAxisId="right" type="monotone" dataKey="pct" stroke="#3b82f6" strokeWidth={2} name="累计占比(%)" dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="📊 工序质量得分">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={D.processQualityScore} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 10 }} unit="分" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v} 分`, "质量得分"]} />
              <Bar isAnimationActive animationDuration={900} animationEasing="ease-out" dataKey="score" radius={[4, 4, 0, 0]}>
                {D.processQualityScore.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
