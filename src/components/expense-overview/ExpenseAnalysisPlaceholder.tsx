// 费用分析占位壳：三个次级页面共用（实际分析内容待后续设计输入）
export function ExpenseAnalysisPlaceholder({ title, from }: { title: string; from: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">费用预算执行 · 费用分析</p>
      </div>
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
        <span className="text-4xl">🚧</span>
        <p className="mt-3 text-sm font-medium text-gray-600">页面建设中</p>
        <p className="mt-1 text-xs text-gray-400">当前入口：{from}</p>
      </div>
    </div>
  );
}
