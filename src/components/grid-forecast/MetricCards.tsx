"use client";

import { AlertLevelBadge } from "@/components/alert/alertBadges";
import {
  coreMetrics,
  energyTypeMetrics,
  ENERGY_COEFFICIENT,
  GRADE_STYLE,
  FORECAST_STATUS_STYLE,
  type EvalGrade,
  type ForecastStatus,
} from "@/lib/mock-data/grid-forecast";
import type { AlertLevel } from "@/types";

// 带左侧色条的卡片外壳
function CardShell({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: color }} />
      <div className="pl-2">{children}</div>
    </div>
  );
}

export function GradeBadge({ grade }: { grade: EvalGrade }) {
  const s = GRADE_STYLE[grade];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.soft} ${s.text}`}>
      {grade}
    </span>
  );
}

export function ForecastStatusBadge({ status }: { status: ForecastStatus }) {
  const s = FORECAST_STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.soft} ${s.text}`}>
      {status}
    </span>
  );
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// AlertLevel → 卡片色条颜色
function levelColor(level: AlertLevel): string {
  if (level === "告警" || level === "危险") return "#ef4444";
  if (level === "预警") return "#f97316";
  return "#16a34a";
}

// ===== 顶部 5 个核心指标卡 =====
export function CoreMetricCards() {
  const { health, totalEnergy, perBox, forecast, anomaly } = coreMetrics;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {/* 能耗运行健康度 */}
      <CardShell color={GRADE_STYLE[health.grade].color}>
        <div className="mb-1 text-xs text-gray-500">能耗运行健康度</div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{health.score}</span>
          <span className="text-sm text-gray-400">分</span>
          <GradeBadge grade={health.grade} />
        </div>
        <div className="text-xs text-gray-400">
          较上月 <span className="font-medium text-green-600">+{health.delta}分</span>
        </div>
      </CardShell>

      {/* 单箱卷烟综合能耗 */}
      <CardShell color={GRADE_STYLE[perBox.grade].color}>
        <div className="mb-1 text-xs text-gray-500">单箱卷烟综合能耗</div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{perBox.value}</span>
          <span className="text-sm text-gray-400">公斤标煤/箱</span>
          <GradeBadge grade={perBox.grade} />
        </div>
        <div className="text-xs text-gray-400">
          目标 {perBox.target}｜同比 {perBox.yoy}%｜环比 {sign(perBox.mom)}%
        </div>
      </CardShell>

      {/* 本月累计综合能耗 */}
      <CardShell color={GRADE_STYLE[totalEnergy.grade].color}>
        <div className="mb-1 text-xs text-gray-500">本月累计综合能耗</div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{totalEnergy.value}</span>
          <span className="text-sm text-gray-400">tce</span>
          <GradeBadge grade={totalEnergy.grade} />
        </div>
        <div className="text-xs text-gray-400">
          目标 {totalEnergy.target} tce｜同比 {totalEnergy.yoy}%｜环比 {sign(totalEnergy.mom)}%
        </div>
      </CardShell>

      {/* 月末预测能耗 */}
      <CardShell color={FORECAST_STATUS_STYLE[forecast.status].color}>
        <div className="mb-1 text-xs text-gray-500">月末预测能耗</div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{forecast.value}</span>
          <span className="text-sm text-gray-400">tce</span>
          <ForecastStatusBadge status={forecast.status} />
        </div>
        <div className="text-xs text-gray-400">
          置信区间 {forecast.range[0]}~{forecast.range[1]}｜偏差 +{forecast.deviance}({forecast.devRate}%)
          <div className="text-gray-300">{forecast.time}</div>
        </div>
        <div className="mt-1 text-xs font-medium text-orange-600">
          已修正 +{forecast.revisedDelta} tce（+{forecast.revisedRate}%）
        </div>
      </CardShell>

      {/* 异常网格 */}
      <CardShell color={anomaly.total > 0 ? levelColor(anomaly.maxLevel) : "#16a34a"}>
        <div className="mb-1 text-xs text-gray-500">异常网格</div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{anomaly.total}</span>
          <span className="text-sm text-gray-400">个</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          较昨日 +{anomaly.delta}个｜最高预警
          <AlertLevelBadge level={anomaly.maxLevel} />
        </div>
      </CardShell>
    </div>
  );
}

// ===== 4 个能源分类指标卡 =====
function EnergyTypeCard({
  meta,
  info,
}: {
  meta: { label: string; short: string; unit: string };
  info: { value: number; target: number; devRate: number; yoy: number; mom: number; grade?: EvalGrade };
}) {
  const color = info.grade ? GRADE_STYLE[info.grade].color : "#9ca3af";
  return (
    <CardShell color={color}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-gray-500">{meta.label}</span>
        {info.grade ? <GradeBadge grade={info.grade} /> : null}
      </div>
      <div className="mb-1 flex items-baseline gap-1">
        <span className="text-xl font-bold text-gray-900">{info.value.toLocaleString()}</span>
        <span className="text-sm text-gray-400">{meta.unit}</span>
      </div>
      <div className={`text-xs ${info.value > info.target ? "text-red-500" : "text-green-600"}`}>
        {info.value > info.target
          ? `超出上限 ${Math.abs(info.value - info.target).toLocaleString()}`
          : `距上限还有 ${Math.abs(info.target - info.value).toLocaleString()}`}{" "}
        {meta.unit}
      </div>
      <div className="mt-0.5 text-xs text-gray-400">
        目标 {info.target.toLocaleString()}｜同比 {info.yoy}%｜环比 {sign(info.mom)}%
      </div>
    </CardShell>
  );
}

export function EnergyTypeCards() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <EnergyTypeCard meta={ENERGY_COEFFICIENT.electric} info={energyTypeMetrics.electric} />
      <EnergyTypeCard meta={ENERGY_COEFFICIENT.gas} info={energyTypeMetrics.gas} />
      <EnergyTypeCard meta={ENERGY_COEFFICIENT.steam} info={energyTypeMetrics.steam} />
      <EnergyTypeCard meta={ENERGY_COEFFICIENT.water} info={energyTypeMetrics.water} />
    </div>
  );
}
