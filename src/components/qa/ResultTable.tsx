"use client";

import { parseMarkdownTable } from "@/lib/qa/parse-table";

interface ResultTableProps {
  markdown: string; // 查询结果（markdown 表格或纯文本）
}

/**
 * 渲染「查询结果」段：若是 markdown 表格则渲染为 HTML 表格，否则按文本展示。
 */
export function ResultTable({ markdown }: ResultTableProps) {
  const table = parseMarkdownTable(markdown);

  if (!table) {
    return (
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{markdown}</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {table.headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 font-medium text-gray-600 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-2 px-3 whitespace-nowrap ${
                    ci === 0 ? "text-gray-800 font-medium" : "text-gray-700"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
