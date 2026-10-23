"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { StreamText } from "@/components/ui/StreamText";
import { WarningIcon } from "@/components/ui/WarningIcon";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import { RiskTrendChart } from "./RiskTrendChart";
import { RiskContributionChart, SourceBreakdownChart } from "./RiskSourceCharts";
import {
  BASE_TIME,
  FORECAST_DEFECTS,
  UPDATED_AT,
  WINDOW_HOURS,
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
// object 按名称或机台编码匹配，batch 须属于该对象，任一无效则回退该缺陷的默认目标
function deepTargetOf(params: URLSearchParams) {
  const base = defaultTargetOf(params.get("code") ?? undefined);
  const o = params.get("object");
  const obj = o ? forecastObjectsOf(base.code).find((x) => x.key === o || x.code === o) : undefined;
  const objectKey = obj?.key ?? base.objectKey;
  const b = params.get("batch");
  const batch = b && (obj ? obj.batches.includes(b) : b === base.batch) ? b : defaultBatchOf(base.code, objectKey);
  return { code: base.code, objectKey, batch };
}

// 缺陷预测主视图：顶部项目及对象选择（缺陷单选 → 预测对象联动 → 多批次分别预测，字段与控件同行），
// 只读上下文紧随其后；风险摘要字段值同行、无卡片标题（压缩高度让参数表进第一屏）；左侧主区域（预测趋势 / 关联参数表），
// 右侧辅助区域（AI 解读 / 贡献度 / 来源分布）。解读区默认收起：点击「智能解读」后按
// AI 解读文字逐字 → 贡献度 → 来源分布 → 关联参数表的顺序流式生成；切换输入后重置回按钮态。
// 本期仅展示最新一轮预测：切换对象即整轮切换，不混合轮次。
export function DefectForecastView() {
  const searchParams = useSearchParams();
  const [initial] = useState(() => deepTargetOf(searchParams));
  const [code, setCode] = useState(initial.code);
  const [objectKey, setObjectKey] = useState(initial.objectKey);
  const [batch, setBatch] = useState(initial.batch);
  // 智能解读：进入页面不展示解读区（AI 解读 / 贡献度 / 来源分布 / 关联参数表），点击按钮后流式生成
  const [interpreting, setInterpreting] = useState(false);
  // 预测详情抽屉：收纳辅助字段（评分 / 等级 / 置信度 / 模型版本 / 窗口 / 水分口径 / 更新时间），默认不展开
  const [detailOpen, setDetailOpen] = useState(false);

  const defect = forecastDefectOf(code);
  const objects = forecastObjectsOf(code);
  const activeObject = objects.find((o) => o.key === objectKey) ?? objects[0];
  const forecast = forecastOf(code, activeObject.key, batch);
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
  const ctx = forecast.context;

  // 切换缺陷：整轮重置为该缺陷的默认对象（同窗口最高评分的首个有效对象）
  function handleChangeCode(next: string) {
    const t = defaultTargetOf(next);
    setCode(t.code);
    setObjectKey(t.objectKey);
    setBatch(t.batch);
    setInterpreting(false);
  }

  // 切换对象：关联批次重置为该对象最高风险批次（多批次分别预测，不混合）
  function handleChangeObject(nextKey: string) {
    setObjectKey(nextKey);
    setBatch(defaultBatchOf(code, nextKey));
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

  // 成品水分与允差范围对比标签（新口径：预测值 − 允差上限）：超上限浅橙底橙字 / 低于下限浅蓝底蓝字 / 范围内灰
  const overCls =
    forecast.moisture?.overKind === "over"
      ? "bg-orange-50 text-orange-600"
      : forecast.moisture?.overKind === "under"
        ? "bg-blue-50 text-blue-600"
        : "bg-gray-100 text-gray-500";

  // 箱储业务依据（数值口径；预计出库 / 总时长收进预测详情抽屉）
  const st = forecast.storage;

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
                <select
                  value={batch}
                  onChange={(e) => {
                    setBatch(e.target.value);
                    setInterpreting(false);
                  }}
                  className={selectCls}
                >
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
          {/* 左：风险结论（窗口 + 等级大字 + 进入高风险时间） */}
          <div>
            <p className="text-xs text-gray-400">
              {forecast.status === "ok" ? `未来${WINDOW_HOURS}小时最高风险` : "本轮预测"}
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
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`text-sm font-medium ${etaCls}`}>{eta.text}</span>
              <span
                title="时间表示风险评分达到阈值的预计时间，不代表缺陷实际发生时间"
                className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold leading-none text-gray-400"
              >
                ?
              </span>
            </div>
            {!peak && <p className="mt-1 text-xs text-gray-400">必需输入不足，本轮未生成预测</p>}
          </div>

          {/* 右：业务依据（成品水分对象 → 预测水分与允差对比；箱储对象 → 储存状态核算） */}
          {forecast.moisture && (
            <div>
              <p className="text-xs text-gray-400">预测成品水分</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{forecast.moisture.predicted}</span>
                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${overCls}`}>
                  {forecast.moisture.overText}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400">允差范围 {forecast.moisture.range}</p>
            </div>
          )}
          {!forecast.moisture && st && (
            <div>
              {/* 上方两组重点：储存状态（视觉重点）+ 允许储存截止时间，窄屏自动换行 */}
              <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
                <div>
                  <p className="text-xs text-gray-400">储存状态</p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    {st.remainingHours < 0 ? (
                      // 已超时：红色强调超时时长
                      <>
                        <span className="text-sm font-medium text-red-600">已超时</span>
                        <span className="text-2xl font-bold text-red-600">{-st.remainingHours}</span>
                        <span className="text-sm font-medium text-red-600">小时</span>
                      </>
                    ) : st.remainingHours === 0 ? (
                      // 恰达上限：临界警示
                      <span className="text-2xl font-bold text-orange-600">已达上限</span>
                    ) : (
                      // 未超时：深色强调剩余可储存时长
                      <>
                        <span className="text-sm font-medium text-gray-600">剩余可储存</span>
                        <span className="text-2xl font-bold text-gray-900">{st.remainingHours}</span>
                        <span className="text-sm font-medium text-gray-500">小时</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">允许储存截止时间</p>
                  <p className="mt-2.5 text-lg font-semibold text-gray-900">{st.deadline}</p>
                </div>
              </div>
              {/* 下方一行辅助信息（标签灰、数值深色，无分隔线） */}
              <p className="mt-3 text-xs text-gray-400">
                已储存 <span className="font-medium text-gray-700">{st.storedHours}</span> 小时
                <span className="mx-1.5">·</span>
                储存上限 <span className="font-medium text-gray-700">{st.limitHours}</span> 小时
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* 左侧主区域：预测趋势 / 关联参数表 */}
        <div className="space-y-3 xl:col-span-2">
          <Card title={`${defect.name}风险预测趋势`}>
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

      {/* 预测详情抽屉：辅助字段收纳（默认不展开）；缺陷名称 / 预测对象置首，水分口径字段仅成品水分对象展示 */}
      <Drawer open={detailOpen} onClose={() => setDetailOpen(false)} title="预测详情" width={440}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <SummaryItem label="缺陷名称" value={defect.name} />
          <SummaryItem label="预测对象" value={activeObject.key} />
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
          <SummaryItem label="预测窗口" value={forecast.status === "ok" ? `未来${windowTextOf(forecast)}` : "—"} />
          {forecast.moisture && (
            <>
              <SummaryItem label="成品水分标准值" value={`${forecast.moisture.std}（${forecast.moisture.overText}）`} />
              <SummaryItem label="允差范围" value={forecast.moisture.range} />
              <SummaryItem label="预测成品水分" value={forecast.moisture.predicted} />
              <SummaryItem label="相对标准值偏差" value={forecast.moisture.dev} />
            </>
          )}
          {st && (
            <>
              <SummaryItem
                label="储存状态"
                value={
                  st.remainingHours < 0
                    ? `已超时 ${-st.remainingHours} 小时`
                    : st.remainingHours === 0
                      ? "已达上限"
                      : `剩余可储存 ${st.remainingHours} 小时`
                }
                valueCls={
                  st.remainingHours < 0
                    ? "text-red-600"
                    : st.remainingHours === 0
                      ? "text-orange-600"
                      : "text-gray-900"
                }
              />
              <SummaryItem label="允许储存截止时间" value={st.deadline} />
              <SummaryItem label="已储存时长" value={`${st.storedHours} 小时`} />
              <SummaryItem label="储存时长上限" value={`${st.limitHours} 小时`} />
              {st.totalHours !== undefined && (
                <SummaryItem label="预计总储存时长" value={`${st.totalHours} 小时`} />
              )}
              {st.outbound && <SummaryItem label="预计出库时间" value={st.outbound} />}
            </>
          )}
          <SummaryItem label="预测更新时间" value={UPDATED_AT} />
        </div>
      </Drawer>
    </div>
  );
}
