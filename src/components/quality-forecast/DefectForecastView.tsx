"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { StreamText } from "@/components/ui/StreamText";
import { WarningIcon } from "@/components/ui/WarningIcon";
import { RiskTrendChart } from "./RiskTrendChart";
import { RiskContributionChart, SourceBreakdownChart } from "./RiskSourceCharts";
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
  highRiskEta,
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

// 牌号筛选（预测趋势图右上角）：不同牌号的预测趋势不同，切换即整轮切换
function BrandFilter({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (options.length === 0) return null;
  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-primary-400 hover:text-primary-600"
      >
        牌号：<span className="font-medium text-gray-800">{value}</span>
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-28 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {options.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => {
                onChange(b);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-primary-50 ${
                b === value ? "bg-primary-50 font-medium text-primary-700" : "text-gray-600"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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

// 缺陷预测主视图：顶部缺陷 tab 切换（预测对象 / 关联批次不再作为筛选项，
// 预测对象由牌号筛选与深链参数确定；上下文信息仅在趋势图悬浮提示内展示），
// 风险摘要字段值同行、无卡片标题
// （压缩高度让参数表进第一屏）；左侧主区域（预测趋势含牌号筛选 / 关联参数表），
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
  // 预测详情抽屉：收纳辅助字段（评分 / 等级 / 置信度 / 模型版本 / 窗口 / 业务口径 / 更新时间），默认不展开
  const [detailOpen, setDetailOpen] = useState(false);

  const defect = forecastDefectOf(code);
  const forecast = forecastOf(code, objectKey, batch);
  const peak = peakOf(forecast);
  const lv = peak ? levelOf(peak.score) : null;
  const eta = highRiskEta(forecast);
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

  // 高风险预测口径配色：已达/预计达阈值 红，单点无时序 灰，数据不足 浅灰
  const etaCls =
    eta.kind === "reached" || eta.kind === "within"
      ? "text-red-600"
      : eta.kind === "noSeries"
        ? "text-gray-500"
        : forecast.status === "insufficient"
          ? "text-gray-400"
          : "text-gray-900";

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
      {/* 顶部：缺陷 tab 切换（分段式）；牌号 / 班次 / 班组等上下文不在页面展示（趋势图悬浮提示内可查）；
          深链到未开放 tab 的缺陷（烟支刺破）时不点亮任何 tab，仅正常展示内容 */}
      <Card>
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
      </Card>

      {/* 预测概况：标题 + 预测详情入口；正文左（风险结论）右（业务依据）约 5:5，无分隔线 */}
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
        <div className={`grid gap-6 px-5 pb-5 pt-2 ${forecast.moisture || st ? "lg:grid-cols-2" : ""}`}>
          {/* 左：风险结论（等级大字 + 进入高风险批次） */}
          <div>
            <p className="text-xs text-gray-400">
              {forecast.status === "ok" ? "未来最高风险" : "本轮预测"}
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
              <span className={`text-sm font-medium ${etaCls}`}>{eta.text}</span>
            </div>
            {!peak && <p className="mt-1 text-xs text-gray-400">必需输入不足，本轮未生成预测</p>}
          </div>

          {/* 右：业务依据（成品水分对象 → 预测水分与允许范围对比；箱储对象 → 预测结果核算） */}
          {forecast.moisture && (
            <div>
              <p className="text-xs text-gray-400">预测成品水分</p>
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
              {/* 预测结果（视觉重点）+ 允许储存截止时间，窄屏自动换行；已储存/上限等辅助信息不再上卡片 */}
              <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
                <div>
                  <p className="text-xs text-gray-400">预测结果</p>
                  <p className={`mt-2.5 text-lg font-semibold ${stCls}`}>{stRes?.text}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">允许储存截止时间</p>
                  <p className="mt-2.5 text-lg font-semibold text-gray-900">{st.deadline}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* 左侧主区域：预测趋势（右上角牌号筛选）/ 关联参数表 */}
        <div className="space-y-3 xl:col-span-2">
          <Card
            title={defect.trendTitle}
            headerRight={<BrandFilter options={brands} value={curBrand} onChange={handleBrand} />}
          >
            <RiskTrendChart forecast={forecast} />
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

      {/* 预测详情抽屉：辅助字段收纳（默认不展开）；缺陷名称置首，
          成品水分对象展示 预测成品水分/允许范围/超上限，箱储对象展示 预测结果/允许储存截止时间 */}
      <Drawer open={detailOpen} onClose={() => setDetailOpen(false)} title="预测详情" width={440}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <SummaryItem label="缺陷名称" value={defect.name} />
          <SummaryItem
            label="最高风险评分"
            value={peak ? `${peak.score.toFixed(1)}分` : "—"}
            valueCls={lv ? lv.textCls : "text-gray-400"}
          />
          <SummaryItem label="风险等级" value={lv ? lv.label : "—"} valueCls={lv ? lv.textCls : "text-gray-400"} />
          {forecast.confidence !== undefined && (
            <SummaryItem label="模型置信度" value={`${Math.round(forecast.confidence * 100)}%`} />
          )}
          <SummaryItem label="模型版本" value={forecast.modelVer} />
          <SummaryItem label="预测窗口" value={windowTextOf(forecast)} />
          {forecast.moisture && (
            <>
              <SummaryItem label="预测成品水分" value={forecast.moisture.predicted} />
              <SummaryItem label="成品水分允许范围" value={forecast.moisture.range} />
              <SummaryItem label="超上限" value={forecast.moisture.overValue ?? forecast.moisture.overText} valueCls={overTextCls} />
            </>
          )}
          {st && stRes && (
            <>
              <SummaryItem label="预测结果" value={stRes.text} valueCls={stCls} />
              <SummaryItem label="允许储存截止时间" value={st.deadline} />
            </>
          )}
          <SummaryItem label="预测更新时间" value={UPDATED_AT} />
        </div>
      </Drawer>
    </div>
  );
}
