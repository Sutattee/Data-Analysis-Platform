"use client";

import { useState } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { CorrectionDrawer } from "@/components/grid-forecast/CorrectionDrawer";
import { CombinedDrawer } from "@/components/grid-forecast/CombinedDrawer";
import {
  GRADE_STYLE,
  GRADE_TO_LEVEL,
  getCorrectionEvents,
  type AnomalyDetail,
  type CorrectionEvent,
  type EvalGrade,
} from "@/lib/mock-data/grid-forecast";
import { getCarbonTrend } from "@/lib/mock-data/carbon-eval";
import type { AlertLevel } from "@/types";

const OBJECTS = ["全厂", "动力车间", "制丝车间", "卷包车间"];
const selectCls =
  "px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";

function buildCarbonAnomaly(object: string, metricName: string, unit: string, p: any): AnomalyDetail {
  return {
    title: `${object} · ${metricName}异常`,
    metricName,
    current: `${p.actual} ${unit}`,
    baseline: `${p.target} ${unit}`,
    deviation: `超出目标 ${(((p.actual - p.target) / p.target) * 100).toFixed(1)}%`,
    triggerTime: p.time ?? `${p.date}`,
    duration: "2小时15分钟",
    cause: "碳排放当量短期上升，可能由高碳能源消耗增加或产值波动引起。",
    suggestion: "排查高排放源（锅炉/工艺直燃），优化能源结构与负荷调度。",
    level: p.anomalyGrade ? GRADE_TO_LEVEL[p.anomalyGrade as EvalGrade] : "预警",
  };
}

function buildCarbonForecastAnomaly(object: string, metricName: string, unit: string, p: any): AnomalyDetail {
  return {
    title: `${object} · ${metricName} 预测超标`,
    metricName,
    forecastValue: `${p.predict} ${unit}`,
    baseline: `${p.target} ${unit}`,
    deviation: `预计超出目标 ${(((p.predict - p.target) / p.target) * 100).toFixed(1)}%`,
    confidenceRange: p.upper && p.lower ? `${p.lower} ~ ${p.upper} ${unit}` : undefined,
    forecastTime: `预计${p.date}越界`,
    cause: "根据历史碳排放趋势预测，未来该指标可能超出目标/标准。",
    suggestion: "建议提前推进减排措施，优化高排放源运行，降低超标风险。",
    level: "预警" as AlertLevel,
  };
}

