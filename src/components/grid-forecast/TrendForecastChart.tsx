"use client";

import { useState } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot, ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { CorrectionDrawer } from "@/components/grid-forecast/CorrectionDrawer";
import { CombinedDrawer } from "@/components/grid-forecast/CombinedDrawer";
import {
  getTrendForecast, GRADE_STYLE, GRADE_TO_LEVEL, pickAlertRecordId, getCorrectionEvents,
  type AnomalyDetail, type CorrectionEvent, type EvalGrade, type ForecastRange,
} from "@/lib/mock-data/grid-forecast";
import type { AlertLevel } from "@/types";

const OBJECTS = ["全厂", "动力车间", "制丝车间", "卷包车间"];
const selectCls =
  "px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";

// AI 异常原因：按指标生成综合分析，按影响程度由高到低，融入关联对象/影响程度/证据/可信度
function buildCause(object: string, metricName: string, unit: string, p: any): string {
  if (metricName === "单箱卷烟综合能耗") {
    return `经分析，本次${object}单箱卷烟综合能耗升至 ${p.actual} ${unit}，主要受产量下降和制冷效率降低共同影响。\n首要原因是卷包车间排产减少2个班次，日产量下降12%，但固定能耗未同步下降，导致单位产量分摊能耗增加，影响程度高、可信度高；\n其次，AH13制冷主机COP由4.2降至3.1，设备电耗同步上升，对单箱能耗产生中等程度影响，可信度高；\n此外，外界温度由28℃升至35℃，可能进一步增加空调及制冷负荷，影响程度低、可信度中。`;
  }
  return `经分析，本次${object}综合能耗升至 ${p.actual} ${unit}，主要受生产负荷提升与蒸汽管网损耗增大共同影响。\n首要原因是卷包车间新增排产班次，主要用能设备运行时长增加，能耗随之上升，影响程度高、可信度高；\n其次，蒸汽管网2号分段疏水阀存在内漏，管网损耗增大约8%，对整体能耗产生中等影响，可信度中；\n此外，近期外界气温下降，供暖与伴热负荷上升，可能进一步推高能耗，影响程度低、可信度中。`;
}

// 当前异常详情（actual 段异常点）
function buildAnomaly(object: string, metricName: string, unit: string, p: any): AnomalyDetail {
  return {
    title: `${object} · ${metricName}异常`,
    metricName,
    current: `${p.actual} ${unit}`,
    baseline: `${p.target} ${unit}`,
    deviation: `超出目标 ${(((p.actual - p.target) / p.target) * 100).toFixed(1)}%`,
    triggerTime: p.time ?? `${p.date}`,
    duration: "2小时15分钟",
    // 动力车间：该对象当前数据不足，演示"暂无依据 → 补充异常原因"流程；其余对象展示 AI 综合分析
    cause: object === "动力车间" ? "" : buildCause(object, metricName, unit, p),
    suggestion: "核查主要用能设备启停与负载，优化错峰用电与蒸汽供给策略。",
    recordId: pickAlertRecordId(object),
    level: p.anomalyGrade ? GRADE_TO_LEVEL[p.anomalyGrade as EvalGrade] : "预警",
  };
}

// 预测异常详情（predict 段越界点）
function buildForecastAnomaly(object: string, metricName: string, unit: string, p: any, isDay: boolean): AnomalyDetail {
  const [y, mo, da] = (p.time ?? "").split(" ")[0].split("-");
  const m = parseInt(mo);
  const d = parseInt(da);
  return {
    title: `${object} · ${metricName} 预测超标`,
    metricName,
    forecastValue: `${p.predict} ${unit}`,
    baseline: `${p.target} ${unit}`,
    deviation: `预计超出目标 ${(((p.predict - p.target) / p.target) * 100).toFixed(1)}%`,
    confidenceRange: p.upper && p.lower ? `${p.lower} ~ ${p.upper} ${unit}` : undefined,
    forecastTime: isDay ? `预计${y}年${m}月${d}日越界` : `预计${y}年${m}月越界`,
    cause: "",
    suggestion: "建议提前调整用能计划，优化高耗能设备运行，降低预测超标风险。",
    recordId: pickAlertRecordId(object),
    level: "预警" as AlertLevel,
  };
}

