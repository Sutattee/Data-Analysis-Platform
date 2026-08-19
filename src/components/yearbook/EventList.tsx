"use client";

// 重大事件 - 事件列表（筛选 + 表格 + 详情/表单抽屉 + 确认/排除 + 生成年度报告入口）
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { OrgCascaderFilter } from "@/components/alert/OrgCascaderFilter";
import { ColumnFilter } from "@/components/alert/ColumnFilter";
import { useApp } from "@/lib/store/AppContext";
import { listEvents, setEventStatus } from "@/lib/mock-data/major-events";
import { EMPTY_ORG_FILTER, type OrgFilter } from "@/lib/mock-data/alerts";
import { EventDetailDrawer } from "./EventDetailDrawer";
import { EventFormDrawer } from "./EventFormDrawer";
import { GenerateReportModal } from "./GenerateReportModal";
import { LinkedAlertsModal } from "./LinkedAlertsModal";
import { ConfirmStatusBadge } from "./eventBadges";
import type { MajorEvent } from "@/types";

// 筛选条件（keyword/日期为输入态，其余即时应用）
interface EventListFilter {
  keyword: string;
  year: string;
  dateFrom: string;
  dateTo: string;
  formation: string;
  status: string;
}

const EMPTY_FILTER: EventListFilter = {
  keyword: "",
  year: "",
  dateFrom: "",
  dateTo: "",
  formation: "",
  status: "",
};

const FORMATIONS = ["AI识别", "AI识别·人工修订", "人工补录"] as const;
const STATUSES = ["待确认", "已确认", "已排除"] as const;

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

type Phase = "loading" | "success";

