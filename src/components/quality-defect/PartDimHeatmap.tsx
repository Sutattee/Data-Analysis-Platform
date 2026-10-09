"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  heatmapOf,
  type DefectRecord,
  type HeatDim,
} from "@/lib/mock-data/quality-defect";

// 列维度：类别 / 牌号 / 机台 / 班组
const DIM_LABELS: Record<HeatDim, string> = {
  grade: "类别",
  brand: "牌号",
  machine: "机台",
  shift: "班组",
};
const DIMS: HeatDim[] = ["grade", "brand", "machine", "shift"];

// 选中格（dim + 部位 + 维度值），由父级持有并联动顶部筛选
export interface HeatSelection {
  dim: HeatDim;
  part: string;
  value: string;
}

// 单元格：颜色深浅 = 数值占比；hover 浮层展示明细；点击选中/取消（选中格高亮、其余置灰）
function HeatCell({
  value,
  max,
  grand,
  part,
  colValue,
  dim,
  selected,
  onSelect,
}: {
  value: number;
  max: number;
  grand: number;
  part: string;
  colValue: string;
  dim: HeatDim;
  selected: HeatSelection | null;
  onSelect: (s: HeatSelection | null) => void;
}) {
  const isSel =
    !!selected && selected.dim === dim && selected.part === part && selected.value === colValue;
  const dimmed = !!selected && !isSel;
  const alpha = value === 0 ? 0.03 : 0.1 + 0.75 * (value / max);
  const pct = grand > 0 ? ((value / grand) * 100).toFixed(0) : "0";

  return (
    <td className={`p-0.5 transition-opacity ${dimmed ? "opacity-25" : ""}`}>
      <div className="group relative">
        <button
          onClick={() => (isSel ? onSelect(null) : onSelect({ dim, part, value: colValue }))}
          className={`flex h-9 w-full items-center justify-center rounded-md text-sm transition-all ${
            alpha > 0.5 ? "font-medium text-white" : "text-gray-800"
          } ${isSel ? "font-bold ring-2 ring-primary-600 ring-offset-1" : "hover:ring-1 hover:ring-primary-300"}`}
          style={{ backgroundColor: `rgba(37, 99, 235, ${alpha})` }}
        >
          {value}
        </button>
        {/* hover 浮层：部位 / 类别名称 / 条数 / 全量占比 */}
        <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden -translate-x-1/2 translate-y-1.5 whitespace-nowrap rounded-lg border border-gray-100 bg-white px-3 py-2 text-left text-xs shadow-lg group-hover:block">
          <p className="text-gray-500">缺陷部位：{part}</p>
          <p className="text-gray-500">
            缺陷{DIM_LABELS[dim]}：{dim === "grade" ? `${colValue}类` : colValue}
          </p>
          <p className="font-medium text-gray-800">缺陷条数：{value}条</p>
          <p className="text-gray-500">全量占比：{pct}%</p>
        </div>
      </div>
    </td>
  );
}

// 部位×缺陷类别分布热力图：不随部位/类别等筛选变化，仅随统计周期变化；
// 列维度切换后列名与标题联动；点击格写回顶部筛选并联动趋势图/明细表
export function PartDimHeatmap({
  records,
  selected,
  onSelect,
}: {
  records: DefectRecord[];
  selected: HeatSelection | null;
  onSelect: (s: HeatSelection | null) => void;
}) {
  const [dim, setDim] = useState<HeatDim>("grade");
  const data = useMemo(() => heatmapOf(records, dim), [records, dim]);
  const max = Math.max(...data.cells.flat(), 1);

  // 切换列维度时取消选中（联动父级恢复筛选）
  function changeDim(d: HeatDim) {
    if (d === dim) return;
    setDim(d);
    onSelect(null);
  }

  const th = "px-2 py-2 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <Card padding={false}>
      {/* 标题随列维度联动 + 维度切换 tab */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-800">
          部位×{DIM_LABELS[dim]}分布热力图
        </h3>
        <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5">
          {DIMS.map((d) => (
            <button
              key={d}
              onClick={() => changeDim(d)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                dim === d
                  ? "bg-white font-medium text-primary-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {DIM_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* 部位行数随真实部位口径增多：限高滚动 + 粘性表头 */}
      <div className="max-h-[420px] overflow-auto p-3">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {/* 首列表头精简为「部位」：列宽收窄，让数据列（格子）分到更多宽度 */}
              <th className={`${th} sticky left-0 top-0 z-10 w-[1%] bg-white text-left`}>部位</th>
              {data.cols.map((c) => (
                <th key={c} className={`${th} sticky top-0 z-10 bg-white`}>
                  {dim === "grade" ? `${c}类` : c}
                </th>
              ))}
              <th className={`${th} sticky top-0 z-10 bg-white`}>合计</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((part, pi) => (
              <tr key={part}>
                <td className="px-2 py-1.5 text-xs font-medium whitespace-nowrap text-gray-700">{part}</td>
                {data.cols.map((c, ci) => (
                  <HeatCell
                    key={c}
                    value={data.cells[pi][ci]}
                    max={max}
                    grand={data.grandTotal}
                    part={part}
                    colValue={c}
                    dim={dim}
                    selected={selected}
                    onSelect={onSelect}
                  />
                ))}
                <td className="px-2 py-1.5 text-center text-sm font-medium text-gray-700">
                  {data.rowTotals[pi]}
                </td>
              </tr>
            ))}
            {/* 合计行（不可点击） */}
            <tr>
              <td className="px-2 py-2 text-xs font-medium whitespace-nowrap text-gray-700">合计</td>
              {data.colTotals.map((v, i) => (
                <td key={i} className="p-0.5">
                  <div className="flex h-9 items-center justify-center rounded-md bg-gray-100 text-sm font-medium text-gray-700">
                    {v}
                  </div>
                </td>
              ))}
              <td className="p-0.5">
                <div className="flex h-9 items-center justify-center rounded-md bg-gray-200 text-sm font-bold text-gray-800">
                  {data.grandTotal}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
