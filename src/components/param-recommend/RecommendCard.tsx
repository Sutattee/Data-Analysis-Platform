"use client";

// 下一批次推荐卡：左侧 💧 标签 + 大号建议值（数字从 0 增长动效）+ 允许范围区间位置横条；
// 右侧批次信息 + 置信度（算法提供才展示）。
// 已生成不展示状态标签；数据不足 / 暂无待生产仅文字说明；超出工艺范围 / 生成失败保留状态标签与原因文案；
// 重算期间（updating）仅降透明度提示，不展示文字标签。
import { Card } from "@/components/ui/Card";
import { StatusTag } from "./StatusTag";
import { CountUp } from "./CountUp";
import { DRYING_RANGE, fmt2, type NextRecommendation } from "@/lib/mock-data/param-recommend";

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="break-words text-sm text-gray-800">{value ?? "-"}</span>
    </div>
  );
}

/** 批次信息区：下一批次 / 牌号产线（未生成等分支复用） */
function BatchInfo({ rec }: { rec: NextRecommendation }) {
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <InfoField
        label="下一批次"
        value={rec.batch ? rec.batch.batch : "-"}
      />
      <InfoField label="牌号 / 产线" value={rec.batch ? `${rec.batch.brand} / ${rec.batch.line}` : "-"} />
    </div>
  );
}

export function RecommendCard({
  rec,
  updating,
  onShowBasis,
}: {
  rec: NextRecommendation;
  updating: boolean; // 输入变化自动重算中：卡片降透明度提示
  onShowBasis: () => void;
}) {
  const generated = rec.status === "已生成" && rec.value !== undefined;

  return (
    <Card
      title="下一批次推荐"
      divider={false}
      padding={false}
      headerRight={
        <button
          type="button"
          onClick={onShowBasis}
          className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
        >
          查看依据
        </button>
      }
    >
      <div className={`px-5 pb-5 -mt-3 pt-0.5 ${updating ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
        {/* 状态标签：超出工艺范围 / 生成失败展示；数据不足、暂无待生产不展示标签 */}
        {(rec.status === "超出工艺范围" || rec.status === "生成失败") && <StatusTag text={rec.status} />}

        {generated ? (
          <div className="mt-4 flex flex-col gap-5 lg:flex-row">
            {/* 核心建议：💧 标签在上 + 大号推荐值（数字从 0 增长动效）+ 允许范围横条 */}
            <div className="lg:w-[36%] lg:border-r lg:border-gray-100 lg:pr-6">
              <p className="text-sm font-medium text-gray-600">💧 加香出口水分建议值</p>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight tabular-nums text-primary-600">
                  <CountUp to={rec.value!} />
                </span>
                <span className="text-lg font-semibold text-primary-600">%</span>
              </div>

              {/* 加香出口水分允许范围横条：左上角标题 + 右上角「建议值位置」，竖指针标记建议值在区间中的位置 */}
              {(() => {
                const pos = ((rec.value! - DRYING_RANGE.low) / (DRYING_RANGE.high - DRYING_RANGE.low)) * 100;
                return (
                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-500">加香出口水分允许范围</span>
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary-600">
                        <span className="inline-block h-2 w-2 rounded-sm bg-primary-600" />
                        建议值位置
                      </span>
                    </div>
                    <div className="relative mt-2">
                      <div className="h-2 rounded-full bg-primary-100" />
                      <div
                        className="absolute -top-1 h-4 w-1 rounded-full bg-primary-600"
                        style={{ left: `calc(${pos}% - 2px)` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">下限 {fmt2(DRYING_RANGE.low)}%</span>
                      <span className="text-[11px] text-gray-400">上限 {fmt2(DRYING_RANGE.high)}%</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoField
                  label="下一批次"
                  value={rec.batch ? rec.batch.batch : "-"}
                />
                <InfoField label="牌号 / 产线" value={rec.batch ? `${rec.batch.brand} / ${rec.batch.line}` : "-"} />
                {rec.confidence !== undefined && (
                  <InfoField
                    label="模型置信度"
                    value={<span className="font-medium text-gray-800">{(rec.confidence * 100).toFixed(1)}%</span>}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {rec.status === "数据不足" ? (
              <p className="text-sm leading-relaxed text-gray-700">
                历史数据不足，当前 {rec.validCount} 批；补齐后自动计算。
              </p>
            ) : rec.status === "超出工艺范围" ? (
              <p className="text-sm leading-relaxed text-gray-700">
                未生成有效推荐：超出工艺范围（{fmt2(DRYING_RANGE.low)}%~{fmt2(DRYING_RANGE.high)}%），不截断为边界值。
              </p>
            ) : rec.status === "生成失败" ? (
              <p className="text-sm leading-relaxed text-gray-700">推荐生成失败，后台自动重试；重试成功后自动更新。</p>
            ) : (
              <p className="text-sm leading-relaxed text-gray-700">
                当前产线暂无待生产批次；新工单排产后自动生成推荐，历史数据正常展示。
              </p>
            )}
            {rec.batch && <BatchInfo rec={rec} />}
          </div>
        )}
      </div>
    </Card>
  );
}
