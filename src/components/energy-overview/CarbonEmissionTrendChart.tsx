"use client";

import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { Card } from "@/components/ui/Card";
import { GRADE_STYLE, type AnomalyDetail } from "@/lib/mock-data/grid-forecast";
import { CARBON_MONTHLY, buildOverviewAnomaly } from "@/lib/mock-data/energy-overview";

const NAME_MAP: Record<string, string> = { actual: "实际值", target: "目标值" };

// 单位产量碳排放趋势：按月展示实际值与目标值，支持箱/万支单位切换
export function CarbonEmissionTrendChart({ onAnomaly }: { onAnomaly: (d: AnomalyDetail) => void }) {
  const [unitMode, setUnitMode] = useState<"万支" | "箱">("万支");
  // 序列基准口径即 kg CO₂/万支，箱 = 万支 × 5（1箱 = 5万支）
  const convertFactor = unitMode === "万支" ? 1 : 5;
  const unitLabel = unitMode === "万支" ? "kg CO₂/万支" : "kg CO₂/箱";
  // 标题中的单位缩写（如 CO₂/箱、CO₂/万支）
  const unitShort = unitMode === "万支" ? "CO₂/万支" : "CO₂/箱";

  // 转换数据：万支 → 箱 换算
  const data = useMemo(() => {
    return CARBON_MONTHLY.map((d) => ({
      ...d,
      actual: d.actual * convertFactor,
      target: d.target ? d.target * convertFactor : undefined,
    }));
  }, [convertFactor]);

  function handleClick(e: any) {
    if (!e?.activeLabel) return;
    const pt = data.find((d) => d.date === e.activeLabel);
    // 按当前单位口径（万支 / 箱）生成异常详情，数值与单位保持一致
    if (pt?.anomaly) onAnomaly(buildOverviewAnomaly("carbon", pt, { unit: unitLabel }));
  }

  return (
    <Card
      title={`🌱 单位产量碳排放趋势（按月 ${unitShort}）`}
      headerRight={
        <span className="flex items-center text-xs leading-none">
          <button
            type="button"
            onClick={() => setUnitMode("万支")}
            className={unitMode === "万支" ? "font-medium text-primary-600" : "text-gray-400 hover:text-gray-600"}
          >
            万支
          </button>
          <span className="mx-1 text-gray-300">｜</span>
          <button
            type="button"
            onClick={() => setUnitMode("箱")}
            className={unitMode === "箱" ? "font-medium text-primary-600" : "text-gray-400 hover:text-gray-600"}
          >
            箱
          </button>
        </span>
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={2} />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={44} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, n: any) => [`${Number(v).toFixed(3)} ${unitLabel}`, NAME_MAP[n as string] ?? n]}
          />
          <Line type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="4 4" dot={false} name="目标值" />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="实际值" />
          {data
            .filter((d) => d.anomaly)
            .map((d) => (
              <ReferenceDot
                key={d.iso}
                x={d.date}
                y={d.actual}
                r={5}
                fill={GRADE_STYLE[d.anomaly!].color}
                stroke="#fff"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                className="cursor-pointer"
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-blue-500" /> 实际值
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-orange-500" /> 目标值
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" /> 关注
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-orange-500" /> 告警
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" /> 危险
        </span>
      </div>
    </Card>
  );
}
