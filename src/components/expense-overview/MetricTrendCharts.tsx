"use client";

// 费用总览 - 指标卡切换的趋势图组（5 张折线图，月度执行趋势图见 MonthlyTrendChart）：
// 总体健康度评分趋势 / 预算执行率趋势 / 执行进度偏差趋势（随科目筛选联动）+
// 运营成本趋势 / 单箱可控费用趋势（全口径固定，不随科目筛选联动）
// 除预算执行率趋势保留 9-12 月预测虚线外，其余四图仅展示 1-8 月实际值（折线点带数值标签）
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, ReferenceArea, LabelList,
} from "recharts";
import { Card } from "@/components/ui/Card";
import {
  OPERATING_COST, PER_BOX_COST, OPERATING_COST_MONTHLY, PER_BOX_MONTHLY,
  expenseDataOf, healthTrendOf, rateTrendOf, deviationTrendOf,
  healthTrendInterpretation, rateTrendInterpretation, deviationTrendInterpretation,
  operatingCostInterpretation, perBoxInterpretation,
  type TrendPoint,
} from "@/lib/mock-data/expense-overview";

// 趋势图外壳：标题 + 右上角费用名称（联动图展示）+ 图表 + AI 数据解读（与月度执行趋势图同构）
function TrendCard({
  title, subjectName, interpretation, children,
}: {
  title: string;
  subjectName?: string;
  interpretation: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      title={title}
      headerRight={subjectName ? <span className="text-xs text-gray-400">{subjectName}</span> : undefined}
    >
      {children}
      {/* 大模型数据解读（每月自动更新，300 字内） */}
      <div className="mt-3 rounded-lg border border-primary-100 bg-primary-50/60 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary-700">
          <span>🤖</span>数据解读
        </div>
        <p className="text-xs leading-relaxed text-gray-600">{interpretation}</p>
      </div>
    </Card>
  );
}

// 通用 Tooltip：月份 + 实际/预测值（带单位）+ 可选等级标签
function TrendTooltip({ active, payload, label, unit, withGrade }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as TrendPoint;
  const v = d.value ?? d.forecastValue;
  const isForecast = d.value === null || d.value === undefined;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-gray-800">{label}</p>
      <p className="text-gray-500">
        {isForecast ? "预测" : "实际"}：{v !== null && v !== undefined ? `${v}${unit}` : "—"}
      </p>
      {withGrade && d.gradeLabel && (
        <p className="mt-0.5 border-t border-gray-100 pt-0.5 text-gray-400">
          等级：<span className="font-medium" style={{ color: d.gradeColor }}>{d.gradeLabel}</span>
        </p>
      )}
    </div>
  );
}

/* ---------------- 总体健康度评分趋势 ---------------- */

// 五档等级色带（Y 轴 0-100 分区浅色填充，配 ReferenceArea 标注等级名）
const GRADE_BANDS = [
  { label: "优秀", from: 90, to: 100, fill: "rgba(22,163,74,0.08)" },
  { label: "良好", from: 80, to: 90, fill: "rgba(74,222,128,0.12)" },
  { label: "一般", from: 70, to: 80, fill: "rgba(234,179,8,0.10)" },
  { label: "预警", from: 60, to: 70, fill: "rgba(249,115,22,0.10)" },
  { label: "危险", from: 0, to: 60, fill: "rgba(239,68,68,0.08)" },
];

