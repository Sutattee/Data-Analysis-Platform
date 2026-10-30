"use client";

// 异常详情抽屉（点击实测趋势图异常点滑出）：字段与排版对齐稳定性预测页的异常详情抽屉
// （StabilityAnomalyDrawer，Section/Field 同构）。核心异常数据取监测记录与管控判定口径；
// 「原因与处置建议」合并展示两段（原因 → 处置建议），AI 原因标注生成方式；
// 判定依据展示告警策略名称（蓝色可点击，跳告警策略详情）/ 触发条件 / 连续同向偏离
// （策略优先取告警策略档案中含该指标条件的策略，未覆盖的指标按等级规则生成同构文案）；
// 底部「查看告警详情」按指标名匹配工艺质量域最新一条实测异常记录跳详情，无匹配跳列表。
import { useRouter } from "next/navigation";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";
import { formatCondition, getAlertStrategies } from "@/lib/mock-data/alert-strategies";
import {
  causeOfDetail,
  consecutiveExceedOf,
  processOfDetail,
  suggestionOfDetail,
  type MonitorRecord,
  type ProcessDetailMetric,
} from "@/lib/mock-data/process-control-detail";

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

// 统计周期 → 连续同向偏离的计量词（5个批次 / 3个班次 / 2天 / 2个月）
const CYCLE_WORD: Record<ProcessDetailMetric["cycle"], string> = {
  批: "批次",
  班: "班次",
  日: "天",
  月: "个月",
};

export function AnomalyPointDrawer({
  metric,
  record,
  onClose,
}: {
  metric: ProcessDetailMetric;
  record: MonitorRecord | null;
  onClose: () => void;
}) {
  const router = useRouter();

  const fmt = (v: number) => `${v.toFixed(metric.decimals)}${metric.unit}`;
  // 来源工序（结果类指标 QC-10/11 无 → 不展示）
  const process = processOfDetail(metric);

  // 基准 / 阈值与越界口径：越出侧边界 = 管控值（与记录等级判定同源）
  const { upper, lower } = metric.control;
  const baselineText =
    upper !== undefined && lower !== undefined
      ? `上限≤${fmt(upper)}｜下限≥${fmt(lower)}`
      : upper !== undefined
        ? `上限≤${fmt(upper)}`
        : lower !== undefined
          ? `下限≥${fmt(lower)}`
          : metric.control.text;
  let deviation: number | null = null;
  let deviationDir: "上限" | "下限" | null = null;
  if (record) {
    if (upper !== undefined && record.value > upper) {
      deviation = record.value - upper;
      deviationDir = "上限";
    } else if (lower !== undefined && record.value < lower) {
      deviation = lower - record.value;
      deviationDir = "下限";
    }
  }
  // 超出量：越出侧边界的绝对差（方向词；% 指标以 pct 计，如 超上限0.35pct）
  const exceedUnit = metric.unit === "%" ? "pct" : metric.unit;
  const deviationText =
    deviation === null || deviationDir === null
      ? "-"
      : `${deviationDir === "上限" ? "超上限" : "低于下限"}${deviation.toFixed(metric.decimals)}${exceedUnit}`;

  // 判定依据：优先取告警策略档案中含该指标条件的策略（可点击跳策略详情）；
  // 未覆盖的指标按等级规则最轻级生成同构文案（纯文本，不跳转）
  const matched = getAlertStrategies().find((s) => s.conditions.some((c) => c.metric === metric.name));
  const matchedCond = matched?.conditions.find((c) => c.metric === metric.name);
  const lightest = metric.rule ? metric.rule.levels[metric.rule.levels.length - 1] : undefined;
  const basis = matched && matchedCond
    ? {
        id: matched.id as string | null,
        name: matched.name,
        condition: formatCondition(matchedCond),
      }
    : {
        id: null as string | null,
        name: `${metric.name}异常告警策略`,
        condition: lightest?.threshold !== undefined
          ? `${metric.name} ${metric.rule?.op === ">=" ? ">" : "<"} ${
              metric.rule?.op === ">=" ? "上限" : "下限"
            }${lightest.threshold.toFixed(metric.decimals)}${metric.unit}`
          : metric.control.text,
      };

  // 连续同向偏离：从点击单元向前连续越管控值（同向）的统计单元数
  const consecutive = record ? consecutiveExceedOf(metric.id, record) : 0;

  const cause = record ? causeOfDetail(metric.id) : "";

  // 查看告警详情：按指标名匹配工艺质量域最新一条实测异常记录，跳告警详情页；无匹配跳列表
  function gotoAlertRecord() {
    const rec = ALERT_RECORDS.find(
      (r) => r.domain === "工艺质量" && r.metricName === metric.name && r.type === "当前异常"
    );
    router.push(rec ? `/quality/alert/records/${rec.id}` : "/quality/alert/records");
  }

  return (
    <Drawer open={record !== null} onClose={onClose} title="异常详情" width={520}
      footer={
        <div className="flex justify-end">
          <Button onClick={gotoAlertRecord}>查看告警详情</Button>
        </div>
      }
    >
      {record && (
        <div className="space-y-5">
          {/* 指标名称 */}
          <p className="text-sm text-gray-500">{metric.name}</p>

          {/* 核心异常数据 */}
          <Section title="核心异常数据">
            <Field label="告警等级" value={record.level ? <AlertLevelBadge level={record.level} /> : "-"} />
            <Field label="告警类型" value="实测异常" />
            <Field label="业务域" value="工艺质量" />
            <Field label="批次" value={record.batch} />
            <Field label="班次" value={record.shiftType ? record.label : "-"} />
            <Field label="班组" value={record.shiftGroup ?? "-"} />
            <Field label="牌号" value={record.brand} />
            {process && <Field label="工序" value={process} />}
            <Field label="告警触发时间" value={record.time} />
            <Field label="告警值" value={fmt(record.value)} />
            <Field label="基准 / 阈值" value={baselineText} />
            <Field label="超出量" value={deviationText} />
          </Section>

          {/* 原因与处置建议（两段式：原因 → 处置建议；AI 原因标注生成方式） */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500">原因与处置建议</h4>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
              原因：{cause || "当前数据不足，暂无法确定异常原因"}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-700">
              处置建议：{suggestionOfDetail(metric.id)}
            </p>
            <p className="mt-2 text-xs text-gray-400">原因由 AI 分析数据自动生成</p>
          </div>

          {/* 判定依据：策略名称蓝色可点击（跳告警策略详情） */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500">判定依据</h4>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">告警策略名称</span>
                {basis.id ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/quality/alert/management/${basis.id}/edit`)}
                    className="break-words text-left text-sm text-primary-600 transition-colors hover:text-primary-700"
                  >
                    {basis.name}
                  </button>
                ) : (
                  <span className="break-words text-sm text-gray-800">{basis.name}</span>
                )}
              </div>
              <Field label="触发条件" value={basis.condition} />
              <Field label="连续同向偏离" value={consecutive > 0 ? `${consecutive}个${CYCLE_WORD[metric.cycle]}` : "-"} />
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
