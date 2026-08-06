"use client";

import { useMemo, useState } from "react";
import { HistorySession } from "@/lib/mock-data/history";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface Props {
  sessions: HistorySession[];
  activeSessionId: string | null;
  onToggleCollapse: () => void;
  onNewSession: () => void;
  onContinue: (s: HistorySession) => void;
  onRename: (id: string, topic: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
}

// ---- 时间工具 ----
function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}
function clockToMinutes(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}
function sessionYearMonth(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

type Tab = "history" | "favorites";

export function QaSidebar({
  sessions, activeSessionId, onToggleCollapse, onNewSession, onContinue, onRename, onDelete, onToggleFavorite, onBatchDelete,
}: Props) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("history");
  const [search, setSearch] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ mode: "single" | "batch"; id?: string } | null>(null);

  // 搜索过滤
  const kw = search.trim().toLowerCase();
  const filtered = useMemo(
    () => sessions.filter((s) => !kw || s.topic.toLowerCase().includes(kw)),
    [sessions, kw]
  );

  // 历史：时间分组
  const historyGroups = useMemo(() => {
    const list = filtered
      .filter((s) => true)
      .sort((a, b) => a.daysAgo * 100000 - clockToMinutes(a.clock) - (b.daysAgo * 100000 - clockToMinutes(b.clock)));
    const g: { label: string; items: HistorySession[] }[] = [];
    const push = (label: string, pred: (s: HistorySession) => boolean) => {
      const items = list.filter(pred);
      if (items.length) g.push({ label, items });
    };
    push("今天", (s) => s.daysAgo === 0);
    push("昨天", (s) => s.daysAgo === 1);
    push("近7天", (s) => s.daysAgo >= 2 && s.daysAgo < 7);
    push("近30天", (s) => s.daysAgo >= 7 && s.daysAgo < 30);
    // 年-月分组（≥30 天）
    const monthMap = new Map<string, HistorySession[]>();
    list.filter((s) => s.daysAgo >= 30).forEach((s) => {
      const ym = sessionYearMonth(s.daysAgo);
      if (!monthMap.has(ym)) monthMap.set(ym, []);
      monthMap.get(ym)!.push(s);
    });
    Array.from(monthMap.keys()).sort().reverse().forEach((ym) => g.push({ label: ym, items: monthMap.get(ym)! }));
    return g;
  }, [filtered]);

  // 收藏：按收藏时间倒序
  const favoriteList = useMemo(
    () =>
      filtered
        .filter((s) => s.favorited)
        .sort((a, b) => (a.favDaysAgo ?? 0) * 100000 - clockToMinutes(a.favClock ?? "00:00") - ((b.favDaysAgo ?? 0) * 100000 - clockToMinutes(b.favClock ?? "00:00"))),
    [filtered]
  );

  const currentList = tab === "history" ? historyGroups.flatMap((g) => g.items) : favoriteList;
  const allChecked = currentList.length > 0 && currentList.every((s) => selectedIds.includes(s.id));

  // ---- 行内重命名 ----
  function startRename(s: HistorySession) {
    setOpenMenuId(null);
    setEditingId(s.id);
    setEditingText(s.topic);
  }
  function commitRename() {
    if (!editingId) return;
    const v = editingText.trim();
    if (v) onRename(editingId, v);
    setEditingId(null);
  }
  function cancelRename() {
    setEditingId(null);
  }

  // ---- 删除 ----
  function confirmDelete() {
    if (!deleteConfirm) return;
    if (deleteConfirm.mode === "single" && deleteConfirm.id) {
      onDelete(deleteConfirm.id);
      setSelectedIds((prev) => prev.filter((x) => x !== deleteConfirm.id));
    } else {
      onBatchDelete(selectedIds);
      toast(`已删除 ${selectedIds.length} 个会话`, "success");
      setSelectedIds([]);
      setBatchMode(false);
    }
    setDeleteConfirm(null);
  }

  // ---- 批量 ----
  function enterBatch() {
    setOpenMenuId(null);
    setBatchMode(true);
    setSelectedIds([]);
  }
  function exitBatch() {
    setBatchMode(false);
    setSelectedIds([]);
  }
  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleAll() {
    if (allChecked) setSelectedIds([]);
    else setSelectedIds(currentList.map((s) => s.id));
  }
  function batchUnfavorite() {
    selectedIds.forEach((id) => onToggleFavorite(id));
    toast(`已取消 ${selectedIds.length} 个收藏`, "success");
    exitBatch();
  }

  // ---- 行渲染 ----
  function renderRow(s: HistorySession) {
    const isActive = activeSessionId === s.id;
    return (
      <div
        key={s.id}
        className={`group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer ${
          isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-slate-200"
        }`}
        onClick={() => !batchMode && !editingId && onContinue(s)}
      >
        {batchMode && (
          <input
            type="checkbox"
            checked={selectedIds.includes(s.id)}
            onChange={() => toggleSelect(s.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-3.5 h-3.5 flex-shrink-0 accent-primary-600"
          />
        )}
        {tab === "favorites" && <span className="text-yellow-400 text-xs flex-shrink-0">⭐</span>}
        <div className="flex-1 min-w-0">
          {editingId === s.id ? (
            <input
              autoFocus
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                else if (e.key === "Escape") cancelRename();
              }}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-1.5 py-0.5 border border-primary-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            />
          ) : (
            <span className="truncate block text-xs">{s.topic}</span>
          )}
        </div>
        {/* 更多菜单（非批量态） */}
        {!batchMode && !editingId && (
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 px-1 leading-none"
              title="更多"
            >
              ···
            </button>
            {openMenuId === s.id && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[104px]">
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(s); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    重命名
                  </button>
                  {tab === "history" ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ mode: "single", id: s.id }); setOpenMenuId(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                    >
                      删除
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(s.id); setOpenMenuId(null); toast("已取消收藏", "success"); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      取消收藏
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); enterBatch(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    批量操作
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-white overflow-hidden">
      {/* 顶部：折叠 */}
      <div className="flex items-center px-3 py-2 flex-shrink-0">
        <button onClick={onToggleCollapse} className="p-1 text-gray-400 hover:text-gray-700" title="折叠">{"<<"}</button>
      </div>

      {/* + 新建会话（次级按钮） */}
      <div className="px-3 py-2 flex-shrink-0">
        <button
          onClick={onNewSession}
          className="w-full px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          + 新建会话
        </button>
      </div>

      {/* Tab */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {([["history", "历史记录"], ["favorites", "收藏"]] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => { setTab(k); setBatchMode(false); setSelectedIds([]); }}
            className={`flex-1 py-2 text-xs -mb-px border-b-2 transition-colors ${
              tab === k ? "border-primary-600 text-primary-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索问题"
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* 列表（滚动条仅在 hover 时出现） */}
      <div className="flex-1 overflow-hidden hover:overflow-y-auto px-2 py-2 min-h-0">
        {tab === "history" ? (
          historyGroups.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">暂无历史记录</div>
          ) : (
            <div className="space-y-3">
              {historyGroups.map((g) => (
                <div key={g.label}>
                  <div className="text-[10px] font-medium text-gray-400 px-1 mb-1">{g.label}</div>
                  <div className="space-y-0.5">{g.items.map(renderRow)}</div>
                </div>
              ))}
            </div>
          )
        ) : favoriteList.length === 0 ? (
          <div className="py-10 text-center text-xs text-gray-400">暂无收藏</div>
        ) : (
          <div className="space-y-0.5">{favoriteList.map(renderRow)}</div>
        )}
      </div>

      {/* 批量模式底部工具栏 */}
      {batchMode && (
        <div className="border-t border-slate-200 px-2 py-2 flex-shrink-0 space-y-2 bg-slate-200/60">
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-3.5 h-3.5 accent-primary-600" />
              <span>全选</span>
            </label>
            <span className="text-gray-400">已选 {selectedIds.length} 项</span>
          </div>
          <div className="flex gap-2">
            {tab === "history" ? (
              <button
                onClick={() => selectedIds.length > 0 && setDeleteConfirm({ mode: "batch" })}
                disabled={selectedIds.length === 0}
                className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40"
              >
                批量删除
              </button>
            ) : (
              <button
                onClick={batchUnfavorite}
                disabled={selectedIds.length === 0}
                className="flex-1 px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-40"
              >
                批量取消收藏
              </button>
            )}
            <button onClick={exitBatch} className="flex-1 px-2 py-1 text-xs bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50">
              退出
            </button>
          </div>
        </div>
      )}

      {/* 删除二次确认 */}
      <Modal open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} title="确认删除会话？" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {deleteConfirm?.mode === "batch"
              ? `确认删除选中的 ${selectedIds.length} 个会话？内容将被删除且无法恢复。`
              : "对话内容将被删除且无法恢复。"}
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-1.5 text-xs bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50">取消</button>
            <button onClick={confirmDelete} className="px-4 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700">确定</button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
