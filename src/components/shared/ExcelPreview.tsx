"use client";

// Excel 工作表形式的只读预览（选择模板弹窗 / 管理后台报告模板预览 / 智能填表抽屉共用）：
// 顶部说明 + 缩放控件（−/百分比/+/重置，60%~150%）；滚动区支持横向、纵向滚动；
// 表格按模板版式渲染——表头区灰底加粗、合并单元格（rowSpan/colSpan）、细边框、数字列右对齐；
// 多 Sheet 时底部页签切换（Excel 风格标签条）。SheetGrid 单独导出供仅需网格渲染的场景复用。
import { useEffect, useMemo, useState } from "react";
import type { ExcelSheetPreview } from "@/types";

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

// 合并单元格索引：起点 → span 信息；覆盖位 → skip（渲染时跳过）
function buildMergeMap(sheet: ExcelSheetPreview) {
  const anchor = new Map<string, { rowSpan: number; colSpan: number }>();
  const covered = new Set<string>();
  (sheet.merges ?? []).forEach((m) => {
    anchor.set(`${m.row},${m.col}`, { rowSpan: m.rowSpan, colSpan: m.colSpan });
    for (let r = m.row; r < m.row + m.rowSpan; r++) {
      for (let c = m.col; c < m.col + m.colSpan; c++) {
        if (r !== m.row || c !== m.col) covered.add(`${r},${c}`);
      }
    }
  });
  return { anchor, covered };
}

// Excel 风格网格（表头区灰底加粗居中、细边框、数字列右对齐、合并单元格）
export function SheetGrid({ sheet }: { sheet: ExcelSheetPreview }) {
  const { anchor, covered } = useMemo(() => buildMergeMap(sheet), [sheet]);
  const headerRows = sheet.headerRows ?? 0;
  const numericCols = sheet.numericCols ?? [];
  const cellBorder = "border border-gray-300 px-2.5 py-1.5 whitespace-nowrap";

  return (
    <table className="border-collapse text-sm bg-white" aria-label={`工作表 ${sheet.name}`}>
      <tbody>
        {sheet.cells.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => {
              if (covered.has(`${r},${c}`)) return null; // 被合并覆盖的位置不渲染
              const span = anchor.get(`${r},${c}`);
              const inHeader = r < headerRows;
              const isNumeric = numericCols.includes(c);
              // 表头区：灰底加粗居中；数字列：右对齐等宽数字（模拟数字格式）
              const cls = `${cellBorder} ${
                inHeader
                  ? "bg-gray-100 font-medium text-gray-700 text-center"
                  : isNumeric
                    ? "text-right tabular-nums text-gray-800"
                    : "text-gray-700"
              }`;
              return (
                <td
                  key={c}
                  rowSpan={span?.rowSpan}
                  colSpan={span?.colSpan}
                  className={cls}
                >
                  {cell}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ExcelPreview({
  sheets,
  maxHeight = 360,
}: {
  sheets: ExcelSheetPreview[];
  maxHeight?: number;
}) {
  const [sheetIdx, setSheetIdx] = useState(0);
  const [zoom, setZoom] = useState(1);

  // 数据源变化时回到第一个工作表
  useEffect(() => {
    setSheetIdx(0);
  }, [sheets]);

  if (!sheets.length) return null;
  const idx = Math.min(sheetIdx, sheets.length - 1);
  const sheet = sheets[idx];
  const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 10) / 10));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" aria-label="Excel 工作表只读预览">
      {/* 工具条：预览说明 + 缩放控件 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs text-gray-400">Excel 工作表只读预览：底部页签可切换工作表，支持滚动与缩放查看</span>
        <div className="flex items-center gap-1 flex-shrink-0 ml-3">
          <button
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
            className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="缩小"
            aria-label="缩小"
          >
            −
          </button>
          <span className="text-xs text-gray-500 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
            className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="放大"
            aria-label="放大"
          >
            +
          </button>
          {zoom !== 1 && (
            <button
              onClick={() => setZoom(1)}
              className="px-1.5 h-6 flex items-center justify-center rounded border border-gray-200 bg-white text-xs text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
              title="重置缩放"
            >
              重置
            </button>
          )}
        </div>
      </div>

      {/* 滚动区：横向、纵向；缩放用 transform，外层按比例放大宽度以保证横向滚动完整 */}
      <div className="overflow-auto" style={{ maxHeight }}>
        <div style={{ width: `${100 / zoom}%` }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "0 0", padding: 12 }}>
            <SheetGrid sheet={sheet} />
          </div>
        </div>
      </div>

      {/* 底部 Sheet 页签条（Excel 风格） */}
      <div className="flex items-end gap-0.5 px-2 pt-1.5 bg-gray-100 border-t border-gray-200" role="tablist" aria-label="工作表页签">
        {sheets.map((s, i) => (
          <button
            key={s.name}
            role="tab"
            aria-selected={i === idx}
            onClick={() => setSheetIdx(i)}
            className={`px-3 py-1.5 text-xs rounded-t-md border border-b-0 transition-colors ${
              i === idx
                ? "bg-white text-primary-700 font-medium border-gray-300"
                : "bg-gray-200/70 text-gray-500 border-transparent hover:bg-gray-200"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
