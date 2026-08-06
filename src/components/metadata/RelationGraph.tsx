"use client";

import { TableRelation } from "@/types";

const NODE_H = 48;
const V_GAP = 32;
const TOP = 24;
const CENTER_X = 24;
const CENTER_W = 200;
const TARGET_X = 400;
const TARGET_W = 176;

// 配色（与主题一致）
const C = {
  centerFill: "#eff6ff",
  centerStroke: "#2563eb",
  targetFill: "#ffffff",
  targetStroke: "#e5e7eb",
  line: "#cbd5e1",
  badgeFill: "#2563eb",
  textDark: "#1f2937",
  textMuted: "#6b7280",
  white: "#ffffff",
};

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/**
 * 关系图：中心表节点 + 关联表节点 + 连线（标注基数与关联字段）。
 * 使用 SVG 绘制，节点纵向排布在右侧，中心节点居中。
 */
export function RelationGraph({ tableName, relations }: { tableName: string; relations: TableRelation[] }) {
  if (relations.length === 0) {
    return <div className="py-16 text-center text-sm text-gray-400">暂无关联表信息</div>;
  }

  const totalHeight = TOP + relations.length * (NODE_H + V_GAP) - V_GAP + TOP;
  const centerY = totalHeight / 2;

  return (
    <div className="overflow-auto">
      <svg width={600} height={totalHeight} style={{ minWidth: 600 }} className="block">
        {/* 中心节点 */}
        <g>
          <rect
            x={CENTER_X}
            y={centerY - NODE_H / 2}
            width={CENTER_W}
            height={NODE_H}
            rx={8}
            fill={C.centerFill}
            stroke={C.centerStroke}
            strokeWidth={1.5}
          />
          <text x={CENTER_X + CENTER_W / 2} y={centerY - 4} textAnchor="middle" className="fill-gray-800" style={{ fontSize: 11, fontWeight: 600 }}>
            {truncate(tableName, 20)}
          </text>
          <text x={CENTER_X + CENTER_W / 2} y={centerY + 12} textAnchor="middle" style={{ fontSize: 9, fill: C.textMuted }}>
            当前表
          </text>
        </g>

        {/* 关联节点与连线 */}
        {relations.map((rel, i) => {
          const targetTop = TOP + i * (NODE_H + V_GAP);
          const targetCenterY = targetTop + NODE_H / 2;
          const lineX1 = CENTER_X + CENTER_W;
          const lineX2 = TARGET_X;
          const midX = (lineX1 + lineX2) / 2;
          const midY = (centerY + targetCenterY) / 2;

          return (
            <g key={`${rel.targetTable}-${i}`}>
              {/* 连线 */}
              <line x1={lineX1} y1={centerY} x2={lineX2} y2={targetCenterY} stroke={C.line} strokeWidth={1.5} />
              {/* 箭头 */}
              <polygon
                points={`${lineX2 - 6},${targetCenterY - 4} ${lineX2},${targetCenterY} ${lineX2 - 6},${targetCenterY + 4}`}
                fill={C.line}
              />
              {/* 基数徽标 */}
              <rect x={midX - 18} y={midY - 9} width={36} height={18} rx={9} fill={C.badgeFill} />
              <text x={midX} y={midY + 4} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600, fill: C.white }}>
                {rel.cardinality}
              </text>
              {/* 关联字段 */}
              <text x={midX} y={midY - 14} textAnchor="middle" style={{ fontSize: 9, fill: C.textMuted }}>
                {truncate(rel.joinField, 18)}
              </text>

              {/* 目标节点 */}
              <rect
                x={TARGET_X}
                y={targetTop}
                width={TARGET_W}
                height={NODE_H}
                rx={8}
                fill={C.targetFill}
                stroke={C.targetStroke}
                strokeWidth={1}
              />
              <text x={TARGET_X + TARGET_W / 2} y={targetCenterY - 2} textAnchor="middle" style={{ fontSize: 11, fontWeight: 500, fill: C.textDark }}>
                {truncate(rel.targetTable, 20)}
              </text>
              <text x={TARGET_X + TARGET_W / 2} y={targetCenterY + 14} textAnchor="middle" style={{ fontSize: 9, fill: C.textMuted }}>
                关联表
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
