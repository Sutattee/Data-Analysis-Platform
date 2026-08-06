"use client";

import { GradeBadge } from "@/components/grid-forecast/MetricCards";
import { GRADE_STYLE } from "@/lib/mock-data/grid-forecast";
import { carbonMetrics, type CarbonMetricInfo } from "@/lib/mock-data/carbon-eval";

// 带左侧色条的卡片外壳（与 grid-forecast 一致风格）
function CardShell({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: color }} />
      <div className="pl-2">{children}</div>
    </div>
  );
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const fmt = (n: number) => n.toLocaleString();

// 合规差距（带单位）
function Gap({ info }: { info: CarbonMetricInfo }) {
  const { direction, value, target, unit } = info;
  if (direction === "score" || value === undefined || target === undefined) return null;
  const diff = Math.abs(value - target);
  const diffStr = `${fmt(diff)}${unit}`;
  if (direction === "total") {
    const over = value > target;
    return <span className={over ? "text-red-500" : "text-gray-500"}>{over ? `超出目标 ${diffStr}` : `剩余目标空间 ${diffStr}`}</span>;
  }
  if (direction === "lower") {
    const over = value > target;
    return <span className={over ? "text-red-500" : "text-green-600"}>{over ? `超出目标 ${diffStr}` : `低于目标 ${diffStr}`}</span>;
  }
  // higher
  const ok = value >= target;
  return <span className={ok ? "text-green-600" : "text-red-500"}>{ok ? `高于标准 ${diffStr}` : `低于标准 ${diffStr}`}</span>;
}

function CarbonMetricCard({ title, info }: { title: string; info: CarbonMetricInfo }) {
  const color = info.grade ? GRADE_STYLE[info.grade].color : "#9ca3af";
  const warn = info.grade === "预警" || info.grade === "危险";
  return (
    <CardShell color={color}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {warn && <span className="mr-1">⚠️</span>}
          {title}
        </span>
        {info.grade ? <GradeBadge grade={info.grade} /> : null}
      </div>

      {info.direction === "score" ? (
        <>
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{info.score}</span>
            <span className="text-sm text-gray-400">{info.unit}</span>
            {info.compliant && <span className="text-xs font-medium text-green-600">{info.compliant}</span>}
          </div>
          <div className="text-xs text-gray-400">
            较上季度 <span className="font-medium text-green-600">+{info.delta}分</span>
          </div>
        </>
      ) : (
        <>
          <div className="mb-1 flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">{fmt(info.value!)}</span>
            <span className="text-sm text-gray-400">{info.unit}</span>
          </div>
          <div className="text-xs">
            <Gap info={info} />
          </div>
          <div className="mt-0.5 text-xs text-gray-400">
            {info.targetLabel}｜同比 {info.yoy}%｜环比 {sign(info.mom!)}%
          </div>
        </>
      )}
    </CardShell>
  );
}

export function CarbonMetricCards() {
  const m = carbonMetrics;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <CarbonMetricCard title="碳排放健康度" info={m.health} />
      <CarbonMetricCard title="单位产值碳排放量" info={m.perOutput} />
      <CarbonMetricCard title="CO₂排放当量" info={m.co2} />
      <CarbonMetricCard title="水资源重复利用率" info={m.waterReuse} />
      <CarbonMetricCard title="单箱化学需氧量排放量" info={m.perBoxCOD} />
      <CarbonMetricCard title="污水排放COD" info={m.cod} />
    </div>
  );
}
