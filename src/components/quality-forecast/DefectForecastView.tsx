"use client";

// 缺陷预测主视图：对象信息（缺陷 + 机台 + 生产上下文）→ 风险摘要 → 预测趋势 → 来源工序参数
// → AI 风险解读 → 风险来源 + 来源工序分布；切换缺陷 / 机台后全量联动；本期仅展示最新预测结果
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import { catalogOf } from "@/lib/mock-data/quality-defect";
import {
  FORECAST_DEFECTS,
  PARAM_GROUPS,
  aiInterpretation,
  contributionsOf,
  contextOf,
  etaOf,
  forecastMachinesOf,
  forecastOf,
  groupOf,
  levelOf,
  paramDirection,
  reducingFactorsOf,
  sourceBreakdownOf,
  topMachineOf,
} from "@/lib/mock-data/quality-defect-forecast";
import { RiskTrendChart } from "./RiskTrendChart";
import { ReducingFactors, RiskContributionChart, SourceBreakdownChart } from "./RiskSourceCharts";

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

// 只读带出项（当前批次 / 牌号 / 班组 / 班次 / 工序 / 部位）
function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

export function DefectForecastView() {
  // 默认选中首个支持预测的缺陷及其风险最高的有效机台
  const [code, setCode] = useState(FORECAST_DEFECTS[0].code);
  const [machine, setMachine] = useState(() => topMachineOf(FORECAST_DEFECTS[0].code));

  const defectName = catalogOf(code)?.name ?? code;
  const forecast = forecastOf(code, machine);
  const ctx = contextOf(code, machine);
  const machines = forecastMachinesOf(code);
  // 基准批次点（hist 末位，与趋势图基准批次同源）：顶部「当前批次 / 班次」取自该点，保证两处一致
  const basePoint = forecast?.hist[forecast.hist.length - 1];

  // 切换缺陷：机台重置为该缺陷风险最高的有效机台，全量联动
  function changeCode(v: string) {
    setCode(v);
    setMachine(topMachineOf(v));
  }

  // 数据不足（必需输入不满足模型要求）：整次预测标「数据不足」，布局与正常态一致：左 = 占位说明，右 = AI 解读提示
  if (!forecast || forecast.insufficient) {
    return (
      <div className="space-y-4">
        {/* 对象信息行 */}
        <Card>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">缺陷</span>
              <div className="w-56">
                <SearchSelect
                  options={FORECAST_DEFECTS.map((d) => ({ value: d.code, label: `${catalogOf(d.code)?.name ?? d.code}  ${d.code}` }))}
                  value={code}
                  onChange={changeCode}
                  placeholder="搜索..."
                />
              </div>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">机台</span>
              <select className={selectCls} value={machine} onChange={(e) => setMachine(e.target.value)}>
                {machines.map((m) => (
                  <option key={m.machine} value={m.machine}>
                    {m.machine}｜{m.insufficient ? "数据不足" : levelOf(m.score).label}
                  </option>
                ))}
              </select>
            </label>
            <span className="h-5 w-px bg-gray-100" />
            <ContextItem label="当前批次" value={basePoint?.label ?? ctx.batch} />
            <ContextItem label="牌号" value={ctx.brand} />
            <ContextItem label="班组" value={ctx.shift} />
            <ContextItem label="班次" value={basePoint?.shiftLabel ?? "—"} />
            <ContextItem label="工序" value={ctx.process} />
            <ContextItem label="部位" value={ctx.part} />
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          {/* 左：数据不足占位 */}
          <Card className="xl:col-span-2">
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-medium text-gray-700">数据不足，本轮预测未生成</p>
              <p className="max-w-md text-xs leading-relaxed text-gray-400">
                {machine} 的必需输入（车间环境测点数据）不满足模型要求，未生成有效风险评分与趋势；
                恢复数据采集后将随下一轮滚动预测自动更新。
              </p>
            </div>
          </Card>

          {/* 右：AI 解读不生成，直接提示 */}
          <Card>
            <div className="mb-2.5 flex items-center gap-1.5">
              <span>🤖</span>
              <h3 className="text-sm font-semibold text-gray-800">AI 风险解读</h3>
            </div>
            <p className="text-xs leading-relaxed text-gray-600">数据不足，无法生成解读</p>
          </Card>
        </div>
      </div>
    );
  }

  const level = levelOf(forecast.score);
  const contributions = contributionsOf(forecast);
  const reducing = reducingFactorsOf(forecast);
  const breakdown = sourceBreakdownOf(forecast);
  const aiTexts = aiInterpretation(forecast, code, machine);
  const group = PARAM_GROUPS[groupOf(code)];

  return (
    <div className="space-y-4">
      {/* 对象信息：缺陷 + 机台选择，批次 / 牌号 / 班组 / 班次 / 工序 / 部位自动带出（无则 —） */}
      <Card>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">缺陷</span>
            <div className="w-56">
              <SearchSelect
                options={FORECAST_DEFECTS.map((d) => ({ value: d.code, label: `${catalogOf(d.code)?.name ?? d.code}  ${d.code}` }))}
                value={code}
                onChange={changeCode}
                placeholder="搜索..."
              />
            </div>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">机台</span>
            <select className={selectCls} value={machine} onChange={(e) => setMachine(e.target.value)}>
              {machines.map((m) => (
                <option key={m.machine} value={m.machine}>
                  {m.machine}｜{m.insufficient ? "数据不足" : levelOf(m.score).label}
                </option>
              ))}
            </select>
          </label>
          <span className="h-5 w-px bg-gray-100" />
          <ContextItem label="当前批次" value={ctx.batch} />
          <ContextItem label="牌号" value={ctx.brand} />
          <ContextItem label="班组" value={ctx.shift} />
          <ContextItem label="工序" value={ctx.process} />
          <ContextItem label="部位" value={ctx.part} />
        </div>
      </Card>

      {/* 风险摘要：评分与趋势图基准批次点同口径 */}
      <Card>
        <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
          <SummaryItem label="当前风险评分">
            <span className={`text-2xl font-bold ${level.textCls}`}>{forecast.score.toFixed(2)}</span>
          </SummaryItem>
          <SummaryItem label="风险等级">
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${level.badgeCls}`}>
              {level.label}
            </span>
          </SummaryItem>
          <SummaryItem label="高风险预测">{etaOf(forecast)}</SummaryItem>
          <SummaryItem label="预测窗口">未来{forecast.windowBatches}个批次</SummaryItem>
          <SummaryItem label="预测更新时间">{forecast.updatedAt}</SummaryItem>
          <SummaryItem label="模型置信度">{Math.round(forecast.confidence * 100)}%</SummaryItem>
        </div>
      </Card>

      {/* 左右布局：左 = 趋势 + 来源工序参数；右 = AI 解读 + 风险来源 + 工序分布（紧凑一屏） */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* 风险预测趋势 */}
          <Card>
            <h3 className="mb-1 text-sm font-semibold text-gray-800">{defectName}风险预测趋势</h3>
            <RiskTrendChart forecast={forecast} />
          </Card>

          {/* 来源工序参数：指标卡片（数值 + 参考范围 + 偏差方向合并展示） */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-800">来源工序参数</h3>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
              {group.params.map((def) => {
                const p = forecast.params.find((x) => x.key === def.key)!;
                const { dir, deviation, rangeText } = paramDirection(p);
                const devCls =
                  dir === "up" ? "text-red-500" : dir === "down" ? "text-blue-500" : dir === "in" ? "text-gray-400" : "text-gray-300";
                const devText =
                  dir === "up" ? `${deviation} ↑` : dir === "down" ? `${deviation} ↓` : dir === "in" ? "0 →" : "—";
                return (
                  <div key={def.key} className="rounded-lg border border-gray-100 bg-gray-50/60 px-3.5 py-3">
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
                      <span className="text-gray-400">范围 {rangeText}</span>
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
            <div className="space-y-2">
              {aiTexts.map((s, i) => (
                <p key={i} className="text-xs leading-relaxed text-gray-600">
                  <span className="font-medium text-gray-700">{s.topic}：</span>
                  {s.text}
                </p>
              ))}
            </div>
          </Card>

          {/* 风险来源：φ>0 降序 + 风险降低因素 */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">风险来源</h3>
              <span className="text-xs text-gray-400">按贡献从高到低</span>
            </div>
            <RiskContributionChart contributions={contributions} />
            <div className="mt-3">
              <ReducingFactors factors={reducing} />
            </div>
          </Card>

          {/* 来源工序分布 */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">来源工序分布</h3>
              <span className="text-xs text-gray-400">按贡献从高到低</span>
            </div>
            <SourceBreakdownChart breakdown={breakdown} />
          </Card>
        </div>
      </div>
    </div>
  );
}
