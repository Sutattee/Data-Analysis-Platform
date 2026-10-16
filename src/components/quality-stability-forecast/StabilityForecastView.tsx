"use client";

// 稳定性预测主视图：对象信息（指标 + 机台，机台含「全部」综合曲线）→ 摘要（实际值/预测最高等级/等级变化预测/窗口/更新时间/置信度）
// → 左列（预测趋势 + 来源工序参数）右列（AI 解读 + 风险来源 + 来源工序分布）；切换指标 / 机台后全量联动
import { useState } from "react";
import { Card } from "@/components/ui/Card";
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
  levelChangeOf,
  maxFutureLevelOf,
  metricMachinesOf,
  metricOf,
  paramDirection,
  sourceBreakdownOf,
  stabilityForecastOf,
  statusOf,
  windowTextOf,
  type TrendPoint,
} from "@/lib/mock-data/quality-stability-forecast";
import { MetricTrendChart } from "./MetricTrendChart";
import { StabilityAnomalyDrawer } from "./StabilityAnomalyDrawer";
import { StabilityContributionChart } from "./StabilityContributionChart";

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

// 摘要单项
function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-800">{children}</div>
    </div>
  );
}

export function StabilityForecastView() {
  // 默认选中首个启用预测模型的指标；机台默认「全部」（综合曲线），可切换单机台
  const [code, setCode] = useState(STABILITY_METRICS[0].code);
  const [machine, setMachine] = useState("全部");
  // 点击趋势图等级标记点（升级点 / 触发等级的基准点）→ 匹配告警记录，滑出异常详情抽屉
  const [anomalyAlert, setAnomalyAlert] = useState<AlertRecord | null>(null);

  const metric = metricOf(code)!;
  const machineText = machine === "全部" ? "全部机台" : machine;
  const forecast = machine === "全部" ? combinedForecastOf(code) : stabilityForecastOf(code, machine);
  const machines = metricMachinesOf(code);

  // 切换指标：机台重置为「全部」，全量联动
  function changeCode(v: string) {
    setCode(v);
    setMachine("全部");
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

  // 以点击点位的数值覆写告警记录展示字段（等级 / 告警值 / 基准 / 偏离 / 批次 / 班次 / 班组 / 牌号 /
  // 预测窗口等与点位一致；点位在预测曲线上 → 告警类型 = 预测风险，基准点为最新实测值 →
  // 实测异常、告警值「当前值」且不展示预测窗口）；
  // 策略、原因、建议、触发时间等无法由点位派生的字段保留告警记录原文
  function pointAlertOf(
    rec: AlertRecord,
    info: { level: AlertRecord["level"]; label: string; value: number; point?: TrendPoint; measured?: boolean }
  ): AlertRecord {
    const fmt = (v: number) => v.toFixed(metric.decimals);
    const rule = metric.rule;
    // 基准 = 管控值边界（最轻级，与图上管控值线一致）；偏离 = 越出侧边界的差值与比例
    let baselineText = rec.baselineLabel;
    let delta: number | null = null;
    let baseAbs = 0;
    if (rule) {
      const lightest = rule.levels[rule.levels.length - 1];
      if (rule.op === "between" && lightest.low !== undefined && lightest.high !== undefined) {
        baselineText = `下限 ${fmt(lightest.low)}${metric.unit}｜上限 ${fmt(lightest.high)}${metric.unit}`;
        if (info.value > lightest.high) {
          delta = info.value - lightest.high;
          baseAbs = Math.abs(lightest.high);
        } else if (info.value < lightest.low) {
          delta = info.value - lightest.low;
          baseAbs = Math.abs(lightest.low);
        }
      } else if (rule.op !== "between" && lightest.threshold !== undefined) {
        const t = lightest.threshold;
        baselineText = `${rule.op === ">=" ? "上限" : "下限"} ${fmt(t)}${metric.unit}`;
        delta = info.value - t;
        baseAbs = Math.abs(t);
      }
    }
    return {
      ...rec,
      level: info.level,
      type: info.measured ? "当前异常" : "预测风险",
      objectName: machineText,
      valueLabel: `${info.measured ? "当前值" : "预测值"}${fmt(info.value)}${metric.unit}`,
      baselineLabel: baselineText,
      deviationValue: delta === null ? "-" : `${delta >= 0 ? "+" : "-"}${fmt(Math.abs(delta))}${metric.unit}`,
      deviationRate:
        delta === null || baseAbs < 1e-9 ? "-" : `${delta >= 0 ? "+" : "-"}${Math.round((Math.abs(delta) / baseAbs) * 1000) / 10}%`,
      batch: info.point?.batch ? `第 ${info.point.batch} 批` : undefined,
      shiftLabel: info.point?.shift, // 班次取点位上下文（批/班周期有、月周期无），不沿用原记录
      shift: info.point?.shiftGroup,
      brand: info.point?.brand,
      forecastWindow: info.measured ? undefined : rec.forecastWindow ?? windowTextOf(metric.cycle),
      consecutiveShifts: undefined,
    };
  }

  // 数据不足 / 预测失败：布局与正常态一致，左 = 占位说明，右 = AI 解读提示
  if (!forecast || forecast.insufficient || forecast.failed) {
    const failed = forecast?.failed === true;
    const reason = forecast?.reason ?? `未找到 ${metric.name}（${code}）在 ${machineText} 上的预测结果，请重新选择机台。`;
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
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">机台</span>
              <select className={selectCls} value={machine} onChange={(e) => setMachine(e.target.value)}>
                <option value="全部">全部</option>
                {machines.map((m) => (
                  <option key={m.machine} value={m.machine}>
                    {m.machine}｜{m.tag.text}
                  </option>
                ))}
              </select>
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
              <h3 className="text-sm font-semibold text-gray-800">AI 风险解读</h3>
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
  const ai = aiInterpretation(forecast, code, machineText);
  // 最新实测值配色：等级色 / 正常绿 / 无法判定灰
  const valueCls = status === "—" ? "text-gray-400" : status === "正常" ? "text-green-600" : LEVEL_TEXT_CLS[status];

  return (
    <div className="space-y-4">
      {/* 对象信息：指标 + 机台选择（选项标签 = 预测最高等级）；机台「全部」= 有效机台逐点均值的综合曲线 */}
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
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">机台</span>
            <select className={selectCls} value={machine} onChange={(e) => setMachine(e.target.value)}>
              <option value="全部">全部</option>
              {machines.map((m) => (
                <option key={m.machine} value={m.machine}>
                  {m.machine}｜{m.tag.text}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {/* 预测摘要：最新实际值 / 预测最高等级 / 等级变化预测 / 预测窗口 / 更新时间 / 置信度 */}
      <Card>
        <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
          <SummaryItem label="最新实际值">
            <span className={`text-2xl font-bold ${valueCls}`}>
              {forecast.base.toFixed(metric.decimals)}
              {metric.unit}
            </span>
            <span className={`ml-1 text-sm font-medium ${valueCls}`}>｜{status}</span>
          </SummaryItem>
          <SummaryItem label="预测最高等级">
            {!metric.rule ? (
              <span className="text-gray-400">未配置等级规则</span>
            ) : maxLv === null ? (
              <span className="text-green-600">正常</span>
            ) : (
              <span className={LEVEL_TEXT_CLS[maxLv]}>{maxLv}</span>
            )}
          </SummaryItem>
          <SummaryItem label="等级变化预测">
            {/* 升级按目标等级着色 / 同级持续按当前等级着色 / 降级为好转（绿） / 其余灰 */}
            <span
              className={
                change.kind === "upgrade" && change.toLevel !== undefined
                  ? LEVEL_TEXT_CLS[change.toLevel]
                  : change.kind === "hold" && status !== "—" && status !== "正常"
                    ? LEVEL_TEXT_CLS[status]
                    : change.kind === "degrade"
                      ? "text-green-600"
                      : "text-gray-800"
              }
            >
              {change.text}
            </span>
          </SummaryItem>
          <SummaryItem label="预测窗口">{windowTextOf(metric.cycle)}</SummaryItem>
          <SummaryItem label="预测更新时间">{forecast.updatedAt}</SummaryItem>
          <SummaryItem label="模型置信度">
            {forecast.confidence === null ? <span className="text-gray-400">—</span> : `${Math.round(forecast.confidence * 100)}%`}
          </SummaryItem>
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

          {/* 来源工序参数：指标卡片（数值 + 参考范围或基准 + 偏差方向合并；悬浮提示采集方式） */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-800">来源工序参数</h3>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
              {metric.params.map((def) => {
                const p = forecast.params.find((x) => x.key === def.key)!;
                const { dir, deviation, rangeText } = paramDirection(p);
                const devCls =
                  dir === "up" ? "text-red-500" : dir === "down" ? "text-blue-500" : dir === "in" ? "text-gray-400" : "text-gray-300";
                const devText = dir === "up" ? `${deviation} ↑` : dir === "down" ? `${deviation} ↓` : dir === "in" ? `${deviation} →` : "—";
                return (
                  <div key={def.key} className="rounded-lg border border-gray-100 bg-gray-50/60 px-3.5 py-3" title={`采集方式：${def.tip}`}>
                    <div className="text-xs text-gray-500">{def.name}</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      {p.value === null ? (
                        <span className="text-xl font-bold text-gray-300">—</span>
                      ) : (
                        <>
                          <span className="text-xl font-bold text-gray-900">{p.value}</span>
                          <span className="text-xs text-gray-400">{def.unit}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-gray-400">{rangeText}</span>
                      <span className={`font-medium ${devCls}`}>{devText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* AI 风险解读：三段带主题（风险概况 / 参数关注 / 核查重点），与预测结果同步更新 */}
          <Card>
            <div className="mb-2.5 flex items-center gap-1.5">
              <span>🤖</span>
              <h3 className="text-sm font-semibold text-gray-800">AI 风险解读</h3>
            </div>
            <div className="space-y-1.5 text-xs leading-relaxed text-gray-600">
              {ai.map((s, i) => (
                <p key={i}>
                  <span className="font-medium text-gray-700">{s.topic}：</span>
                  {s.text}
                </p>
              ))}
            </div>
          </Card>

          {/* 风险来源：仅增险因素按占比降序；解释目标 = 沿等级规则方向最不利预测点 */}
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

          {/* 来源工序分布：按来源占比降序 */}
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
        </div>
      </div>

      {/* 异常详情抽屉（点击趋势图等级标记点：升级点 / 触发等级的基准点） */}
      <StabilityAnomalyDrawer record={anomalyAlert} onClose={() => setAnomalyAlert(null)} />
    </div>
  );
}
