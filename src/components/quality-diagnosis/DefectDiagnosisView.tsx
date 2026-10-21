"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { DIAG_CATALOG } from "@/lib/mock-data/quality-defect";
import {
  ensureProgress,
  getDiagVersion,
  listTasks,
  primaryActionOf,
  statusCounts,
  subscribeDiag,
  type DiagTask,
} from "@/lib/mock-data/defect-diagnosis-flow";
import { DiagnosisTaskCard } from "./DiagnosisTaskCard";
import { DiagnosisTaskTable } from "./DiagnosisTaskTable";

type TabKey = "pending" | "judged" | "all";
type ViewKey = "card" | "table";

interface Filters {
  name: string;
  from: string;
  to: string;
  machine: string;
  storageObj: string;
  batch: string;
  brand: string;
  shift: string;
}

const DEFAULT_FILTERS: Filters = {
  name: "all", from: "", to: "",
  machine: "all", storageObj: "all", batch: "", brand: "all", shift: "all",
};

// 列表状态（筛选 + 视图 + 页码）持久化：从详情返回时恢复
const STATE_KEY = "diag-list-state";

interface SavedState {
  tab: TabKey;
  view: ViewKey;
  draft: Filters;
  applied: Filters;
  page: number;
  pageSize: number;
}

function loadSaved(): SavedState | null {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as SavedState) : null;
  } catch {
    return null;
  }
}

