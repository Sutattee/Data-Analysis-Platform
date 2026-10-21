"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import { RiskTrendChart } from "./RiskTrendChart";
import { RiskContributionChart, SourceBreakdownChart } from "./RiskSourceCharts";
import { StabilityAnomalyDrawer } from "@/components/quality-stability-forecast/StabilityAnomalyDrawer";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";
import type { AlertRecord } from "@/types";
import {
  BASE_TIME,
  FORECAST_DEFECTS,
  HIGH_THRESHOLD,
  MID_THRESHOLD,
  UPDATED_AT,
  aiInterpretation,
  defaultBatchOf,
  defaultTargetOf,
  forecastDefectOf,
  forecastObjectsOf,
  forecastOf,
  highRiskEta,
  levelOf,
  peakOf,
  windowTextOf,
  type ParamCell,
  type TrendPoint,
} from "@/lib/mock-data/quality-defect-forecast";

const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
const th = "text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

// 缺陷下拉选项（3 个重点缺陷："名称｜编码"）
const FORECAST_DEFECT_OPTIONS = FORECAST_DEFECTS.map((d) => ({ value: d.code, label: `${d.name}｜${d.code}` }));

// AI 解读三段固定小标题
const AI_SECTION_TITLES = ["预测概况", "参数关注", "核查重点"];

