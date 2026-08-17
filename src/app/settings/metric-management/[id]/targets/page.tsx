"use client";

// 目标值管理页（指标管理列表「目标值管理」操作入口）
// 左上角导航标签：指标管理 / 目标值管理（可返回上级列表页）
// 内容：当前生效目标 + 历史版本列表（查看/编辑并新建版本/停用）+ 新增目标值（右侧滑出表单抽屉）
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { TargetManagement } from "@/components/settings/TargetManagement";
import { metricList } from "@/lib/mock-data/metric-management";
import { isTargetSupported } from "@/lib/mock-data/metric-targets";

export default function MetricTargetsPage() {
  const params = useParams<{ id: string }>();
  const metric = metricList.find((m) => m.id === params.id);

  if (!metric) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-24 text-gray-400">
          <span className="mb-3 text-4xl">🔍</span>
          <p className="text-sm text-gray-500">指标不存在或已被删除</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 导航标签：指标管理 / 目标值管理（点击返回上级页面） */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-sm text-gray-400">
          <Link href="/settings/metric-management" className="hover:text-primary-600">指标管理</Link>
          <span>/</span>
          <span className="text-gray-600">目标值管理</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{metric.nameCn}</h1>
        <p className="mt-1 text-sm text-gray-500">目标值版本化管理｜历史版本永久保留，编辑将生成新版本</p>
      </div>

      <Card padding>
        {isTargetSupported(metric.id) ? (
          <TargetManagement metric={metric} />
        ) : (
          <p className="text-sm text-gray-400">该指标暂不支持目标值配置</p>
        )}
      </Card>
    </div>
  );
}
