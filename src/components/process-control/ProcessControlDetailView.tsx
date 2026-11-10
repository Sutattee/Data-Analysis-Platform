"use client";

// 过程管控详情主视图：查询条件（filter 输入态 / applied 应用态双态）→ 最新监测摘要 →
// 实测趋势 → 多维度对比；摘要 / 趋势 / 对比共用同一份筛选后记录，口径一致。
// 统计周期按统计单元数筛选（最近 N 批次/班次/个月）；指标切换经路由参数
// （/quality/process-control/[metricId]）驱动，切换时重置全部条件（清除不适配维度）。
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ENV_HUM_OPTIONS,
  ENV_TEMP_OPTIONS,
  metricOfDetail,
  recordsOfDetail,
  type MonitorRecord,
} from "@/lib/mock-data/process-control-detail";
import { BRAND_OPTIONS } from "@/lib/mock-data/quality-defect";
import { AnomalyPointDrawer } from "./AnomalyPointDrawer";
import { DimensionCompareCard } from "./DimensionCompareCard";
import { LatestSummaryCard } from "./LatestSummaryCard";
import { MeasuredTrendChart } from "./MeasuredTrendChart";
import { ProcessDetailFilters, type DetailFilterState } from "./ProcessDetailFilters";

// 按指标周期形态取初始统计周期：批/班/日 = 近30单元，月 = 近3个月
function initRangeMode(cycle: "批" | "班" | "日" | "月" | undefined): DetailFilterState["rangeMode"] {
  return cycle === "月" ? "last3" : "last30";
}

// 初始查询条件：牌号默认选中首个牌号（无「全部牌号」空选），其余维度不选
function initialFilter(rangeMode: DetailFilterState["rangeMode"]): DetailFilterState {
  return {
    rangeMode,
    brands: [BRAND_OPTIONS[0]],
    machines: [],
    shifts: [],
    materials: [],
    spec: "",
    envTemp: "",
    envHum: "",
  };
}

function inEnvRange(v: number | undefined, text: string, opts: typeof ENV_TEMP_OPTIONS): boolean {
  if (!text) return true;
  const o = opts.find((x) => x.text === text);
  if (!o) return true;
  return v !== undefined && v >= o.range[0] && v <= o.range[1];
}

export function ProcessControlDetailView() {
  const params = useParams<{ metricId: string }>();
  const router = useRouter();
  const metricId = params.metricId;
  const metric = metricOfDetail(metricId);

  const initMode = initRangeMode(metric?.cycle);
  const [filter, setFilter] = useState<DetailFilterState>(() => initialFilter(initMode));
  const [applied, setApplied] = useState<DetailFilterState>(() => initialFilter(initMode));
  const [selected, setSelected] = useState<MonitorRecord | null>(null);

  // 指标切换（路由参数变化）→ 重置全部条件，清除上一指标不适配的筛选项
  useEffect(() => {
    const init = initialFilter(initRangeMode(metricOfDetail(metricId)?.cycle));
    setFilter(init);
    setApplied(init);
    setSelected(null);
  }, [metricId]);

  const allRecords = useMemo(() => recordsOfDetail(metricId), [metricId]);

  // 应用态过滤：各维度（仅保留当前指标支持的维度值生效）→ 统计周期（最近 N 个统计单元）
  const records = useMemo(() => {
    if (!metric) return [];
    const filtered = allRecords.filter((r) => {
      // 牌号过滤仅对支持牌号维度的指标生效（防御：不支持时不因默认牌号滤空数据）
      if (metric.dims.includes("brand") && applied.brands.length && !applied.brands.includes(r.brand))
        return false;
      if (applied.machines.length && !applied.machines.includes(r.machine)) return false;
      if (applied.shifts.length && !(r.shiftGroup && applied.shifts.includes(r.shiftGroup))) return false;
      if (applied.materials.length && !(r.material && applied.materials.includes(r.material))) return false;
      if (applied.spec && r.spec !== applied.spec) return false;
      if (!inEnvRange(r.envTemp, applied.envTemp, ENV_TEMP_OPTIONS)) return false;
      if (!inEnvRange(r.envHum, applied.envHum, ENV_HUM_OPTIONS)) return false;
      return true;
    });
    // 统计周期：按统计单元（批次号 / 班次 / 月份 = 记录 label）取最近的 N 个
    const n = Number(applied.rangeMode.slice(4)); // "last10" → 10
    const unitTime = new Map<string, string>();
    for (const r of filtered) {
      const t = unitTime.get(r.label);
      if (!t || r.time > t) unitTime.set(r.label, r.time);
    }
    const keep = new Set(
      Array.from(unitTime.entries())
        .sort((a, b) => b[1].localeCompare(a[1]))
        .slice(0, n)
        .map(([label]) => label)
    );
    return filtered.filter((r) => keep.has(r.label));
  }, [metric, allRecords, applied]);

  // 无效指标编码兜底
  if (!metric) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">过程管控详情</h1>
        <Card>
          <div className="py-10 text-center">
            <p className="text-sm text-gray-500">未找到指标编码「{metricId}」，请从工艺质量总览的过程管控列表进入。</p>
            <Button className="mt-4" onClick={() => router.push("/quality/overview")}>
              返回工艺质量总览
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 面包屑（不设大标题） */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link href="/quality/overview" className="hover:text-primary-600">
          总览
        </Link>
        <span>/</span>
        <span className="text-gray-600">过程管控详情</span>
      </nav>

      {/* 查询条件 */}
      <Card>
        <ProcessDetailFilters
          metric={metric}
          filter={filter}
          onChange={setFilter}
          onMetricChange={(id) => router.push(`/quality/process-control/${id}`)}
          onSearch={() => setApplied(filter)}
          onReset={() => {
            const init = initialFilter(initRangeMode(metric.cycle));
            setFilter(init);
            setApplied(init);
          }}
        />
      </Card>

      {/* 最新监测摘要 */}
      <LatestSummaryCard metric={metric} records={records} />

      {/* 实测趋势 */}
      <Card title="实测趋势">
        {records.length ? (
          <MeasuredTrendChart metric={metric} records={records} onSelect={setSelected} />
        ) : (
          <p className="py-10 text-center text-sm text-gray-400">当前查询范围内无监测记录，请调整查询条件。</p>
        )}
      </Card>

      {/* 多维度对比 */}
      {records.length ? (
        <DimensionCompareCard metric={metric} records={records} />
      ) : (
        <Card title="多维度对比">
          <p className="py-10 text-center text-sm text-gray-400">当前查询范围内无监测记录，无法对比。</p>
        </Card>
      )}

      {/* 异常详情抽屉 */}
      <AnomalyPointDrawer metric={metric} record={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
