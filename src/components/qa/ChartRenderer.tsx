"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { parseMarkdownTable } from "@/lib/qa/parse-table";

// 图表配色
const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

// 解析数值字段
function parseValue(str: string): number {
  const cleaned = str.replace(/[,%↑↓]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// 判断列是否数值列
function isNumericCol(rows: string[][], colIdx: number): boolean {
  return rows.every((row) => {
    const val = row[colIdx];
    if (!val) return false;
    const cleaned = val.replace(/[,%↑↓\s]/g, "");
    return !isNaN(parseFloat(cleaned)) && parseFloat(cleaned) !== 0;
  });
}

interface ChartRendererProps {
  content: string;
  chartType: "bar" | "line" | "pie" | "area" | "scatter" | "table";
}

export function ChartRenderer({ content, chartType }: ChartRendererProps) {
  const table = parseMarkdownTable(content);
  if (!table) return null;

  const { headers, rows } = table;

  // 找数值列和名称列
  const numericCols = headers.map((_, i) => isNumericCol(rows, i));
  const nameColIdx = headers.findIndex((_, i) => !numericCols[i]);
  const firstNumericIdx = numericCols.indexOf(true);

  if (firstNumericIdx === -1) return null;

  // 构造 Recharts 数据
  const data = rows.map((row) => {
    const entry: Record<string, string | number> = {};
    entry.name = nameColIdx >= 0 ? row[nameColIdx].replace(/(吨|%|\s)/g, "") : row[0];
    headers.forEach((h, i) => {
      if (numericCols[i]) {
        entry[h.replace(/(\(|（).*(\)|）)/g, "").trim()] = parseValue(row[i]);
      }
    });
    return entry;
  });

  const valueKeys = headers.filter((_, i) => numericCols[i]).map((h) => h.replace(/(\(|（).*(\)|）)/g, "").trim());
  const numBars = valueKeys.length;

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {valueKeys.map((key, i) => (
              <Bar isAnimationActive animationDuration={900} animationEasing="ease-out" key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {valueKeys.map((key, i) => (
              <Line isAnimationActive animationDuration={900} animationEasing="ease-out" key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
            ))}
          </LineChart>
        );
      case "pie":
        return (
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie isAnimationActive animationDuration={900} animationEasing="ease-out"
              data={data.map((d) => ({
                name: d.name as string,
                value: d[valueKeys[0]] as number,
              }))}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {valueKeys.map((key, i) => (
              <Area isAnimationActive animationDuration={900} animationEasing="ease-out" key={key} type="monotone" dataKey={key} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.2} />
            ))}
          </AreaChart>
        );
      case "scatter":
        // 散点图用第一组数值作为 X，第二组作为 Y
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {valueKeys.slice(0, 2).map((key, i) => (
              <Bar isAnimationActive animationDuration={900} animationEasing="ease-out" key={key} dataKey={key} fill={COLORS[i * 3]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
      case "table":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {headers.map((h, i) => (
                    <th key={i} className="text-left py-2 px-3 font-medium text-gray-600 bg-gray-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-100 hover:bg-gray-50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2 px-3 text-gray-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  const chartHeight = chartType === "pie" ? 280 : 250;

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 my-3">
      <ResponsiveContainer width="100%" height={chartHeight}>
        {renderChart()}
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center mt-1">
        {headers.join(" / ")} • {rows.length} 条记录
      </p>
    </div>
  );
}
