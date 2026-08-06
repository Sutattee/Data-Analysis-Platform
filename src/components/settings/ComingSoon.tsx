import { ReactNode } from "react";

interface ComingSoonProps {
  title: string;
  desc: string;
  icon?: string;
  children?: ReactNode;
}

/**
 * 管理后台「开发中」占位页：统一标题样式 + 居中提示卡片。
 */
export function ComingSoon({ title, desc, icon = "⚙️", children }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-gray-400">
        <span className="text-5xl mb-3">{icon}</span>
        <p className="text-sm">此功能模块正在开发中</p>
        <p className="text-xs mt-1 text-gray-300">敬请期待</p>
        {children}
      </div>
    </div>
  );
}