// 缺陷诊断任务列表：状态 tab（待处理/已判定/全部）+ 卡片/表格视图 + 基础/展开筛选；
//智能诊断状态实时刷新（useSyncExternalStore 订阅会话级 store）
export function DefectDiagnosisView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 缺陷分析页跳转 ?code= 预筛（仅诊断域 3 缺陷有效，优先于 sessionStorage）
  const initCode = searchParams.get("code");
  const validCode = initCode && DIAG_CATALOG.some((c) => c.code === initCode) ? initCode : null;

  const [tab, setTab] = useState<TabKey>("pending");
  const [view, setView] = useState<ViewKey>("card");
  const [draft, setDraft] = useState<Filters>(validCode ? { ...DEFAULT_FILTERS, name: validCode } : DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(validCode ? { ...DEFAULT_FILTERS, name: validCode } : DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [expanded, setExpanded] = useState(false);

  const version = useSyncExternalStore(subscribeDiag, getDiagVersion);

  const all = listTasks();
  const counts = statusCounts();

  // 诊断中任务恢复推进（退出详情不取消，回列表继续）
  useEffect(() => {
    all.filter((t) => t.status === "诊断中").forEach((t) => ensureProgress(t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 挂载后恢复列表状态（筛选/视图/页码）：SSR 首帧用默认值保证水合一致，客户端再恢复
  useEffect(() => {
    const s = loadSaved();
    if (s && !validCode) {
      setTab(s.tab);
      setView(s.view);
      setDraft(s.draft);
      setApplied(s.applied);
      setPage(s.page);
      setPageSize(s.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 状态持久化：任何变更即时保存
  useEffect(() => {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ tab, view, draft, applied, page, pageSize } satisfies SavedState));
    } catch {
      /* 隐私模式等场景忽略 */
    }
  }, [tab, view, draft, applied, page, pageSize]);

  // 筛选选项（随任务派生）
  const machines = useMemo(
    () => Array.from(new Set(all.filter((t) => !t.storage).map((t) => t.occurrence.machine))).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const storageObjs = useMemo(
    () => Array.from(new Set(all.filter((t) => t.storage).map((t) => t.storage!.object))).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 过滤：应用态筛选 + tab；排序：成品水分不合格任务固定置顶（组内及其余按检验发现时间倒序）
  const rows = useMemo(() => {
    return all
      .filter((t) => {
        const date = t.occurrence.date;
        const batch = t.storage ? t.storage.batch : t.occurrence.batch;
        const kw = applied.batch.trim();
        return (
          (applied.name === "all" || t.code === applied.name) &&
          (!applied.from || date >= applied.from) &&
          (!applied.to || date <= applied.to) &&
          (applied.machine === "all" || (!t.storage && t.occurrence.machine === applied.machine)) &&
          (applied.storageObj === "all" || (!!t.storage && t.storage.object === applied.storageObj)) &&
          (!kw || batch.includes(kw)) &&
          (applied.brand === "all" || t.occurrence.brand === applied.brand) &&
          (applied.shift === "all" || t.occurrence.shift === applied.shift) &&
          (tab === "all" || (tab === "judged" ? t.status === "已判定" : t.status !== "已判定"))
        );
      })
      .sort((a, b) => {
        const pa = a.code === "CPSFBH" ? 0 : 1;
        const pb = b.code === "CPSFBH" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return `${b.occurrence.date} ${b.occurrence.time}`.localeCompare(`${a.occurrence.date} ${a.occurrence.time}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, tab, version]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSearch() {
    setApplied({ ...draft });
    setPage(1);
  }

  function handleReset() {
    setDraft({ ...DEFAULT_FILTERS });
    setApplied({ ...DEFAULT_FILTERS });
    setPage(1);
  }

  function openTask(t: DiagTask) {
    router.push(`/quality/diagnosis/defect/${t.id}${primaryActionOf(t).query}`);
  }

  const dateCls =
    "px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
  const selCls =
    "w-44 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
  const label = "flex items-center gap-1.5";

  const tabs: { key: TabKey; text: string; count: number }[] = [
    { key: "pending", text: "待处理", count: counts.pending },
    { key: "judged", text: "已判定", count: counts.judged },
    { key: "all", text: "全部", count: counts.all },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">缺陷诊断</h1>

      {/* 筛选区：基础筛选常驻 + 展开筛选（缺陷类别/机台/箱储对象/批次/牌号/班组），查询提交生效 */}
      <Card>
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <label className={label}>
              <span className="text-xs text-gray-500">缺陷名称</span>
              <select value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={selCls}>
                <option value="all">全部</option>
                {DIAG_CATALOG.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} {c.code}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              <span className="text-xs text-gray-500">检验时间</span>
              <input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className={dateCls} />
              <span className="text-xs text-gray-400">至</span>
              <input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className={dateCls} />
            </label>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "收起筛选 ▴" : "展开筛选 ▾"}
              </Button>
              <Button size="sm" onClick={handleSearch}>查询</Button>
              <Button size="sm" variant="secondary" onClick={handleReset}>重置</Button>
            </div>
          </div>

          {expanded && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-gray-50 pt-2.5">
              <label className={label}>
                <span className="text-xs text-gray-500">机台</span>
                <select value={draft.machine} onChange={(e) => setDraft({ ...draft, machine: e.target.value })} className={selCls}>
                  <option value="all">全部</option>
                  {machines.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className={label}>
                <span className="text-xs text-gray-500">箱储对象</span>
                <select value={draft.storageObj} onChange={(e) => setDraft({ ...draft, storageObj: e.target.value })} className={selCls}>
                  <option value="all">全部</option>
                  {storageObjs.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className={label}>
                <span className="text-xs text-gray-500">批次</span>
                <input
                  value={draft.batch}
                  onChange={(e) => setDraft({ ...draft, batch: e.target.value })}
                  placeholder="支持模糊匹配"
                  className={`${selCls} placeholder:text-gray-300`}
                />
              </label>
              <label className={label}>
                <span className="text-xs text-gray-500">牌号</span>
                <select value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} className={selCls}>
                  <option value="all">全部</option>
                  <option value="娇子">娇子</option>
                  <option value="长城">长城</option>
                  <option value="宽窄">宽窄</option>
                </select>
              </label>
              <label className={label}>
                <span className="text-xs text-gray-500">班组</span>
                <select value={draft.shift} onChange={(e) => setDraft({ ...draft, shift: e.target.value })} className={selCls}>
                  <option value="all">全部</option>
                  <option value="甲班">甲班</option>
                  <option value="乙班">乙班</option>
                  <option value="丙班">丙班</option>
                </select>
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* 状态 tab + 视图切换 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={`rounded-md px-3.5 py-1.5 text-sm transition-colors ${
                tab === t.key ? "bg-white font-medium text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.text}
              <span className={`ml-1.5 text-xs ${tab === t.key ? "text-primary-600" : "text-gray-400"}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setView("card")}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors ${view === "card" ? "bg-white font-medium text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            title="卡片视图"
          >
            ▦ 卡片
          </button>
          <button
            onClick={() => setView("table")}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors ${view === "table" ? "bg-white font-medium text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            title="表格视图"
          >
            ▤ 表格
          </button>
        </div>
      </div>

      {/* 任务列表：卡片（默认）/ 表格 */}
      {view === "card" ? (
        <div>
          {pageRows.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white py-16 text-center text-sm text-gray-400">
              所选条件下暂无诊断任务
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pageRows.map((t) => (
                <DiagnosisTaskCard key={t.id} task={t} onOpen={openTask} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card padding={false}>
          <div className="p-4 pb-0">
            <DiagnosisTaskTable tasks={pageRows} onOpen={openTask} codeFilter={applied.name} />
          </div>
          <div className="border-t border-gray-100 px-4 py-3">
            <Pagination
              total={rows.length}
              page={safePage}
              pageSize={pageSize}
              pageSizeOptions={[12, 24, 48]}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              showRange={false}
            />
          </div>
        </Card>
      )}

      {/* 卡片视图分页 */}
      {view === "card" && (
        <Card>
          <Pagination
            total={rows.length}
            page={safePage}
            pageSize={pageSize}
            pageSizeOptions={[12, 24, 48]}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            showRange={false}
          />
        </Card>
      )}
    </div>
  );
}