// 总体健康度评分趋势：蓝色实线（折线点展示分数）+ 五档色带 + 数据点按当月等级着色，悬停查看评分与等级
export function HealthTrendChart({ subjectId }: { subjectId: string }) {
  const data = healthTrendOf(subjectId);
  return (
    <TrendCard
      title="总体健康度评分趋势（分）"
      subjectName={expenseDataOf(subjectId).name}
      interpretation={healthTrendInterpretation(subjectId)}
    >
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#9ca3af" width={44} unit="分" />
          <Tooltip content={<TrendTooltip unit=" 分" withGrade />} cursor={{ stroke: "#e5e7eb" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {GRADE_BANDS.map((b) => (
            <ReferenceArea
              key={b.label}
              y1={b.from}
              y2={b.to}
              fill={b.fill}
              strokeOpacity={0}
              label={{ value: b.label, position: "insideLeft", fontSize: 9, fill: "#9ca3af" }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="value"
            name="健康度评分"
            stroke="#3b82f6"
            strokeWidth={2}
            connectNulls
            dot={(p: any) =>
              p.payload?.gradeColor && p.payload?.value !== null && p.payload?.value !== undefined ? (
                <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill={p.payload.gradeColor} stroke="#fff" strokeWidth={1} />
              ) : (
                <g key={p.index} />
              )
            }
          >
            <LabelList dataKey="value" position="top" formatter={(v: any) => (v === null || v === undefined ? "" : `${v}`)} style={{ fontSize: 9, fill: "#3b82f6" }} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </TrendCard>
  );
}

/* ---------------- 预算执行率趋势（%） ---------------- */

// 预算执行率趋势：累计执行率实线（1-8 月）+ 预测虚线（9-12 月）+ 100% 预算线，折线上均展示数值
export function RateTrendChart({ subjectId }: { subjectId: string }) {
  const s = expenseDataOf(subjectId);
  const data = rateTrendOf(s);
  return (
    <TrendCard title="预算执行率趋势（%）" subjectName={s.name} interpretation={rateTrendInterpretation(s)}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis
            domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]}
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
            width={44}
            unit="%"
          />
          <Tooltip content={<TrendTooltip unit="%" />} cursor={{ stroke: "#e5e7eb" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={100} stroke="#f97316" strokeDasharray="6 4" label={{ value: "100% 预算线", position: "insideTopRight", fontSize: 10, fill: "#f97316" }} />
          <Line type="monotone" dataKey="value" name="预算执行率" stroke="#1d4ed8" strokeWidth={2} connectNulls dot={{ r: 2.5, fill: "#1d4ed8" }}>
            <LabelList dataKey="value" position="top" formatter={(v: any) => (v === null || v === undefined ? "" : `${v}%`)} style={{ fontSize: 9, fill: "#1d4ed8" }} />
          </Line>
          <Line type="monotone" dataKey="forecastValue" name="预测执行率" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" connectNulls dot={{ r: 2, fill: "#3b82f6" }}>
            <LabelList dataKey="forecastValue" position="top" formatter={(v: any) => (v === null || v === undefined ? "" : `${v}%`)} style={{ fontSize: 9, fill: "#3b82f6" }} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </TrendCard>
  );
}

/* ---------------- 执行进度偏差趋势（pct） ---------------- */

// 执行进度偏差趋势：偏差实线（1-8 月，折线点带数值）+ 0 基准线
export function DeviationTrendChart({ subjectId }: { subjectId: string }) {
  const s = expenseDataOf(subjectId);
  const data = deviationTrendOf(s);
  return (
    <TrendCard title="执行进度偏差趋势（pct）" subjectName={s.name} interpretation={deviationTrendInterpretation(s)}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis
            domain={[(min: number) => Math.floor(min / 5) * 5 - 5, (max: number) => Math.ceil(max / 5) * 5 + 5]}
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
            width={44}
            unit="pct"
          />
          <Tooltip content={<TrendTooltip unit="pct" />} cursor={{ stroke: "#e5e7eb" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} label={{ value: "计划进度基准", position: "insideTopRight", fontSize: 10, fill: "#9ca3af" }} />
          <Line type="monotone" dataKey="value" name="执行进度偏差" stroke="#1d4ed8" strokeWidth={2} connectNulls dot={{ r: 2.5, fill: "#1d4ed8" }}>
            <LabelList dataKey="value" position="top" formatter={(v: any) => (v === null || v === undefined ? "" : `${v}`)} style={{ fontSize: 9, fill: "#1d4ed8" }} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </TrendCard>
  );
}

/* ---------------- 运营成本趋势（万元，全口径固定） ---------------- */

export function OperatingCostTrendChart() {
  return (
    <TrendCard title="运营成本趋势（万元）" interpretation={operatingCostInterpretation()}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={OPERATING_COST_MONTHLY} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={56} />
          <Tooltip content={<TrendTooltip unit=" 万元" />} cursor={{ stroke: "#e5e7eb" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="value" name="运营成本" stroke="#1d4ed8" strokeWidth={2} connectNulls dot={{ r: 2.5, fill: "#1d4ed8" }}>
            <LabelList dataKey="value" position="top" formatter={(v: any) => (v === null || v === undefined ? "" : `${v}`)} style={{ fontSize: 9, fill: "#1d4ed8" }} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </TrendCard>
  );
}

/* ---------------- 单箱可控费用趋势（元/箱，全口径固定） ---------------- */

// 单箱可控费用趋势：实线（1-8 月，折线点带数值）+ 橙色目标值水平虚线
export function PerBoxTrendChart() {
  return (
    <TrendCard title="单箱可控费用趋势（元/箱）" interpretation={perBoxInterpretation()}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={PER_BOX_MONTHLY} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis domain={[240, 'dataMax + 30']} tick={{ fontSize: 10 }} stroke="#9ca3af" width={44} unit="元" />
          <Tooltip content={<TrendTooltip unit=" 元/箱" />} cursor={{ stroke: "#e5e7eb" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine
            y={PER_BOX_COST.target}
            stroke="#f97316"
            strokeDasharray="6 4"
            label={{ value: `目标值：${PER_BOX_COST.target}`, position: "insideBottomRight", fontSize: 10, fill: "#f97316" }}
          />
          <Line type="monotone" dataKey="value" name="单箱可控费用" stroke="#1d4ed8" strokeWidth={2} connectNulls dot={{ r: 2.5, fill: "#1d4ed8" }}>
            <LabelList dataKey="value" position="top" formatter={(v: any) => (v === null || v === undefined ? "" : `${v}`)} style={{ fontSize: 9, fill: "#1d4ed8" }} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </TrendCard>
  );
}