export function EventList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { state, addRecentVisit } = useApp();
  const isAdmin = state.user?.role === "管理员";
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";

  const [events, setEvents] = useState<MajorEvent[]>(() => listEvents());
  const [filter, setFilter] = useState<EventListFilter>(EMPTY_FILTER); // 输入态
  const [applied, setApplied] = useState<EventListFilter>(EMPTY_FILTER); // 应用态
  const [orgFilter, setOrgFilter] = useState<OrgFilter>(EMPTY_ORG_FILTER);
  const [phase, setPhase] = useState<Phase>("loading");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 抽屉 / 弹窗状态
  const [detail, setDetail] = useState<MajorEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<MajorEvent | null>(null);
  const [alertsIds, setAlertsIds] = useState<string[]>([]); // 非空时打开关联预警弹窗
  const [confirmTarget, setConfirmTarget] = useState<MajorEvent | null>(null);
  const [excludeTarget, setExcludeTarget] = useState<MajorEvent | null>(null);
  const [excludeReason, setExcludeReason] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  function runLoad() {
    setPhase("loading");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPhase("success"), 500);
  }

  useEffect(() => {
    runLoad();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 支持 URL ?id= 预打开详情抽屉（报告页事件编号链接 / 首页最近访问跳入）
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      const target = listEvents().find((e) => e.id === id);
      if (target) {
        setDetail(target);
        // 记录最近访问（首页「重大事件记录」条目）
        addRecentVisit({
          id: `rv-event-${target.id}`,
          title: target.title,
          board: "生产管理",
          contentType: "重大事件记录",
          creator: target.createdBy || "系统",
          editable: false,
          route: `/energy/yearbook/events?id=${target.id}`,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function reload() {
    setEvents(listEvents());
    runLoad();
  }

  // —— 筛选 ——
  function matchKeyword(e: MajorEvent, kw: string): boolean {
    if (!kw.trim()) return true;
    const k = kw.trim().toLowerCase();
    return [e.id, e.title, e.impactSummary, ...e.objects, ...e.metrics].some((v) =>
      v.toLowerCase().includes(k)
    );
  }

  const sorted = useMemo(() => {
    const filtered = events.filter((e) => {
      if (!matchKeyword(e, applied.keyword)) return false;
      if (applied.year && e.startTime.slice(0, 4) !== applied.year) return false;
      if (applied.formation && e.formation !== applied.formation) return false;
      if (applied.status && e.status !== applied.status) return false;
      const day = e.startTime.slice(0, 10);
      if (applied.dateFrom && day < applied.dateFrom) return false;
      if (applied.dateTo && day > applied.dateTo) return false;
      // 影响对象：任一层级选中即要求事件对象包含该节点
      const { workshop, grid, equipment } = orgFilter;
      if (workshop && !e.objects.includes(workshop)) return false;
      if (grid && !e.objects.includes(grid)) return false;
      if (equipment && !e.objects.includes(equipment)) return false;
      return true;
    });
    // 默认发生时间倒序
    return [...filtered].sort((a, b) => b.startTime.localeCompare(a.startTime));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, applied, orgFilter]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilter =
    (Object.keys(applied) as (keyof EventListFilter)[]).some((k) => applied[k].trim() !== "") ||
    orgFilter.workshop !== "" || orgFilter.grid !== "" || orgFilter.equipment !== "";

  // 年度选项：数据中出现的年份（降序）
  const yearOptions = useMemo(
    () => Array.from(new Set(events.map((e) => e.startTime.slice(0, 4)))).sort((a, b) => b.localeCompare(a)),
    [events]
  );

  function applyFilter(patch: Partial<EventListFilter>) {
    setApplied((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function handleSearch() {
    applyFilter({ keyword: filter.keyword, dateFrom: filter.dateFrom, dateTo: filter.dateTo });
    runLoad();
  }

  function handleReset() {
    setFilter(EMPTY_FILTER);
    setApplied(EMPTY_FILTER);
    setOrgFilter(EMPTY_ORG_FILTER);
    setPage(1);
    runLoad();
  }

  // —— 确认 / 排除 ——
  function handleConfirmOk() {
    if (!confirmTarget) return;
    setEventStatus(confirmTarget.id, "已确认", { user: currentUser });
    setConfirmTarget(null);
    reload();
    toast("事件已确认，将纳入年度报告统计", "success");
  }

  function handleExcludeOk() {
    if (!excludeTarget) return;
    setEventStatus(excludeTarget.id, "已排除", { user: currentUser, excludeReason: excludeReason.trim() || undefined });
    setExcludeTarget(null);
    setExcludeReason("");
    reload();
    toast("事件已排除，不再纳入年度报告统计", "success");
  }

  const th = "text-left px-4 py-3";

  return (
    <div className="space-y-4">
      {/* ===== 筛选区（搜索与操作按钮上下对齐：左搜索，右新增/生成入口） ===== */}
      <Card padding>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="搜索事件标题/事件编号/影响对象/影响指标"
            className="w-[360px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
          {/* 新增重大事件 / 生成年度报告（仅事件管理权限用户） */}
          {isAdmin && (
            <div className="ml-auto flex gap-2">
              <Button
                onClick={() => {
                  setFormInitial(null);
                  setFormOpen(true);
                }}
              >
                ＋ 新增重大事件
              </Button>
              <Button variant="secondary" onClick={() => setReportOpen(true)}>
                生成年度报告
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">发生年度</span>
            <select className={selectCls} value={applied.year} onChange={(e) => applyFilter({ year: e.target.value })}>
              <option value="">全部</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y} 年</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">时间范围</span>
            <input type="date" className={selectCls} value={filter.dateFrom} onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })} />
            <span className="text-gray-400 text-xs">至</span>
            <input type="date" className={selectCls} value={filter.dateTo} onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })} />
          </div>
          <OrgCascaderFilter value={orgFilter} onChange={(v) => { setOrgFilter(v); setPage(1); }} />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">形成方式</span>
            <select className={selectCls} value={applied.formation} onChange={(e) => applyFilter({ formation: e.target.value })}>
              <option value="">全部</option>
              {FORMATIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ===== 事件列表 ===== */}
      <Card padding={false}>
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-24">
            <Spinner />
            <p className="text-sm text-gray-400 mt-3">加载中…</p>
          </div>
        )}
        {phase === "success" && total === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-4xl mb-3">{hasFilter ? "🔍" : "📭"}</span>
            <p className="text-sm text-gray-500">{hasFilter ? "无筛选结果" : "暂无事件"}</p>
            {hasFilter && <Button variant="secondary" className="mt-3" onClick={handleReset}>重置筛选</Button>}
          </div>
        )}

        {phase === "success" && total > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                  <th className={`${th} sticky left-0 bg-gray-50 z-10`}>事件编号</th>
                  <th className={th}>事件标题</th>
                  <th className={th}>影响对象</th>
                  <th className={th}>影响指标</th>
                  <th className={th}>发生时间</th>
                  <th className={th}>
                    <span className="inline-flex items-center gap-0.5">
                      确认状态
                      <ColumnFilter options={[...STATUSES]} value={applied.status} onChange={(v) => applyFilter({ status: v })} />
                    </span>
                  </th>
                  <th className={`${th} text-right sticky right-0 bg-gray-50 z-10`}>操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                      <button
                        onClick={() => setDetail(e)}
                        className="font-mono text-xs text-gray-900 hover:text-gray-600 hover:underline"
                      >
                        {e.id}
                      </button>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="text-gray-900 truncate" title={e.title}>{e.title}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-[160px] truncate" title={e.objects.join("／")}>
                      {e.objects.join("／")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 max-w-[170px]">
                        {e.metrics.length === 0 && <span className="text-gray-900">-</span>}
                        {e.metrics.slice(0, 2).map((m) => (
                          <span key={m} className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-900">{m}</span>
                        ))}
                        {e.metrics.length > 2 && (
                          <span className="text-xs text-gray-900" title={e.metrics.slice(2).join("、")}>
                            +{e.metrics.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-900">
                      <div>{e.startTime}</div>
                      <div className={e.endTime ? "" : "font-medium"}>
                        {e.endTime ? `至 ${e.endTime}` : "进行中"}
                      </div>
                    </td>
                    <td className="px-4 py-3"><ConfirmStatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 sticky right-0 bg-white z-10">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                          onClick={() => setDetail(e)}
                        >
                          查看
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                              onClick={() => {
                                setFormInitial(e);
                                setFormOpen(true);
                              }}
                            >
                              编辑
                            </Button>
                            {e.status === "待确认" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setConfirmTarget(e)}
                              >
                                确认
                              </Button>
                            )}
                            {e.status !== "已排除" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                  setExcludeTarget(e);
                                  setExcludeReason("");
                                }}
                              >
                                排除
                              </Button>
                            )}
                          </>
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
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          </div>
        )}
      </Card>

      {/* ===== 详情 / 表单抽屉 ===== */}
      <EventDetailDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        event={detail}
        onEdit={isAdmin ? (e) => { setDetail(null); setFormInitial(e); setFormOpen(true); } : undefined}
        onShowAlerts={setAlertsIds}
      />
      <EventFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={formInitial}
        user={currentUser}
        onSaved={reload}
      />

      {/* ===== 关联预警弹窗 ===== */}
      <LinkedAlertsModal open={alertsIds.length > 0} onClose={() => setAlertsIds([])} alertIds={alertsIds} />

      {/* ===== 确认弹窗 ===== */}
      <Modal open={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="确认事件">
        <p className="text-sm text-gray-600 leading-relaxed">
          确认将事件 <span className="font-mono text-xs">{confirmTarget?.id}</span>「{confirmTarget?.title}」标记为已确认？
          确认后事件将纳入年度重大事件年鉴报告统计。
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setConfirmTarget(null)}>取消</Button>
          <Button onClick={handleConfirmOk}>确认</Button>
        </div>
      </Modal>

      {/* ===== 排除弹窗（误识别处理，无物理删除） ===== */}
      <Modal open={!!excludeTarget} onClose={() => setExcludeTarget(null)} title="排除事件">
        <p className="text-sm text-gray-600 leading-relaxed">
          排除后事件 <span className="font-mono text-xs">{excludeTarget?.id}</span>「{excludeTarget?.title}」
          将不再纳入年度报告统计（系统不物理删除事件，可保留追溯）。
        </p>
        <div className="mt-3">
          <label className="text-sm font-medium text-gray-700 mb-1 block">排除原因（选填）</label>
          <textarea
            rows={3}
            maxLength={200}
            value={excludeReason}
            onChange={(e) => setExcludeReason(e.target.value)}
            placeholder="如：经核查为传感器数据漂移，无实际事件"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setExcludeTarget(null)}>取消</Button>
          <Button variant="danger" onClick={handleExcludeOk}>确认排除</Button>
        </div>
      </Modal>

      {/* ===== 生成年度报告 ===== */}
      <GenerateReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        user={currentUser}
        onCreated={(id) => router.push(`/energy/yearbook/reports/${id}`)}
      />
    </div>
  );
}
