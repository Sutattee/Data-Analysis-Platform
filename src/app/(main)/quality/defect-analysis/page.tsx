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
  filterByRange,
  filterDims,
  filterRecords,
  periodRangeOf,
  prevRangeOf,
  summarize,
  type DefectFilters,
  type DefectRecord,
} from "@/lib/mock-data/quality-defect";

// 缺陷分析：从总览「查看全部」进入，不在左侧导航中；
// 顶部导航标签「总览 | 缺陷分析」。统计周期（时间窗口：近1/2/3个月或自定义日期范围）控制全部图表，
// 其余筛选控制指标卡/趋势图/明细表，热力图仅随周期变化。
export default function DefectAnalysisPage() {
  const [filters, setFilters] = useState<DefectFilters>(DEFAULT_DEFECT_FILTERS);
  const [heatSel, setHeatSel] = useState<HeatSelection | null>(null);
  const [drawerRecord, setDrawerRecord] = useState<DefectRecord | null>(null);
  // 保存判定后触发重渲染（缺陷明细表「缺陷状态」列渲染时实时读取会话内判定）
  const [, bumpRev] = useState(0);

  // 统计周期：时间窗口（近1/2/3个月或自定义日期范围）
  const range = useMemo(() => periodRangeOf(filters.period), [filters.period]);
  // 窗口内批次列表（批次号升序，供趋势图横轴）
  const batches = useMemo(
    () => batchesInRange(filterByRange(DEFECT_RECORDS, range)),
    [range]
  );

  // 指标卡 / 趋势图 / 明细表：完整筛选（周期 + 维度）
  const cur = useMemo(() => filterRecords(DEFECT_RECORDS, filters), [filters]);
  // 环比：同维度条件的上一等长时间窗口
  const prev = useMemo(
    () => filterByRange(filterDims(DEFECT_RECORDS, filters), prevRangeOf(filters.period)),
    [filters]
  );
  const summary = useMemo(() => summarize(cur, prev), [cur, prev]);

  // 热力图：仅随统计周期变化，不随部位/类别等筛选
  const heatRecords = useMemo(
    () => filterByRange(DEFECT_RECORDS, range),
    [range]
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
