"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { ColumnFilter } from "@/components/alert/ColumnFilter";
import { ALERT_RECORDS, ALERT_LEVELS, sortAlerts, applyHandledOverride } from "@/lib/mock-data/alerts";
import { TYPE_DISPLAY } from "@/lib/mock-data/quality-alerts";
import type { AlertRecord } from "@/types";

// 筛选条件（输入态 / 已应用 两份）
interface QualityAlertFilter {
  keyword: string;   // 仅按告警标题模糊搜索
  level: string;     // 表头筛选
  status: string;    // 表头筛选（未处理/已处理）
  type: string;      // 表头筛选（实测异常/预测风险）
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTER: QualityAlertFilter = {
  keyword: "",
  level: "",
  status: "",
  type: "",
  dateFrom: "",
  dateTo: "",
};

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
const dateCls = selectCls;

type Phase = "loading" | "success" | "error";
type SortMode = "default" | "time_desc" | "time_asc";

// 工艺质量 · 告警记录列表（ZL 前缀记录；标题搜索 + 时间范围筛选 + 查询/重置；
// 等级/状态表头筛选；默认按等级优先级 + 同级最新优先排序）
export function QualityAlertRecordsList({ basePath = "/quality/alert/records" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 全量质量告警记录（实测异常 + 预测风险均展示；应用会话级处理覆盖）
  const [records, setRecords] = useState<AlertRecord[]>(() =>
    ALERT_RECORDS.filter((r) => r.id.startsWith("ZL")).map((r) => applyHandledOverride({ ...r }))
  );
  // 深链初始类型筛选（?type=实测异常|预测风险，来自工作台「全部告警记录」）：无效参数忽略
  const [filter, setFilter] = useState<QualityAlertFilter>(() => {
    const t = searchParams.get("type");
    return t === "实测异常" || t === "预测风险" ? { ...EMPTY_FILTER, type: t } : EMPTY_FILTER;
  }); // 输入态
  const [applied, setApplied] = useState<QualityAlertFilter>(filter);
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
    return r.title.toLowerCase().includes(kw.trim().toLowerCase());
  }

  function matchDate(r: AlertRecord, from: string, to: string): boolean {
    const t = r.triggerTime.slice(0, 10);
    if (from && t < from) return false;
    if (to && t > to) return false;
    return true;
  }

  function matchStatus(r: AlertRecord, status: string): boolean {
    if (!status) return true;
    return (status === "已处理") === !!r.handledBy;
  }

  const sorted = useMemo(() => {
    const filtered = records.filter(
      (r) =>
        matchKeyword(r, applied.keyword) &&
        (!applied.level || r.level === applied.level) &&
        matchStatus(r, applied.status) &&
        (!applied.type || TYPE_DISPLAY[r.type] === applied.type) &&
        matchDate(r, applied.dateFrom, applied.dateTo)
    );
    if (sortMode === "time_desc") return [...filtered].sort((a, b) => b.triggerTime.localeCompare(a.triggerTime));
    if (sortMode === "time_asc") return [...filtered].sort((a, b) => a.triggerTime.localeCompare(b.triggerTime));
    // 默认：飘移类（连续同向偏离）记录置顶，其余按等级（高→低）+ 告警触发时间（新→旧）
    const drift = sortAlerts(filtered.filter((r) => r.consecutiveShifts != null));
    const rest = sortAlerts(filtered.filter((r) => r.consecutiveShifts == null));
    return [...drift, ...rest];
  }, [records, applied, sortMode]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilter = (Object.keys(applied) as (keyof QualityAlertFilter)[]).some((k) => applied[k].trim() !== "");

  // 查询：应用输入态（标题/时间范围），保留表头筛选（等级/状态）
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
    setSortMode("default");
    setPage(1);
    runLoad();
  }

  // 表头筛选：即时应用
  function applyColumnFilter(key: "level" | "status" | "type", v: string) {
    setApplied((prev) => ({ ...prev, [key]: v }));
    setPage(1);
  }

  function toggleTimeSort() {
    setSortMode((m) => (m === "default" ? "time_desc" : m === "time_desc" ? "time_asc" : "default"));
  }

  return (
    <div className="space-y-4">
      {/* 搜索 + 筛选（一行）：搜索框（仅按告警标题模糊搜索）、时间范围，后跟 查询/重置 */}
      <Card padding>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="搜索告警标题"
            className="w-[260px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">时间范围</span>
            <input type="date" className={dateCls} value={filter.dateFrom} onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })} />
            <span className="text-gray-400 text-xs">至</span>
            <input type="date" className={dateCls} value={filter.dateTo} onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })} />
          </div>
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
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
                  <th className="text-left px-4 py-3">
                    <span className="inline-flex items-center gap-0.5">
                      告警类型
                      <ColumnFilter options={["实测异常", "预测风险"]} value={applied.type} onChange={(v) => applyColumnFilter("type", v)} />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3">指标名称</th>
                  <th className="text-left px-4 py-3 cursor-pointer select-none" onClick={toggleTimeSort}>
                    <span className="inline-flex items-center gap-1">
                      告警触发时间
                      <span className="text-gray-400">{sortMode === "time_desc" ? "↓" : sortMode === "time_asc" ? "↑" : "↕"}</span>
                    </span>
                  </th>
                  <th className="text-left px-4 py-3">接收人</th>
                  <th className="text-left px-4 py-3">
                    <span className="inline-flex items-center gap-0.5">
                      状态
                      <ColumnFilter options={["未处理", "已处理"]} value={applied.status} onChange={(v) => applyColumnFilter("status", v)} />
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 sticky right-0 bg-gray-50 z-10">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><AlertLevelBadge level={r.level} /></td>
                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                      <button
                        type="button"
                        className="text-left text-primary-600 hover:text-primary-700 hover:underline"
                        onClick={() => router.push(`${basePath}/${r.id}`)}
                      >
                        {r.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{TYPE_DISPLAY[r.type]}</td>
                    <td className="px-4 py-3 text-gray-600">{r.metricName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.triggerTime}</td>
                    <td className="px-4 py-3 text-gray-600">{r.receiver ?? "—"}</td>
                    <td className={`px-4 py-3 text-xs ${r.handledBy ? "text-green-600" : "text-gray-400"}`}>
                      {r.handledBy ? "已处理" : "未处理"}
                    </td>
                    <td className="px-4 py-3 sticky right-0 bg-white z-10">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => router.push(`${basePath}/${r.id}`)}>
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
    </div>
  );
}
