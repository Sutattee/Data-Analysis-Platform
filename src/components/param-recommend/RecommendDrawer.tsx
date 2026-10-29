"use client";

// 推荐依据抽屉：推荐卡「查看依据」（target="next"）→ 工单信息 / 目标与推算结果 / 历史依据与生成信息 三区；
// 图表点击 / 记录「详情」（target=批次记录）→ 当时锁定的推荐版本、目标标准与实际回填结果（保留当时快照口径）。
import { Drawer } from "@/components/ui/Drawer";
import { StatusTag } from "./StatusTag";
import {
  DRYING_RANGE,
  absDiffOf,
  fmt2,
  resultOf,
  stdOf,
  validHistoryOf,
  type BatchRecord,
  type NextRecommendation,
} from "@/lib/mock-data/param-recommend";

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="break-words text-sm text-gray-800">{value ?? "-"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-bold text-gray-900">{title}</h4>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

/** 未生成有效推荐时的原因文案（展示在「目标与推算结果」区） */
function recHintOf(rec: NextRecommendation): string {
  return rec.status === "数据不足"
    ? `历史数据不足，当前 ${rec.validCount} 批，补齐后自动计算`
    : rec.status === "超出工艺范围"
      ? "未生成有效推荐：超出工艺范围"
      : rec.status === "生成失败"
        ? "推荐生成失败，后台自动重试"
        : "暂无待生产批次";
}

export function RecommendDrawer({
  target,
  rec,
  onClose,
}: {
  target: BatchRecord | "next" | null;
  rec: NextRecommendation | null; // 当前产线的下一批次推荐（target="next" 时使用）
  onClose: () => void;
}) {
  const isNext = target === "next";
  const batch = isNext ? rec?.batch : target;

  return (
    <Drawer open={target !== null} onClose={onClose} title={isNext ? "推荐依据" : "批次详情"} width={520}>
      {target === "next" && !batch && (
        <p className="py-8 text-center text-sm text-gray-400">
          当前产线暂无待生产批次，暂无推荐依据；新工单排产后自动生成。
        </p>
      )}
      {batch && (
        <div className="space-y-5">
          {isNext && rec ? (
            <>
              {/* 工单信息 */}
              <Section title="工单信息">
                <Field label="工单号" value={batch.workOrder} />
                <Field label="下一批次" value={batch.batch} />
                <Field label="牌号" value={batch.brand} />
                <Field label="产线" value={batch.line} />
              </Section>

              {/* 目标与推算结果：加香合格标准 + 成品水分允许范围 + 建议值 + 置信度 */}
              <Section title="目标与推算结果">
                {rec.std ? (
                  <Field label="加香出口水分合格范围" value={`${fmt2(rec.std.low)}%～${fmt2(rec.std.high)}%`} />
                ) : (
                  <Field label="加香出口水分标准" value={<span className="text-gray-400">标准缺失</span>} />
                )}
                <Field label="成品水分允许范围" value={`${fmt2(DRYING_RANGE.low)}%～${fmt2(DRYING_RANGE.high)}%`} />
                {rec.status === "已生成" && rec.value !== undefined ? (
                  <>
                    <Field
                      label="加香出口水分建议值"
                      value={
                        <span className="font-semibold text-primary-600">{fmt2(rec.value)}%</span>
                      }
                    />
                    {rec.confidence !== undefined && (
                      <Field label="模型置信度" value={`${(rec.confidence * 100).toFixed(1)}%`} />
                    )}
                  </>
                ) : (
                  <Field label="推算结果" value={<span className="text-gray-400">{recHintOf(rec)}</span>} />
                )}
              </Section>

              {/* 历史依据与生成信息 */}
              {(() => {
                const valid = validHistoryOf(batch.line, batch.brand);
                return (
                  <Section title="历史依据与生成信息">
                    <Field label="参与计算的历史批次" value="同产线同牌号近10个有效批次（不足10批时基于现有批次计算）" />
                    <Field label="有效批次" value={`${valid.length}批`} />
                    {valid.length > 0 && (
                      <Field label="批次范围" value={`${valid[0].batch}～${valid[valid.length - 1].batch}`} />
                    )}
                    <Field label="推荐生成时间" value={rec.generatedAt ?? "-"} />
                    <Field label="模型版本" value={rec.modelVer} />
                  </Section>
                );
              })()}
            </>
          ) : (
            <>
              {/* 历史批次：锁定推荐 + 实际回填 */}
              <Section title="工单信息">
                <Field label="工单号" value={batch.workOrder} />
                <Field label="批次" value={batch.batch} />
                <Field label="牌号" value={batch.brand} />
                <Field label="产线" value={batch.line} />
                <Field label="计划开工" value={batch.planStart} />
                <Field label="实际开工" value={batch.startAt ?? "-"} />
              </Section>

              {(() => {
                const std = stdOf(batch.brand, (batch.startAt ?? batch.planStart).slice(0, 10));
                return (
                  <Section title="目标与范围（生产时有效标准）">
                    {std ? (
                      <>
                        <Field label="加香出口水分目标" value={`${fmt2(std.goal)}%`} />
                        <Field label="加香合格范围" value={`${fmt2(std.low)}% ~ ${fmt2(std.high)}%`} />
                        <Field label="标准版本" value={`${std.brand} ${std.ver}`} />
                      </>
                    ) : (
                      <Field label="加香出口水分标准" value={<span className="text-gray-400">标准缺失</span>} />
                    )}
                    <Field label="烘丝出口水分允许范围" value={`${fmt2(DRYING_RANGE.low)}% ~ ${fmt2(DRYING_RANGE.high)}%`} />
                  </Section>
                );
              })()}

              <Section title="推荐与锁定">
                <Field
                  label="烘丝出口水分建议值"
                  value={
                    batch.dryingAdvice !== null ? (
                      <span className="font-semibold text-primary-600">{fmt2(batch.dryingAdvice)}%</span>
                    ) : (
                      <span className="text-gray-400">{batch.adviceReason ?? "无有效推荐"}</span>
                    )
                  }
                />
                <Field label="推荐版本" value={batch.adviceVersion ?? "-"} />
                <Field label="推荐生成时间" value={batch.adviceGeneratedAt ?? "-"} />
              </Section>

              <Section title="实际回填">
                <Field label="烘丝出口水分实际值" value={batch.dryingActual !== null ? `${fmt2(batch.dryingActual)}%` : "待回传"} />
                <Field label="绝对差" value={absDiffOf(batch) !== null ? `${fmt2(absDiffOf(batch))} pct` : "-"} />
                <Field
                  label="加香出口水分实际值"
                  value={
                    batch.flavorActual !== null ? (
                      <span>
                        {fmt2(batch.flavorActual)}%
                        {batch.flavorLink === "待核对" && <span className="ml-1 text-xs text-amber-600">（待核对）</span>}
                      </span>
                    ) : (
                      "待回传"
                    )
                  }
                />
                <Field label="物料追溯关联" value={batch.flavorLink} />
                <Field label="结果状态" value={<StatusTag text={resultOf(batch)} />} />
              </Section>

              <p className="text-xs leading-relaxed text-gray-400">
                说明：绝对差 = |实际值 − 建议值|，表示两者接近程度，不能作为模型预测误差或准确率；仅凭实际值接近建议值，也不能判断现场已采用推荐。
              </p>
            </>
          )}
        </div>
      )}
    </Drawer>
  );
}
