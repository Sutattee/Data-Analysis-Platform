"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { getCarbonAnomalyDistribution } from "@/lib/mock-data/carbon-eval";

const selectCls =
  "px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";

export function CarbonAnomalyRanking() {
  const router = useRouter();
  const [path, setPath] = useState<string[]>([]);
  const [range, setRange] = useState<"当前发生中" | "24h" | "7d">("当前发生中");

  const level = path.length === 0 ? "workshop" : path.length === 1 ? "grid" : "equipment";
  const parent = path.length > 0 ? path[path.length - 1] : null;
  const data = getCarbonAnomalyDistribution(level, parent, range);

  function drill(name: string) {
    if (level !== "equipment") setPath([...path, name]);
  }

  return (
    <Card
      title="⚠️ 当前异常对象排名"
      headerRight={
        <select className={selectCls} value={range} onChange={(e) => setRange(e.target.value as "当前发生中" | "24h" | "7d")}>
          <option value="当前发生中">当前发生中</option>
          <option value="24h">近24小时全部异常</option>
          <option value="7d">近7日全部异常</option>
        </select>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-gray-500">
        <button className="hover:text-primary-600" onClick={() => setPath([])}>
          全厂
        </button>
        {path.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-gray-300">/</span>
            <button className="hover:text-primary-600" onClick={() => setPath(path.slice(0, i + 1))}>
              {p}
            </button>
          </span>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">✅ 当前范围无异常</div>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-2 border-b border-gray-50 px-2 pb-1 text-xs text-gray-400">
            <span className="col-span-1">排名</span>
            <span className="col-span-3">对象名称</span>
            <span className="col-span-2">异常状态</span>
            <span className="col-span-2 pr-4 text-right">异常数量</span>
            <span className="col-span-2">最高预警等级</span>
            <span className="col-span-2 text-right">操作</span>
          </div>
          {data.map((it, i) => (
            <div key={it.name} className="grid grid-cols-12 items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-gray-50">
              <span className="col-span-1 text-gray-400">{i + 1}</span>
              <span className="col-span-3 flex min-w-0 items-center">
                <button
                  className={`truncate text-left ${
                    level === "equipment" ? "cursor-default text-gray-800" : "text-gray-800 hover:text-primary-600"
                  }`}
                  onClick={() => drill(it.name)}
                >
                  {it.name}
                  {level !== "equipment" && <span className="ml-1 text-primary-500">›</span>}
                </button>
              </span>
              <span className="col-span-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    it.status === "发生中" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {it.status}
                </span>
              </span>
              <span className="col-span-2 pr-4 text-right text-gray-700">{it.count}</span>
              <span className="col-span-2">
                <AlertLevelBadge level={it.maxLevel} />
              </span>
              <span className="col-span-2 text-right">
                <button
                  className="text-primary-600 hover:underline"
                  onClick={() =>
                    router.push(`/alert/records?object=${encodeURIComponent(it.name)}&domain=${encodeURIComponent("碳排放与环保合规")}`)
                  }
                >
                  查看预警记录
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400">
        仅展示碳排放及环保合规业务域异常；点击对象名进入下级，「查看预警记录」跳转预警记录页并带入对象与业务域筛选。
      </p>
    </Card>
  );
}
