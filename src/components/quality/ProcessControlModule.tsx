"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PM_TO_DETAIL } from "@/lib/mock-data/process-control-detail";
import { PROCESS_METRICS } from "@/lib/mock-data/quality";

// 模块二「过程管控」：9 项过程指标表（全宽）；
// 行内展示最新实际值/管控值/超限比例/近期均值（带统计周期）/半年均值评价，最新实际值超管控值的标红；
// 管控值支持上限型（≤X）与区间型（值落在区间内达标）；整行、指标名称与「详情」进入过程管控详情页
export function ProcessControlModule() {
  const router = useRouter();
  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";
  // 行跳转目标：pm-* → 过程管控详情指标编码（缺省 SF02）
  const detailPath = (id: string) => `/quality/process-control/${PM_TO_DETAIL[id] ?? "SF02"}`;

  return (
    <Card padding={false} title="过程管控">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className={th}>工序</th>
              <th className={th}>指标</th>
              <th className={th}>最新实际值</th>
              <th className={th}>管控值</th>
              <th className={th}>超限比例</th>
              <th className={th}>近期均值</th>
              <th className={th}>半年均值评价</th>
              <th className={`${th} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {PROCESS_METRICS.map((m) => {
              // 最新实际值是否超管控值：区间型 = 落在区间外为超；上限型 = 大于上限为超；待配置不判定
              const latestOver = m.tolRange
                ? m.latestNum < m.tolRange[0] || m.latestNum > m.tolRange[1]
                : m.toleranceNum !== null && m.latestNum > m.toleranceNum;
              // 偏离比例无基准（待配置）时为 "-"，置灰展示
              const noDeviation = m.deviation === "-";
              return (
                <tr
                  key={m.id}
                  onClick={() => router.push(detailPath(m.id))}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{m.stage}</td>
                  {/* 指标名称可点击进入详情（与整行同目标） */}
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    <span
                      className="text-primary-600 hover:text-primary-700 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(detailPath(m.id));
                      }}
                    >
                      {m.name}
                    </span>
                  </td>
                  {/* 最新实际值：超管控值标红，口径（批次/班次班组/本月）以「｜」分隔 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`font-medium ${latestOver ? "text-red-600" : "text-gray-800"}`}>
                      {m.latestValue}
                    </span>
                    <span className="text-gray-300">｜</span>
                    <span className="text-[11px] text-gray-400">{m.latestNote}</span>
                  </td>
                  {/* 管控值：待配置置灰 */}
                  <td
                    className={`px-4 py-3 whitespace-nowrap ${
                      m.toleranceNum === null && !m.tolRange ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {m.tolerance}
                  </td>
                  {/* 超限比例：无基准（-）置灰 */}
                  <td
                    className={`px-4 py-3 whitespace-nowrap ${
                      noDeviation ? "text-gray-300" : "text-gray-800"
                    }`}
                  >
                    {m.deviation}
                  </td>
                  {/* 近期均值：值「｜」统计周期（近10批次 / 近3个月 / 近10班次） */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-gray-800">{m.recent}</span>
                    <span className="text-gray-300">｜</span>
                    <span className="text-[11px] text-gray-400">{m.recentNote}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-gray-800">{m.halfYearValue}</span>
                    <span className="text-gray-300">｜</span>
                    {m.halfYearPass ? (
                      <span className="text-xs text-green-600">达标</span>
                    ) : (
                      <span className="text-xs text-red-600">未达标</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(detailPath(m.id));
                      }}
                    >
                      详情
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
        近期均值统计周期随指标监测频次而异；点击指标名称、行或「详情」进入过程管控详情。
      </div>
    </Card>
  );
}
