"use client";

// 费用预算执行率趋势：执行率（青实线）/ 计划执行进度（橙虚线）/ 年度预算100%参考线（灰蓝点线）；
// 提示补充偏差与累计金额；整图点击下钻费用总览（预选预算执行率指标卡）
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BUDGET_ANNUAL, BUDGET_HEALTH, BUDGET_TREND } from "@/lib/mock-data/cockpit";

const AXIS_COLOR = "#a0b8d6";
const GRID_COLOR = "#1e3a5f";
const RATE_COLOR = "#55dbff";
const PLAN_COLOR = "#ffc575";
const FULL_COLOR = "#9bb1d0";

function BudgetTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = BUDGET_TREND.find((d) => d.month === label);
  if (!row) return null;
  const dev = row.rate - row.plan;
  return (
    <div className="chart-tip">
      <p className="tip-title">{label}（累计）</p>
      <div className="tip-row"><span>预算执行率</span><span>{row.rate.toFixed(1)}%</span></div>
      <div className="tip-row"><span>计划执行进度</span><span>{row.plan.toFixed(1)}%</span></div>
      <div className="tip-row">
        <span>执行进度偏差</span>
        <span className={dev > 0 ? "warning" : "good"}>{dev >= 0 ? "+" : "−"}{Math.abs(dev).toFixed(1)} pct</span>
      </div>
      <div className="tip-row"><span>累计执行</span><span>{row.executed.toLocaleString()} 万元</span></div>
      <div className="tip-row"><span>年度预算</span><span>{BUDGET_ANNUAL.toLocaleString()} 万元</span></div>
    </div>
  );
}

export function BudgetTrendChart() {
  return (
    <section className="panel" aria-label="费用预算执行率趋势">
      <h2 className="panel-heading">
        费用预算执行率趋势
        <span className="panel-extra">费用预算健康度 {BUDGET_HEALTH.score}分 · {BUDGET_HEALTH.grade}</span>
      </h2>
      <div className="panel-body">
        <Link href="/expense/overview?metric=rate" className="chart-box" title="查看费用总览 · 预算执行率" style={{ display: "block" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={BUDGET_TREND} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 105]}
                ticks={[0, 20, 40, 60, 80, 100]}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={36}
                unit="%"
              />
              <Tooltip content={<BudgetTooltip />} cursor={{ stroke: "#5fbbf7", strokeDasharray: "3 3" }} />
              <ReferenceLine y={100} stroke={FULL_COLOR} strokeWidth={1} strokeDasharray="2 4" ifOverflow="extendDomain" />
              <Line type="monotone" dataKey="plan" name="计划执行进度" stroke={PLAN_COLOR} strokeWidth={2} strokeDasharray="8 5" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="rate" name="预算执行率" stroke={RATE_COLOR} strokeWidth={2} dot={{ r: 2.5, fill: RATE_COLOR, stroke: "#0b1b38", strokeWidth: 1 }} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Link>
        <div className="chart-foot-row">
          <div className="chart-legend">
            <span className="legend-key solid"><i />预算执行率</span>
            <span className="legend-key dashed"><i />计划执行进度</span>
            <span className="legend-key dotline"><i />年度预算 100%</span>
          </div>
          <p className="chart-footnote">
          10月末累计执行 15,180 万元 ｜ 年度预算 {BUDGET_ANNUAL.toLocaleString()} 万元
          </p>
        </div>
      </div>
    </section>
  );
}
