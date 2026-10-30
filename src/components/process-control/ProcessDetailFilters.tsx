"use client";

// 查询条件区：指标单选（切换由主视图统一清不适配条件并跳转）、统计周期（按周期分
// 形态：批=近N批次，班=近N班次，日=近N日，月=近1/2/3个月，按统计单元数取最近
// N 个单元）、牌号/机台/班组多选、更多条件（材料+环境温湿度，仅支持的指标展示）。
// 指标选项仅展示指标名称（不带单位与统计周期）。查询 = 应用输入态；重置 = 恢复初始条件（均由主视图处理）。
import { SearchMultiSelect } from "@/components/alert/SearchMultiSelect";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import { Button } from "@/components/ui/Button";
import { BRAND_OPTIONS, SHIFT_OPTIONS } from "@/lib/mock-data/quality-defect";
import {
  ENV_HUM_OPTIONS,
  ENV_TEMP_OPTIONS,
  MATERIAL_OPTIONS,
  PROCESS_DETAIL_METRICS,
  SPEC_OPTIONS,
  type ProcessDetailMetric,
} from "@/lib/mock-data/process-control-detail";

export interface DetailFilterState {
  rangeMode: "last1" | "last2" | "last3" | "last4" | "last5" | "last6" | "last10" | "last20" | "last30" | "last40" | "last50" | "last60";
  brands: string[];
  machines: string[];
  shifts: string[];
  materials: string[];
  spec: string;
  envTemp: string;
  envHum: string;
}

const selectCls =
  "px-2.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

export function ProcessDetailFilters({
  metric,
  filter,
  onChange,
  onMetricChange,
  onSearch,
  onReset,
}: {
  metric: ProcessDetailMetric;
  filter: DetailFilterState;
  onChange: (f: DetailFilterState) => void;
  onMetricChange: (id: string) => void;
  onSearch: () => void;
  onReset: () => void;
}) {
  const patch = (p: Partial<DetailFilterState>) => onChange({ ...filter, ...p });
  // 统计周期选项按周期形态：批/班 = 最近 1~60 个统计单元（批次/班次），月 = 最近 1~6 个月
  const unitOptions = (unit: string) =>
    [1, 10, 20, 30, 40, 50, 60].map((n) => ({ v: `last${n}`, t: `近${n}${unit}` }));
  const rangeOptions =
    metric.cycle === "月"
      ? [1, 2, 3, 4, 5, 6].map((n) => ({ v: `last${n}`, t: `近${n}个月` }))
      : metric.cycle === "班"
        ? unitOptions("班次")
        : metric.cycle === "日"
          ? unitOptions("日")
          : unitOptions("批次");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">指标</span>
          <div className="w-[240px]">
            <SearchSelect
              options={PROCESS_DETAIL_METRICS.map((m) => ({
                value: m.id,
                label: m.name,
              }))}
              value={metric.id}
              onChange={onMetricChange}
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">统计周期</span>
          <select
            value={filter.rangeMode}
            onChange={(e) => patch({ rangeMode: e.target.value as DetailFilterState["rangeMode"] })}
            className={selectCls}
          >
            {rangeOptions.map((o) => (
              <option key={o.v} value={o.v}>
                {o.t}
              </option>
            ))}
          </select>
        </div>
        {/* 维度条件按指标支持能力展示 */}
        {metric.dims.includes("brand") && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">牌号</span>
            <div className="w-[200px]">
              <SearchMultiSelect
                options={BRAND_OPTIONS.map((b) => ({ value: b, label: b }))}
                value={filter.brands}
                onChange={(v) => patch({ brands: v })}
                placeholder="全部牌号"
              />
            </div>
          </div>
        )}
        {metric.dims.includes("machine") && metric.machines.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">机台</span>
            <div className="w-[240px]">
              <SearchMultiSelect
                options={metric.machines.map((m) => ({ value: m, label: m }))}
                value={filter.machines}
                onChange={(v) => patch({ machines: v })}
                placeholder="全部机台"
              />
            </div>
          </div>
        )}
        {metric.dims.includes("shift") && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">班组</span>
            <div className="w-[200px]">
              <SearchMultiSelect
                options={SHIFT_OPTIONS.map((s) => ({ value: s, label: s }))}
                value={filter.shifts}
                onChange={(v) => patch({ shifts: v })}
                placeholder="全部班组"
              />
            </div>
          </div>
        )}
        {metric.dims.includes("spec") && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">规格</span>
            <select value={filter.spec} onChange={(e) => patch({ spec: e.target.value })} className={selectCls}>
              <option value="">全部规格</option>
              {SPEC_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* 查询/重置：与筛选条件同一行，靠右 */}
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={onSearch}>查询</Button>
          <Button variant="secondary" onClick={onReset}>
            重置
          </Button>
        </div>
      </div>
      {/* 更多条件：材料 + 环境温湿度（仅成品水分标准偏差等支持的指标展示） */}
      {metric.dims.includes("material") && (
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-50 pt-3">
          <span className="text-xs text-gray-400">更多条件</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">材料</span>
            <div className="w-[220px]">
              <SearchMultiSelect
                options={MATERIAL_OPTIONS.map((mm) => ({ value: mm, label: mm }))}
                value={filter.materials}
                onChange={(v) => patch({ materials: v })}
                placeholder="全部材料"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">环境温度</span>
            <select value={filter.envTemp} onChange={(e) => patch({ envTemp: e.target.value })} className={selectCls}>
              <option value="">不限</option>
              {ENV_TEMP_OPTIONS.map((o) => (
                <option key={o.text} value={o.text}>
                  {o.text}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">环境湿度</span>
            <select value={filter.envHum} onChange={(e) => patch({ envHum: e.target.value })} className={selectCls}>
              <option value="">不限</option>
              {ENV_HUM_OPTIONS.map((o) => (
                <option key={o.text} value={o.text}>
                  {o.text}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
