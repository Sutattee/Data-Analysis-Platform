"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { ColumnFilter } from "@/components/alert/ColumnFilter";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import { ALERT_RECORDS, ALERT_LEVELS, sortAlerts } from "@/lib/mock-data/alerts";
import { EXPENSE_ALERT_METRIC_NAMES } from "@/lib/mock-data/expense-alerts";
import { DEPT_STATS } from "@/lib/mock-data/expense-indicators";
import { EXPENSE_NODES } from "@/lib/mock-data/expense-overview";
import type { AlertRecord } from "@/types";

// 筛选条件（输入态 / 已应用 两份；keyword/部门/科目/时间点「查询」组合应用，等级在表头即时筛选）
interface ExpenseAlertFilter {
  keyword: string;
  dept: string;      // "" = 全部部门
  subjectId: string; // "all" = 全部费用
  dateFrom: string;
  dateTo: string;
  level: string;     // 表头等级筛选（即时应用）
}

const EMPTY_FILTER: ExpenseAlertFilter = { keyword: "", dept: "", subjectId: "all", dateFrom: "", dateTo: "", level: "" };

// 科目下拉选项：全角空格缩进表层级（同费用总览 ExpenseHeader）
const SUBJECT_OPTIONS = EXPENSE_NODES.map((n) => ({
  value: n.id,
  label: `${"　".repeat(n.depth)}${n.name}`,
}));

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
const dateCls = selectCls;

type Phase = "loading" | "success" | "error";
type SortMode = "default" | "time_desc" | "time_asc";

// 费用预算执行 · 告警记录列表（列结构/筛选区与能源告警中心不同，独立组件）
// basePath：详情跳转前缀（/expense/alert/records）
export function ExpenseAlertRecordsList({ basePath = "/expense/alert/records" }: { basePath?: string }) {
  const router = useRouter();

  // 费用口径告警记录（仅"执行进度偏差"类指标）
  const [records] = useState<AlertRecord[]>(() =>
    ALERT_RECORDS.filter((r) => EXPENSE_ALERT_METRIC_NAMES.has(r.metricName)).map((r) => ({ ...r }))
  );
  const [filter, setFilter] = useState<ExpenseAlertFilter>(EMPTY_FILTER); // 输入态
  const [applied, setApplied] = useState<ExpenseAlertFilter>(EMPTY_FILTER); // 应用态
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

  // 关键字：告警名称 / 部门名称 / 费用名称（科目路径）/ 指标名称
  function matchKeyword(r: AlertRecord, kw: string): boolean {
    if (!kw.trim()) return true;
    const k = kw.trim().toLowerCase();
    return [r.title, r.objectName, r.metricLabel ?? "", r.subjectPath ?? ""].some((v) =>
      v.toLowerCase().includes(k)
    );
  }

  function matchDate(r: AlertRecord, from: string, to: string): boolean {
    const t = r.triggerTime.slice(0, 10);
    if (from && t < from) return false;
    if (to && t > to) return false;
    return true;
  }

  // 费用科目：科目节点子树命中（记录挂载科目全路径，前缀匹配无歧义）
  function matchSubject(r: AlertRecord, subjectId: string): boolean {
    if (subjectId === "all" || !r.subjectPath) return subjectId === "all";
    const node = EXPENSE_NODES.find((n) => n.id === subjectId);
    if (!node) return true;
    return r.subjectPath === node.path || r.subjectPath.startsWith(node.path + "\\");
  }

  const sorted = useMemo(() => {
    const filtered = records.filter(
      (r) =>
        matchKeyword(r, applied.keyword) &&
        (!applied.dept || r.objectName === applied.dept) &&
        matchSubject(r, applied.subjectId) &&
        (!applied.level || r.level === applied.level) &&
        matchDate(r, applied.dateFrom, applied.dateTo)
    );
    if (sortMode === "time_desc") return [...filtered].sort((a, b) => b.triggerTime.localeCompare(a.triggerTime));
    if (sortMode === "time_asc") return [...filtered].sort((a, b) => a.triggerTime.localeCompare(b.triggerTime));
    // 默认：按等级（危险→提示）+ 告警时间（新→旧）
    return sortAlerts(filtered);
  }, [records, applied, sortMode]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilter =
    (Object.keys(applied) as (keyof ExpenseAlertFilter)[]).some((k) => applied[k].trim() !== "" && applied[k] !== "all");

  // 组合查询：输入态全量应用（保留表头等级筛选）；重置：恢复默认条件
  function handleSearch() {
    setApplied({ ...filter, level: applied.level });
    setPage(1);
    runLoad();
  }
  // 部门/费用科目：选择后即时筛选（无需点查询；保留关键字/时间/表头等级）
  function applyNow(patch: Partial<ExpenseAlertFilter>) {
    const next = { ...filter, ...patch };
    setFilter(next);
    setApplied((prev) => ({ ...prev, ...patch }));
    setPage(1);
    runLoad();
  }
  function handleReset() {
    setFilter({ ...EMPTY_FILTER });
    setApplied({ ...EMPTY_FILTER });
    setSortMode("default");
    setPage(1);
    runLoad();
  }
  // 表头等级筛选：即时应用
  function applyLevelFilter(v: string) {
    setApplied((prev) => ({ ...prev, level: v }));
    setPage(1);
  }
  function toggleTimeSort() {
    setSortMode((m) => (m === "default" ? "time_desc" : m === "time_desc" ? "time_asc" : "default"));
  }

  return (
    <div className="space-y-4">
      {/* 搜索 + 组合筛选区（等级筛选在表头） */}
      <Card padding>
        <div className="flex gap-2 flex-wrap">
          <input
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="搜索告警名称、部门名称、费用名称、指标名称"
            className="w-[480px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">部门</span>
            <select
              className={selectCls}
              value={filter.dept}
              onChange={(e) => applyNow({ dept: e.target.value })}
            >
              <option value="">全部部门</option>
              {DEPT_STATS.map((d) => (
                <option key={d.dept} value={d.dept}>{d.dept}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">费用科目</span>
            <div className="w-52">
              <SearchSelect
                options={SUBJECT_OPTIONS}
                value={filter.subjectId}
                onChange={(id) => applyNow({ subjectId: id })}
                placeholder="全部费用"
              />
            </div>
          </div>
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
                      <ColumnFilter options={ALERT_LEVELS} value={applied.level} onChange={applyLevelFilter} />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 sticky left-0 bg-gray-50 z-10">告警标题</th>
                  <th className="text-left px-4 py-3">所属部门</th>
                  <th className="text-left px-4 py-3">数据指标</th>
                  <th className="text-left px-4 py-3">执行进度偏差</th>
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
                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                      <button
                        onClick={() => router.push(`${basePath}/${r.id}`)}
                        className="text-left text-gray-900 hover:text-primary-600 hover:underline"
                        title={r.title}
                      >
                        {r.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.objectName}</td>
                    <td className="px-4 py-3 text-gray-600">{r.metricLabel ?? r.metricName}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{r.deviationLabel ?? r.deviationValue}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.triggerTime}</td>
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
