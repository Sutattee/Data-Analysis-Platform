interface ComingSoonProps {
  title: string;
  description?: string;
}

// 通用「即将上线」占位组件：用于尚未开发的功能模块
export function ComingSoon({ title, description = "该模块正在开发中，敬请期待" }: ComingSoonProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      {/* 占位图 */}
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-primary-50 text-6xl">
        🚀
      </div>

      <h1 className="text-xl font-bold text-gray-900">{title}</h1>

      <span className="mt-3 inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-600">
        即将上线
      </span>

      <p className="mt-4 max-w-md text-sm text-gray-500">{description}</p>
    </div>
  );
}
