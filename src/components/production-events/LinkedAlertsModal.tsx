"use client";

// 重大事件（生产） - 关联预警弹窗：展示事件关联的告警记录，可跳转生产管理告警记录详情
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";

export function LinkedAlertsModal({
  open,
  onClose,
  alertIds,
}: {
  open: boolean;
  onClose: () => void;
  alertIds: string[];
}) {
  const router = useRouter();
  const records = alertIds
    .map((id) => ALERT_RECORDS.find((r) => r.id === id))
    .filter((r): r is (typeof ALERT_RECORDS)[number] => !!r);

  return (
    <Modal open={open} onClose={onClose} title={`关联预警（${alertIds.length} 条）`}>
      {records.length ? (
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <AlertLevelBadge level={r.level} />
                  <span className="truncate text-sm text-gray-800">{r.title}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400 truncate">
                  {r.id}｜{r.objectName}｜{r.metricName}｜{r.triggerTime}
                </p>
              </div>
              <button
                onClick={() => router.push(`/production/alert/records/${r.id}`)}
                className="flex-shrink-0 text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                查看
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-gray-400">暂无关联预警</p>
      )}
    </Modal>
  );
}
