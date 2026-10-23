"use client";

// 下一批次推荐卡：核心建议（大号蓝色推荐值）+ 批次信息 + 最终控制目标 + 置信度（算法提供才展示）。
// 已生成时不展示状态标签；数据不足 / 超出工艺范围 / 生成失败 / 暂无待生产保留状态标签与原因文案；
// 牌号筛选与下一批次牌号不一致时仍完整展示推荐（附一行提示），历史图表与记录按所选牌号展示。
import { Card } from "@/components/ui/Card";
import { StatusTag } from "./StatusTag";
import { DRYING_RANGE, fmt2, type NextRecommendation } from "@/lib/mock-data/param-recommend";

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="break-words text-sm text-gray-800">{value ?? "-"}</span>
    </div>
  );
}

/** 批次信息区：下一批次 / 牌号产线 / 最终控制目标 / 烘丝允许范围 */
function BatchInfo({ rec }: { rec: NextRecommendation }) {
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <InfoField
        label="下一批次"
        value={rec.batch ? `${rec.batch.batch}（${rec.batch.workOrder}）` : "-"}
      />
      <InfoField label="牌号 / 产线" value={rec.batch ? `${rec.batch.brand} / ${rec.batch.line}` : "-"} />
      <InfoField
        label="最终控制目标 · 加香出口水分"
        value={
          rec.std ? (
            <span>
              <span className="font-medium">{fmt2(rec.std.goal)}%</span>（{fmt2(rec.std.low)}~{fmt2(rec.std.high)}）
              <span className="ml-1 text-xs text-gray-400">{rec.std.ver}</span>
            </span>
          ) : (
            <span className="text-gray-400">标准缺失</span>
          )
        }
      />
      <InfoField label="烘丝出口水分允许范围" value={`${fmt2(DRYING_RANGE.low)}% ~ ${fmt2(DRYING_RANGE.high)}%`} />
    </div>
  );
}

export function RecommendCard({
  rec,
  updating,
  brand,
  onShowBasis,
}: {
  rec: NextRecommendation;
  updating: boolean; // 输入变化自动重算中：状态显示"更新中"，旧版本降透明度
  brand: string;
  onShowBasis: () => void;
}) {
  const generated = rec.status === "已生成" && rec.value !== undefined;
  // 下一批次与筛选牌号不一致：推荐仍完整展示，仅附一行提示（历史区按所选牌号）
  const brandNote =
    !generated || brand === rec.batch?.brand
      ? null
      : `当前筛选「${brand}」：下一批次为「${rec.batch!.brand}」牌号，历史图表与推荐记录仍按「${brand}」展示。`;

  return (
    <Card
      title="下一批次推荐"
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
      <div className={updating ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {/* 状态：已生成不展示标签；其余状态 / 更新中保留颜色标签 */}
        <div className="flex flex-wrap items-center gap-2">
          {updating ? <StatusTag text="更新中" /> : !generated && <StatusTag text={rec.status} />}
          {updating && (
            <span className="text-xs text-gray-400">输入变化，正在按最新数据重算，旧版本仅保留在推荐记录中</span>
          )}
        </div>
        {brandNote && <p className="mt-2 text-xs text-gray-400">{brandNote}</p>}

        {generated ? (
          <div className="mt-4 flex flex-col gap-5 lg:flex-row">
            {/* 核心建议：大号蓝色推荐值 */}
            <div className="lg:w-[36%] lg:border-r lg:border-gray-100 lg:pr-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-primary-600">{fmt2(rec.value)}</span>
                <span className="text-lg font-semibold text-primary-600">%</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">烘丝出口水分推荐值</p>
              <p className="mt-3 text-sm text-gray-600">
                叶丝柜入口水分（模型推算）：
                <span className="font-medium text-primary-700">{fmt2(rec.inletMoisture)}%</span>
              </p>
              {rec.confidence !== undefined && (
                <p className="mt-1 text-sm text-gray-600">
                  模型置信度：<span className="font-medium text-gray-800">{(rec.confidence * 100).toFixed(1)}%</span>
                </p>
              )}
              {rec.generatedAt && (
                <p className="mt-1 text-xs text-gray-400">推荐生成时间 {rec.generatedAt}</p>
              )}
            </div>
            <div className="flex-1">
              <BatchInfo rec={rec} />
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {rec.status === "数据不足" ? (
              <p className="text-sm leading-relaxed text-gray-700">
                历史数据不足，当前 {rec.validCount}/10 批
                {rec.batch ? `（${rec.batch.brand} · ${rec.batch.batch}）` : ""}；补齐后自动计算。
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
