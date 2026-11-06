"use client";

// Excel 工作表形式的只读预览（选择模板弹窗 / 管理后台报告模板预览 / 智能填表抽屉共用）：
// 滚动区支持横向、纵向滚动；
// 表格按模板版式渲染——表头区灰底加粗、合并单元格（rowSpan/colSpan）、细边框、数字列右对齐；
// 多 Sheet 时底部页签切换（Excel 风格标签条）。SheetGrid 单独导出供仅需网格渲染的场景复用。
import { useEffect, useMemo, useState } from "react";
import type { ExcelSheetPreview } from "@/types";

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

  // 数据源变化时回到第一个工作表
  useEffect(() => {
    setSheetIdx(0);
  }, [sheets]);

  if (!sheets.length) return null;
  const idx = Math.min(sheetIdx, sheets.length - 1);
  const sheet = sheets[idx];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" aria-label="Excel 工作表只读预览">
      {/* 滚动区：横向、纵向 */}
      <div className="overflow-auto" style={{ maxHeight }}>
        <div style={{ padding: 12 }}>
          <SheetGrid sheet={sheet} />
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
