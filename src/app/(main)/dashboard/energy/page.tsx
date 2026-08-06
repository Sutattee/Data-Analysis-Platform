"use client";

import {
  ComposedChart, Line, Area, BarChart, Bar, PieChart, Pie, XAxis, YAxis,
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
        <Area type="monotone" dataKey="predict" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.08} name="预测值" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="3 3" name="目标值" dot={false} />
        <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} name="实际值" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// 单箱物耗（实际 vs 目标，越低越好）
function MaterialBar({ m }: { m: { name: string; value: number; target: number; unit: string } }) {
  const pct = Math.min((m.value / m.target) * 100, 100);
  const ok = m.value <= m.target;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{m.name}</span>
        <span className={ok ? "text-green-600" : "text-red-500"}>{m.value.toLocaleString()} {m.unit} <span className="text-gray-400">/ 目标 {m.target.toLocaleString()}</span></span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function EnergyPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">能源消耗管理</h1>
        <p className="text-sm text-gray-500 mt-1">能源消耗模块关键 KPI（E1–E9）</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {D.energyKpi.map((k) => <KpiCard key={k.code} k={k} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="📈 单箱卷烟综合能耗趋势（公斤标煤/箱）"><TrendChart data={D.energyConsumeTrend} domain={[10, 16]} /></Card>
        <Card title="🌱 单位产值碳排放量趋势（吨/万元）"><TrendChart data={D.carbonTrend} domain={[0.1, 0.18]} /></Card>
        <Card title="🧪 污水排放 COD 趋势（mg/L）"><TrendChart data={D.codTrend} domain={[30, 60]} /></Card>

        <Card title="📦 单箱物耗对比（实际 vs 目标）">
          <div className="space-y-4 pt-2">
            {D.materialConsumeCompare.map((m) => <MaterialBar key={m.name} m={m} />)}
          </div>
        </Card>

        <Card title="🍩 能源消耗结构">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={D.energyStructure} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                {D.energyStructure.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="🔧 主要用能环节能耗排行">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[
              { name: "制丝工序", energy: 35 },
              { name: "卷接工序", energy: 28 },
              { name: "包装工序", energy: 18 },
              { name: "动力车间", energy: 12 },
              { name: "其他", energy: 7 },
            ]} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" unit="%" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}%`, "能耗占比"]} />
              <Bar dataKey="energy" radius={[0, 4, 4, 0]}>
                {[0, 1, 2, 3, 4].map((i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
