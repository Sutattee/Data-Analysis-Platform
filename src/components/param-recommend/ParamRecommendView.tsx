"use client";

// 工艺参数推荐主视图：以加香出口水分达标为目标，按 牌号 × 机台 × 历史参考期 生成参数建议
// 上卡「生产条件与当前工况」：推荐条件行（牌号/机台联动 + 参考期 + 生成按钮）+ 当前工况网格（可手工编辑）；
// 下卡「参数建议」：5 列结果表；生成后条件或工况再变更 → 提示重新生成，防止快照与已生成建议错配
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import {
  MIN_SAMPLES,
  RECOMMEND_BRANDS,
  conditionOf,
  defaultRange,
  machinesOfBrand,
  recommendOf,
  todayISO,
  type ConditionSnapshot,
  type RecommendResult,
} from "@/lib/mock-data/param-recommend";

const dateCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
const selCls =
  "px-2.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
// 数值输入框：纯手输（隐藏浏览器原生增减按钮，保留 number 类型的输入校验）
const numCls =
  "w-24 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-800 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const th = "text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";
const td = "px-3 py-2.5 whitespace-nowrap";

// 工况只读字段
function CondField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
  );
}

// 工况可编辑数值字段（支持手工修正，变更后需重新生成）
function CondNumField({
  label,
  unit,
  value,
  onChange,
  step,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  step: string;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-gray-500">{label}</div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className={numCls}
        />
        <span className="text-xs text-gray-400">{unit}</span>
      </div>
    </div>
  );
}

// 调整量样式：数值灰黑 / 无需调整与 — 降灰
function deltaCls(d: string): string {
  if (d === "—") return "text-gray-300";
  if (d === "无需调整") return "text-gray-400";
  return "font-medium text-gray-700";
}

