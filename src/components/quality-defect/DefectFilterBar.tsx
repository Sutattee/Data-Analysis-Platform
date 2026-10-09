"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  PART_OPTIONS,
  GRADE_OPTIONS,
  BRAND_OPTIONS,
  MACHINE_OPTIONS,
  SHIFT_OPTIONS,
  type DefectFilters,
} from "@/lib/mock-data/quality-defect";

const selCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all focus:ring-2 focus:ring-primary-500 focus:border-transparent";

// 缺陷分析筛选区：统计周期（查询时间范围，控制全部图表）+
// 部位/类别/牌号/机台/班组（控制指标卡、趋势图、明细表；热力图不跟随）+ 重置
export function DefectFilterBar({
  value,
  onChange,
  onReset,
}: {
  value: DefectFilters;
  onChange: (f: DefectFilters) => void;
  onReset: () => void;
}) {
  return (
    <Card padding>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">统计周期</span>
          <select
            value={value.period}
            onChange={(e) => onChange({ ...value, period: Number(e.target.value) as 1 | 2 | 3 })}
            className={selCls}
          >
            <option value={1}>近1个月</option>
            <option value={2}>近2个月</option>
            <option value={3}>近3个月</option>
          </select>
        </label>

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
