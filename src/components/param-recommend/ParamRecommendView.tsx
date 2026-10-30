"use client";

// 工艺参数推荐主视图：以加香出口水分达标为目标，结合牌号 / 产线 / 近 N 批历史自动推荐下一批次加香出口水分。
// 自上而下：筛选栏（产线 Tab + 牌号，历史范围固定近 20 批）→ 下一批次推荐卡 → 左右双图（成品水分趋势 / 达标情况）→ 推荐记录折叠区。
// 产线 / 牌号变化 → 推荐卡短暂降透明度（输入变化自动重算）；推荐依据与批次详情共用抽屉。
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import {
  LINES,
  lineOf,
  nextRecommendationOf,
  type BatchRecord,
} from "@/lib/mock-data/param-recommend";
import { RecommendCard } from "./RecommendCard";
import { MoistureTrendChart } from "./MoistureTrendChart";
import { FlavorComplianceChart } from "./FlavorComplianceChart";
import { RecommendRecords } from "./RecommendRecords";
import { RecommendDrawer } from "./RecommendDrawer";

export function ParamRecommendView() {
  const [lineName, setLineName] = useState("产线A");
  const [brand, setBrand] = useState("娇子");
  const [updating, setUpdating] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<BatchRecord | "next" | null>(null);

  const line = lineOf(lineName);
  const rec = useMemo(() => nextRecommendationOf(lineName), [lineName]);
  const brandOptions = useMemo(() => line.brands.map((b) => ({ value: b, label: b })), [line]);

  // 更新中模拟：产线 / 牌号变化 → 约 800ms 后落定（首挂载不延迟）
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setUpdating(true);
    const timer = setTimeout(() => setUpdating(false), 800);
    return () => clearTimeout(timer);
  }, [lineName, brand]);

  function switchLine(name: string) {
    setLineName(name);
    const next = lineOf(name);
    if (!next.brands.includes(brand)) setBrand(next.brands[0]); // 新产线无当前牌号 → 回落首项
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">工艺参数推荐</h1>
      </div>

      {/* 筛选栏：产线 Tab + 牌号 + 历史范围 */}
      <Card>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <p className="mb-1.5 text-xs text-gray-500">产线</p>
            <div className="flex gap-1.5" role="group" aria-label="产线选择">
              {LINES.map((l) => {
                const active = l.name === lineName;
                return (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => switchLine(l.name)}
                    aria-pressed={active}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary-600 text-white"
                        : "border border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-700"
                    }`}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="w-44">
            <p className="mb-1.5 text-xs text-gray-500">牌号</p>
            <SearchSelect options={brandOptions} value={brand} onChange={setBrand} placeholder="选择牌号" />
          </div>
          {/* 历史范围：仅支持最近 20 个批次（固定展示，不可选择） */}
          <div>
            <p className="mb-1.5 text-xs text-gray-500">历史范围</p>
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">近 20 批</p>
          </div>
        </div>
      </Card>

      {/* 下一批次推荐 */}
      <RecommendCard rec={rec} updating={updating} onShowBasis={() => setDrawerTarget("next")} />

      {/* 左右双图：窄屏上下排列 */}
      <div className="grid gap-4 xl:grid-cols-2">
        <MoistureTrendChart line={lineName} brand={brand} range={20} onRecordClick={setDrawerTarget} />
        <FlavorComplianceChart line={lineName} brand={brand} range={20} onRecordClick={setDrawerTarget} />
      </div>

      {/* 推荐记录：暂时隐藏不展示（组件代码保留，需要时恢复渲染）
      <RecommendRecords line={lineName} brand={brand} rec={rec} onDetail={setDrawerTarget} />
      */}

      {/* 推荐依据 / 批次详情抽屉 */}
      <RecommendDrawer target={drawerTarget} rec={rec} onClose={() => setDrawerTarget(null)} />
    </div>
  );
}
