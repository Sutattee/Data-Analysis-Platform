"use client";

import { useMemo, useState } from "react";
import { NODE_STYLE, CalcNode } from "@/lib/mock-data/calc-process";
import { TraceMetric, ViewMode } from "@/lib/mock-data/metric-trace";

const NODE_H = 54;   // 节点最小高度（连线纵向基准）
const ROW_H = 116;   // 层间距（保证垂直留白）
const GAP_X = 30;    // 同层节点水平间距
const MIN_W = 132;
const MAX_W = 340;

interface Pos { x: number; y: number; w: number; }

// 自适应布局（子树宽度算法）：每个子树占用宽度 = max(节点宽, 子子树宽之和+间距)，
// 父节点居中于子树，子节点在父的子树内居中排列 —— 保证任意节点互不重叠。
function layoutAdaptive(root: CalcNode) {
  const positions = new Map<string, Pos>();
  const edges: { from: string; to: string }[] = [];
  const nodeMap = new Map<string, CalcNode>();

  function collect(n: CalcNode) {
    nodeMap.set(n.id, n);
    (n.children || []).forEach((c) => {
      edges.push({ from: n.id, to: c.id });
      collect(c);
    });
  }
  collect(root);

  function widthOf(n: CalcNode): number {
    const len = Math.max(
      n.label.length,
      n.detail?.formula?.length || 0,
      n.detail?.sourceTable?.length || 0
    );
    return Math.min(MAX_W, Math.max(MIN_W, len * 12 + 22));
  }

  // 第一遍：计算每个节点的子树宽度
  const subtreeW = new Map<string, number>();
  function calcW(n: CalcNode): number {
    const w = widthOf(n);
    if (!n.children || n.children.length === 0) {
      subtreeW.set(n.id, w);
      return w;
    }
    let childrenW = 0;
    n.children.forEach((c, i) => { childrenW += calcW(c) + (i > 0 ? GAP_X : 0); });
    const sw = Math.max(w, childrenW);
    subtreeW.set(n.id, sw);
    return sw;
  }
  calcW(root);

  // 第二遍：放置节点
  function place(n: CalcNode, x: number, depth: number) {
    const w = widthOf(n);
    const y = depth * ROW_H;
    const sw = subtreeW.get(n.id)!;
    const cx = x + sw / 2; // 子树水平中心
    positions.set(n.id, { x: cx - w / 2, y, w });

    if (n.children && n.children.length) {
      let childrenW = 0;
      n.children.forEach((c, i) => { childrenW += subtreeW.get(c.id)! + (i > 0 ? GAP_X : 0); });
      let curX = x + (sw - childrenW) / 2; // 子节点整体居中于父子树
      n.children.forEach((c) => {
        place(c, curX, depth + 1);
        curX += subtreeW.get(c.id)! + GAP_X;
      });
    }
  }
  place(root, 0, 0);

  let maxX = 0;
  let maxY = 0;
  positions.forEach((p) => {
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + NODE_H);
  });
  return { positions, nodeMap, edges, width: maxX, height: maxY };
}

export function TraceTopology({
  metric, viewMode, showValues,
}: { metric: TraceMetric; viewMode: ViewMode; showValues?: boolean }) {
  const resultTree = viewMode === "business" ? metric.businessTree : metric.technicalTree;
  const defineTree = viewMode === "business" ? metric.businessTreeDefine : metric.technicalTreeDefine;
  const tree = showValues === false && defineTree ? defineTree : resultTree;

  const layout = useMemo(() => layoutAdaptive(tree), [tree]);
  const { positions, nodeMap, edges, width, height } = layout;
  const allNodes = Array.from(nodeMap.values());
  const [hoverId, setHoverId] = useState<string | null>(null);

  // ----- 缩放控制（区域内右上角） -----
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 1.8;
  const ZOOM_STEP = 0.15;
  const [zoom, setZoom] = useState(1);

  const canvasW = Math.max(width + 80, 420);
  const canvasH = Math.max(height + 60, 240);

  const zoomBtnCls =
    "px-2.5 py-1 text-xs text-gray-600 rounded transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-600";

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 拓扑图：滚动区内嵌，缩放控制固定在外层右上角（不随内容滚动） */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 overflow-auto bg-slate-50/60 p-6">
        {/* 画布：外层占位按缩放比例撑开（保证滚动范围正确），内层以左上角为基准缩放 */}
        <div className="relative mx-auto" style={{ width: canvasW * zoom, height: canvasH * zoom }}>
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: canvasW, height: canvasH, transform: `scale(${zoom})` }}
          >
          {/* 连线 */}
          <svg className="absolute inset-0 pointer-events-none" width={canvasW} height={canvasH}>
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
              </marker>
            </defs>
            {edges.map((e) => {
              const a = positions.get(e.from);
              const b = positions.get(e.to);
              if (!a || !b) return null;
              const x1 = a.x + a.w / 2;
              const y1 = a.y + NODE_H;
              const x2 = b.x + b.w / 2;
              const y2 = b.y;
              const midY = (y1 + y2) / 2;
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </svg>

          {/* 节点 */}
          {allNodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            const st = NODE_STYLE[n.type] || NODE_STYLE.value;
            const isHover = hoverId === n.id;
            return (
              <div
                key={n.id}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
                className={`absolute rounded-lg border shadow-sm transition-all duration-150 flex items-center justify-center ${st.card} ${
                  isHover ? "ring-2 ring-primary-400 scale-[1.03] z-10" : ""
                }`}
                style={{ left: p.x, top: p.y, width: p.w, minHeight: NODE_H }}
              >
                <div className="px-2 py-1.5 text-center">
                  <div className="text-xs font-medium text-gray-800 leading-snug break-words">{n.label}</div>
                  {n.detail?.formula && (
                    <div className="text-[10px] text-gray-500 mt-0.5 font-mono break-all">{n.detail.formula}</div>
                  )}
                  {n.detail?.sourceTable && (
                    <div className="text-[10px] text-gray-500 mt-0.5 font-mono break-all">{n.detail.sourceTable}</div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
        </div>
        {/* 缩放控制（固定区域右上角，不随内容滚动） */}
        <div className="absolute right-4 top-3 z-20 flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white py-0.5 pl-0.5 pr-1 shadow-sm">
          <button
            className={zoomBtnCls}
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round(((z - ZOOM_STEP) * 100) / 5) * 5 / 100))}
            disabled={zoom <= ZOOM_MIN}
            title="缩小"
          >
            −
          </button>
          <span className="min-w-[38px] text-center text-xs tabular-nums text-gray-500">{Math.round(zoom * 100)}%</span>
          <button
            className={zoomBtnCls}
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round(((z + ZOOM_STEP) * 100) / 5) * 5 / 100))}
            disabled={zoom >= ZOOM_MAX}
            title="放大"
          >
            +
          </button>
          <span className="mx-0.5 h-3 w-px bg-gray-200" />
          <button className={zoomBtnCls} onClick={() => setZoom(1)} disabled={zoom === 1} title="恢复原始大小">
            复位
          </button>
        </div>
      </div>
    </div>
  );
}
