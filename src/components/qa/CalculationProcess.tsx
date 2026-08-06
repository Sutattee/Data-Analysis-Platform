"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalcNode, NODE_STYLE, oeeCalcTree } from "@/lib/mock-data/calc-process";

const NODE_W = 148;
const NODE_H = 64;
const GAP_X = 18;
const ROW_H = 114;

// 缩放范围 0.5~2，按 0.1 步进（保留 1 位小数）
const clampZoom = (v: number) => Math.min(2, Math.max(0.5, Math.round(v * 10) / 10));

interface Pos {
  x: number;
  y: number;
}

export function buildLayout(root: CalcNode) {
  const positions = new Map<string, Pos>();
  const parentMap = new Map<string, string>();
  const nodeMap = new Map<string, CalcNode>();
  const edges: { from: string; to: string }[] = [];
  let col = 0;
  let maxDepth = 0;
  let width = 0;

  function walk(node: CalcNode, depth: number): number {
    nodeMap.set(node.id, node);
    maxDepth = Math.max(maxDepth, depth);
    const y = depth * ROW_H;
    if (!node.children || node.children.length === 0) {
      const x = col * (NODE_W + GAP_X);
      positions.set(node.id, { x, y });
      col++;
      width = Math.max(width, x + NODE_W);
      return x + NODE_W / 2;
    }
    const centers = node.children.map((c) => {
      parentMap.set(c.id, node.id);
      edges.push({ from: node.id, to: c.id });
      return walk(c, depth + 1);
    });
    const cx = (centers[0] + centers[centers.length - 1]) / 2;
    positions.set(node.id, { x: cx - NODE_W / 2, y });
    width = Math.max(width, cx + NODE_W / 2);
    return cx;
  }
  walk(root, 0);
  return { positions, parentMap, nodeMap, edges, width, height: (maxDepth + 1) * ROW_H };
}

// 子树节点集合
function descendants(id: string, nodeMap: Map<string, CalcNode>): Set<string> {
  const set = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (set.has(cur)) continue;
    set.add(cur);
    nodeMap.get(cur)?.children?.forEach((c) => stack.push(c.id));
  }
  return set;
}

