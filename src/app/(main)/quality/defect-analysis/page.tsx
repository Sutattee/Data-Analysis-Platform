"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DefectFilterBar } from "@/components/quality-defect/DefectFilterBar";
import { DefectSummaryCards } from "@/components/quality-defect/DefectSummaryCards";
import { DefectTrendChart } from "@/components/quality-defect/DefectTrendChart";
import { PartDimHeatmap, type HeatSelection } from "@/components/quality-defect/PartDimHeatmap";
import { DefectDetailTable } from "@/components/quality-defect/DefectDetailTable";
import { DefectDiagnosisDrawer } from "@/components/quality-defect/DefectDiagnosisDrawer";
import {
  DEFECT_RECORDS,
  DEFAULT_DEFECT_FILTERS,
  batchesInRange,
  filterByBatches,
  filterByRange,
  filterDims,
  filterRecords,
  latestBatchesOf,
  periodRangeOf,
  prevBatchesOf,
  prevRangeOf,
  summarize,
  type DefectFilters,
  type DefectPeriod,
  type DefectRecord,
} from "@/lib/mock-data/quality-defect";

// 统计周期窗口：时间形态（日期范围）或批次形态（最近 N 批次号，含环比用上一期批次）
type PeriodWindow =
  | { mode: "time"; range: { from: string; to: string }; prevRange: { from: string; to: string } }
  | { mode: "batches"; batches: string[]; prevBatches: string[] };

// 批次窗口基于全量数据流的批次序（与时间窗的全量时间轴同构），维度筛选不影响窗口边界
function windowOf(period: DefectPeriod): PeriodWindow {
  if (period.kind === "batches") {
    return {
      mode: "batches",
      batches: latestBatchesOf(DEFECT_RECORDS, period.count),
      prevBatches: prevBatchesOf(DEFECT_RECORDS, period.count),
    };
  }
  return { mode: "time", range: periodRangeOf(period), prevRange: prevRangeOf(period) };
}

// 缺陷分析：从总览「查看全部」进入，不在左侧导航中；
// 顶部导航标签「总览 | 缺陷分析」。统计周期（时间窗口：近1/2/3个月或自定义日期范围；或批次窗口：
// 近1/10/20/30/40/50/60批次）控制全部图表，其余筛选控制指标卡/趋势图/明细表，热力图仅随周期变化。
export default function DefectAnalysisPage() {
  const [filters, setFilters] = useState<DefectFilters>(DEFAULT_DEFECT_FILTERS);
  const [heatSel, setHeatSel] = useState<HeatSelection | null>(null);
  const [drawerRecord, setDrawerRecord] = useState<DefectRecord | null>(null);
  // 保存判定后触发重渲染（缺陷明细表「缺陷状态」列渲染时实时读取会话内判定）
  const [, bumpRev] = useState(0);

  // 统计周期窗口（时间或批次形态）
  const win = useMemo(() => windowOf(filters.period), [filters.period]);
  // 趋势图横轴批次列表（批次号升序；批次口径 = 窗口批次本身）
  const batches = useMemo(
    () => (win.mode === "batches" ? win.batches : batchesInRange(filterByRange(DEFECT_RECORDS, win.range))),
    [win]
  );

  // 指标卡 / 趋势图 / 明细表：完整筛选（周期 + 维度）
  const cur = useMemo(() => filterRecords(DEFECT_RECORDS, filters), [filters]);
  // 环比：同维度条件的上一等长窗口（时间前移一段或再往前 N 个批次）
  const prev = useMemo(
    () =>
      win.mode === "batches"
        ? filterByBatches(filterDims(DEFECT_RECORDS, filters), win.prevBatches)
        : filterByRange(filterDims(DEFECT_RECORDS, filters), win.prevRange),
    [filters, win]
  );
  const summary = useMemo(() => summarize(cur, prev), [cur, prev]);

  // 热力图：仅随统计周期变化，不随部位/类别等筛选
  const heatRecords = useMemo(
    () => (win.mode === "batches" ? filterByBatches(DEFECT_RECORDS, win.batches) : filterByRange(DEFECT_RECORDS, win.range)),
    [win]
  );

  // 手动改筛选时清除热力图选中态
  function changeFilters(f: DefectFilters) {
    setFilters(f);
    setHeatSel(null);
  }

  // 点击热力图格：条件写回顶部筛选（部位 + 该维度值，其余重置），再点取消
  function handleHeatSelect(sel: HeatSelection | null) {
    setHeatSel(sel);
    if (!sel) {
      setFilters((f) => ({ ...f, part: "all", grade: "all", brand: "all", machine: "all", shift: "all" }));
      return;
    }
    setFilters((f) => ({
      ...f,
      part: sel.part,
      grade: "all",
      brand: "all",
      machine: "all",
      shift: "all",
      [sel.dim]: sel.value,
    }));
  }

  function handleReset() {
    setFilters(DEFAULT_DEFECT_FILTERS);
    setHeatSel(null);
  }

  return (
    <div className="space-y-3">
      {/* 面包屑导航：总览（可返回）/ 缺陷分析（当前页） */}
      <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2.5 text-sm">
        <Link href="/quality/overview" className="text-gray-500 transition-colors hover:text-primary-600">
          总览
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">缺陷分析</span>
      </div>

      <div className="space-y-3">
        <DefectFilterBar value={filters} onChange={changeFilters} onReset={handleReset} />
        <DefectSummaryCards summary={summary} />

        <div className="grid gap-3 xl:grid-cols-2">
          <DefectTrendChart records={cur} batches={batches} total={summary.total} />
          <PartDimHeatmap records={heatRecords} selected={heatSel} onSelect={handleHeatSelect} />
        </div>

        <DefectDetailTable filters={filters} onOpen={setDrawerRecord} />
      </div>

      <DefectDiagnosisDrawer
        record={drawerRecord}
        open={!!drawerRecord}
        onClose={() => setDrawerRecord(null)}
        onSaved={() => bumpRev((n) => n + 1)}
        variant="detail"
      />
    </div>
  );
}
