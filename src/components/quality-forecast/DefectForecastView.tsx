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

// 只读带出项（当前批次 / 牌号 / 班次 / 工序 / 部位）
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

  // 切换缺陷：机台重置为该缺陷风险最高的有效机台，全量联动
  function changeCode(v: string) {
    setCode(v);
    setMachine(topMachineOf(v));
  }

  // 数据不足（必需输入不满足模型要求）：整次预测标「数据不足」，仅保留对象信息行与占位说明
  if (!forecast || forecast.insufficient) {
    const aiTexts = forecast
      ? aiInterpretation(forecast, code, machine)
      : [`未找到 ${defectName}（${code}）在 ${machine} 上的预测结果，请重新选择机台。`];
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
            <ContextItem label="工序" value={ctx.process} />
            <ContextItem label="部位" value={ctx.part} />
          </div>
        </Card>

        <Card>
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl">📭</span>
            <p className="text-sm font-medium text-gray-700">数据不足，本轮预测未生成</p>
            <p className="max-w-md text-xs leading-relaxed text-gray-400">
              {machine} 的必需输入（车间环境测点数据）不满足模型要求，未生成有效风险评分与趋势；
              恢复数据采集后将随下一轮滚动预测自动更新。
            </p>
          </div>
        </Card>

        <Card>
          <div className="mb-2.5 flex items-center gap-1.5">
            <span>🤖</span>
            <h3 className="text-sm font-semibold text-gray-800">AI 风险解读</h3>
          </div>
          <div className="space-y-2">
            {aiTexts.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] font-semibold text-primary-700">
                  {i + 1}
                </span>
                <p className="text-xs leading-relaxed text-gray-600">{t}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const level = levelOf(forecast.score);
  const contributions = contributionsOf(forecast);
  const reducing = reducingFactorsOf(forecast);
  const breakdown = sourceBreakdownOf(forecast);
  const aiTexts = aiInterpretation(forecast, code, machine);
  const group = PARAM_GROUPS[groupOf(code)];

  const th = "text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      {/* 对象信息：缺陷 + 机台选择，批次 / 牌号 / 班次 / 工序 / 部位自动带出（无则 —） */}
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
          <ContextItem label="班次" value={ctx.shift} />
          <ContextItem label="工序" value={ctx.process} />
          <ContextItem label="部位" value={ctx.part} />
        </div>
      </Card>

      {/* 风险摘要：评分与趋势图「现在」点同口径 */}
      <Card>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <SummaryItem label="风险评分">
            <span className={`text-2xl font-bold ${level.textCls}`}>{forecast.score.toFixed(2)}</span>
          </SummaryItem>
          <SummaryItem label="风险等级">
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${level.badgeCls}`}>
              {level.label}
            </span>
          </SummaryItem>
          <SummaryItem label="预测窗口">未来 {forecast.windowHours} 小时</SummaryItem>
          <SummaryItem label="预测更新时间">{forecast.updatedAt}</SummaryItem>
          <SummaryItem label="模型置信度">{Math.round(forecast.confidence * 100)}%</SummaryItem>
        </div>
      </Card>

      {/* 风险预测趋势 */}
      <Card>
        <h3 className="mb-1 text-sm font-semibold text-gray-800">{defectName}风险预测趋势</h3>
        <p className="mb-2 text-xs text-gray-400">
          纵轴为 0-1 风险评分；实线为历史风险，虚线为未来 {forecast.windowHours} 小时预测
        </p>
        <RiskTrendChart defectName={defectName} forecast={forecast} />
      </Card>

      {/* 来源工序参数：本轮预测实际使用的数据 */}
      <Card padding={false}>
        <div className="border-b border-gray-50 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-800">来源工序参数（{group.process} · 车间环境）</h3>
          <p className="mt-0.5 text-xs text-gray-400">展示本轮预测实际使用的数据；方向：超上限 ↑ / 低于下限 ↓ / 范围内 →</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-100">
              <th className={th}>参数名称</th>
              <th className={th}>数值</th>
              <th className={th}>参考范围</th>
              <th className={th}>偏差</th>
              <th className={th}>方向</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {group.params.map((def) => {
              const p = forecast.params.find((x) => x.key === def.key)!;
              const { dir, deviation, rangeText } = paramDirection(p);
              return (
                <tr key={def.key} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{def.name}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-800">
                    {p.value === null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <>
                        <span className="font-medium">{p.value}</span>
                        <span className="ml-1 text-xs text-gray-400">{def.unit}</span>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">{rangeText}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                    {dir === "none" ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span className={dir === "in" ? "text-gray-400" : dir === "up" ? "text-red-500" : "text-blue-500"}>
                        {deviation}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {dir === "none" || dir === "in" ? (
                      <span className={dir === "in" ? "text-gray-400" : "text-gray-300"}>
                        {dir === "in" ? "→" : "—"}
                      </span>
                    ) : (
                      <span className={dir === "up" ? "text-red-500" : "text-blue-500"}>{dir === "up" ? "↑" : "↓"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* AI 风险解读：评分 / 等级 / 趋势 / 置信度 → 参数偏离 → 核查建议，与预测结果同步更新 */}
      <Card>
        <div className="mb-2.5 flex items-center gap-1.5">
          <span>🤖</span>
          <h3 className="text-sm font-semibold text-gray-800">AI 风险解读</h3>
        </div>
        <div className="space-y-2">
          {aiTexts.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] font-semibold text-primary-700">
                {i + 1}
              </span>
              <p className="text-xs leading-relaxed text-gray-600">{t}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 风险来源 + 来源工序分布 */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">风险来源</h3>
            <span className="text-xs text-gray-400">按各参数风险贡献从高到低</span>
          </div>
          <RiskContributionChart contributions={contributions} />
          <div className="mt-3">
            <ReducingFactors factors={reducing} />
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">来源工序分布</h3>
          </div>
          <SourceBreakdownChart breakdown={breakdown} />
        </Card>
      </div>
    </div>
  );
}
