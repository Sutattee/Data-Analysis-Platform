"use client";

import {
  ComposedChart, Line, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
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

// 通用趋势图（实际值/预测值/目标值）
function TrendChart({ data, domain }: { data: { date: string; actual: number; target: number; predict: number }[]; domain?: [number, number] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={4} />
        <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" domain={domain} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="predict" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.08} name="预测值" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="3 3" name="目标值" dot={false} />
        <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} name="实际值" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function ProductionPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">生产管理</h1>
        <p className="text-sm text-gray-500 mt-1">生产运行模块关键 KPI（P1–P9）</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {D.productionKpi.map((k) => <KpiCard key={k.code} k={k} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="📈 设备运行效率趋势"><TrendChart data={D.equipmentEffTrend} domain={[80, 95]} /></Card>
        <Card title="📈 生产效率趋势"><TrendChart data={D.productionEffTrend} domain={[90, 100]} /></Card>
        <Card title="💰 运营成本趋势（万元/日）"><TrendChart data={D.operationCostTrend} /></Card>

        <Card title="⚡ 机台运行效率排行">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={D.machineEffRank} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[80, 95]} tick={{ fontSize: 10 }} stroke="#9ca3af" unit="%" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}%`, "运行效率"]} />
              <Bar dataKey="eff" radius={[0, 4, 4, 0]}>
                {D.machineEffRank.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="⚠️ 生产异常分析（Pareto）">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={D.productionAnomalyPareto}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="次数" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="pct" stroke="#ef4444" strokeWidth={2} name="累计占比(%)" dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