export function CarbonTrendChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  const [object, setObject] = useState("全厂");
  const [metric, setMetric] = useState<"总量" | "单位产值">("总量");
  const [range, setRange] = useState<"1m" | "3m">("3m");
  const [correction, setCorrection] = useState<CorrectionEvent | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [combined, setCombined] = useState<{ event: CorrectionEvent; anomaly: AnomalyDetail } | null>(null);

  const data = getCarbonTrend(object, metric, range);
  const unit = metric === "总量" ? "tCO₂e" : "tCO₂e/万元";
  const metricName = metric === "总量" ? "碳排放总量" : "单位产值碳排放量";
  const events = getCorrectionEvents();
  // 事件与异常点重合日期（组合标记）
  const overlapDates = new Set(
    events.filter((e) => data.find((d) => d.date === e.effectDate && d.anomalyGrade)).map((e) => e.effectDate)
  );

  function handleClick(e: any) {
    if (!e?.activeLabel) return;
    const pt = data.find((d) => d.date === e.activeLabel);
    // 组合标记（事件 + 异常重合）优先
    if (pt && overlapDates.has(e.activeLabel)) {
      const ev = events.find((x) => x.effectDate === e.activeLabel)!;
      setCombined({ event: ev, anomaly: buildCarbonAnomaly(object, metricName, unit, pt) });
      return;
    }
    const ev = events.find((x) => x.effectDate === e.activeLabel);
    if (ev) {
      setCorrection(ev);
      return;
    }
    if (!pt) return;
    if (pt.anomalyGrade) onAnomaly(buildCarbonAnomaly(object, metricName, unit, pt));
    else if (pt.breach) onAnomaly(buildCarbonForecastAnomaly(object, metricName, unit, pt));
  }

  return (
    <Card
      title="📈 碳排放趋势与预测"
      headerRight={
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectCls} value={object} onChange={(e) => setObject(e.target.value)}>
            {OBJECTS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <select className={selectCls} value={metric} onChange={(e) => setMetric(e.target.value as "总量" | "单位产值")}>
            <option value="总量">碳排放总量</option>
            <option value="单位产值">单位产值碳排放量</option>
          </select>
          <select className={selectCls} value={range} onChange={(e) => setRange(e.target.value as "1m" | "3m")}>
            <option value="3m">未来3个月</option>
            <option value="1m">未来1个月</option>
          </select>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" domain={metric === "单位产值" ? [0.25, 0.45] : ["dataMin", "dataMax"]} tickFormatter={(v: number) => (metric === "单位产值" ? (+v).toFixed(2) : `${v}`)} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [metric === "单位产值" ? (+v).toFixed(2) : v, ({ actual: "实际值", target: "目标/标准", predict: "预测值(修正后)", originalPredict: "修正前预测", upper: "置信区间", lower: "置信区间" } as Record<string, string>)[n as string] ?? n]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="upper" stroke="none" fill="#bfdbfe" fillOpacity={0.5} name="置信区间" />
          <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} legendType="none" />
          <Line type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="4 4" dot={false} name="目标/标准" />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="实际值" connectNulls />
          <Line type="monotone" dataKey="predict" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 4" dot={false} name="预测值(修正后)" connectNulls />
          <Line type="monotone" dataKey="originalPredict" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="修正前预测" connectNulls hide={!showOriginal} />
          {events.map((ev) => (
            <ReferenceLine
              key={`e${ev.effectDate}`}
              x={ev.effectDate}
              stroke="#f59e0b"
              strokeDasharray="5 3"
              label={{ value: ev.name, fontSize: 9, fill: "#b45309", position: "insideTopRight" }}
            />
          ))}
          {/* 事件修正点（排除与异常重合的组合标记日期） */}
          {events.filter((ev) => !overlapDates.has(ev.effectDate)).map((ev) => {
            const pt = data.find((d) => d.date === ev.effectDate);
            return pt?.predict != null ? (
              <ReferenceDot key={`ed${ev.effectDate}`} x={ev.effectDate} y={pt.predict} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} ifOverflow="extendDomain" />
            ) : null;
          })}
          {/* 当前异常点（排除与事件重合的组合标记日期） */}
          {data
            .filter((d) => d.anomalyGrade && !overlapDates.has(d.date))
            .map((d) => (
              <ReferenceDot key={`a${d.date}`} x={d.date} y={d.actual ?? d.predict} r={5} fill={GRADE_STYLE[d.anomalyGrade as EvalGrade].color} stroke="#fff" strokeWidth={1.5} ifOverflow="extendDomain" />
            ))}
          {/* 组合标记：事件 + 异常重合（位于预测曲线，黄实心圆 + 橙外环） */}
          {data
            .filter((d) => d.anomalyGrade && overlapDates.has(d.date))
            .map((d) => (
              <ReferenceDot key={`c${d.date}`} x={d.date} y={d.predict} r={6} fill="#eab308" stroke="#f97316" strokeWidth={2.5} ifOverflow="extendDomain" />
            ))}
          {/* 预计越界点（橙色空心 + 标注） */}
          {data
            .filter((d) => d.breach)
            .map((d) => (
              <ReferenceDot key={`b${d.date}`} x={d.date} y={d.predict} r={6} fill="none" stroke="#f97316" strokeWidth={2} ifOverflow="extendDomain" />
            ))}
          {data
            .filter((d) => d.breach)
            .map((d) => (
              <ReferenceLine key={`bl${d.date}`} x={d.date} stroke="transparent" label={{ value: `预计${d.date}越界`, fontSize: 9, fill: "#f97316", position: "insideTopRight" }} />
            ))}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          蓝实线=实际，蓝虚线=修正后预测，浅蓝带=置信区间，橙线=目标/标准；点击异常点/越界点/事件标记查看详情。
        </p>
        <button onClick={() => setShowOriginal((v) => !v)} className="text-xs text-primary-600 hover:underline">
          {showOriginal ? "隐藏修正前预测" : "查看修正前预测"}
        </button>
      </div>
      <CorrectionDrawer open={correction !== null} onClose={() => setCorrection(null)} event={correction} />
      <CombinedDrawer open={combined !== null} onClose={() => setCombined(null)} event={combined?.event ?? null} anomaly={combined?.anomaly ?? null} />
    </Card>
  );
}
