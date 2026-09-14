import { AlertLevelBadge } from "@/components/alert/alertBadges";
import type { AlertLevel } from "@/types";

// 执行进度偏差阈值档位（产品示例，请以实际规则进行配置）
const DEVIATION_ROWS: { dev: string; status: string; level: AlertLevel | null }[] = [
  { dev: "-3pct～+3pct", status: "正常", level: null },
  { dev: "+3pct～+5pct", status: "超计划", level: "提示" },
  { dev: "+5pct～+10pct", status: "超计划", level: "关注" },
  { dev: "+10pct～+15pct", status: "超计划", level: "预警" },
  { dev: "+15pct～+20pct", status: "超计划", level: "告警" },
  { dev: "＞+20pct", status: "超计划", level: "危险" },
  { dev: "-5pct～-3pct", status: "滞后", level: "提示" },
  { dev: "-10pct～-5pct", status: "滞后", level: "关注" },
  { dev: "-15pct～-10pct", status: "滞后", level: "预警" },
  { dev: "-20pct～-15pct", status: "滞后", level: "告警" },
  { dev: "＜-20pct", status: "滞后", level: "危险" },
];

// 执行进度偏差阈值示例表（新建/编辑数据告警 · 触发条件区块下方说明）
export function ExpenseDeviationThresholdNote() {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
      <p className="text-xs text-gray-600">
        执行进度偏差 = 预算执行率 − 计划执行进度；偏差在 -3pct～+3pct 内为正常，不触发告警。阈值参考如下（产品示例，请以实际规则进行配置）：
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="text-gray-500 border-b border-blue-100">
              <th className="text-left py-1.5 pr-4 font-medium">执行进度偏差</th>
              <th className="text-left py-1.5 pr-4 font-medium">业务状态</th>
              <th className="text-left py-1.5 font-medium">告警等级</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {DEVIATION_ROWS.map((r) => (
              <tr key={r.dev}>
                <td className="py-1.5 pr-4 text-gray-700">{r.dev}</td>
                <td className="py-1.5 pr-4 text-gray-600">{r.status}</td>
                <td className="py-1.5">
                  {r.level ? <AlertLevelBadge level={r.level} /> : <span className="text-gray-400">不告警</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
