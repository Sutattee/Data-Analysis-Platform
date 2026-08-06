"use client";

/**
 * 数据预览：按字段生成的小样本数据表。
 */
export function DataPreview({ rows }: { rows: Record<string, string | number>[] }) {
  if (rows.length === 0) {
    return <div className="py-16 text-center text-sm text-gray-400">暂无预览数据</div>;
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {columns.map((col) => (
              <th key={col} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col} className="px-4 py-2 text-xs text-gray-700 font-mono whitespace-nowrap">
                  {String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 text-xs text-gray-400">共 {rows.length} 条预览数据（模拟）</div>
    </div>
  );
}
