"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StreamText } from "@/components/ui/StreamText";
import { WarningIcon } from "@/components/ui/WarningIcon";
import { BrandFilter } from "@/components/forecast/BrandFilter";
import { RiskTrendChart, type DefectAnomalyClickInfo } from "./RiskTrendChart";
import { DefectAnomalyDrawer } from "./DefectAnomalyDrawer";
import { RiskContributionChart, SourceBreakdownChart } from "./RiskSourceCharts";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";
import type { AlertRecord } from "@/types";
import {
  FORECAST_DEFECTS,
  UPDATED_AT,
  aiInterpretation,
  bestForecastOfBrand,
  brandOptionsOf,
  defaultBatchOf,
  defaultTargetOf,
  forecastDefectOf,
  forecastOf,
  levelChangeOf,
  levelClsOf,
  levelOf,
  peakOf,
  storageResultOf,
  windowTextOf,
  type ParamCell,
} from "@/lib/mock-data/quality-defect-forecast";

const th = "text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

// 缺陷 tab 选项（开放 2 个重点缺陷，仅展示缺陷名称；烟支刺破保留数据供工作台深链，不开放 tab）
const FORECAST_DEFECT_OPTIONS = FORECAST_DEFECTS.filter((d) => d.code !== "YZCB").map((d) => ({
  value: d.code,
  label: d.name,
}));

// AI 解读三段固定小标题（规格 §9 解读顺序：风险概况 → 参数关注 → 核查重点）
const AI_SECTION_TITLES = ["风险概况", "参数关注", "核查重点"];

// 缺陷 → 告警侧指标名（与告警侧缺陷预测记录同源）：趋势图标记点点击时按此匹配告警记录；
// 烟支刺破（YZCB）风险评分类预测记录已下线 → 无匹配记录时不滑出异常详情抽屉
const DEFECT_ALERT_METRIC: Record<string, string> = {
  CPSFBH: "预测成品水分",
  YZCB: "烟支刺破风险评分",
  XCCG: "预测箱储总存储时长",
};

