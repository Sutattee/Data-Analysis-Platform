"use client";

// 血缘关系 Tab：含「表血缘 / 字段血缘」两个子视图。
// 横向三栏拓扑：上游表（蓝） → 当前表（绿） → 下游表（蓝），箭头指示数据流向；
// 右上角提供 放大 / 缩小 / 复原 控件，画布超宽时可横向滚动查看。
import { useMemo, useState } from "react";
import type { MetadataTable } from "@/types";
import { allMetadataTables } from "@/lib/mock-data/metadata";

type LineageMode = "table" | "field";

// —— 布局常量（px） ——
const GAP = 20;               // 同栏卡片纵向间距
const PAD = 24;               // 画布四周留白
const TABLE_NODE_W = 200;     // 表血缘节点宽
const TABLE_HEADER_H = 64;    // 表血缘节点高（仅表头）
const FIELD_CARD_W = 250;     // 字段血缘卡片宽
const FIELD_HEADER_H = 40;    // 字段血缘卡片表头高
const FIELD_ROW_H = 24;       // 字段行高
const MIN_H = 360;            // 画布最小高度

interface CardNode {
  key: string;
  name: string;
  chineseName: string;
  tableType: string;
  fields: string[];      // 展示的字段（表血缘为空数组）
  x: number; y: number; w: number; h: number; headerH: number;
  center: boolean;
}

interface EdgeLink {
  fromCard: string; fromField?: string;
  toCard: string; toField?: string;
  label?: string;
}

interface LineageData {
  tableEdges: EdgeLink[];      // 表血缘边
  fieldEdges: EdgeLink[];      // 字段血缘边
  upstreamTables: string[];    // 上游表名
  downstreamTables: string[];  // 下游表名
}

// 计算血缘：上游 = 当前表 relations 指向的表；下游 = 其他表 relations 指向当前表
function computeLineage(table: MetadataTable): LineageData {
  const upstreamTables: string[] = [];
  for (const r of table.relations) {
    if (!upstreamTables.includes(r.targetTable)) upstreamTables.push(r.targetTable);
  }
  const downstreamTables: string[] = [];
  for (const t of allMetadataTables) {
    if (t.name === table.name) continue;
    if (t.relations.some((r) => r.targetTable === table.name) && !downstreamTables.includes(t.name)) {
      downstreamTables.push(t.name);
    }
  }

  // 表血缘边：上游 → 当前表（标注关联字段与基数）；当前表 → 下游
  const tableEdges: EdgeLink[] = table.relations.map((r) => ({
    fromCard: r.targetTable,
    toCard: table.name,
    label: `${r.joinField}（${r.cardinality}）`,
  }));
  for (const t of allMetadataTables) {
    if (t.name === table.name) continue;
    for (const r of t.relations) {
      if (r.targetTable === table.name) {
        tableEdges.push({ fromCard: table.name, toCard: t.name, label: `${r.joinField}（${r.cardinality}）` });
      }
    }
  }

  // 字段血缘边：当前表字段的 fk → 上游字段；下游表字段的 fk.table === 当前表
  const fieldEdges: EdgeLink[] = [];
  for (const f of table.fields) {
    if (f.fk) fieldEdges.push({ fromCard: f.fk.table, fromField: f.fk.field, toCard: table.name, toField: f.name });
  }
  for (const t of allMetadataTables) {
    if (t.name === table.name) continue;
    for (const f of t.fields) {
      if (f.fk && f.fk.table === table.name) {
        fieldEdges.push({ fromCard: table.name, fromField: f.fk.field, toCard: t.name, toField: f.name });
      }
    }
  }

  return { tableEdges, fieldEdges, upstreamTables, downstreamTables };
}

// 表名 → 元数据（找不到时兜底空信息）
function metaOf(name: string): { chineseName: string; tableType: string; fieldOrder: string[] } {
  const t = allMetadataTables.find((x) => x.name === name);
  return {
    chineseName: t?.chineseName ?? "",
    tableType: t?.tableType ?? "",
    fieldOrder: t ? t.fields.map((f) => f.name) : [],
  };
}

