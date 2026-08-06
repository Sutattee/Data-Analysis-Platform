"use client";

// 仪表盘占位页（功能开发中）
export default function PanelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-sm text-gray-500 mt-1">自定义数据分析仪表盘</p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-xl border border-gray-100">
        <span className="text-5xl mb-4">📈</span>
        <p className="text-base font-medium text-gray-500">功能开发中</p>
        <p className="text-sm mt-1">仪表盘功能正在建设中，敬请期待</p>
      </div>
    </div>
  );
}
