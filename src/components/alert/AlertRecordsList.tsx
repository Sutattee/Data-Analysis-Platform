"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { AlertLevelBadge, AlertStatusText } from "@/components/alert/alertBadges";
import { AlertStatusModal } from "@/components/alert/AlertStatusModal";
import { ColumnFilter } from "@/components/alert/ColumnFilter";
import { useApp } from "@/lib/store/AppContext";
import {
  ALERT_RECORDS,
  ALERT_LEVELS,
  ALERT_STATUSES,
  sortAlerts,
  orgPathOf,
  EMPTY_ORG_FILTER,
  type OrgFilter,
} from "@/lib/mock-data/alerts";
import { OrgCascaderFilter } from "@/components/alert/OrgCascaderFilter";
import type { AlertRecord } from "@/types";

// 筛选条件（输入态 / 已应用 两份）
interface AlertFilter {
  keyword: string;
  type: string;
  level: string;
  domain: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTER: AlertFilter = {
  keyword: "",
  type: "",
  level: "",
  domain: "能耗管理",
  status: "",
  dateFrom: "",
  dateTo: "",
};

// 业务域筛选选项
const BIZ_DOMAINS = ["能耗管理", "碳排放与环保合规"];

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
const dateCls = selectCls;

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

type Phase = "loading" | "success" | "error";
type SortMode = "default" | "time_desc" | "time_asc";
type ModalState = { mode: "mark" | "unmark"; id: string } | null;

export function AlertRecordsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useApp();
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";

  // 仅展示能源消耗管理（能耗管理）方向的告警记录：每个等级各取 2 条（共 10 条，覆盖全部等级），按等级+时间排序
  const [records, setRecords] = useState<AlertRecord[]>(() => {
    const current = ALERT_RECORDS.filter((r) => r.type === "当前异常");
    const picked = ALERT_LEVELS.flatMap((lv) =>
      current.filter((r) => r.level === lv).slice(0, 2).map((r) => ({ ...r }))
    );
    return sortAlerts(picked);
  });
  const [filter, setFilter] = useState<AlertFilter>(EMPTY_FILTER); // 输入态（keyword/domain/date）
  // 支持 URL ?domain= 预筛选业务域（carbon-eval 异常「查看告警记录」跳转用）
  const [applied, setApplied] = useState<AlertFilter>(() => {
    const d = searchParams.get("domain");
    return d ? { ...EMPTY_FILTER, domain: d } : EMPTY_FILTER;
  });
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
  const [modal, setModal] = useState<ModalState>(null);
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
        (!applied.domain || r.domain === applied.domain) &&
        (!applied.status || r.status === applied.status) &&
        matchDate(r, applied.dateFrom, applied.dateTo) &&
        matchOrgName(r.objectName)
    );
    if (sortMode === "time_desc") return [...filtered].sort((a, b) => b.triggerTime.localeCompare(a.triggerTime));
    if (sortMode === "time_asc") return [...filtered].sort((a, b) => a.triggerTime.localeCompare(b.triggerTime));
    // 默认：按等级（高→低）+ 告警时间（新→旧）排序
    return sortAlerts(filtered);
  }, [records, applied, sortMode, orgFilter]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilter =
    (Object.keys(applied) as (keyof AlertFilter)[]).some((k) => applied[k].trim() !== "") ||
    orgFilter.workshop !== "" || orgFilter.grid !== "" || orgFilter.equipment !== "";

  // 查询：同步输入态（keyword/domain/date），保留表头筛选（type/level/status）
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
  function applyColumnFilter(key: "level" | "status", v: string) {
    setApplied((prev) => ({ ...prev, [key]: v }));
    setPage(1);
  }

  function toggleTimeSort() {
    setSortMode((m) => (m === "default" ? "time_desc" : m === "time_desc" ? "time_asc" : "default"));
  }

  function handleConfirm(note?: string) {
    if (!modal) return;
    const id = modal.id;
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (modal.mode === "mark") {
          return { ...r, status: "已处理", handleNote: note || undefined, handledAt: formatNow(), handledBy: currentUser };
        }
        return { ...r, status: "未处理", handleNote: undefined, handledAt: undefined, handledBy: undefined };
      })
    );
    setModal(null);
  }

  return (
    <div className="space-y-4">
      {/* 搜索 + 筛选区（类型/等级/状态已移至表头） */}
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
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">业务域</span>
            <select
              className={selectCls}
              value={applied.domain}
              onChange={(e) => {
                setApplied((prev) => ({ ...prev, domain: e.target.value }));
                setPage(1);
              }}
            >
              {BIZ_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <OrgCascaderFilter value={orgFilter} onChange={setOrgFilter} />
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
                  <th className="text-left px-4 py-3">
                    <span className="inline-flex items-center gap-0.5">
                      处理状态
                      <ColumnFilter options={ALERT_STATUSES} value={applied.status} onChange={(v) => applyColumnFilter("status", v)} />
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
                    <td className="px-4 py-3"><AlertStatusText status={r.status} /></td>
                    <td className="px-4 py-3 sticky right-0 bg-white z-10">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => router.push(`/alert/records/${r.id}`)}>
                          查看
                        </Button>
                        {r.status === "未处理" ? (
                          <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setModal({ mode: "mark", id: r.id })}>
                            已处理
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100" onClick={() => setModal({ mode: "unmark", id: r.id })}>
                            误处理
                          </Button>
                        )}
                      </div>
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

      <AlertStatusModal
        open={modal !== null}
        mode={modal?.mode ?? "mark"}
        onClose={() => setModal(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
