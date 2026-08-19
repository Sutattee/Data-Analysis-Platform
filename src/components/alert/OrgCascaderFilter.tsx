"use client";

import {
  ENERGY_WORKSHOPS,
  gridsOfWorkshop,
  equipmentsOfGrid,
  type OrgFilter,
} from "@/lib/mock-data/alerts";

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-400";

// 组织级联筛选：车间 → 网格 → 设备（逐级联动，逐级重置下级）
export function OrgCascaderFilter({
  value,
  onChange,
}: {
  value: OrgFilter;
  onChange: (v: OrgFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">部门</span>
        <select
          className={selectCls}
          value={value.workshop}
          onChange={(e) => onChange({ workshop: e.target.value, grid: "", equipment: "" })}
        >
          <option value="">全部</option>
          {ENERGY_WORKSHOPS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">网格</span>
        <select
          className={selectCls}
          value={value.grid}
          disabled={!value.workshop}
          onChange={(e) => onChange({ ...value, grid: e.target.value, equipment: "" })}
        >
          <option value="">全部</option>
          {gridsOfWorkshop(value.workshop).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">设备</span>
        <select
          className={selectCls}
          value={value.equipment}
          disabled={!value.grid}
          onChange={(e) => onChange({ ...value, equipment: e.target.value })}
        >
          <option value="">全部</option>
          {equipmentsOfGrid(value.grid).map((eq) => (
            <option key={eq} value={eq}>
              {eq}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
