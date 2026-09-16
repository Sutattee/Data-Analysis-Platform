"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { ABNORMAL_SUBJECTS, expenseNodeOf, subtreeIds, type AbnormalSubject } from "@/lib/mock-data/expense-overview";

// 进度异常科目行：科目路径 + 等级色进度条（执行率）+ 等级标签 + 触发时间 + 查看按钮
function AbnormalRow({ item }: { item: AbnormalSubject }) {
  const router = useRouter();
  const s = item.summary;

  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-gray-800" title={item.path}>
            {item.path}
          </span>
          <span className="flex flex-shrink-0 items-center gap-2">
            <AlertLevelBadge level={item.level} />
            <button
              type="button"
              onClick={() => router.push(`/expense/analysis/all?subject=${item.id}`)}
              className="rounded-md border border-primary-200 px-2 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
            >
              查看
            </button>
          </span>
        </div>
        {/* 进度条：底灰 + 等级色内条（宽度 = 预算执行率） */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${Math.min(s.rate, 100)}%`, backgroundColor: item.color }} />
          </div>
          <span className="w-14 flex-shrink-0 text-right text-xs font-semibold" style={{ color: item.color }}>
            {s.rate}%
          </span>
        </div>
        <div className="mt-1 truncate text-[11px] text-gray-400" title={item.triggeredAt}>
          触发时间：{item.triggeredAt}
        </div>
      </div>
    </div>
  );
}

// 进度异常科目列表：按告警等级降序 + 触发时间倒序；选中科目时仅显示其子树内异常
export function AbnormalSubjectsPanel({ subjectId }: { subjectId: string }) {
  const items = useMemo(() => {
    if (subjectId === "all") return ABNORMAL_SUBJECTS;
    const scope = subtreeIds(subjectId);
    return ABNORMAL_SUBJECTS.filter((a) => scope.has(a.id));
  }, [subjectId]);

  return (
    <Card
      title="进度异常科目"
      headerRight={<span className="text-xs text-gray-400">{expenseNodeOf(subjectId).path}｜共 {items.length} 项</span>}
    >
      {items.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400">当前科目范围内暂无进度异常</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((a) => (
            <AbnormalRow key={a.id} item={a} />
          ))}
        </div>
      )}
    </Card>
  );
}
