"use client";

// 异常状态「查看告警详情」：蓝色文字链接（仅异常时展示；费用科目/部门费用页共用）
export function AlertDetailButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
      onClick={onClick}
    >
      查看告警详情
    </button>
  );
}