// 摘要信息格：label 上 / 值下两行式（各列起点对齐，长文本换行完整展示），备注行在下方
function SummaryItem({
  label,
  value,
  sub,
  valueCls = "text-gray-900",
}: {
  label: string;
  value: string;
  sub?: string;
  valueCls?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`mt-1 text-sm font-semibold leading-5 ${valueCls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs leading-4 text-gray-400">{sub}</div>}
    </div>
  );
}

// 只读上下文信息格：字段与值同行（缺失或不适用显示 "—"），紧随预测对象字段展示
function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="shrink-0 text-xs text-gray-500">{label}：</span>
      <span className="text-sm text-gray-700">{value || "—"}</span>
    </div>
  );
}

// 参数偏差单元格：超上限 ↑ 橙 / 低于下限 ↓ 蓝 / 范围内 → 灰 / 不适用 — 浅灰
function DevCell({ dev }: { dev: ParamCell["dev"] }) {
  const cls =
    dev.dir === "up"
      ? "text-orange-600"
      : dev.dir === "down"
        ? "text-blue-600"
        : dev.dir === "in"
          ? "text-gray-400"
          : "text-gray-300";
  return <span className={`font-medium ${cls}`}>{dev.text}</span>;
}

// 缺陷预测主视图：顶部项目及对象选择（缺陷单选 → 预测对象联动 → 多批次分别预测，字段与控件同行），
// 只读上下文紧随其后；风险摘要字段值同行、无卡片标题（压缩高度让参数表进第一屏）；左侧主区域（预测趋势 / 关联参数表），
// 右侧辅助区域（AI 解读 / 贡献度 / 来源分布）。本期仅展示最新一轮预测：切换对象即整轮切换，不混合轮次。
export function DefectForecastView() {
  const [code, setCode] = useState(() => defaultTargetOf().code);
  const [objectKey, setObjectKey] = useState(() => defaultTargetOf().objectKey);
  const [batch, setBatch] = useState(() => defaultTargetOf().batch);
  // 点击趋势图标记点（窗口最高风险点 / 已达阈值的基准点）→ 构造告警记录，滑出异常详情抽屉
  const [anomalyAlert, setAnomalyAlert] = useState<AlertRecord | null>(null);

  const defect = forecastDefectOf(code);
  const objects = forecastObjectsOf(code);
  const activeObject = objects.find((o) => o.key === objectKey) ?? objects[0];
  const forecast = forecastOf(code, activeObject.key, batch);
  const peak = peakOf(forecast);
  const lv = peak ? levelOf(peak.score) : null;
  const eta = highRiskEta(forecast);
  const texts = aiInterpretation(forecast);
  const ctx = forecast.context;

  // 切换缺陷：整轮重置为该缺陷的默认对象（同窗口最高评分的首个有效对象）
  function handleChangeCode(next: string) {
    const t = defaultTargetOf(next);
    setCode(t.code);
    setObjectKey(t.objectKey);
    setBatch(t.batch);
  }

  // 切换对象：关联批次重置为该对象最高风险批次（多批次分别预测，不混合）
  function handleChangeObject(nextKey: string) {
    setObjectKey(nextKey);
    setBatch(defaultBatchOf(code, nextKey));
  }

  // 趋势图标记点点击 → 异常详情抽屉：等级 / 告警值 / 基准 / 偏离 / 批次 / 牌号 / 班次等数值字段
  // 按点位与预测上下文覆写（峰值点 = 预测风险，基准点 = 当前异常）；策略 / 原因 / 建议等无法由
  // 点位派生的字段借用工艺质量域告警记录（兼作「查看告警详情」跳转目标）
  function openAnomalyDrawer(point: TrendPoint, kind: "peak" | "base") {
    const base = ALERT_RECORDS.find((r) => r.domain === "工艺质量");
    if (!base) return;
    const lv = levelOf(point.score);
    const threshold = point.score >= HIGH_THRESHOLD ? HIGH_THRESHOLD : MID_THRESHOLD;
    const alertLevel: AlertRecord["level"] =
      point.score >= HIGH_THRESHOLD ? "告警" : point.score >= MID_THRESHOLD ? "预警" : "关注";
    const delta = point.score - threshold;
    const sign = delta >= 0 ? "+" : "-";
    setAnomalyAlert({
      ...base,
      level: alertLevel,
      title: `${defect.name}风险评分${kind === "peak" ? "预计达窗口峰值" : `已达${lv.label}阈值`}`,
      type: kind === "peak" ? "预测风险" : "当前异常",
      objectName: activeObject.label,
      metricName: `${defect.name}风险评分`,
      triggerTime: point.full,
      valueLabel: `${kind === "peak" ? "预测值" : "当前值"}${point.score.toFixed(1)}`,
      baselineLabel: `${lv.label}阈值 ${threshold}`,
      deviationValue: `${sign}${Math.abs(delta).toFixed(1)}`,
      deviationRate: `${sign}${((Math.abs(delta) / threshold) * 100).toFixed(1)}%`,
      batch: forecast.batch,
      brand: ctx.brand,
      shift: ctx.shiftGroup,
      shiftLabel: ctx.shift,
      process: ctx.process,
      forecastWindow: kind === "peak" ? windowTextOf(forecast) : undefined,
      consecutiveShifts: undefined,
      confidenceRange: undefined,
      duration: undefined,
      forecastTime: undefined,
      riskProb: undefined,
    });
  }

  // 高风险预测口径配色：已达/预计达阈值 红，单点无时序 灰，数据不足 浅灰
  const etaCls =
    eta.kind === "reached" || eta.kind === "within"
      ? "text-red-600"
      : eta.kind === "noSeries"
        ? "text-gray-500"
        : forecast.status === "insufficient"
          ? "text-gray-400"
          : "text-gray-900";

  // 箱储时长核算字段：数据不足时仅展示已储存时长 / 上限 / 剩余允许时间（不编造预计出库时间）
  const st = forecast.storage;
  const storageFields: [string, string][] =
    st === undefined
      ? []
      : forecast.status === "insufficient"
        ? [
            ["已储存时长", st.stored],
            ["储存时长上限", st.limit],
            ["剩余允许储存时间", st.remaining],
          ]
        : [
            ["已储存时长", st.stored],
            ["储存时长上限", st.limit],
            ["剩余允许储存时间", st.remaining],
            ["预计总储存时长", st.total],
            ["预计出库/耗用时间", st.outbound],
            ["允许储存截止时间", st.deadline],
          ];

  // 班次按"日期 班次"格式展示（与预测基准时间同日）
  const contextItems: [string, string][] = [
    ["牌号", ctx.brand],
    ["班次", `${BASE_TIME.slice(5, 10)} ${ctx.shift}`],
    ["班组", ctx.shiftGroup],
    ["工序", ctx.process],
    ["部位", ctx.part],
    ["质量类别", ctx.qualityClass],
  ];

  return (
    <div className="space-y-3">
      {/* 顶部：项目及对象选择（字段与控件同行，下拉选项直接带风险等级）+ 只读上下文紧随其后 */}
      <Card>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-gray-500">缺陷</span>
            <div className="w-48">
              <SearchSelect
                options={FORECAST_DEFECT_OPTIONS}
                value={code}
                onChange={handleChangeCode}
                placeholder="按缺陷名称搜索"
              />
            </div>
          </label>
          <label className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-gray-500">预测对象</span>
            <div className="w-56">
              <select value={activeObject.key} onChange={(e) => handleChangeObject(e.target.value)} className={selectCls}>
                {objects.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
          {activeObject.batches.length > 1 && (
            <label className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-gray-500">关联批次</span>
              <div className="w-40">
                <select value={batch} onChange={(e) => setBatch(e.target.value)} className={selectCls}>
                  {activeObject.batches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          )}
          {/* 只读上下文（牌号 / 班次 / 班组 / 工序 / 部位 / 质量类别） */}
          {contextItems.map(([label, value]) => (
            <ContextItem key={label} label={label} value={value} />
          ))}
        </div>
      </Card>

      {/* 风险摘要：筛选区下方整行展示（字段与值同行、无卡片标题，压缩页面高度） */}
      <Card>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-3 xl:grid-cols-6">
          <SummaryItem
            label="预测最高风险评分"
            value={peak ? peak.score.toFixed(1) : "—"}
            sub={peak ? undefined : "数据不足，未生成有效预测"}
            valueCls={lv ? lv.textCls : "text-gray-400"}
          />
          <div className="min-w-0">
            <div className="text-xs text-gray-400">风险等级</div>
            <div className="mt-1">
              {lv ? (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${lv.badgeCls}`}>
                  {lv.label}
                </span>
              ) : (
                <span className="text-sm font-semibold text-gray-400">—</span>
              )}
            </div>
          </div>
          <SummaryItem label="高风险预测" value={eta.text} valueCls={etaCls} sub={forecast.status === "ok" ? undefined : "必需输入不足，本轮未生成预测"} />
          <SummaryItem label="预测窗口" value={windowTextOf(forecast)} />
          <SummaryItem label="预测更新时间" value={UPDATED_AT} />
          {forecast.confidence !== undefined && (
            <SummaryItem label="模型置信度" value={`${Math.round(forecast.confidence * 100)}%`} />
          )}
        </div>

        {/* 项目业务依据：成品水分 → 预测水分 / 允差（含标准水分）/ 偏差；箱储 → 时长核算 */}
        {forecast.moisture && (
          <div className="mt-2.5 border-t border-gray-100 pt-2.5">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 md:grid-cols-3">
              <SummaryItem label="预测成品水分" value={forecast.moisture.predicted} />
              <SummaryItem label="允差" value={`${forecast.moisture.tolerance}（标准水分 12.5%）`} />
              <SummaryItem label="预测偏差" value={forecast.moisture.dev} valueCls="text-orange-600" />
            </div>
          </div>
        )}
        {st && storageFields.length > 0 && (
          <div className="mt-2.5 border-t border-gray-100 pt-2.5">
            <div className="mb-2 text-xs font-medium text-gray-500">箱储时长核算</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-3 xl:grid-cols-6">
              {storageFields.map(([label, value]) => (
                <SummaryItem key={label} label={label} value={value} />
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* 左侧主区域：预测趋势 / 关联参数表 */}
        <div className="space-y-3 xl:col-span-2">
          <Card title={`${defect.name}风险预测趋势`}>
            <RiskTrendChart forecast={forecast} onPointClick={openAnomalyDrawer} />
          </Card>

          <Card title="关联工序及环境参数" padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className={th}>参数名称</th>
                    <th className={th}>来源工序及系统</th>
                    <th className={`${th} text-right`}>数值</th>
                    <th className={th}>单位</th>
                    <th className={th}>取值时间/统计周期</th>
                    <th className={th}>基准值/参考范围</th>
                    <th className={`${th} text-right`}>偏差</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {forecast.params.map((p) => (
                    <tr key={p.name} className="transition-colors hover:bg-gray-50">
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{p.name}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{p.source}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap font-medium text-gray-800">
                        {p.value ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">{p.unit ?? "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{p.time}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{p.ref}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <DevCell dev={p.dev} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* 右侧辅助区域：AI 解读 / 贡献度 / 来源分布（无可信解释时后两者不展示） */}
        <div className="space-y-3">
          <Card title="AI 风险解读">
            {forecast.status === "insufficient" ? (
              <p className="text-sm text-gray-400">数据不足，无法生成解读</p>
            ) : (
              <div className="space-y-3">
                {AI_SECTION_TITLES.map((title, i) => (
                  <div key={title}>
                    <div className="text-xs font-semibold text-gray-500">{title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-gray-700">{texts[i]}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {forecast.contributions.length > 0 && (
            <Card title="风险贡献度">
              <RiskContributionChart items={forecast.contributions} />
            </Card>
          )}
          {forecast.sources.length > 0 && (
            <Card title="来源分布">
              <SourceBreakdownChart breakdown={forecast.sources} />
            </Card>
          )}
        </div>
      </div>

      {/* 异常详情抽屉（点击趋势图标记点：窗口最高风险点 / 已达阈值的基准点） */}
      <StabilityAnomalyDrawer record={anomalyAlert} onClose={() => setAnomalyAlert(null)} />
    </div>
  );
}
