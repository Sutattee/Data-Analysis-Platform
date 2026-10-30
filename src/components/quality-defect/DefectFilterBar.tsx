"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  PART_OPTIONS,
  GRADE_OPTIONS,
  BRAND_OPTIONS,
  MACHINE_OPTIONS,
  SHIFT_OPTIONS,
  BATCH_COUNT_OPTIONS,
  periodRange,
  type DefectFilters,
  type DefectPeriod,
} from "@/lib/mock-data/quality-defect";

const selCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all focus:ring-2 focus:ring-primary-500 focus:border-transparent";

// 缺陷分析筛选区：统计周期（时间窗口：近1/2/3个月或自定义日期范围；或批次窗口：近1/10/…/60批次，
// 控制全部图表）+ 部位/类别/牌号/机台/班组（控制指标卡、趋势图、明细表；热力图不跟随）+ 重置
export function DefectFilterBar({
  value,
  onChange,
  onReset,
}: {
  value: DefectFilters;
  onChange: (f: DefectFilters) => void;
  onReset: () => void;
}) {
  const periodKey =
    value.period.kind === "preset"
      ? `m${value.period.months}`
      : value.period.kind === "batches"
        ? `b${value.period.count}`
        : "custom";
  const custom = value.period.kind === "custom" ? value.period : null;

  function changePeriodKind(key: string) {
    const period: DefectPeriod =
      key === "m1"
        ? { kind: "preset", months: 1 }
        : key === "m2"
          ? { kind: "preset", months: 2 }
          : key === "m3"
            ? { kind: "preset", months: 3 }
            : key.startsWith("b")
              ? { kind: "batches", count: Number(key.slice(1)) }
              : value.period.kind === "custom"
                ? value.period
                : { kind: "custom", ...periodRange(1) }; // 切自定义时默认带出近1个月范围
    onChange({ ...value, period });
  }

  return (
    <Card padding>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">统计周期</span>
          <select value={periodKey} onChange={(e) => changePeriodKind(e.target.value)} className={selCls}>
            <optgroup label="按时间">
              <option value="m1">近1个月</option>
              <option value="m2">近2个月</option>
              <option value="m3">近3个月</option>
              <option value="custom">自定义</option>
            </optgroup>
            <optgroup label="按批次">
              {BATCH_COUNT_OPTIONS.map((n) => (
                <option key={n} value={`b${n}`}>
                  近{n}批次
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {custom && (
          <label className="flex items-center gap-1.5">
            <input
              type="date"
              value={custom.from}
              max={custom.to}
              onChange={(e) => onChange({ ...value, period: { ...custom, from: e.target.value } })}
              className={selCls}
            />
            <span className="text-xs text-gray-400">至</span>
            <input
              type="date"
              value={custom.to}
              min={custom.from}
              onChange={(e) => onChange({ ...value, period: { ...custom, to: e.target.value } })}
              className={selCls}
            />
          </label>
        )}

        <label className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">缺陷部位</span>
          <select value={value.part} onChange={(e) => onChange({ ...value, part: e.target.value })} className={selCls}>
            <option value="all">全部</option>
            {PART_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">类别</span>
          <select value={value.grade} onChange={(e) => onChange({ ...value, grade: e.target.value })} className={selCls}>
            <option value="all">全部</option>
            {GRADE_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}类</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">牌号</span>
          <select value={value.brand} onChange={(e) => onChange({ ...value, brand: e.target.value })} className={selCls}>
            <option value="all">全部</option>
            {BRAND_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">机台</span>
          <select value={value.machine} onChange={(e) => onChange({ ...value, machine: e.target.value })} className={selCls}>
            <option value="all">全部</option>
            {MACHINE_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">班组</span>
          <select value={value.shift} onChange={(e) => onChange({ ...value, shift: e.target.value })} className={selCls}>
            <option value="all">全部</option>
            {SHIFT_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <Button variant="secondary" onClick={onReset}>
          重置
        </Button>
      </div>
    </Card>
  );
}
