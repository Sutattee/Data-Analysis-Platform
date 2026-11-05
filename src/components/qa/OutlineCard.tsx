"use client";

// 大纲确认卡片（方式二）：报告标题/生成要求/参考文件 + 目录树（一级/二级标题与分析思路）。
// 支持编辑标题与思路、新增/删除章节（删一级二次确认）、拖拽同级排序、升降级、自动编号（一、/1.1）；
// 「重新生成」覆盖当前修改，「生成报告」先校验（标题非空/至少一节，失败定位提示）。
import { useState } from "react";
import type { OutlineSection, ReportCardData, ReportOutline } from "@/types";
import { levelNumber } from "@/lib/mock-data/report-gen";
import { useToast } from "@/components/ui/Toast";

// 在章节树中定位包含 id 的同级数组（一级数组或某个一级章节的 children）
function findSiblingArray(sections: OutlineSection[], id: string): OutlineSection[] | null {
  if (sections.some((s) => s.id === id)) return sections;
  for (const s of sections) {
    if (s.children.some((c) => c.id === id)) return s.children;
  }
  return null;
}

let addSeq = 0;

export function OutlineCard({
  data,
  locked,
  onConfirm,
  onRegenerate,
}: {
  data: ReportCardData;
  locked: boolean;
  onConfirm: (outline: ReportOutline) => void;
  onRegenerate: () => void;
}) {
  const toast = useToast();
  // 编辑态大纲（消息上的数据只在确认时回写）
  const [outline, setOutline] = useState<ReportOutline>(() => ({ ...data.outline!, sections: structuredClone(data.outline!.sections) }));
  // 编辑中的字段：{kind:"report-title"} | {kind:"section", id, field:"title"|"approach"}
  const [editing, setEditing] = useState<{ kind: "report-title" } | { kind: "section"; id: string; field: "title" | "approach" } | null>(null);
  const [editValue, setEditValue] = useState("");
  // 删除一级（含子级）时的二次确认目标 id
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // 拖拽排序
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // 校验未通过的章节 id（红框定位）
  const [invalidId, setInvalidId] = useState<string | null>(null);
  // 确认后收起，点击标题行展开只读
  const [expanded, setExpanded] = useState(!locked);

  // ---------- 树操作（均返回新数组） ----------
  const mutate = (fn: (draft: OutlineSection[]) => void) => {
    const next = structuredClone(outline.sections);
    fn(next);
    setOutline((o) => ({ ...o, sections: next }));
  };

  const addSection = (parentId?: string) => {
    addSeq += 1;
    const node: OutlineSection = { id: `os-new-${Date.now().toString(36)}-${addSeq}`, title: "", approach: "", children: [] };
    mutate((draft) => {
      if (!parentId) { draft.push(node); return; }
      const parent = draft.find((s) => s.id === parentId);
      if (parent) parent.children.push(node);
    });
    setInvalidId(null);
  };

  const removeSection = (id: string) => {
    mutate((draft) => {
      const arr = findSiblingArray(draft, id);
      if (!arr) return;
      const idx = arr.findIndex((s) => s.id === id);
      if (idx >= 0) arr.splice(idx, 1);
    });
    setConfirmId(null);
  };

  // 同级拖拽排序：把 drag 项移动到 target 所在位置之前
  const dropOn = (id: string) => {
    if (!dragId || dragId === id) return;
    mutate((draft) => {
      const fromArr = findSiblingArray(draft, dragId);
      const toArr = findSiblingArray(draft, id);
      if (!fromArr || !toArr || fromArr !== toArr) return; // 仅同级排序，跨级用升降级
      const fromIdx = fromArr.findIndex((s) => s.id === dragId);
      const [moved] = fromArr.splice(fromIdx, 1);
      const toIdx = toArr.findIndex((s) => s.id === id);
      toArr.splice(toIdx, 0, moved);
    });
    setDragId(null);
    setDragOverId(null);
  };

  // 升级：二级 → 一级（插到父章节之后）；降级：一级 → 上一一级章节的末尾子节
  const promote = (id: string) => {
    mutate((draft) => {
      const parent = draft.find((s) => s.children.some((c) => c.id === id));
      if (!parent) return;
      const idx = parent.children.findIndex((c) => c.id === id);
      const [moved] = parent.children.splice(idx, 1);
      const parentIdx = draft.findIndex((s) => s.id === parent.id);
      draft.splice(parentIdx + 1, 0, { ...moved, children: [] });
    });
  };
  const demote = (id: string) => {
    mutate((draft) => {
      const idx = draft.findIndex((s) => s.id === id);
      if (idx <= 0) return; // 第一节或未找到不可降级（需有前一个一级章节挂靠）
      const [moved] = draft.splice(idx, 1);
      draft[idx - 1].children.push(moved);
    });
  };

  // ---------- 编辑保存 ----------
  const startEdit = (target: typeof editing, value: string) => {
    setEditing(target);
    setEditValue(value);
  };
  const saveEdit = () => {
    if (!editing) return;
    const v = editValue.trim();
    if (editing.kind === "report-title") {
      setOutline((o) => ({ ...o, title: v }));
    } else {
      mutate((draft) => {
        const s = [...draft, ...draft.flatMap((x) => x.children)].find((n) => n.id === editing.id);
        if (s) s[editing.field] = v;
      });
    }
    setEditing(null);
  };

  // ---------- 校验 + 生成报告 ----------
  const handleConfirm = () => {
    if (!outline.title.trim()) {
      toast("报告标题不能为空", "danger");
      startEdit({ kind: "report-title" }, outline.title);
      return;
    }
    const all = [...outline.sections, ...outline.sections.flatMap((s) => s.children)];
    if (all.length === 0) {
      toast("至少保留一个章节", "danger");
      return;
    }
    const bad = all.find((s) => !s.title.trim());
    if (bad) {
      setInvalidId(bad.id);
      document.getElementById(bad.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("子标题不能为空", "danger");
      return;
    }
    onConfirm(outline);
  };

  // ---------- 渲染 ----------
  const editInput = (
    <input
      autoFocus
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={saveEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
        if (e.key === "Escape") setEditing(null);
      }}
      className="w-full px-2 py-1 border border-primary-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white text-gray-800"
    />
  );

  // 章节行（一级/二级共用）：编号 + 标题 +（展开的思路行）+ 操作
  const SectionRow = ({ s, no, level }: { s: OutlineSection; no: string; level: 1 | 2 }) => {
    const editingThis = editing?.kind === "section" && editing.id === s.id;
    const childCount = level === 1 ? s.children.length : 0;
    return (
      <div
        id={s.id}
        draggable={!locked && !editing}
        onDragStart={() => setDragId(s.id)}
        onDragOver={(e) => { e.preventDefault(); setDragOverId(s.id); }}
        onDrop={(e) => { e.preventDefault(); dropOn(s.id); }}
        onDragEnd={() => { setDragId(null); setDragOverId(null); }}
        className={`rounded-lg border px-3 py-2 ${
          dragOverId === s.id && dragId !== s.id ? "border-primary-400 bg-primary-50/50" : "border-gray-100"
        } ${invalidId === s.id ? "!border-red-400 !bg-red-50" : ""} ${level === 1 ? "" : "ml-6"}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 select-none">{dragId === s.id ? "⋮⋮" : level === 1 ? "📂" : "📄"}</span>
          <span className="text-xs text-gray-500 font-medium flex-shrink-0">{no}</span>
          {editingThis && editing!.field === "title" ? (
            <span className="flex-1 min-w-40">{editInput}</span>
          ) : (
            <button
              disabled={locked}
              onClick={() => startEdit({ kind: "section", id: s.id, field: "title" }, s.title)}
              className={`text-sm text-left flex-1 min-w-0 truncate ${level === 1 ? "font-medium text-gray-800" : "text-gray-700"} ${locked ? "cursor-default" : "hover:text-primary-600"}`}
              title={locked ? undefined : "点击编辑章节标题"}
            >
              {s.title || <span className="text-red-400">（未填写标题）</span>}
            </button>
          )}
          {!locked && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              {level === 1 && (
                <button onClick={() => addSection(s.id)} className="hover:text-primary-600 px-1" title="新增二级章节">＋二级</button>
              )}
              {level === 2 && (
                <button onClick={() => promote(s.id)} className="hover:text-primary-600 px-1" title="升级为一级章节">↑升级</button>
              )}
              {level === 1 && (
                <button onClick={() => demote(s.id)} className="hover:text-primary-600 px-1" title="降级为上一章节的二级">↓降级</button>
              )}
              <button
                onClick={() => (level === 1 && childCount > 0 ? setConfirmId(s.id) : removeSection(s.id))}
                className="hover:text-red-500 px-1"
                title="删除章节"
              >
                ✕
              </button>
            </span>
          )}
        </div>
        {/* 删除含子级一级章节的二次确认条 */}
        {confirmId === s.id && (
          <div className="mt-2 flex items-center gap-2 text-xs bg-red-50 border border-red-200 rounded px-2 py-1.5">
            <span className="text-red-600">将同步删除「{s.title}」及其 {childCount} 个子章节，确认删除？</span>
            <button onClick={() => removeSection(s.id)} className="ml-auto px-2 py-0.5 bg-red-500 text-white rounded hover:bg-red-600">确认删除</button>
            <button onClick={() => setConfirmId(null)} className="px-2 py-0.5 text-gray-500 hover:text-gray-700">取消</button>
          </div>
        )}
        {/* 分析思路：展示态一行灰字，编辑态 textarea */}
        {editingThis && editing!.field === "approach" ? (
          <textarea
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            rows={2}
            placeholder="分析思路（可留空，生成报告时自动补充）"
            className="mt-1.5 w-full px-2 py-1 border border-primary-400 rounded text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white text-gray-700 resize-none"
          />
        ) : (
          <button
            disabled={locked}
            onClick={() => startEdit({ kind: "section", id: s.id, field: "approach" }, s.approach ?? "")}
            className={`mt-1 block w-full text-left text-xs leading-relaxed ${s.approach ? "text-gray-500" : "text-gray-300 italic"} ${locked ? "cursor-default" : "hover:text-primary-600"}`}
            title={locked ? undefined : "点击编辑分析思路（可留空）"}
          >
            思路：{s.approach || "（留空，生成报告时按章节标题与要求自动补充）"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="border border-primary-200 bg-primary-50/40 rounded-xl p-4 space-y-3 min-w-0" aria-label="大纲确认卡片">
      {/* 报告标题（点击编辑）+ 收起/展开 */}
      <div className="flex items-center gap-2">
        <span className="text-base">📝</span>
        {editing?.kind === "report-title" ? (
          <span className="flex-1">{editInput}</span>
        ) : (
          <button
            onClick={() => (locked ? setExpanded((v) => !v) : startEdit({ kind: "report-title" }, outline.title))}
            className="text-sm font-semibold text-gray-800 text-left truncate hover:text-primary-600"
            title={locked ? "点击收起/展开" : "点击编辑报告标题"}
          >
            {outline.title || "（未命名报告）"}
          </button>
        )}
        {locked && <span className="flex-shrink-0 text-xs text-primary-600 border border-primary-200 bg-white rounded-full px-2 py-0.5">已确认</span>}
        {locked && <span className="text-gray-400 text-xs">{expanded ? "▲" : "▼"}</span>}
      </div>

      {expanded && (
        <>
          {/* 生成要求与参考文件 */}
          <div className="text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-2 space-y-1">
            <p><span className="text-gray-400">生成要求：</span>{outline.requirement}</p>
            {outline.refFile && <p><span className="text-gray-400">参考文件：</span>{outline.refFile}</p>}
          </div>

          {/* 目录树：自动编号（一级 一、二级 1.1），拖拽排序 */}
          <div className="space-y-1.5" aria-label="报告目录">
            {outline.sections.map((s, i) => (
              <div key={s.id} className="space-y-1.5">
                <SectionRow s={s} no={`${levelNumber(i)}、`} level={1} />
                {s.children.map((c, j) => (
                  <SectionRow key={c.id} s={c} no={`${i + 1}.${j + 1}`} level={2} />
                ))}
              </div>
            ))}
          </div>

          {!locked && (
            <button
              onClick={() => addSection()}
              className="w-full py-1.5 text-xs text-gray-400 hover:text-primary-600 border border-dashed border-gray-200 hover:border-primary-300 rounded-lg transition-colors"
            >
              ＋ 新增一级章节
            </button>
          )}

          {/* 底部操作：重新生成 / 生成报告 */}
          {!locked && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={onRegenerate}
                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-800 transition-colors"
                title="按原始要求重新生成整份大纲（覆盖当前修改）"
              >
                🔄 重新生成
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                ✅ 生成报告
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