// 三栏布局：每栏纵向堆叠并整体垂直居中
function layout(mode: LineageMode, table: MetadataTable, data: LineageData) {
  const cardW = mode === "table" ? TABLE_NODE_W : FIELD_CARD_W;
  const headerH = mode === "table" ? TABLE_HEADER_H : FIELD_HEADER_H;
  const colX = [PAD, PAD + cardW + 260, PAD + (cardW + 260) * 2];
  const W = colX[2] + cardW + PAD;

  // 组装每栏卡片（字段血缘按参与血缘的字段过滤）
  function makeCard(name: string, center: boolean, fields: string[]): Omit<CardNode, "y"> {
    return {
      key: name, name,
      chineseName: center ? table.chineseName : metaOf(name).chineseName,
      tableType: center ? table.tableType : metaOf(name).tableType,
      fields,
      x: 0, w: cardW,
      h: headerH + fields.length * FIELD_ROW_H + 4,
      headerH, center,
    };
  }

  const upstreamCards: Omit<CardNode, "y">[] = [];
  const downstreamCards: Omit<CardNode, "y">[] = [];
  let centerCard: Omit<CardNode, "y">;

  if (mode === "table") {
    data.upstreamTables.forEach((n) => upstreamCards.push(makeCard(n, false, [])));
    centerCard = makeCard(table.name, true, []);
    data.downstreamTables.forEach((n) => downstreamCards.push(makeCard(n, false, [])));
  } else {
    // 参与字段血缘的表集合（以上游/下游边实际出现的表为准）
    const upNames: string[] = [];
    const downNames: string[] = [];
    const upFields: Record<string, string[]> = {};
    const downFields: Record<string, string[]> = {};
    for (const e of data.fieldEdges) {
      if (!upNames.includes(e.fromCard)) upNames.push(e.fromCard);
      if (!upFields[e.fromCard]) upFields[e.fromCard] = [];
      if (e.fromField && !upFields[e.fromCard].includes(e.fromField)) upFields[e.fromCard].push(e.fromField);
      if (!downNames.includes(e.toCard)) downNames.push(e.toCard);
      if (!downFields[e.toCard]) downFields[e.toCard] = [];
      if (e.toField && !downFields[e.toCard].includes(e.toField)) downFields[e.toCard].push(e.toField);
    }
    // 字段按表定义顺序展示
    const sorted = (name: string, list: string[]) =>
      metaOf(name).fieldOrder.filter((f) => list.includes(f));
    upNames.forEach((n) => upstreamCards.push(makeCard(n, false, sorted(n, upFields[n]))));
    centerCard = makeCard(table.name, true, table.fields.map((f) => f.name));
    downNames.forEach((n) => downstreamCards.push(makeCard(n, false, sorted(n, downFields[n]))));
  }

  // 各栏纵向布局（堆叠 + 垂直居中）
  function placeColumn(cards: Omit<CardNode, "y">[], x: number, H: number): CardNode[] {
    const totalH = cards.reduce((s, c) => s + c.h, 0) + GAP * Math.max(0, cards.length - 1);
    let y = (H - totalH) / 2;
    return cards.map((c) => {
      const node = { ...c, x, y };
      y += c.h + GAP;
      return node;
    });
  }

  const colH = (cards: Omit<CardNode, "y">[]) =>
    cards.reduce((s, c) => s + c.h, 0) + GAP * Math.max(0, cards.length - 1);
  const H = Math.max(MIN_H, colH(upstreamCards), colH(downstreamCards), centerCard.h + 40);

  const cards = [
    ...placeColumn(upstreamCards, colX[0], H),
    ...placeColumn([centerCard], colX[1], H),
    ...placeColumn(downstreamCards, colX[2], H),
  ];
  return { cards, W, H };
}