export function CalculationProcess({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState("oee");
  const [zoom, setZoom] = useState(1);

  // 快捷键缩放：Ctrl/Cmd + +/-/0
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => clampZoom(z + 0.1));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => clampZoom(z - 0.1));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 鼠标拖拽平移画布
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0, moved: false });
  const [grabbing, setGrabbing] = useState(false);

  function handlePointerDown(e: React.PointerEvent) {
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      moved: false,
    };
    setGrabbing(true);
  }
  function handlePointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d.dragging) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = d.scrollLeft - dx;
      el.scrollTop = d.scrollTop - dy;
    }
  }
  function endDrag() {
    dragRef.current.dragging = false;
    setGrabbing(false);
  }
  function handleNodeClick(id: string) {
    // 拖拽后忽略点击
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setSelectedId(id);
  }

  const layout = useMemo(() => buildLayout(oeeCalcTree), []);
  const { positions, parentMap, nodeMap, edges } = layout;
  const canvasW = Math.max(layout.width, 640);
  const canvasH = Math.max(layout.height, 320);

  // 锁定背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // 上下游路径 = 祖先链 ∪ 子树
  const pathSet = useMemo(() => {
    const set = new Set<string>();
    let cur: string | undefined = selectedId;
    while (cur) {
      set.add(cur);
      cur = parentMap.get(cur);
    }
    descendants(selectedId, nodeMap).forEach((id) => set.add(id));
    return set;
  }, [selectedId, parentMap, nodeMap]);

  const allNodes = useMemo(() => Array.from(nodeMap.values()), [nodeMap]);
  const selected = nodeMap.get(selectedId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[92vw] h-[86vh] flex flex-col overflow-hidden z-10">
        {/* 顶部 */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-800">计算过程 · 指标回溯链路</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xl"
          >
            ✕
          </button>
        </div>

        {/* 主体 */}
        <div className="flex-1 flex min-h-0">
          {/* 左：拓扑图（可缩放、可拖拽平移） */}
          <div className="flex-1 relative bg-slate-50/60">
            <div
              ref={scrollRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              className={`h-full overflow-auto p-6 cursor-grab select-none ${grabbing ? "cursor-grabbing" : ""}`}
            >
              {/* 缩放包裹层：尺寸随 zoom 变化，保证滚动区与缩放一致 */}
              <div style={{ width: canvasW * zoom, height: canvasH * zoom }}>
                <div
                  className="relative"
                  style={{ width: canvasW, height: canvasH, transform: `scale(${zoom})`, transformOrigin: "top left" }}
                >
                  {/* 连线 */}
                  <svg className="absolute inset-0 pointer-events-none" width={canvasW} height={canvasH}>
                    {edges.map((e) => {
                      const a = positions.get(e.from)!;
                      const b = positions.get(e.to)!;
                      const x1 = a.x + NODE_W / 2;
                      const y1 = a.y + NODE_H;
                      const x2 = b.x + NODE_W / 2;
                      const y2 = b.y;
                      const midY = (y1 + y2) / 2;
                      const onPath = pathSet.has(e.from) && pathSet.has(e.to);
                      return (
                        <path
                          key={`${e.from}-${e.to}`}
                          d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                          fill="none"
                          stroke={onPath ? "#3b82f6" : "#cbd5e1"}
                          strokeWidth={onPath ? 2 : 1.5}
                          strokeOpacity={onPath ? 1 : 0.55}
                        />
                      );
                    })}
                  </svg>
                  {/* 节点 */}
                  {allNodes.map((n) => {
                    const p = positions.get(n.id)!;
                    const onPath = pathSet.has(n.id);
                    const isSel = selectedId === n.id;
                    const st = NODE_STYLE[n.type];
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNodeClick(n.id)}
                        className={`absolute rounded-lg border shadow-sm transition-all duration-150 text-left cursor-pointer ${st.card} ${
                          isSel ? "ring-2 ring-primary-500 z-10" : ""
                        } ${!onPath ? "opacity-40 hover:opacity-70" : "hover:shadow-md"}`}
                        style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
                      >
                        <div className="px-2.5 py-1.5 h-full flex flex-col justify-center">
                          <span className={`inline-block self-start px-1.5 py-0.5 rounded text-[10px] leading-none mb-1 ${st.tag}`}>
                            {st.tagLabel}
                          </span>
                          <span className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{n.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 缩放控件（固定在视图右上角） */}
            <div className="absolute top-4 right-4 flex flex-col items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-md py-1 z-20">
              <button
                onClick={() => setZoom((z) => clampZoom(z + 0.1))}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-md text-lg leading-none"
                title="放大 (Ctrl/Cmd +)"
              >
                ＋
              </button>
              <span className="text-[10px] text-gray-500 select-none">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => clampZoom(z - 0.1))}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-md text-lg leading-none"
                title="缩小 (Ctrl/Cmd -)"
              >
                －
              </button>
              <button
                onClick={() => setZoom(1)}
                className="w-8 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md text-xs"
                title="重置 (Ctrl/Cmd 0)"
              >
                1:1
              </button>
            </div>
          </div>

          {/* 右：详情面板 */}
          <div className="w-[34%] min-w-[300px] border-l border-gray-100 overflow-auto p-5">
            {selected && <DetailPanel node={selected} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ node }: { node: CalcNode }) {
  const d = node.detail;
  const st = NODE_STYLE[node.type];
  const rows: { label: string; value?: string }[] = [
    { label: "业务定义", value: d.definition },
    { label: "当前值", value: d.value },
    { label: "更新时间", value: d.updateTime },
    { label: "所属主题", value: d.subject },
    { label: "指标负责人", value: d.owner },
    { label: "计算公式", value: d.formula },
    { label: "当前参与计算", value: d.currentParts },
    { label: "数据来源", value: d.dataSources },
    { label: "来源表", value: d.sourceTable },
    { label: "记录内容", value: d.recordContent },
    { label: "系统名称", value: d.systemName },
    { label: "同步方式", value: d.syncMode },
    { label: "刷新频率", value: d.refreshRate },
  ];
  const present = rows.filter((r) => r.value);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`px-1.5 py-0.5 rounded text-[10px] ${st.tag}`}>{st.tagLabel}</span>
        <h4 className="text-base font-semibold text-gray-800">{node.label}</h4>
      </div>
      <div className="space-y-3">
        {present.map((r) => (
          <div key={r.label}>
            <div className="text-xs text-gray-400 mb-0.5">{r.label}</div>
            <div className="text-sm text-gray-700 leading-relaxed">{r.value}</div>
          </div>
        ))}
      </div>
      {d.relatedData && d.relatedData.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1.5">涉及业务数据</div>
          <div className="flex flex-wrap gap-1.5">
            {d.relatedData.map((x) => (
              <span key={x} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                ✓ {x}
              </span>
            ))}
          </div>
        </div>
      )}
      {d.providedMetrics && d.providedMetrics.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1.5">提供指标</div>
          <ul className="space-y-1">
            {d.providedMetrics.map((x) => (
              <li key={x} className="text-sm text-gray-700 flex items-center gap-1.5">
                <span className="text-gray-300">•</span>
                {x}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
