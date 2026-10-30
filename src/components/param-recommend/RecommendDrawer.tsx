"use client";

// 批次详情抽屉：图表点位点击 → 当时锁定的推荐版本、目标标准与实际回填结果（保留当时快照口径）。
import { Drawer } from "@/components/ui/Drawer";
import { StatusTag } from "./StatusTag";
import {
  DRYING_RANGE,
  absDiffOf,
  fmt2,
  resultOf,
  stdOf,
  type BatchRecord,
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

export function RecommendDrawer({
  target,
  onClose,
}: {
  target: BatchRecord | null;
  onClose: () => void;
}) {
  const batch = target;

  return (
    <Drawer open={target !== null} onClose={onClose} title="批次详情" width={520}>
      {batch && (
        <div className="space-y-5">
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
        </div>
      )}
    </Drawer>
  );
}
