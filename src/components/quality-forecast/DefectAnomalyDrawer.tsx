"use client";

// 缺陷预测 · 异常详情抽屉（缺陷预测页趋势图点击等级标记点滑出：升级点 / 触发等级的基准批次点）：
// 布局对齐能源消耗板块的异常详情抽屉（Section/Field 同构），数据取自匹配的告警记录（AlertRecord）——
// 数值字段（等级 / 告警值 / 基准阈值 / 超出量 / 批次 / 班次 / 班组 / 牌号 / 工序）由视图按点击点位的
// 实际数值覆写，与点位保持一致；首行为缺陷名称；「原因与处置建议」合并展示
// （原因 → 处置建议两段），AI 原因标注「原因由 AI 分析数据自动生成」；
// 判定依据（策略名蓝色可点击跳告警策略详情；触发条件与超出量合并展示）；
// 底部「查看告警详情」跳告警记录详情页。
import { useRouter } from "next/navigation";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { alertStrategyIdFor, conditionWithExceed } from "@/lib/mock-data/alert-strategies";
import { TYPE_DISPLAY } from "@/lib/mock-data/quality-alerts";
import type { AlertRecord } from "@/types";

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
      <h4 className="mb-2 text-xs font-semibold text-gray-500">{title}</h4>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function DefectAnomalyDrawer({
  record,
  onClose,
}: {
  record: AlertRecord | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const hasCause = !!record?.causeSummary?.trim();
  // 判定依据策略跳转：档案名精确匹配 → 条件指标兜底 → null 纯文本不跳转
  const strategyId = record ? alertStrategyIdFor(record.strategyName, record.metricName) : null;

  return (
    <Drawer
      open={record !== null}
      onClose={onClose}
      title="异常详情"
      width={520}
      footer={
        record ? (
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/quality/alert/records/${record.id}`)}>查看告警详情</Button>
          </div>
        ) : undefined
      }
    >
      {record && (
        <div className="space-y-5">
          {/* 缺陷名称（视图已按当前缺陷覆写 record.metricName） */}
          <p className="text-sm text-gray-500">{record.metricName}</p>

          {/* 核心异常数据（数值字段由点击点位覆写，与趋势图一致） */}
          <Section title="核心异常数据">
            <Field label="告警等级" value={<AlertLevelBadge level={record.level} />} />
            <Field label="告警类型" value={TYPE_DISPLAY[record.type] ?? record.type} />
            <Field label="业务域" value={record.domain} />
            <Field label="批次" value={record.batch} />
            <Field label="班次" value={record.shiftLabel} />
            <Field label="班组" value={record.shift} />
            <Field label="牌号" value={record.brand} />
            <Field label="工序" value={record.process} />
            <Field label="告警触发时间" value={record.triggerTime} />
            <Field label="告警值" value={record.valueLabel} />
            <Field label="基准 / 阈值" value={record.baselineLabel} />
            {/* 超出量：越出管控值边界的绝对差（如 超上限0.4pct / 超下限0.4pct / 超上限30h）；未越界 - */}
            <Field label="超出量" value={record.deviationValue} />
          </Section>

          {/* 原因与处置建议（合并字段，两段式：原因 → 处置建议；AI 原因标注生成方式） */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500">原因与处置建议</h4>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
              原因：{hasCause ? record.causeSummary : "当前数据不足，暂无法确定异常原因"}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-700">
              处置建议：{record.suggestion ?? "-"}
            </p>
            {hasCause && <p className="mt-2 text-xs text-gray-400">原因由 AI 分析数据自动生成</p>}
          </div>

          {/* 判定依据（策略名蓝色可点击跳告警策略详情；触发条件与超出量合并为同一字段） */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500">判定依据</h4>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">告警策略名称</span>
                {strategyId ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/quality/alert/management/${strategyId}/edit`)}
                    className="break-words text-left text-sm text-primary-600 transition-colors hover:text-primary-700"
                  >
                    {record.strategyName}
                  </button>
                ) : (
                  <span className="break-words text-sm text-gray-800">{record.strategyName}</span>
                )}
              </div>
              <Field
                label="触发条件"
                value={conditionWithExceed(record.triggerCondition, record.deviationValue)}
              />
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
