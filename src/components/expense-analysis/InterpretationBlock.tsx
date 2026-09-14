"use client";

// 🤖 数据解读块：图表下方大模型解读（300 字内，每月自动更新），样式与费用总览一致
export function InterpretationBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary-700">
        <span>🤖</span>数据解读
      </div>
      <p className="text-xs leading-relaxed text-gray-600">{text}</p>
    </div>
  );
}
