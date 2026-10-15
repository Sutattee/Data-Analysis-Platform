"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { ColumnFilter } from "@/components/alert/ColumnFilter";
import {
  ALERT_RECORDS,
  ALERT_LEVELS,
  PRODUCTION_MATERIAL_METRICS,
  sortAlerts,
  orgPathOf,
  EMPTY_ORG_FILTER,
  type OrgFilter,
} from "@/lib/mock-data/alerts";
import { EXPENSE_ALERT_METRIC_NAMES } from "@/lib/mock-data/expense-alerts";
import { OrgCascaderFilter } from "@/components/alert/OrgCascaderFilter";
import type { AlertRecord } from "@/types";

// 筛选条件（输入态 / 已应用 两份）
interface AlertFilter {
  keyword: string;
  type: string;
  level: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTER: AlertFilter = {
  keyword: "",
  type: "",
  level: "",
  dateFrom: "",
  dateTo: "",
};

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
const dateCls = selectCls;

type Phase = "loading" | "success" | "error";
type SortMode = "default" | "time_desc" | "time_asc";

// metrics：指标白名单。传入 → 仅展示白名单指标的记录（生产管理/费用预算执行告警中心）；
// 不传 → 展示全部并排除生产辅料与费用预算执行记录（能源告警中心维持原有口径）
// basePath：详情跳转前缀（费用预算执行传 /expense/alert/records；缺省按 metrics 二分保持兼容）
export function AlertRecordsList({ metrics, basePath }: { metrics?: string[]; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailBase = basePath ?? (metrics ? "/production/alert/records" : "/alert/records");

  // 全量告警记录（当前异常 + 预测风险均展示），等级等筛选在 sorted 中进行
  const [records, setRecords] = useState<AlertRecord[]>(() =>
    ALERT_RECORDS.filter((r) =>
      metrics
        ? metrics.includes(r.metricName)
        : !PRODUCTION_MATERIAL_METRICS.includes(r.metricName) &&
          !EXPENSE_ALERT_METRIC_NAMES.has(r.metricName) &&
          !r.id.startsWith("ZL") // 能源口径排除工艺质量记录（ZL 前缀独立数据集）
    ).map((r) => ({ ...r }))
  );
  const [filter, setFilter] = useState<AlertFilter>(EMPTY_FILTER); // 输入态（keyword/date）
  const [applied, setApplied] = useState<AlertFilter>(EMPTY_FILTER);
  // 支持 URL ?object= 预筛选（仪表盘异常点击跳转），映射为组织级联筛选
  const [orgFilter, setOrgFilter] = useState<OrgFilter>(() => {
    const name = searchParams.get("object");
    if (!name) return EMPTY_ORG_FILTER;
    const p = orgPathOf(name);
    if (p.level === "workshop") return { workshop: p.workshop ?? "", grid: "", equipment: "" };
    if (p.level === "grid") return { workshop: p.workshop ?? "", grid: p.grid ?? "", equipment: "" };
    if (p.level === "equipment") return { workshop: p.workshop ?? "", grid: p.grid ?? "", equipment: name };
    return EMPTY_ORG_FILTER;
  });
  const [phase, setPhase] = useState<Phase>("loading");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runLoad() {
    setPhase("loading");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPhase("success"), 600);
  }

  useEffect(() => {
    runLoad();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function matchKeyword(r: AlertRecord, kw: string): boolean {
    if (!kw.trim()) return true;
    const k = kw.trim().toLowerCase();
    return [r.title, r.objectCode, r.objectName, r.receiver, r.metricName].some((v) =>
      v.toLowerCase().includes(k)
    );
  }

  function matchDate(r: AlertRecord, from: string, to: string): boolean {
    const t = r.triggerTime.slice(0, 10);
    if (from && t < from) return false;
    if (to && t > to) return false;
    return true;
  }

  const sorted = useMemo(() => {
    // 组织层级筛选：全厂/车间/网格/设备
    const { workshop, grid, equipment } = orgFilter;
    function matchOrgName(name: string): boolean {
      if (!workshop && !grid && !equipment) return true;
      const p = orgPathOf(name);
      if (equipment) {
        // 选中设备 → 匹配该设备所属网格的记录（记录最细到网格级）
        const ep = orgPathOf(equipment);
        return !!ep.grid && p.grid === ep.grid && (!workshop || p.workshop === workshop);
      }
      if (grid) return p.grid === grid && (!workshop || p.workshop === workshop);
      if (workshop) return p.workshop === workshop;
      return true;
    }
    const filtered = records.filter(
      (r) =>
        matchKeyword(r, applied.keyword) &&
        (!applied.level || r.level === applied.level) &&
        matchDate(r, applied.dateFrom, applied.dateTo) &&
        matchOrgName(r.objectName)
    );
    // 未选等级时每个等级最多取 2 条：默认恰好 10 条且覆盖全部 5 个等级
    const capped = applied.level
      ? filtered
      : ALERT_LEVELS.flatMap((lv) => filtered.filter((r) => r.level === lv).slice(0, 2));
    if (sortMode === "time_desc") return [...capped].sort((a, b) => b.triggerTime.localeCompare(a.triggerTime));
    if (sortMode === "time_asc") return [...capped].sort((a, b) => a.triggerTime.localeCompare(b.triggerTime));
    // 默认：按等级（高→低）+ 告警时间（新→旧）排序
    return sortAlerts(capped);
  }, [records, applied, sortMode, orgFilter]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilter =
    (Object.keys(applied) as (keyof AlertFilter)[]).some((k) => applied[k].trim() !== "") ||
    orgFilter.workshop !== "" || orgFilter.grid !== "" || orgFilter.equipment !== "";

  // 查询：同步输入态（keyword/date），保留表头筛选（level）
  function handleSearch() {
    setApplied((prev) => ({
      ...prev,
      keyword: filter.keyword,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
    }));
    setPage(1);
    runLoad();
  }

  function handleReset() {
    setFilter(EMPTY_FILTER);
    setApplied(EMPTY_FILTER);
    setOrgFilter(EMPTY_ORG_FILTER);
    setSortMode("default");
    setPage(1);
    runLoad();
  }

  // 表头筛选：即时应用
  function applyColumnFilter(key: "level", v: string) {
    setApplied((prev) => ({ ...prev, [key]: v }));
    setPage(1);
  }

  function toggleTimeSort() {
    setSortMode((m) => (m === "default" ? "time_desc" : m === "time_desc" ? "time_asc" : "default"));
  }

  return (
    <div className="space-y-4">
      {/* 搜索 + 筛选区（等级筛选已移至表头） */}
      <Card padding>
        <div className="flex gap-2 flex-wrap">
          <input
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="搜索告警标题/告警对象编号/告警对象名称/接收人姓名/指标名称"
            className="w-[480px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3">
          {/* 组织级联筛选仅能源域适用（辅料为全厂级指标） */}
          {!metrics && <OrgCascaderFilter value={orgFilter} onChange={setOrgFilter} />}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">时间范围</span>
            <input type="date" className={dateCls} value={filter.dateFrom} onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })} />
            <span className="text-gray-400 text-xs">至</span>
            <input type="date" className={dateCls} value={filter.dateTo} onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })} />
          </div>
        </div>
      </Card>

      {/* 列表 */}
      <Card padding={false}>
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-24">
            <Spinner />
            <p className="text-sm text-gray-400 mt-3">加载中…</p>
          </div>
        )}
        {phase === "error" && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-4xl mb-3">⚠️</span>
            <p className="text-sm text-gray-500">加载失败，请稍后重试</p>
            <Button variant="secondary" className="mt-3" onClick={runLoad}>重新加载</Button>
          </div>
        )}
        {phase === "success" && total === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-4xl mb-3">{hasFilter ? "🔍" : "📭"}</span>
            <p className="text-sm text-gray-500">{hasFilter ? "无筛选结果" : "暂无记录"}</p>
            {hasFilter && <Button variant="secondary" className="mt-3" onClick={handleReset}>重置筛选</Button>}
          </div>
        )}

        {phase === "success" && total > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                  <th className="text-left px-4 py-3">
                    <span className="inline-flex items-center gap-0.5">
                      等级
                      <ColumnFilter options={ALERT_LEVELS} value={applied.level} onChange={(v) => applyColumnFilter("level", v)} />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 sticky left-0 bg-gray-50 z-10">告警标题</th>
                  <th className="text-left px-4 py-3">告警对象编号</th>
                  <th className="text-left px-4 py-3">告警对象名称</th>
                  <th className="text-left px-4 py-3">指标名称</th>
                  <th className="text-left px-4 py-3 cursor-pointer select-none" onClick={toggleTimeSort}>
                    <span className="inline-flex items-center gap-1">
                      告警触发时间
                      <span className="text-gray-400">{sortMode === "time_desc" ? "↓" : sortMode === "time_asc" ? "↑" : "↕"}</span>
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 sticky right-0 bg-gray-50 z-10">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><AlertLevelBadge level={r.level} /></td>
                    <td className="px-4 py-3 sticky left-0 bg-white z-10 text-gray-900">{r.title}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.objectCode}</td>
                    <td className="px-4 py-3 text-gray-600">{r.objectName}</td>
                    <td className="px-4 py-3 text-gray-600">{r.metricName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.triggerTime}</td>
                    <td className="px-4 py-3 sticky right-0 bg-white z-10">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => router.push(`${detailBase}/${r.id}`)}>
                        查看
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {phase === "success" && total > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              total={total}
              page={safePage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          </div>
        )}
      </Card>

      {/* 来源页跳入时展示一键返回（如网格监测「告警记录」） */}
      {searchParams.get("from") && (
        <div className="flex justify-center">
          <Button onClick={() => router.back()}>返回</Button>
        </div>
      )}
    </div>
  );
}
