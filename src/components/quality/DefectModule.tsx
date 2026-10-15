"use client";

import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  DEFECT_GRADES,
  DEFECT_PARTS,
  DEFECT_TOTAL,
  TOP_DEFECTS,
  EMERGING_DEFECTS,
  type DefectSlice,
} from "@/lib/mock-data/quality";

// 扇区渲染：Tooltip 激活（hover）的扇区外半径 +6，实现「移入变大」（Recharts 3 通过 shape + isActive 实现）
function renderSector(props: any) {
  return <Sector {...props} outerRadius={props.outerRadius + (props.isActive ? 6 : 0)} />;
}

// 通用饼图 Tooltip
function SliceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as DefectSlice;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-gray-800">{d.name}</p>
      <p className="text-gray-500">
        {d.value} 条 · {((d.value / DEFECT_TOTAL) * 100).toFixed(1)}%
      </p>
    </div>
  );
}

// 可 hover 放大的小尺寸饼图 / 环形图（外径统一 54 保证直径一致，明细见右侧图例）
function HoverPie({ data, innerRadius }: { data: DefectSlice[]; innerRadius?: number }) {
  return (
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={innerRadius}
        outerRadius={54}
        isAnimationActive={false}
        shape={renderSector}
      >
        {data.map((s) => (
          <Cell key={s.name} fill={s.color} />
        ))}
      </Pie>
      <Tooltip content={<SliceTooltip />} />
    </PieChart>
  );
}

// 右侧图例：色块 + 名称 + 条数与占比（按数量倒序排列，文字用深灰保证可读；左移贴近图表）
function PieLegend({ data }: { data: DefectSlice[] }) {
  return (
    <ul className="-ml-3 w-28 shrink-0 space-y-1.5">
      {[...data].sort((a, b) => b.value - a.value).map((s) => (
        <li key={s.name} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} />
          <span className="whitespace-nowrap text-xs font-medium text-gray-700">{s.name}</span>
          <span className="ml-auto whitespace-nowrap text-[11px] text-gray-500">
            {s.value}条 · {((s.value / DEFECT_TOTAL) * 100).toFixed(0)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

// 模块一「缺陷」（近1个月）：部位分布环形图（中心总数）/ 等级分布饼图 /
// Top5 横向条形图（条侧标注条数·占比）/ 新冒头缺陷滚动列表（默认 4 条），四图并列
export function DefectModule() {
  const router = useRouter();
  const chartTitle = "mb-2 text-xs font-medium text-gray-500";

  return (
    <Card padding={false}>
      {/* 模块头：标题 + 统计口径 + 查看全部 */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-50 px-5 py-4">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-gray-800">缺陷</h3>
          <span className="text-xs text-gray-400">近1个月</span>
        </div>
        <Button size="sm" onClick={() => router.push("/quality/defect-analysis")}>
          查看全部
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
        {/* 缺陷部位分布（环形图中心展示缺陷总数 + 右侧图例，hover 扇区放大） */}
        <div>
          <h4 className={chartTitle}>缺陷部位分布</h4>
          <div className="flex items-center gap-2">
            <div className="relative h-[170px] min-w-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <HoverPie data={DEFECT_PARTS} innerRadius={34} />
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-gray-400">缺陷总数</span>
                <span className="text-base font-bold text-gray-900">{DEFECT_TOTAL} 条</span>
              </div>
            </div>
            <PieLegend data={DEFECT_PARTS} />
          </div>
        </div>

        {/* 缺陷等级分布（饼图缩小 + 右侧图例，hover 扇区放大） */}
        <div>
          <h4 className={chartTitle}>缺陷等级分布</h4>
          <div className="flex items-center gap-2">
            <div className="h-[170px] min-w-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <HoverPie data={DEFECT_GRADES} />
              </ResponsiveContainer>
            </div>
            <PieLegend data={DEFECT_GRADES} />
          </div>
        </div>

        {/* Top5 缺陷排名（横向条形图，条侧标注条数与占比） */}
        <div>
          <h4 className={chartTitle}>Top5 缺陷排名</h4>
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={TOP_DEFECTS}
                layout="vertical"
                margin={{ top: 0, right: 64, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" hide domain={[0, 10]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                  width={88}
                />
                <Tooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.06)" }}
                  formatter={(v: any) => [`${v} 条 · ${((v / DEFECT_TOTAL) * 100).toFixed(1)}%`, "缺陷数"]}
                />
                <Bar dataKey="count" name="缺陷数" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10}>
                  {/* 条形右侧标注：条数 · 占比（自定义渲染强制单行，避免 Recharts 自动折行） */}
                  <LabelList
                    dataKey="count"
                    content={(props: any) => {
                      const { x, y, width, height, value } = props;
                      if (value == null) return null;
                      return (
                        <text
                          x={x + width + 4}
                          y={y + height / 2}
                          fill="#6b7280"
                          fontSize={9}
                          dominantBaseline="middle"
                        >
                          {value}条 · {((value / DEFECT_TOTAL) * 100).toFixed(1)}%
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 新冒头缺陷（按日期倒序，默认展示 4 条，滚动区域表头固定） */}
        <div>
          <h4 className={chartTitle}>新冒头缺陷</h4>
          <div className="max-h-[170px] overflow-auto rounded-lg border border-gray-100">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-2.5 py-2 font-medium whitespace-nowrap">缺陷名称</th>
                  <th className="px-2.5 py-2 font-medium whitespace-nowrap">批次</th>
                  <th className="px-2.5 py-2 font-medium whitespace-nowrap">机台</th>
                  <th className="px-2.5 py-2 font-medium whitespace-nowrap">日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {EMERGING_DEFECTS.map((d) => (
                  <tr key={d.id} className="bg-white transition-colors hover:bg-gray-50">
                    <td className="px-2.5 py-2 whitespace-nowrap text-gray-800">{d.name}</td>
                    <td className="px-2.5 py-2 font-mono text-[10px] whitespace-nowrap text-gray-500">{d.batch}</td>
                    <td className="px-2.5 py-2 whitespace-nowrap text-gray-600">{d.machine}</td>
                    <td className="px-2.5 py-2 whitespace-nowrap text-gray-500">{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}
