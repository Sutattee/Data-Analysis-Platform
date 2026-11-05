"use client";

// 管控值管理 - 变更记录抽屉：新增 / 修改 / 启用 / 停用 / 删除自动留痕，按时间倒序展示
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { listChangeLogs } from "@/lib/mock-data/metric-controls";
import type { ControlChangeLog, MetricControlConfig } from "@/types";

// 操作类型标签：新增蓝 / 修改主色 / 启用绿 / 停用灰 / 删除红
const TYPE_TAG_CLS: Record<ControlChangeLog["type"], string> = {
  新增: "bg-primary-50 text-primary-700",
  修改: "bg-blue-50 text-blue-600",
  启用: "bg-green-50 text-green-600",
  停用: "bg-gray-100 text-gray-500",
  删除: "bg-red-50 text-red-500",
};

export function ControlHistoryDrawer({
  config,
  open,
  onClose,
}: {
  config: MetricControlConfig | null;
  open: boolean;
  onClose: () => void;
}) {
  const logs = config ? listChangeLogs(config.id) : [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`变更记录（${config?.metricName ?? ""}）`}
      width={480}
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      {logs.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">暂无变更记录</p>
      ) : (
        <div className="space-y-3">
          {logs.map((l) => (
            <div key={l.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_TAG_CLS[l.type]}`}
                >
                  {l.type}
                </span>
                <span className="text-xs text-gray-400">
                  {l.at} · {l.by}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs leading-relaxed">
                <p className="text-gray-500">
                  变更前：<span className="text-gray-800">{l.before}</span>
                </p>
                <p className="text-gray-500">
                  变更后：<span className="text-gray-800">{l.after}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-gray-400 leading-relaxed">
        说明：新增、修改管控条件、启用、停用时自动记录变更；已有判定结果保留当时使用的管控条件，不随配置修改自动重算。
      </p>
    </Drawer>
  );
}