/** 血缘关系 Tab 主体 */
export function LineageGraphTab({ table }: { table: MetadataTable }) {
  const [mode, setMode] = useState<LineageMode>("table");
  const [scale, setScale] = useState(1);

  const data = useMemo(() => computeLineage(table), [table]);
  const hasLineage = data.upstreamTables.length > 0 || data.downstreamTables.length > 0;

  const { cards, W, H } = useMemo(() => layout(mode, table, data), [mode, table, data]);
  const edges = mode === "table" ? data.tableEdges : data.fieldEdges;

  // 边锚点：字段级取字段行中心，表级取卡片中心
  const nodeMap: Record<string, CardNode> = {};
  cards.forEach((c) => (nodeMap[c.key] = c));
  function anchorY(cardKey: string, field?: string): number {
    const c = nodeMap[cardKey];
    if (!c) return H / 2;
    if (!field) return c.y + c.h / 2;
    const idx = c.fields.indexOf(field);
    if (idx < 0) return c.y + c.h / 2;
    return c.y + c.headerH + idx * FIELD_ROW_H + FIELD_ROW_H / 2;
  }

  function zoom(delta: number) {
    setScale((s) => Math.min(2, Math.max(0.5, Math.round((s + delta) * 100) / 100)));
  }

  const zoomBtnCls =
    "h-7 min-w-7 px-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50 transition-colors";

  if (!hasLineage) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
        <span className="text-5xl mb-3">🧬</span>
        <p className="text-sm">暂无血缘关系</p>
        <p className="text-xs mt-1 text-gray-300">该表未配置任何上下游关联</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {/* 子 Tab 切换 + 图例 + 缩放控件 */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setMode("table")}
            className={`px-3.5 py-1.5 text-sm transition-colors ${
              mode === "table" ? "bg-primary-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            表血缘
          </button>
          <button
            onClick={() => setMode("field")}
            className={`px-3.5 py-1.5 text-sm transition-colors ${
              mode === "field" ? "bg-primary-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            字段血缘
          </button>
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-green-400" />当前表
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-400" />关联表
          </span>
          <span className="text-gray-400">流向：上游 → 当前表 → 下游</span>
        </div>

        {/* 缩放控件（右上角） */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-gray-400 w-10 text-right">{Math.round(scale * 100)}%</span>
          <button className={zoomBtnCls} title="放大" onClick={() => zoom(0.15)}>＋</button>
          <button className={zoomBtnCls} title="缩小" onClick={() => zoom(-0.15)}>－</button>
          <button className={zoomBtnCls} title="复原" onClick={() => setScale(1)}>⟲ 复原</button>
        </div>
      </div>

      {/* 画布：横向扩展 + 滚动查看 */}
      <div className="overflow-auto rounded-xl border border-gray-100 bg-gray-50" style={{ height: 420 }}>
        <div style={{ width: W * scale, height: H * scale }}>
          <div
            className="relative"
            style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
          >
            {/* 连线层 */}
            <svg width={W} height={H} className="absolute inset-0 pointer-events-none">
              <defs>
                <marker
                  id="lineage-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
              </defs>
              {edges.map((e, i) => {
                const from = nodeMap[e.fromCard];
                const to = nodeMap[e.toCard];
                if (!from || !to) return null;
                const sx = from.x + from.w;
                const sy = anchorY(e.fromCard, e.fromField);
                const tx = to.x;
                const ty = anchorY(e.toCard, e.toField);
                const mid = Math.min(70, (tx - sx) / 2);
                const lx = (sx + tx) / 2;
                const ly = (sy + ty) / 2 - 8;
                return (
                  <g key={i}>
                    <path
                      d={`M ${sx} ${sy} C ${sx + mid} ${sy}, ${tx - mid} ${ty}, ${tx} ${ty}`}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      markerEnd="url(#lineage-arrow)"
                    />
                    {e.label && (
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#64748b"
                        stroke="#f9fafb"
                        strokeWidth={3}
                        style={{ paintOrder: "stroke" }}
                      >
                        {e.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* 节点层 */}
            {cards.map((c) => (
              <div
                key={c.key}
                className={`absolute rounded-lg border shadow-sm overflow-hidden ${
                  c.center
                    ? "border-green-400 bg-white ring-2 ring-green-300"
                    : "border-blue-300 bg-white"
                }`}
                style={{ left: c.x, top: c.y, width: c.w }}
              >
                <div
                  className={`flex flex-col justify-center px-3 ${
                    c.center ? "bg-green-50 border-b border-green-200" : "bg-blue-50 border-b border-blue-200"
                  }`}
                  style={{ height: c.headerH }}
                >
                  <div className={`font-mono text-xs font-semibold truncate ${c.center ? "text-green-800" : "text-blue-800"}`} title={c.name}>
                    {c.name}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {c.chineseName}
                    {c.tableType ? ` · ${c.tableType}` : ""}
                    {c.center ? " · 当前表" : ""}
                  </div>
                </div>
                {c.fields.map((f) => (
                  <div
                    key={f}
                    className="flex items-center px-3 font-mono text-[11px] text-gray-700 border-b border-gray-50 last:border-b-0"
                    style={{ height: FIELD_ROW_H }}
                  >
                    <span className="truncate" title={f}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