// 参数偏差单元格：超上限 ↑ 橙 / 低于下限 ↓ 蓝 / 范围内 → 灰 / 不适用 — 浅灰
function DevCell({ dev, delay = 0 }: { dev: ParamCell["dev"]; delay?: number }) {
  const cls =
    dev.dir === "up"
      ? "text-orange-600"
      : dev.dir === "down"
        ? "text-blue-600"
        : dev.dir === "in"
          ? "text-gray-400"
          : "text-gray-300";
  return (
    <span className={`font-medium ${cls}`}>
      <StreamText text={dev.text} delay={delay} />
    </span>
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

// 深链初始选中（?code=&object=&batch=，来自工作台「预测详情」）：code 取默认兜底，
// object 按对象名匹配有效预测，batch 须命中该对象，任一无效则回退该缺陷的默认目标
function deepTargetOf(params: URLSearchParams) {
  const base = defaultTargetOf(params.get("code") ?? undefined);
  const o = params.get("object");
  let objectKey = base.objectKey;
  if (o) {
    const probe = forecastOf(base.code, o, "");
    if (probe.objectKey === o) objectKey = o;
  }
  const b = params.get("batch");
  const batch =
    b && forecastOf(base.code, objectKey, b).batch === b ? b : defaultBatchOf(base.code, objectKey);
  return { code: base.code, objectKey, batch };
}

// 缺陷预测主视图：顶部缺陷 tab 切换 + 当前缺陷工序 / 质量类别展示（预测对象 / 关联批次
// 不再作为筛选项，预测对象由牌号筛选与深链参数确定；其余上下文仅在趋势图悬浮提示内展示）；
// 点击趋势图等级标记点（升级点 / 触发等级的基准批次点）匹配告警记录滑出异常详情抽屉，
// 风险摘要字段值同行、无卡片标题
// （压缩高度让参数表进第一屏）；左侧主区域（预测趋势 / 关联参数表，牌号筛选在顶部缺陷 tab 旁），
// 右侧辅助区域（AI 解读 / 贡献度 / 来源分布）。解读区默认收起：点击「智能解读」后按
// AI 解读文字逐字 → 贡献度 → 来源分布 → 关联参数表的顺序流式生成；切换输入后重置回按钮态。
// 本期仅展示最新一轮预测：切换缺陷/牌号即整轮切换，不混合轮次。
export function DefectForecastView() {
  const searchParams = useSearchParams();
  const [initial] = useState(() => deepTargetOf(searchParams));
  const [code, setCode] = useState(initial.code);
  const [objectKey, setObjectKey] = useState(initial.objectKey);
  const [batch, setBatch] = useState(initial.batch);
  // 智能解读：进入页面不展示解读区（AI 解读 / 贡献度 / 来源分布 / 关联参数表），点击按钮后流式生成
  const [interpreting, setInterpreting] = useState(false);
  // 点击趋势图等级标记点（升级点 / 触发等级的基准批次点）→ 匹配告警记录，滑出异常详情抽屉
  const [anomalyRecord, setAnomalyRecord] = useState<AlertRecord | null>(null);

  const defect = forecastDefectOf(code);
  const forecast = forecastOf(code, objectKey, batch);
  const peak = peakOf(forecast);
  const lv = peak ? levelOf(peak.score) : null;
  const change = levelChangeOf(forecast);
  const texts = aiInterpretation(forecast);
  // 流式时序：AI 解读三段逐字（8ms/字，段间停顿 200ms）→ 打完后延迟挂载贡献度 / 来源分布 / 参数表
  const sectionDelays: number[] = [];
  texts.forEach((_, i) => {
    sectionDelays.push(i === 0 ? 0 : sectionDelays[i - 1] + texts[i - 1].length * 8 + 200);
  });
  const aiDoneAt =
    texts.length > 0 ? sectionDelays[texts.length - 1] + texts[texts.length - 1].length * 8 + 300 : 0;

  // 牌号筛选：当前缺陷下的可选牌号与当前牌号
  const brands = brandOptionsOf(code);
  const curBrand = forecast.context.brand;

  // 切换缺陷：整轮重置为该缺陷的默认目标（同窗口最高评分的首个有效对象）
  function handleChangeCode(next: string) {
    const t = defaultTargetOf(next);
    setCode(t.code);
    setObjectKey(t.objectKey);
    setBatch(t.batch);
    setInterpreting(false);
  }

  // 切换牌号：定位该牌号下窗口最高分的预测对象（不同牌号预测趋势不同，整轮切换）
  function handleBrand(brand: string) {
    const f = bestForecastOfBrand(code, brand);
    setObjectKey(f.objectKey);
    setBatch(f.batch);
    setInterpreting(false);
  }

  // 升级点 / 触发等级的基准批次点点击 → 告警记录匹配（指标 + 对象，逐级放宽），再按点位数值覆写
  // 展示字段后滑出异常详情抽屉；无匹配记录（如烟支刺破深链，风险评分类预测记录已下线）不滑出
  function openAnomalyDrawer(info: DefectAnomalyClickInfo) {
    const metricName = DEFECT_ALERT_METRIC[code] ?? defect.name;
    const match = (r: AlertRecord) => r.domain === "工艺质量" && r.metricName === metricName;
    const rec =
      ALERT_RECORDS.find((r) => match(r) && r.objectName === objectKey) ?? ALERT_RECORDS.find(match);
    if (rec) setAnomalyRecord(pointAlertOf(rec, info));
  }

  // 以点击点位的数值覆写告警记录展示字段（等级 / 告警值 / 基准阈值 / 超出量 / 批次 / 班次 / 班组 /
  // 牌号 / 工序与点位一致；点位在预测曲线上 → 告警类型 = 预测风险，基准批次点为最新实测值 → 实测异常）；
  // 原因、建议、触发时间等无法由点位派生的字段保留告警记录原文
  function pointAlertOf(rec: AlertRecord, info: DefectAnomalyClickInfo): AlertRecord {
    const m = forecast.moisture;
    const st = forecast.storage;
    const fmt = (v: number) => v.toFixed(1);
    let valueLabel: string;
    let baselineLabel = rec.baselineLabel;
    let deviation = "-";
    if (m) {
      // 成品水分：基准 / 阈值 = 允许范围；超出量 = 越出边界的绝对差（超上限 / 超下限）
      valueLabel = `${info.measured ? "当前值" : "预测值"}${fmt(info.value)}%`;
      baselineLabel = `${m.lo}%～${m.hi}%`;
      if (info.value > m.hi) deviation = `超上限${fmt(info.value - m.hi)}pct`;
      else if (info.value < m.lo) deviation = `超下限${fmt(m.lo - info.value)}pct`;
    } else if (st) {
      // 箱储：基准 / 阈值 = 储存时长上限；超出量 = 预计超时
      valueLabel = `${info.measured ? "当前值" : "预测值"}${fmt(info.value)}h`;
      baselineLabel = `≤${st.limitHours}h`;
      if (info.value > st.limitHours) deviation = `超上限${fmt(info.value - st.limitHours)}h`;
    } else {
      // 评分兜底模式（烟支刺破深链）：无业务管控值
      valueLabel = `${info.measured ? "当前值" : "预测值"}${fmt(info.value)}分`;
    }
    return {
      ...rec,
      level: info.level === "正常" ? rec.level : info.level,
      type: info.measured ? "当前异常" : "预测风险",
      metricName: defect.name, // 抽屉首行 = 缺陷名称
      valueLabel,
      baselineLabel,
      deviationValue: deviation,
      batch: `第 ${info.batch} 批`,
      shiftLabel: forecast.context.shift,
      shift: forecast.context.shiftGroup,
      brand: forecast.context.brand,
      process: forecast.context.process,
    };
  }

  // 等级变化文案配色（与稳定性预测页同口径）：升级按目标等级 / 同级持续按当前等级 /
  // 降级为好转（绿）/ 窗口内正常·暂无法预测 深灰
  const changeCls =
    change.kind === "upgrade" && change.toLevel !== undefined
      ? levelClsOf(change.toLevel)
      : change.kind === "hold" && lv
        ? lv.textCls
        : change.kind === "degrade"
          ? "text-green-600"
          : "text-gray-800";

  // 成品水分与允许范围对比标签（新口径：预测值 − 允许上限）：超上限浅橙底橙字 / 低于下限浅蓝底蓝字 / 范围内灰
  const overKind = forecast.moisture?.overKind;
  const overBadgeCls =
    overKind === "over"
      ? "bg-orange-50 text-orange-600"
      : overKind === "under"
        ? "bg-blue-50 text-blue-600"
        : "bg-gray-100 text-gray-500";
  const overTextCls =
    overKind === "over" ? "text-orange-600" : overKind === "under" ? "text-blue-600" : "text-gray-900";

  // 箱储业务依据（预测结果 = 预计超时 / 预计不超时；已储存时长等收纳进关联参数表）
  const st = forecast.storage;
  const stRes = st ? storageResultOf(st) : null;
  const stCls =
    stRes?.tone === "over" ? "text-red-600" : stRes?.tone === "safe" ? "text-green-600" : "text-gray-400";

  return (
    <div className="space-y-3">
      {/* 顶部：缺陷 tab 切换（分段式）+ tab 旁牌号筛选 + 当前缺陷静态信息（工序 / 质量类别，随缺陷切换）；
          班次 / 班组等上下文不在页面展示（趋势图悬浮提示内可查）；
          深链到未开放 tab 的缺陷（烟支刺破）时不点亮任何 tab，仅正常展示内容 */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-fit items-center gap-1 rounded-lg bg-gray-100 p-1">
              {FORECAST_DEFECT_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => handleChangeCode(d.value)}
                  className={`rounded-md px-3.5 py-1.5 text-sm transition-colors ${
                    code === d.value
                      ? "bg-white font-medium text-primary-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <BrandFilter options={brands} value={curBrand} onChange={handleBrand} />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              工序：<span className="font-medium text-gray-700">{defect.process}</span>
            </span>
            <span>
              质量类别：<span className="font-medium text-gray-700">{defect.qualityClass}</span>
            </span>
          </div>
        </div>
      </Card>

      {/* 预测概况：正文三区（左风险结论 / 中业务依据 / 右模型信息）约 1:1:1，无分隔线 */}
      <Card title="预测概况" divider={false} padding={false}>
        <div className={`grid gap-6 px-5 pb-5 pt-2 ${forecast.moisture || st ? "lg:grid-cols-3" : ""}`}>
          {/* 左：风险结论（窗口最高等级大字 + 等级变化预测） */}
          <div>
            <p className="text-xs text-gray-400">
              {forecast.status === "ok" ? `${windowTextOf(forecast)}最高等级` : "本轮预测"}
            </p>
            <div className="mt-2">
              {lv ? (
                <span className={`inline-flex items-center gap-1.5 text-2xl font-bold ${lv.textCls}`}>
                  <WarningIcon className="h-5 w-5" />
                  {lv.label}
                </span>
              ) : (
                <span className="text-2xl font-bold text-gray-400">—</span>
              )}
            </div>
            <div className="mt-2">
              <span className={`text-sm font-medium ${changeCls}`}>{change.text}</span>
            </div>
            {!peak && <p className="mt-1 text-xs text-gray-400">必需输入不足，本轮未生成预测</p>}
          </div>

          {/* 右：业务依据（成品水分对象 → 超限最大预测值与允许范围对比；箱储对象 → 预计超时核算） */}
          {forecast.moisture && (
            <div>
              <p className="text-xs text-gray-400">超限最大预测值</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{forecast.moisture.predicted}</span>
                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${overBadgeCls}`}>
                  {forecast.moisture.overText}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400">允许范围 {forecast.moisture.range}</p>
            </div>
          )}
          {!forecast.moisture && st && (
            <div>
              {/* 超限最大预测值（视觉重点）；允许储存截止时间收为一行灰色小字置于其下 */}
              <p className="text-xs text-gray-400">超限最大预测值</p>
              <p className={`mt-2.5 text-lg font-semibold ${stCls}`}>{stRes?.text}</p>
              <p className="mt-2 text-xs text-gray-400">允许储存截止时间：{st.deadline}</p>
            </div>
          )}

          {/* 右：模型信息（三行行内式：预测更新时间 / 模型置信度 / 模型版本） */}
          <div className="space-y-2 pt-1">
            <p className="text-xs text-gray-400">
              预测更新时间 <span className="text-gray-700">{UPDATED_AT}</span>
            </p>
            <p className="text-xs text-gray-400">
              模型置信度{" "}
              <span className="text-gray-700">
                {forecast.confidence !== undefined ? `${Math.round(forecast.confidence * 100)}%` : "—"}
              </span>
            </p>
            <p className="text-xs text-gray-400">
              模型版本 <span className="text-gray-700">{forecast.modelVer}</span>
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* 左侧主区域：预测趋势（牌号筛选已上移至顶部缺陷 tab 旁）/ 关联参数表 */}
        <div className="space-y-3 xl:col-span-2">
          <Card title={defect.trendTitle}>
            <RiskTrendChart forecast={forecast} onAnomalyClick={openAnomalyDrawer} />
          </Card>

          {/* 关联参数表：智能解读生成后延迟出现，按行逐字写入 */}
          {interpreting && (
            <Delayed delay={aiDoneAt}>
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
                      {forecast.params.map((p, i) => {
                        const d = i * 90; // 同行单元格同拍输出 → 整行像被逐字写入
                        return (
                          <tr key={p.name} className="transition-colors hover:bg-gray-50">
                            <td className="px-3 py-2.5 whitespace-nowrap text-gray-700"><StreamText text={p.name} delay={d} /></td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-gray-600"><StreamText text={p.source} delay={d} /></td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap font-medium text-gray-800"><StreamText text={p.value ?? "—"} delay={d} /></td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-gray-500"><StreamText text={p.unit ?? "—"} delay={d} /></td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-gray-600"><StreamText text={p.time} delay={d} /></td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-gray-600"><StreamText text={p.ref} delay={d} /></td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              <DevCell dev={p.dev} delay={d} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </Delayed>
          )}
        </div>

        {/* 右侧辅助区域：AI 解读 / 贡献度 / 来源分布（默认收起，点击「智能解读」后流式生成） */}
        <div className="space-y-3">
          <Card title="智能风险解读">
            {forecast.status === "insufficient" ? (
              <p className="text-sm text-gray-400">数据不足，无法生成解读</p>
            ) : !interpreting ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Button onClick={() => setInterpreting(true)}>智能解读</Button>
                <p className="max-w-[220px] text-center text-xs leading-5 text-gray-400">
                  点击后，AI 将实时生成风险解读、贡献度、来源分布与关联工序参数分析。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {AI_SECTION_TITLES.map((title, i) => (
                  <div key={title}>
                    <div className="text-xs font-semibold text-gray-500">{title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-gray-700">
                      <StreamText text={texts[i]} delay={sectionDelays[i] ?? 0} caret />
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {interpreting && forecast.contributions.length > 0 && (
            <Delayed delay={aiDoneAt + 400}>
              <Card title="风险贡献度">
                <RiskContributionChart items={forecast.contributions} />
              </Card>
            </Delayed>
          )}
          {interpreting && forecast.sources.length > 0 && (
            <Delayed delay={aiDoneAt + 1100}>
              <Card title="来源分布">
                <SourceBreakdownChart breakdown={forecast.sources} />
              </Card>
            </Delayed>
          )}
        </div>
      </div>

      {/* 异常详情抽屉：点击趋势图等级标记点（升级点 / 触发等级的基准批次点）滑出，查看告警详情跳告警记录详情页 */}
      <DefectAnomalyDrawer record={anomalyRecord} onClose={() => setAnomalyRecord(null)} />
    </div>
  );
}
