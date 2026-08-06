"use client";

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

/**
 * 受控分页：总条数、每页条数、上一页/下一页、页码窗口、跳页。
 */
export function Pagination({
  total,
  page,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  // 生成页码窗口（始终展示首页、末页与当前页附近）
  function buildPages(): (number | "...")[] {
    const pages: (number | "...")[] = [];
    const window = 1; // 当前页左右各展示 1 页
    const start = Math.max(2, safePage - window);
    const end = Math.min(totalPages - 1, safePage + window);

    pages.push(1);
    if (start > 2) pages.push("...");
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  const btnBase =
    "min-w-[32px] h-8 px-2 inline-flex items-center justify-center text-sm rounded-md transition-colors";
  const btnIdle = "text-gray-600 hover:bg-gray-100";
  const btnActive = "bg-primary-600 text-white font-medium";

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-gray-600">
      <div className="flex items-center gap-3">
        <span>共 <span className="font-medium text-gray-800">{total}</span> 条</span>
        {onPageSizeChange && (
          <span className="flex items-center gap-1.5">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} 条/页
                </option>
              ))}
            </select>
          </span>
        )}
        {total > 0 && (
          <span className="text-xs text-gray-400">
            {from}-{to}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className={`${btnBase} ${btnIdle} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
        >
          上一页
        </button>
        {buildPages().map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${p === safePage ? btnActive : btnIdle}`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className={`${btnBase} ${btnIdle} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
        >
          下一页
        </button>
        {totalPages > 1 && (
          <span className="flex items-center gap-1 ml-2 text-xs">
            跳至
            <input
              type="number"
              min={1}
              max={totalPages}
              className="w-12 h-8 px-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = Number((e.target as HTMLInputElement).value);
                  if (v >= 1 && v <= totalPages) onPageChange(v);
                }
              }}
            />
            页
          </span>
        )}
      </div>
    </div>
  );
}
