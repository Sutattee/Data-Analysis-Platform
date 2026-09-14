import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { expenseDevRuleOf } from "@/lib/mock-data/expense-alerts";

// 预算执行状态标签：告警中心定时检测预算执行率 → 偏差 ±3pct 内绿色「正常」；
// 否则按告警中心阈值展示五级告警标签（提示/关注/预警/告警/危险，危险带图标）
export function ExpenseStatusBadge({ deviation }: { deviation: number }) {
  const rule = expenseDevRuleOf(deviation);
  if (!rule) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        正常
      </span>
    );
  }
  return <AlertLevelBadge level={rule.level} />;
}
