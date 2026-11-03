"use client";

// 单箱综合能耗趋势：实际（青实线）/ 目标（橙虚线）/ 历史均值（灰蓝点划线）；
// 异常点放大空心标记，点击下钻告警详情；底部图例 + 单箱电耗/蒸汽脚注
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ENERGY_FOOTNOTE, ENERGY_TREND, energyAnomalyHref } from "@/lib/mock-data/cockpit";

const AXIS_COLOR = "#a0b8d6";
const GRID_COLOR = "#1e3a5f";
const ACTUAL_COLOR = "#55dbff";
const TARGET_COLOR = "#ffc575";
const AVG_COLOR = "#9bb1d0";

// 联合提示：月份 / 实际 / 目标 / 历史均值 / 与目标差额；异常点附下钻提示
function EnergyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = ENERGY_TREND.find((d) => d.month === label);
  if (!row) return null;
  const diff = row.actual - row.target;
  return (
    <div className="chart-tip">
      <p className="tip-title">{label}</p>
      <div className="tip-row"><span>实际</span><span>{row.actual.toFixed(1)} kgce/箱</span></div>
      <div className="tip-row"><span>目标</span><span>{row.target.toFixed(1)} kgce/箱</span></div>
      <div className="tip-row"><span>历史均值</span><span>{row.avg.toFixed(1)} kgce/箱</span></div>
      <div className="tip-row">
        <span>与目标差额</span>
        <span className={diff <= 0 ? "good" : "warning"}>
          {diff >= 0 ? "+" : "−"}{Math.abs(diff).toFixed(1)}
        </span>
      </div>
      {row.anomaly && <div className="tip-row"><span className="warning">异常点</span><span>点击查看告警详情</span></div>}
    </div>
  );
}

export function EnergyTrendChart() {
  const router = useRouter();
  const anomalyHref = energyAnomalyHref();

  const handleAnomalyClick = useCallback(() => {
    if (anomalyHref) router.push(anomalyHref);
  }, [anomalyHref, router]);

  // 异常点：放大空心圆 + 内点，可点击；普通点小实心
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    if (payload.anomaly) {
      return (
        <g
          key={`anomaly-${payload.month}`}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleAnomalyClick();
          }}
          style={{ cursor: "pointer" }}
        >
          <circle cx={cx} cy={cy} r={8} fill="#55dbff22" stroke={ACTUAL_COLOR} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={2.5} fill="#bfefff" />
        </g>
      );
    }
    return <circle key={`dot-${payload.month}`} cx={cx} cy={cy} r={2.5} fill={ACTUAL_COLOR} stroke="#0b1b38" strokeWidth={1} />;
  };

  return (
    <section className="panel" aria-label="单箱综合能耗趋势">
      <h2 className="panel-heading">
        单箱综合能耗趋势
        <span className="panel-extra">单位：kgce/箱</span>
      </h2>
      <div className="panel-body">
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ENERGY_TREND} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={false}
              />
              <YAxis
                domain={[28, 33]}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<EnergyTooltip />} cursor={{ stroke: "#5fbbf7", strokeDasharray: "3 3" }} />
              <Line type="monotone" dataKey="avg" name="历史均值" stroke={AVG_COLOR} strokeWidth={1.5} strokeDasharray="2 4" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="target" name="目标" stroke={TARGET_COLOR} strokeWidth={2} strokeDasharray="8 5" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="actual" name="实际" stroke={ACTUAL_COLOR} strokeWidth={2} dot={renderDot} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend">
          <span className="legend-key solid"><i />实际</span>
          <span className="legend-key dashed"><i />目标</span>
          <span className="legend-key dotted"><i />历史均值</span>
        </div>
        <p className="chart-footnote">{ENERGY_FOOTNOTE}</p>
      </div>
    </section>
  );
}
