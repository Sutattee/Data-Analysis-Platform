import { AlertLevelBadge } from "@/components/alert/alertBadges";
import type { AlertLevel } from "@/types";

// 缺陷指标预测风险分级示例（新建/编辑数据告警 · 预测风险类型时展示）：
// 同一规则组按最高级别命中；同时「≥上限或≤下限」记录实际命中哪一侧；
// 等级变化及恢复沿用告警中心既有去重规则（持续异常只保留一条，恢复正常后再异常才生成新记录）
interface DefectRow {
  level: AlertLevel;
  metric: string;   // 预测指标
  cond: string;     // 触发条件
}

const MOISTURE_ROWS: DefectRow[] = [
  { level: "预警", metric: "预测成品水分", cond: "≥上限12.8% 或 ＜下限12.2%（超限即触发）" },
  { level: "告警", metric: "预测成品水分", cond: "≥上限12.8% 超出0.5pct 或 ＜下限12.2% 超出0.5pct" },
  { level: "危险", metric: "预测成品水分", cond: "≥上限12.8% 超出1pct 或 ＜下限12.2% 超出1pct" },
];

const STORAGE_ROWS: DefectRow[] = [
  { level: "告警", metric: "预测箱储总存储时长", cond: "＞储存时长上限 72小时 超出2小时" },
  { level: "危险", metric: "预测箱储总存储时长", cond: "＞储存时长上限 72小时 超出5小时" },
];

const TH_STYLE = "text-left py-1.5 pr-4 font-medium";
const TD_STYLE = "py-1.5 pr-4 text-gray-700";

function DefectTable({ rows }: { rows: DefectRow[] }) {
  return (
    <table className="w-full text-xs whitespace-nowrap">
      <thead>
        <tr className="text-gray-500 border-b border-blue-100">
          <th className={TH_STYLE}>告警等级</th>
          <th className={TH_STYLE}>预测指标</th>
          <th className="text-left py-1.5 font-medium">触发条件</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-blue-50">
        {rows.map((r) => (
          <tr key={r.metric + r.level}>
            <td className="py-1.5 pr-4"><AlertLevelBadge level={r.level} /></td>
            <td className={TD_STYLE}>{r.metric}</td>
            <td className="py-1.5 text-gray-700">{r.cond}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 缺陷指标预测告警分级示例（产品示例，请以实际规则进行配置）
export function QualityThresholdNote() {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
      <p className="text-xs leading-relaxed text-gray-600">
        缺陷指标预测告警分级示例（以标准水分 12.5%、允差 ±0.3pct，储存时长上限 72 小时为例，产品示例，请以实际规则进行配置）：
        同一规则组按最高级别命中；指标持续异常期间只保留一条告警记录，恢复正常后再次异常才生成新记录。
      </p>
      <div className="mt-2 space-y-2">
        <div className="overflow-x-auto">
          <DefectTable rows={MOISTURE_ROWS} />
        </div>
        <div className="overflow-x-auto">
          <DefectTable rows={STORAGE_ROWS} />
        </div>
      </div>
    </div>
  );
}