export function ParamRecommendView() {
  const initBrand = RECOMMEND_BRANDS[0];
  const initMachine = machinesOfBrand(initBrand)[0];
  const [brand, setBrand] = useState(initBrand);
  const [machine, setMachine] = useState(initMachine);
  const [from, setFrom] = useState(() => defaultRange().from);
  const [to, setTo] = useState(() => defaultRange().to);
  // 工况（牌号/机台变更自动重取；支持手工编辑，重新生成时重新获取并校验）
  const [cond, setCond] = useState<ConditionSnapshot>(() => conditionOf(initBrand, initMachine));
  // 生成结果（null = 未生成）；生成后条件或工况变更 → stale 提示重新生成
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [stale, setStale] = useState(false);

  const today = todayISO();
  // 历史参考期校验：起止完整、开始 ≤ 结束、结束 ≤ 当前日期
  const dateError =
    !from || !to
      ? "请选择历史参考期起止日期"
      : from > to
        ? "开始日期不得晚于结束日期"
        : to > today
          ? "结束日期不得晚于当前日期"
          : "";
  const canGenerate = !!brand && !!machine && !dateError;

  // 已生成结果失效（条件或工况变更后调用）
  function invalidate() {
    if (result && !stale) setStale(true);
  }

  // 切换牌号：机台选项随之联动，原机台不适用时重置为首个适用机台，工况重取
  function changeBrand(v: string) {
    const machines = machinesOfBrand(v);
    const next = machines.includes(machine) ? machine : machines[0];
    setBrand(v);
    if (next !== machine) setMachine(next);
    setCond(conditionOf(v, next));
    invalidate();
  }

  function changeMachine(v: string) {
    setMachine(v);
    setCond(conditionOf(brand, v));
    invalidate();
  }

  function changeFrom(v: string) {
    setFrom(v);
    invalidate();
  }

  function changeTo(v: string) {
    setTo(v);
    invalidate();
  }

  function editCond(patch: Partial<ConditionSnapshot>) {
    setCond((c) => ({ ...c, ...patch }));
    invalidate();
  }

  // 生成推荐：首次生成沿用当前工况（可含手工修正）；重新生成重新获取工况快照（丢弃手工编辑）再计算
  function handleGenerate() {
    const snapshot = result ? conditionOf(brand, machine) : cond;
    if (result) setCond(snapshot);
    setResult(recommendOf(brand, machine, from, to, snapshot.inflowMoisture));
    setStale(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">工艺参数推荐</h1>
        <p className="mt-0.5 text-sm text-gray-500">以加香出口水分达标为目标，结合当前工况与历史达标表现生成的参数建议，供参考</p>
      </div>

      {/* ===== 区域一：生产条件与当前工况 ===== */}
      <Card title="生产条件与当前工况">
        {/* 推荐条件：牌号（单选）→ 机台（随牌号联动）+ 历史参考期 + 生成推荐 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">牌号</span>
            <div className="w-40">
              <SearchSelect
                options={RECOMMEND_BRANDS.map((b) => ({ value: b, label: b }))}
                value={brand}
                onChange={changeBrand}
                placeholder="搜索..."
              />
            </div>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">机台</span>
            <select value={machine} onChange={(e) => changeMachine(e.target.value)} className={selCls}>
              {machinesOfBrand(brand).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">历史参考期</span>
            <input type="date" max={today} value={from} onChange={(e) => changeFrom(e.target.value)} className={dateCls} />
            <span className="text-xs text-gray-400">至</span>
            <input type="date" max={today} value={to} onChange={(e) => changeTo(e.target.value)} className={dateCls} />
          </label>
          <Button onClick={handleGenerate} disabled={!canGenerate}>
            {result ? "重新生成推荐" : "生成推荐"}
          </Button>
        </div>
        {dateError && <p className="mt-2 text-xs text-red-500">{dateError}</p>}

        {/* 当前工况：自动读取所选牌号、机台及当前批次匹配数据；前两项可手工修正 */}
        <div className="mt-4 border-t border-gray-50 pt-4">
          <div className="mb-2.5 text-xs font-medium text-gray-500">当前工况</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-6">
            <CondNumField
              label="来料水分"
              unit="%"
              step="0.1"
              value={cond.inflowMoisture}
              onChange={(v) => editCond({ inflowMoisture: v })}
            />
            <CondNumField
              label="物料流量"
              unit="kg/h"
              step="10"
              value={cond.flowRate}
              onChange={(v) => editCond({ flowRate: v })}
            />
            <CondField label="配方版本" value={cond.recipeVer} />
            <CondField label="当前批次" value={cond.batch} />
            <CondField label="工况采集时间" value={cond.collectedAt} />
            <CondField label="出口水分达标标准" value={cond.standardText} />
          </div>
        </div>
      </Card>

      {/* ===== 区域二：参数建议 ===== */}
      <Card title="参数建议">
        {!result ? (
          <div className="flex h-[160px] items-center justify-center text-sm text-gray-400">
            请选择牌号与机台，点击「生成推荐」生成参数建议
          </div>
        ) : stale ? (
          <div className="flex h-[160px] items-center justify-center text-sm text-gray-400">
            推荐条件或工况已变更，请重新生成推荐
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className={th}>工艺参数</th>
                    <th className={th}>单位</th>
                    <th className={th}>当前设定值</th>
                    <th className={th}>建议设定值</th>
                    <th className={th}>调整量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.rows.map((r) => (
                    <tr key={r.key} className="transition-colors hover:bg-gray-50">
                      <td className={`${td} text-gray-700`}>{r.name}</td>
                      <td className={`${td} text-gray-500`}>{r.unit}</td>
                      <td className={`${td} text-gray-700`}>{r.current}</td>
                      <td className={`${td} font-semibold text-primary-700`}>{r.suggest}</td>
                      <td className={`${td} ${deltaCls(r.delta)}`}>{r.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.insufficient && (
              <p className="mt-2 text-xs text-gray-400">
                所选参考期内匹配有效历史样本 {result.sampleCount} 条，低于最低样本要求（{MIN_SAMPLES} 条），未生成数值建议。
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
