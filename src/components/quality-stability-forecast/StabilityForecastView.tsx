"use client";

// 稳定性预测主视图：对象信息（仅指标筛选；机台不作筛选条件，由工作台深链 ?machine= 指定，
// 默认「全部」综合曲线）→ 预测概况（左未来结论 / 右窗口预测极值：最大预测值 + 超上限·超下限 + 管控值，
// 辅助字段收进预测详情抽屉）→ 左列（预测趋势 + 来源工序参数）右列（智能风险解读 + 风险来源 + 来源工序分布）；解读区默认收起：
// 点击「智能解读」后按 解读文字逐字 → 来源参数 → 风险来源 → 来源分布 的顺序流式生成，切换输入后重置回按钮态。
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { StreamText } from "@/components/ui/StreamText";
import { WarningIcon } from "@/components/ui/WarningIcon";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import { SourceBreakdownChart } from "@/components/quality-forecast/RiskSourceCharts";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";
import { QUALITY_ALERT_METRICS } from "@/lib/mock-data/quality-alerts";
import type { AlertRecord } from "@/types";
import {
  LEVEL_TEXT_CLS,
  STABILITY_METRICS,
  aiInterpretation,
  combinedForecastOf,
  contributionsOf,
  exceedUnitOf,
  levelChangeOf,
  maxFutureLevelOf,
  metricMachinesOf,
  metricOf,
  paramDirection,
  peakOfForecast,
  sourceBreakdownOf,
  stabilityForecastOf,
  statusOf,
  windowTextOf,
  type TrendPoint,
} from "@/lib/mock-data/quality-stability-forecast";
import { MetricTrendChart } from "./MetricTrendChart";
import { StabilityAnomalyDrawer } from "./StabilityAnomalyDrawer";
import { StabilityContributionChart } from "./StabilityContributionChart";

// 摘要单项
function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-800">{children}</div>
    </div>
  );
}

// 延迟挂载：到时才渲染子节点（智能解读流式编排用；图表卡片延迟出现，挂载时播放自带入场生长动画）
function Delayed({ delay, children }: { delay: number; children: ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!show) return null;
  return <>{children}</>;
}

