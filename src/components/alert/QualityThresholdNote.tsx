import { AlertLevelBadge } from "@/components/alert/alertBadges";
import type { AlertLevel } from "@/types";

// 五级阈值示例行（产品规则示例，以「松散回潮非稳态指数」为例，基准 = 上限 4%）
// 偏离比例＝（实际指数－4%）÷4%×100%，达到上限即触发，按偏离比例划分五个等级
interface ThresholdRow {
  level: AlertLevel | null; // null = 不触发
  op: string;        // 判断方式
  baseType: string;  // 基准类型
  base: string;      // 基准值
  band: string;      // 偏离比例
  range: string;     // 实际触发范围
}

const THRESHOLD_ROWS: ThresholdRow[] = [
  { level: null, op: "—", baseType: "—", base: "—", band: "—", range: "指数＜4.00%" },
  { level: "提示", op: "≥", baseType: "上限", base: "4%", band: "≥0%且＜5%", range: "指数≥4.00%且＜4.20%" },
  { level: "关注", op: "≥", baseType: "上限", base: "4%", band: "≥5%且＜10%", range: "指数≥4.20%且＜4.40%" },
  { level: "预警", op: "≥", baseType: "上限", base: "4%", band: "≥10%且＜20%", range: "指数≥4.40%且＜4.80%" },
  { level: "告警", op: "≥", baseType: "上限", base: "4%", band: "≥20%且＜50%", range: "指数≥4.80%且＜6.00%" },
  { level: "危险", op: "≥", baseType: "上限", base: "4%", band: "≥50%", range: "指数≥6.00%" },
];

// 工艺质量五级阈值示例表（新建/编辑数据告警 · 触发条件区块下方说明）
export function QualityThresholdNote() {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
      <p className="text-xs leading-relaxed text-gray-600">
        告警等级阈值示例（以「松散回潮非稳态指数」为例，产品示例，请以实际规则进行配置）：
        达到上限即触发，并按相对上限的偏离比例划分五个等级，偏离比例＝（实际指数－4%）÷4%×100%。
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="text-gray-500 border-b border-blue-100">
              <th className="text-left py-1.5 pr-4 font-medium">告警等级</th>
              <th className="text-left py-1.5 pr-4 font-medium">判断方式</th>
              <th className="text-left py-1.5 pr-4 font-medium">基准类型</th>
              <th className="text-left py-1.5 pr-4 font-medium">基准值</th>
              <th className="text-left py-1.5 pr-4 font-medium">偏离比例</th>
              <th className="text-left py-1.5 font-medium">实际触发范围</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {THRESHOLD_ROWS.map((r) => (
              <tr key={r.band + (r.level ?? "none")}>
                <td className="py-1.5 pr-4">
                  {r.level ? <AlertLevelBadge level={r.level} /> : <span className="text-gray-400">不告警</span>}
                </td>
                <td className="py-1.5 pr-4 text-gray-700">{r.op}</td>
                <td className="py-1.5 pr-4 text-gray-700">{r.baseType}</td>
                <td className="py-1.5 pr-4 text-gray-700">{r.base}</td>
                <td className="py-1.5 pr-4 text-gray-700">{r.band}</td>
                <td className="py-1.5 text-gray-700">{r.range}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