export function TrendForecastChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  const [object, setObject] = useState("全厂");
  const [metric, setMetric] = useState<"综合" | "E7">("综合");
  const [range, setRange] = useState<ForecastRange>("3m");
  const [correction, setCorrection] = useState<CorrectionEvent | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [combined, setCombined] = useState<{ event: CorrectionEvent; anomaly: AnomalyDetail } | null>(null);

  const data = getTrendForecast(object, metric, range);
  const isDay = range === "7d" || range === "15d";
  const unit = metric === "综合" ? "tce" : "公斤标煤/箱";
  const metricName = metric === "综合" ? "综合能耗" : "单箱卷烟综合能耗";
  // 修正事件仅在月粒度（未来1/3个月）展示
  const events = isDay ? [] : getCorrectionEvents();
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
      setCombined({ event: ev, anomaly: buildAnomaly(object, metricName, unit, pt) });
      return;
    }
    const ev = events.find((x) => x.effectDate === e.activeLabel);
    if (ev) {
      setCorrection(ev);
      return;
    }
    if (!pt) return;
    if (pt.anomalyGrade) onAnomaly(buildAnomaly(object, metricName, unit, pt));
    else if (pt.breach) onAnomaly(buildForecastAnomaly(object, metricName, unit, pt, isDay));
  }

  return (
    <Card
      title="📈 综合能耗趋势与预测"
      headerRight={
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectCls} value={object} onChange={(e) => setObject(e.target.value)}>
            {OBJECTS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <select className={selectCls} value={metric} onChange={(e) => setMetric(e.target.value as "综合" | "E7")}>
            <option value="综合">综合能耗总量</option>
            <option value="E7">单箱卷烟综合能耗</option>
          </select>
          <select className={selectCls} value={range} onChange={(e) => setRange(e.target.value as ForecastRange)}>
            <option value="7d">未来7天</option>
            <option value="15d">未来15天</option>
            <option value="1m">未来1个月</option>
            <option value="3m">未来3个月</option>
          </select>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={isDay ? 5 : 0} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [v, ({ actual: "实际值", target: "目标值", predict: "预测值(修正后)", originalPredict: "修正前预测", upper: "置信区间", lower: "置信区间" } as Record<string, string>)[n as string] ?? n]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="upper" stroke="none" fill="#bfdbfe" fillOpacity={0.5} name="置信区间" />
          <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} legendType="none" />
          <Line type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="4 4" dot={false} name="目标值" />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="实际值" connectNulls />
          {/* 修正后预测（主线，蓝色虚线） */}
          <Line type="monotone" dataKey="predict" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 4" dot={false} name="预测值(修正后)" connectNulls />
          {/* 修正前预测（灰色虚线，默认隐藏） */}
          <Line type="monotone" dataKey="originalPredict" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="修正前预测" connectNulls hide={!showOriginal} />

          {/* 当前异常点（排除与事件重合的组合标记日期） */}
          {data.filter((d) => d.anomalyGrade && !overlapDates.has(d.date)).map((d) => (
            <ReferenceDot key={`a${d.date}`} x={d.date} y={d.actual ?? d.predict} r={5} fill={GRADE_STYLE[d.anomalyGrade as EvalGrade].color} stroke="#fff" strokeWidth={1.5} ifOverflow="extendDomain" />
          ))}
          {/* 组合标记：事件 + 异常重合（位于预测曲线，黄实心圆 + 橙外环） */}
          {data.filter((d) => d.anomalyGrade && overlapDates.has(d.date)).map((d) => (
            <ReferenceDot key={`c${d.date}`} x={d.date} y={d.predict} r={6} fill="#eab308" stroke="#f97316" strokeWidth={2.5} ifOverflow="extendDomain" />
          ))}
          {/* 预测越界点 */}
          {data.filter((d) => d.breach).map((d) => (
            <ReferenceDot key={`b${d.date}`} x={d.date} y={d.predict} r={6} fill="none" stroke="#f97316" strokeWidth={2} ifOverflow="extendDomain" />
          ))}
          {/* 重大事件标记（竖向橙色虚线 + 事件类型 + 修正幅度） */}
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
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          蓝实线=实际，蓝虚线=修正后预测，浅蓝带=置信区间，橙线=目标；点击异常点/越界点/事件标记查看详情。
        </p>
        {!isDay && (
          <button onClick={() => setShowOriginal((v) => !v)} className="text-xs text-primary-600 hover:underline">
            {showOriginal ? "隐藏修正前预测" : "查看修正前预测"}
          </button>
        )}
      </div>
      <CorrectionDrawer open={correction !== null} onClose={() => setCorrection(null)} event={correction} />
      <CombinedDrawer open={combined !== null} onClose={() => setCombined(null)} event={combined?.event ?? null} anomaly={combined?.anomaly ?? null} />
    </Card>
  );
}
