"use client";

// 自定义预测周期选择器（未来值预测 / 条件测算共用，仅日度指标支持）：
// · 预测开始日期由系统自动确定（数据截止日次日），不可修改
// · 用户只选择截止日期，超出模型最大预测范围（最多 30 日）的日期置灰不可选
// · 选择后自动显示预测周期长度（如「共预测 15 日」）
import { CUSTOM_MAX_DAYS, FORECAST_START } from "@/lib/mock-data/forecast";

const readonlyCls =
  "w-full px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-500";
const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// 截止日期上限：起始日 + 最大天数 - 1（30 日 → 2026-09-08）
const MAX_END_DATE = toIso(
  (() => {
    const [y, m, d] = FORECAST_START.split("-").map(Number);
    return new Date(y, m - 1, d + CUSTOM_MAX_DAYS - 1);
  })()
);

// 预测天数 → 截止日期（起始日为第 1 天）
function endDateOfDays(days: number): string {
  const [y, m, d] = FORECAST_START.split("-").map(Number);
  return toIso(new Date(y, m - 1, d + days - 1));
}

// 起始日 → 截止日期的天数（含首尾）
function daysOfEnd(endIso: string): number {
  const [sy, sm, sd] = FORECAST_START.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  return Math.round((new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()) / 86400000) + 1;
}

export function CustomRangePicker({
  days,
  onDaysChange,
}: {
  days: number | null; // 已选预测天数（受控；切换指标时由父级重置）
  onDaysChange: (days: number) => void;
}) {
  // 截止日期由天数反推（保证与父级状态一致）
  const endDate = days !== null ? endDateOfDays(days) : "";

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-400">预测开始日期</label>
          <div className={readonlyCls}>{FORECAST_START}</div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">预测截止日期</label>
          <input
            type="date"
            className={inputCls}
            min={FORECAST_START}
            max={MAX_END_DATE}
            value={endDate}
            onChange={(e) => e.target.value && onDaysChange(daysOfEnd(e.target.value))}
          />
        </div>
      </div>
      <p className="mt-2 text-xs">
        {days !== null ? (
          <span className="font-medium text-primary-600">共预测 {days} 日</span>
        ) : (
          <span className="text-gray-400">
            可选范围 {FORECAST_START.replace(/-/g, "/")} ～ {MAX_END_DATE.replace(/-/g, "/")}（最多 {CUSTOM_MAX_DAYS} 日，超出范围的日期置灰不可选）
          </span>
        )}
      </p>
    </div>
  );
}
