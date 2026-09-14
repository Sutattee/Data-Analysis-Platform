"use client";

import { useRouter } from "next/navigation";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import {
  EXPENSE_HEALTH, OPERATING_COST, PER_BOX_COST, expenseDataOf, operatingCostOf,
  type ExpenseSummary,
} from "@/lib/mock-data/expense-overview";
import { perBoxCostOf } from "@/lib/mock-data/controllable-cost";
import { ALERT_LEVEL_COLOR } from "@/lib/mock-data/grid-forecast";
import type { AlertLevel } from "@/types";

// 带左侧色条的卡片外壳（左侧细条统一主题蓝）
function CardShell({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary-600" />
      <div className="pl-2">{children}</div>
    </div>
  );
}

// 半圆仪表盘（0~100 分，带刻度数字；自绘 SVG 保证 0/100 刻度完整展示，弧色 = 健康度等级色）
function HealthGauge({ score, color }: { score: number; color: string }) {
  const cx = 78;
  const cy = 70; // 圆心（贴近底部，弧朝上）
  const r = 58; // 主弧半径
  // 分值 → 弧上角度（180°=0 分 → 0°=100 分）
  const angleOf = (v: number) => Math.PI - (v / 100) * Math.PI;
  const pt = (v: number, radius: number) => ({
    x: cx + radius * Math.cos(angleOf(v)),
    y: cy - radius * Math.sin(angleOf(v)),
  });
  const arcPath = (from: number, to: number, radius: number) => {
    const a = pt(from, radius);
    const b = pt(to, radius);
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  };

  return (
    <svg viewBox="0 0 156 74" className="h-[74px] w-[156px]" role="img" aria-label={`健康度 ${score} 分`}>
      {/* 背景弧 + 得分弧 */}
      <path d={arcPath(0, 100, r)} fill="none" stroke="#e2e8f0" strokeWidth={9} strokeLinecap="round" />
      <path d={arcPath(0, score, r)} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" />
      {/* 刻度：每 20 一档（短线 + 数字，数字完整落在画布内） */}
      {[0, 20, 40, 60, 80, 100].map((v) => {
        const a = pt(v, r - 8);
        const b = pt(v, r - 2);
        const t = pt(v, r - 14);
        return (
          <g key={v}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#cbd5e1" strokeWidth={1} />
            <text x={t.x} y={t.y + 3} textAnchor="middle" fontSize={8} fill="#94a3b8">{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

// 状态标签：触警时颜色跟随五级告警色，否则 正常绿 / 超计划·滞后橙
function StatusTag({ status, level }: { status: ExpenseSummary["status"]; level: AlertLevel | null }) {
  const cls = level
    ? "text-white"
    : status === "正常"
      ? "bg-green-100 text-green-700"
      : "bg-orange-100 text-orange-700";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${cls}`}
      style={level ? { backgroundColor: ALERT_LEVEL_COLOR[level] } : undefined}
    >
      {status}
    </span>
  );
}

const fmt = (n: number) => n.toLocaleString();

// 同比/环比变化：升 = 橙（费用上升不利）、降 = 绿
function TrendText({ label, v }: { label: string; v: number }) {
  return (
    <span>
      {label}{" "}
      <span className={`font-medium ${v >= 0 ? "text-orange-500" : "text-green-600"}`}>
        {v >= 0 ? `↑${v}%` : `↓${Math.abs(v)}%`}
      </span>
    </span>
  );
}

// 费用总览顶部 6 张核心指标卡（卡 2/3/5/6 随科目筛选联动，卡 1 健康度固定口径）
export function ExpenseOverviewCards({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const s = expenseDataOf(subjectId);
  const perBox = perBoxCostOf(subjectId); // null = 该科目范围无可控费用（展示 —）

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {/* 1. 总体健康度评分：半圆仪表盘（带刻度）+ 分数 + 等级 */}
      <CardShell>
        <div className="mb-0.5 text-xs text-gray-500">总体健康度评分</div>
        <div className="flex justify-center">
          <HealthGauge score={EXPENSE_HEALTH.score} color={EXPENSE_HEALTH.grade.color} />
        </div>
        {/* 等级徽标 + 分数上移嵌入表盘开口区（圆心附近），压缩卡片高度、减少行内留白 */}
        <div className="-mt-9 flex flex-col items-center">
          <span
            className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full text-white"
            style={{ backgroundColor: EXPENSE_HEALTH.grade.color }}
          >
            {EXPENSE_HEALTH.grade.label}
          </span>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold leading-none text-gray-900">{EXPENSE_HEALTH.score}</span>
            <span className="text-xs text-gray-500">分</span>
          </div>
        </div>
      </CardShell>

      {/* 2. 累计执行金额（联动） */}
      <CardShell>
        <div className="mb-1 truncate text-xs text-gray-500">累计执行金额</div>
        <div className="text-2xl font-bold text-gray-900">
          ¥{fmt(s.executed)}
          <span className="text-xs font-normal text-gray-500">万元</span>
        </div>
        <div className="mt-2 truncate text-xs text-gray-500">年度预算：¥{fmt(s.budget)}万元</div>
        {/* 费用科目路径单独一行展示（随科目筛选联动） */}
        <div className="mt-0.5 truncate text-xs text-gray-400">{s.path}</div>
      </CardShell>

      {/* 3. 预算执行率（联动，右上角状态标签） */}
      <CardShell>
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="truncate text-xs text-gray-500">预算执行率</span>
          <StatusTag status={s.status} level={s.level} />
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {s.rate}
          <span className="text-xs font-normal text-gray-500">%</span>
        </div>
        <div className="mt-2 truncate text-xs text-gray-500">计划执行进度 {s.planProgress}%</div>
        <div className="mt-0.5 truncate text-xs text-gray-400">{s.path}</div>
      </CardShell>

      {/* 4. 执行进度偏差（联动，数值颜色跟随等级） */}
      <CardShell>
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="truncate text-xs text-gray-500">执行进度偏差</span>
          {s.level ? <AlertLevelBadge level={s.level} /> : <span className="text-xs text-green-600">正常</span>}
        </div>
        <div
          className="text-2xl font-bold"
          style={{ color: s.level ? ALERT_LEVEL_COLOR[s.level] : "#16a34a" }}
        >
          {s.deviation > 0 ? "+" : ""}
          {s.deviation}
          <span className="text-xs font-normal text-gray-500">pct</span>
        </div>
        <div className="mt-2 truncate text-xs text-gray-500">
          较计划{s.deviation >= 0 ? "多" : "少"}执行约 ¥{fmt(Math.abs(s.overAmount))} 万
        </div>
        <div className="mt-0.5 truncate text-xs text-gray-400">{s.path}</div>
      </CardShell>

      {/* 5. 运营成本（随科目联动，点击跳转费用分析-运营成本） */}
      <CardShell onClick={() => router.push("/expense/analysis/operating-cost")}>
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="truncate text-xs text-gray-500">运营成本</span>
          <span className="text-[10px] text-gray-300">点击查看 ↗</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          ¥{fmt(operatingCostOf(subjectId))}
          <span className="text-xs font-normal text-gray-500">万元</span>
        </div>
        <div className="mt-2 truncate text-xs text-gray-500">
          <TrendText label="同比" v={OPERATING_COST.yoy} />｜<TrendText label="环比" v={OPERATING_COST.mom} />
        </div>
        <div className="mt-0.5 truncate text-xs text-gray-400">{s.path}</div>
      </CardShell>

      {/* 6. 单箱可控费用（随科目联动，点击跳转费用分析-单箱可控费用） */}
      <CardShell onClick={() => router.push("/expense/analysis/per-box-cost")}>
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="truncate text-xs text-gray-500">单箱可控费用</span>
          <span className="text-[10px] text-gray-300">点击查看 ↗</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {perBox === null ? "—" : (
            <>
              {fmt(perBox)}
              <span className="text-xs font-normal text-gray-500">元/箱</span>
            </>
          )}
        </div>
        <div className="mt-2 truncate text-xs text-gray-500">
          {perBox === null ? (
            <>该科目暂无可控费用</>
          ) : (
            <><TrendText label="同比" v={PER_BOX_COST.yoy} />｜<TrendText label="环比" v={PER_BOX_COST.mom} /></>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-gray-400">{s.path}</div>
      </CardShell>
    </div>
  );
}