export function StabilityForecastView() {
  const searchParams = useSearchParams();
  // 深链初始选中（?metric=&machine=，来自工作台「预测详情」）：metric 须为已配置指标、
  // machine 须属于该指标机台（含「全部」），任一无效则回退默认；无参数时行为不变
  const [initial] = useState(() => {
    const m = searchParams.get("metric");
    const metric =
      m && STABILITY_METRICS.some((x) => x.code === m) ? m : STABILITY_METRICS[0].code;
    const p = searchParams.get("machine");
    const machine =
      p && metricMachinesOf(metric).some((x) => x.machine === p) ? p : "全部";
    return { metric, machine };
  });
  const [code, setCode] = useState(initial.metric);
  const [machine, setMachine] = useState(initial.machine);
  // 点击趋势图等级标记点（升级点 / 触发等级的基准点）→ 匹配告警记录，滑出异常详情抽屉
  const [anomalyAlert, setAnomalyAlert] = useState<AlertRecord | null>(null);
  // 智能解读：进入页面不展示解读区（AI 解读 / 风险来源 / 来源分布 / 来源工序参数），点击按钮后流式生成
  const [interpreting, setInterpreting] = useState(false);
  // 预测详情抽屉：收纳辅助字段（指标名称 / 等级变化 / 管控值 / 置信度 / 更新时间等），默认不展开
  const [detailOpen, setDetailOpen] = useState(false);

  const metric = metricOf(code)!;
  const machineText = machine === "全部" ? "全部机台" : machine;
  const forecast = machine === "全部" ? combinedForecastOf(code) : stabilityForecastOf(code, machine);

  // 切换指标：机台重置为「全部」（深链机台随指标失效），全量联动；解读区收起回到按钮态
  function changeCode(v: string) {
    setCode(v);
    setMachine("全部");
    setInterpreting(false);
  }

  // 升级点/告警基准点点击 → 告警记录匹配（指标 + 机台 + 等级，逐级放宽），再按点位数值覆写展示字段后
  // 滑出异常详情抽屉。告警配置与预测页的指标命名存在差异（如 SF07「烟支单支克重偏差(毫克)」/
  // SF09「中支烟硬度变异系数」），统一按 sfCode 映射到告警侧指标名再匹配，保证各指标点击均有
  // 记录命中；「全部机台」综合曲线不按机台过滤，直接取该指标最新一条记录。
  function openAnomalyDrawer(info: {
    level: AlertRecord["level"];
    label: string;
    value: number;
    point?: TrendPoint;
    measured?: boolean;
  }) {
    const alertNames = new Set(QUALITY_ALERT_METRICS.filter((m) => m.sfCode === code).map((m) => m.name));
    const match = (r: AlertRecord) => r.domain === "工艺质量" && alertNames.has(r.metricName);
    const rec =
      (machine !== "全部"
        ? ALERT_RECORDS.find((r) => match(r) && r.objectName === machine && r.level === info.level)
        : undefined) ??
      (machine !== "全部" ? ALERT_RECORDS.find((r) => match(r) && r.objectName === machine) : undefined) ??
      ALERT_RECORDS.find(match);
    if (rec) setAnomalyAlert(pointAlertOf(rec, info));
  }

  // 以点击点位的数值覆写告警记录展示字段（等级 / 告警值 / 基准阈值 / 超出量 / 批次 / 班次 / 班组 /
  // 牌号 / 预测窗口等与点位一致；点位在预测曲线上 → 告警类型 = 预测风险，基准点为最新实测值 →
  // 实测异常、告警值「当前值」且不展示预测窗口）；
  // 策略、原因、建议、触发时间等无法由点位派生的字段保留告警记录原文
  function pointAlertOf(
    rec: AlertRecord,
    info: { level: AlertRecord["level"]; label: string; value: number; point?: TrendPoint; measured?: boolean }
  ): AlertRecord {
    const fmt = (v: number) => v.toFixed(metric.decimals);
    const rule = metric.rule;
    // 基准阈值 = 管控值边界（最轻级，与图上管控值线一致，如「上限≤2.00%」）；
    // 超出量 = 越出侧边界的绝对差（带方向符号，% 指标以 pct 计，如 +0.35pct）；未越界 = -
    let baselineText = rec.baselineLabel;
    let delta: number | null = null;
    if (rule) {
      const lightest = rule.levels[rule.levels.length - 1];
      if (rule.op === "between" && lightest.low !== undefined && lightest.high !== undefined) {
        baselineText = `下限≥${fmt(lightest.low)}${metric.unit}｜上限≤${fmt(lightest.high)}${metric.unit}`;
        if (info.value > lightest.high) {
          delta = info.value - lightest.high;
        } else if (info.value < lightest.low) {
          delta = info.value - lightest.low;
        }
      } else if (rule.op !== "between" && lightest.threshold !== undefined) {
        const t = lightest.threshold;
        baselineText = `${rule.op === ">=" ? "上限" : "下限"}${rule.op === ">=" ? "≤" : "≥"}${fmt(t)}${metric.unit}`;
        delta = info.value - t;
      }
    }
    return {
      ...rec,
      level: info.level,
      type: info.measured ? "当前异常" : "预测风险",
      objectName: machineText,
      valueLabel: `${info.measured ? "当前值" : "预测值"}${fmt(info.value)}${metric.unit}`,
      baselineLabel: baselineText,
      deviationValue: delta === null ? "-" : `${delta >= 0 ? "+" : "-"}${fmt(Math.abs(delta))}${exceedUnitOf(metric.unit)}`,
      batch: info.point?.batch ? `第 ${info.point.batch} 批` : undefined,
      shiftLabel: info.point?.shift, // 班次取点位上下文（批/班周期有、月/日周期无），不沿用原记录
      shift: info.point?.shiftGroup,
      brand: info.point?.brand,
      forecastWindow: info.measured ? undefined : rec.forecastWindow ?? windowTextOf(metric.cycle),
      consecutiveShifts: undefined,
    };
  }

  // 数据不足 / 预测失败：布局与正常态一致，左 = 占位说明，右 = AI 解读提示
  if (!forecast || forecast.insufficient || forecast.failed) {
    const failed = forecast?.failed === true;
    const reason = forecast?.reason ?? `未找到 ${metric.name}（${code}）在 ${machineText} 上的预测结果。`;
    return (
      <div className="space-y-4">
        {/* 对象信息行 */}
        <Card>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">指标</span>
              <div className="w-64">
                <SearchSelect
                  options={STABILITY_METRICS.map((m) => ({ value: m.code, label: m.name }))}
                  value={code}
                  onChange={changeCode}
                  placeholder="搜索..."
                />
              </div>
            </label>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          {/* 左：数据不足 / 预测失败占位 */}
          <Card className="xl:col-span-2">
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
              <span className="text-3xl">{failed ? "⚠️" : "📭"}</span>
              <p className="text-sm font-medium text-gray-700">{failed ? "本轮预测失败" : "数据不足，本轮预测未生成"}</p>
              <p className="max-w-md text-xs leading-relaxed text-gray-400">
                {machine} 的{reason}；恢复后将随下一轮滚动预测自动更新。
              </p>
            </div>
          </Card>

          {/* 右：AI 解读不生成，直接提示 */}
          <Card>
            <div className="mb-2.5 flex items-center gap-1.5">
              <span>🤖</span>
              <h3 className="text-sm font-semibold text-gray-800">智能风险解读</h3>
            </div>
            <p className="text-xs leading-relaxed text-gray-600">{failed ? "本轮预测失败，无法生成解读" : "数据不足，无法生成解读"}</p>
          </Card>
        </div>
      </div>
    );
  }

  const status = statusOf(forecast);
  const change = levelChangeOf(forecast);
  const maxLv = maxFutureLevelOf(forecast);
  const contributions = contributionsOf(forecast);
  // 无规则时贡献与分布均进入空状态
  const breakdown = metric.rule ? sourceBreakdownOf(forecast) : [];
  // 窗口最不利预测极值（卡片右侧 / 预测详情抽屉共用）：最大预测值 + 超上限·超下限超出量
  const peak = peakOfForecast(forecast);
  const ai = aiInterpretation(forecast, code, machineText);
  // 流式时序：解读各段逐字（8ms/字，段间停顿 200ms）→ 打完后延迟挂载来源参数 / 风险来源 / 来源分布
  const sectionDelays: number[] = [];
  ai.forEach((_, i) => {
    sectionDelays.push(i === 0 ? 0 : sectionDelays[i - 1] + ai[i - 1].text.length * 8 + 200);
  });
  const aiDoneAt =
    ai.length > 0 ? sectionDelays[ai.length - 1] + ai[ai.length - 1].text.length * 8 + 300 : 0;
  // 等级变化文案配色：升级按目标等级 / 同级持续按当前等级 / 降级为好转（绿）/ 其余深灰
  const changeCls =
    change.kind === "upgrade" && change.toLevel !== undefined
      ? LEVEL_TEXT_CLS[change.toLevel]
      : change.kind === "hold" && status !== "—" && status !== "正常"
        ? LEVEL_TEXT_CLS[status]
        : change.kind === "degrade"
          ? "text-green-600"
          : "text-gray-800";
  // 管控值文案（最轻级边界，与趋势图管控值线同口径）：区间 → 下限～上限；单边 → ≤/≥ 阈值（op ">=" 为超上限触发 → ≤）
  const rule = metric.rule;
  const lightest = rule?.levels[rule.levels.length - 1];
  const controlText = !rule
    ? "—"
    : rule.op === "between" && lightest?.low !== undefined && lightest?.high !== undefined
      ? `${lightest.low.toFixed(metric.decimals)}${metric.unit}～${lightest.high.toFixed(metric.decimals)}${metric.unit}`
      : rule.op !== "between" && lightest?.threshold !== undefined
        ? `${rule.op === ">=" ? "≤" : "≥"}${lightest.threshold.toFixed(metric.decimals)}${metric.unit}`
        : "—";

  return (
    <div className="space-y-4">
      {/* 对象信息：仅指标选择（选项标签 = 预测最高等级）；机台不作筛选，由深链指定（默认「全部」综合曲线） */}
      <Card>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">指标</span>
            <div className="w-64">
              <SearchSelect
                options={STABILITY_METRICS.map((m) => ({ value: m.code, label: m.name }))}
                value={code}
                onChange={changeCode}
                placeholder="搜索..."
              />
            </div>
          </label>
        </div>
      </Card>

      {/* 预测概况：标题 + 预测详情入口；正文左（未来预测结论）右（窗口预测极值）约 5:5，突出未来风险 */}
      <Card
        title="预测概况"
        divider={false}
        padding={false}
        headerRight={
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
          >
            预测详情
          </button>
        }
      >
        <div className="grid gap-6 px-5 pb-5 pt-2 lg:grid-cols-2">
          {/* 左：预测结论（窗口最高等级大字 + 升级时间；合并原预测窗口 / 最高等级 / 等级变化三字段） */}
          <div>
            <p className="text-xs text-gray-400">{metric.rule ? `${windowTextOf(metric.cycle)}最高等级` : "本轮预测"}</p>
            <div className="mt-2">
              {maxLv ? (
                <span className={`inline-flex items-center gap-1.5 text-2xl font-bold ${LEVEL_TEXT_CLS[maxLv]}`}>
                  <WarningIcon className="h-5 w-5" />
                  {maxLv}
                </span>
              ) : !metric.rule || change.kind === "unavailable" ? (
                <span className="text-2xl font-bold text-gray-400">—</span>
              ) : (
                <span className="text-2xl font-bold text-green-600">正常</span>
              )}
            </div>
            <div className="mt-2 text-sm font-medium">
              <span className={changeCls}>{change.text}</span>
            </div>
          </div>

          {/* 右：窗口预测极值（最大预测值深色大数字 + 超上限/超下限超出量 + 管控值小字） */}
          <div>
            <p className="text-xs text-gray-400">最大预测值</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums text-gray-900">
                {peak ? peak.value.toFixed(metric.decimals) : "—"}
              </span>
              <span className="text-sm font-medium text-gray-500">{metric.unit}</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              超{peak?.side ?? "上限"}：
              {peak && peak.over !== undefined
                ? `${peak.over.toFixed(metric.decimals)}${exceedUnitOf(metric.unit)}`
                : "—"}
            </p>
            <p className="mt-2 text-xs text-gray-400">管控值：{controlText}</p>
          </div>
        </div>
      </Card>

      {/* 左右布局：左 = 预测趋势 + 来源工序参数；右 = AI 解读 + 风险来源 + 工序分布（紧凑一屏） */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* 指标预测趋势 */}
          <Card>
            <h3 className="mb-1 text-sm font-semibold text-gray-800">{metric.name}预测趋势</h3>
            <MetricTrendChart forecast={forecast} onAnomalyClick={openAnomalyDrawer} />
          </Card>

          {/* 来源工序参数：智能解读生成后延迟出现，卡片阶梯浮现、内容逐字写入 */}
          {interpreting ? (
            <Delayed delay={aiDoneAt}>
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-gray-800">来源工序参数</h3>
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                  {metric.params.map((def, i) => {
                    const p = forecast.params.find((x) => x.key === def.key)!;
                    const { dir, deviation, rangeText } = paramDirection(p);
                    const devCls =
                      dir === "up" ? "text-red-500" : dir === "down" ? "text-blue-500" : dir === "in" ? "text-gray-400" : "text-gray-300";
                    const devText = dir === "up" ? `${deviation} ↑` : dir === "down" ? `${deviation} ↓` : dir === "in" ? `${deviation} →` : "—";
                    return (
                      <Delayed key={def.key} delay={i * 120}>
                        <div
                          className="h-full rounded-lg border border-gray-100 bg-gray-50/60 px-3.5 py-3"
                          title={`采集方式：${def.tip}`}
                        >
                          <div className="text-xs text-gray-500">
                            <StreamText text={def.name} />
                          </div>
                          <div className="mt-1 flex items-baseline gap-1">
                            {p.value === null ? (
                              <span className="text-xl font-bold text-gray-300">—</span>
                            ) : (
                              <>
                                <span className="text-xl font-bold tabular-nums text-gray-900">
                                  <StreamText text={String(p.value)} />
                                </span>
                                <span className="text-xs text-gray-400">{def.unit}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-xs">
                            <span className="text-gray-400">
                              <StreamText text={rangeText} />
                            </span>
                            <span className={`font-medium ${devCls}`}>
                              <StreamText text={devText} />
                            </span>
                          </div>
                        </div>
                      </Delayed>
                    );
                  })}
                </div>
              </Card>
            </Delayed>
          ) : null}
        </div>

        <div className="space-y-4">
          {/* 智能风险解读：三段带主题（风险概况 / 参数关注 / 核查重点）；默认收起，点击「智能解读」后逐字流式生成 */}
          <Card>
            <div className="mb-2.5 flex items-center gap-1.5">
              <span>🤖</span>
              <h3 className="text-sm font-semibold text-gray-800">智能风险解读</h3>
            </div>
            {!interpreting ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Button onClick={() => setInterpreting(true)}>智能解读</Button>
                <p className="max-w-[220px] text-center text-xs leading-5 text-gray-400">
                  点击后，AI 将实时生成风险解读、风险来源、来源分布与来源工序参数分析。
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs leading-relaxed text-gray-600">
                {ai.map((s, i) => (
                  <p key={s.topic}>
                    <span className="font-medium text-gray-700">{s.topic}：</span>
                    <StreamText text={s.text} delay={sectionDelays[i] ?? 0} caret />
                  </p>
                ))}
              </div>
            )}
          </Card>

          {/* 风险来源：仅增险因素按占比降序；解释目标 = 沿等级规则方向最不利预测点；解读生成后延迟挂载 */}
          {interpreting ? (
            <Delayed delay={aiDoneAt + 400}>
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">风险来源</h3>
                  <span className="text-xs text-gray-400">按贡献从高到低</span>
                </div>
                {!metric.rule ? (
                  <p className="text-xs text-gray-400">未配置等级规则，暂无贡献解释</p>
                ) : contributions.length === 0 ? (
                  <p className="text-xs text-gray-400">暂无增加风险的贡献因素</p>
                ) : (
                  <StabilityContributionChart contributions={contributions} unit={metric.unit} decimals={metric.decimals} />
                )}
              </Card>
            </Delayed>
          ) : null}

          {/* 来源工序分布：按来源占比降序；解读生成后延迟挂载 */}
          {interpreting ? (
            <Delayed delay={aiDoneAt + 1100}>
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">来源工序分布</h3>
                  <span className="text-xs text-gray-400">按贡献从高到低</span>
                </div>
                {breakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">暂无可用解释</p>
                ) : (
                  <SourceBreakdownChart breakdown={breakdown} />
                )}
              </Card>
            </Delayed>
          ) : null}
        </div>
      </div>

      {/* 预测详情抽屉：辅助字段收纳（默认不展开）；指标名称置首 */}
      <Drawer open={detailOpen} onClose={() => setDetailOpen(false)} title="预测详情" width={440}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <SummaryItem label="指标名称">{metric.name}</SummaryItem>
          <SummaryItem label="预测最高等级">
            {!metric.rule || change.kind === "unavailable" ? (
              <span className="text-gray-400">—</span>
            ) : maxLv === null ? (
              <span className="text-green-600">正常</span>
            ) : (
              <span className={LEVEL_TEXT_CLS[maxLv]}>{maxLv}</span>
            )}
          </SummaryItem>
          <SummaryItem label="等级变化预测">
            <span className={changeCls}>{change.text}</span>
          </SummaryItem>
          <SummaryItem label="最新实际值">
            {forecast.base.toFixed(metric.decimals)}
            {metric.unit}
          </SummaryItem>
          {/* 超出量：窗口极值相对管控值边界（超上限0.55 / 超上限1次 式）；未越界 — */}
          <SummaryItem label="超出量">
            {peak && peak.over !== undefined ? (
              `超${peak.side}${peak.over.toFixed(metric.decimals)}${exceedUnitOf(metric.unit)}`
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </SummaryItem>
          <SummaryItem label="管控值">{controlText}</SummaryItem>
          <SummaryItem label="预测窗口">{windowTextOf(metric.cycle)}</SummaryItem>
          <SummaryItem label="模型置信度">
            {forecast.confidence === null ? <span className="text-gray-400">—</span> : `${Math.round(forecast.confidence * 100)}%`}
          </SummaryItem>
          <SummaryItem label="预测更新时间">{forecast.updatedAt}</SummaryItem>
        </div>
      </Drawer>

      {/* 异常详情抽屉（点击趋势图等级标记点：升级点 / 触发等级的基准点） */}
      <StabilityAnomalyDrawer record={anomalyAlert} onClose={() => setAnomalyAlert(null)} />
    </div>
  );
}
