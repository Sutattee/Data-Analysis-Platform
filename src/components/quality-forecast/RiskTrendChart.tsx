"use client";

// 风险预测趋势图：历史实线 + 未来虚线 + 中/高风险阈值参考线 + 预测区标注
// 评分 0-1；横轴为相对预测时刻的小时刻度（−5小时 … 现在 … ＋8小时）
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { levelOf, type DefectForecast } from "@/lib/mock-data/quality-defect-forecast";

interface Row {
  label: string;
  t: string;
  histScore: number | null;
  futureScore: number | null;
}

export function RiskTrendChart({ defectName, forecast }: { defectName: string; forecast: DefectForecast }) {
  const level = levelOf(forecast.score);
  // 历史点（含"现在"）走实线；"现在"点同时携带 futureScore 使虚线自此衔接；未来点走虚线
  const data: Row[] = [
    ...forecast.hist.map((p, i) => ({
      label: p.label,
      t: p.t,
      histScore: p.score,
      futureScore: i === forecast.hist.length - 1 ? p.score : null,
    })),
    ...forecast.future.slice(1).map((p) => ({ label: p.label, t: p.t, histScore: null, futureScore: p.score })),
  ];
  const lastLabel = data[data.length - 1]?.label ?? "＋8小时";

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={0} minTickGap={20} />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
            tickFormatter={(v: number) => v.toFixed(1)}
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
          />
          {/* 预测区（现在 → ＋8小时）浅色底标注 */}
          <ReferenceArea x1="现在" x2={lastLabel} fill="#2563eb" fillOpacity={0.04} label={{ value: "预测区", position: "insideTopLeft", fontSize: 10, fill: "#93c5fd" }} />
          {/* 阈值参考线：中风险 0.40 橙 / 高风险 0.70 红 */}
          <ReferenceLine
            y={0.4}
            stroke="#f97316"
            strokeDasharray="4 4"
            label={{ value: "中风险阈值 0.40", position: "insideTopRight", fontSize: 10, fill: "#f97316" }}
          />
          <ReferenceLine
            y={0.7}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: "高风险阈值 0.70", position: "insideBottomRight", fontSize: 10, fill: "#ef4444" }}
          />
          {/* 历史风险：实线；当前点按等级色放大 */}
          <Line
            dataKey="histScore"
            stroke="#2563eb"
            strokeWidth={2}
            dot={(props: { cx?: number; cy?: number; payload?: Row }) => {
              const isNow = props.payload?.label === "现在";
              return (
                <circle
                  key={props.payload?.label}
                  cx={props.cx}
                  cy={props.cy}
                  r={isNow ? 5 : 3}
                  fill={isNow ? level.color : "#2563eb"}
                  stroke="#fff"
                  strokeWidth={1}
                />
              );
            }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          {/* 未来预测：虚线（首点=现在，与历史衔接） */}
          <Line
            dataKey="futureScore"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: "#2563eb", stroke: "#fff", strokeWidth: 1 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload;
              const score = row.histScore ?? row.futureScore ?? 0;
              const lv = levelOf(score);
              return (
                <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="text-gray-500">机台：{forecast.machine}</p>
                  <p className="mt-0.5 text-gray-500">预测时间：{row.t}</p>
                  <p className="mt-0.5 font-medium text-gray-800">评分：{score.toFixed(2)}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-gray-600">
                    等级：
                    <span className="font-medium" style={{ color: lv.color }}>
                      {lv.label}
                    </span>
                  </p>
                </div>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      {/* 图例 */}
      <div className="mt-1 flex items-center justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-primary-600" />
          历史风险
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-primary-600" />
          预测趋势
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: level.color }} />
          当前 {defectName}评分 {forecast.score.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
