"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PROCESS_METRICS } from "@/lib/mock-data/quality";

// 模块二「过程管控」：9 项过程指标表（全宽）；
// 行内展示半年评价/最新监测/近期均值/评价标准，最新监测超评价标准的数值标红；
// 整行与「详情」均可进入稳定性诊断（当前为待开发占位页）
export function ProcessControlModule() {
  const router = useRouter();
  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <Card padding={false} title="过程管控">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className={th}>工序</th>
              <th className={th}>指标</th>
              <th className={th}>半年评价</th>
              <th className={th}>最新监测</th>
              <th className={th}>近期均值</th>
              <th className={th}>评价标准</th>
              <th className={`${th} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {PROCESS_METRICS.map((m) => {
              // 最新监测是否超评价标准（标准待配置时不判定）
              const latestOver = m.toleranceNum !== null && m.latestNum > m.toleranceNum;
              return (
                <tr
                  key={m.id}
                  onClick={() => router.push("/quality/diagnosis/stability")}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{m.stage}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap text-gray-800">{m.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-gray-800">{m.halfYearValue}</span>
                    <span className="text-gray-300">｜</span>
                    {m.halfYearPass ? (
                      <span className="text-xs text-green-600">达标</span>
                    ) : (
                      <span className="text-xs text-red-600">未达标</span>
                    )}
                  </td>
                  {/* 最新监测：超评价标准数值标红 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`font-medium ${latestOver ? "text-red-600" : "text-gray-800"}`}>
                      {m.latestValue}
                    </span>
                    <span className="ml-1 text-[11px] text-gray-400">{m.latestNote}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-800">{m.recent}</td>
                  {/* 评价标准：待配置置灰 */}
                  <td
                    className={`px-4 py-3 whitespace-nowrap ${
                      m.toleranceNum === null ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {m.tolerance}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/quality/diagnosis/stability");
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
        近期均值统计周期随指标监测频次而异；点击行或「详情」进入稳定性诊断。
      </div>
    </Card>
  );
}
