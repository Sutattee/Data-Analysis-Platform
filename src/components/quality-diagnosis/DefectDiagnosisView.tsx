"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  LabelList,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import { DefectDiagnosisDrawer } from "@/components/quality-defect/DefectDiagnosisDrawer";
import {
  DEFECT_CATALOG,
  DEFECT_RECORDS,
  catalogOf,
  codeStats,
  distAll,
  filterByRange,
  freqTrendOf,
  listDiagnoses,
  occurrenceContextOf,
  periodRange,
  type DiagnosisItem,
} from "@/lib/mock-data/quality-defect";

// 筛选下拉选项：部位（档案去重）/ 类别
const PART_OPTIONS = Array.from(new Set(DEFECT_CATALOG.map((c) => c.part)));
const GRADE_OPTIONS = ["A", "B", "C", "D"];

// ISO → 9/25
function md(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

// 次数劣化时 ↑ 橙 / ↓ 绿
const badUpCls = (v: number) => {
  if (v === 0) return "text-gray-400";
  return v > 0 ? "text-orange-500" : "text-green-600";
};

// 分布图维度 TAB（默认机台，展示全部取值）
const DIST_DIMS = [
  { key: "machine" as const, label: "机台" },
  { key: "brand" as const, label: "牌号" },
  { key: "shift" as const, label: "班组" },
];

// 横向条形图（分布图共用）：条侧标注次数（牌号另加占比）
function RankBarChart({
  data,
  labelMode,
}: {
  data: { name: string; count: number }[];
  labelMode: "count" | "countPct";
}) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const chartData = data.map((d) => {
    const pct = ((d.count / total) * 100).toFixed(1);
    return { ...d, pct, label: labelMode === "countPct" ? `${d.count}条 · ${pct}%` : `${d.count}条` };
  });

  if (chartData.length === 0) {
    return <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">暂无数据</div>;
  }

  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 72, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" width={96} />
          <Tooltip
            cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { name: string; count: number; pct: string };
              return (
                <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-gray-800">{d.name}</p>
                  <p className="text-gray-500">发生次数：{d.count}条</p>
                  <p className="text-gray-500">次数占比：{d.pct}%</p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" name="发生次数" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14}>
            <LabelList dataKey="label" position="right" style={{ fontSize: 10, fill: "#6b7280" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 频次趋势异常点（单日 ≥3 条）红色大点
function renderTrendDot(props: any) {
  const { cx, cy, payload } = props;
  if (payload?.abnormal) {
    return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />;
  }
  return <circle cx={cx} cy={cy} r={2.5} fill="#3b82f6" />;
}

// 缺陷诊断页主视图：单缺陷代码视角的频次统计 + 诊断明细管理
// 筛选区（部位/类别/缺陷名称/检验日期）为草稿态，点「查询」提交生效
export function DefectDiagnosisView() {
  const searchParams = useSearchParams();
  const initCode = searchParams.get("code");
  const defaultRange = periodRange(1);
  // 草稿态（筛选区控件绑定）
  const [draftPart, setDraftPart] = useState("all");
  const [draftGrade, setDraftGrade] = useState("all");
  const [draftCode, setDraftCode] = useState(
    initCode && DEFECT_CATALOG.some((c) => c.code === initCode) ? initCode : "all"
  );
  const [draftFrom, setDraftFrom] = useState(defaultRange.from);
  const [draftTo, setDraftTo] = useState(defaultRange.to);
  // 应用态（驱动指标卡 / 图表 / 诊断明细）
  const [part, setPart] = useState("all");
  const [grade, setGrade] = useState("all");
  const [code, setCode] = useState(
    initCode && DEFECT_CATALOG.some((c) => c.code === initCode) ? initCode : "all"
  );
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<DiagnosisItem | null>(null); // 抽屉目标行（查看已判定 / 判定未判定共用）
  const [rev, setRev] = useState(0); // 编辑保存后刷新列表（会话级 store 版本号）
  const [distDim, setDistDim] = useState<"machine" | "brand" | "shift">("machine"); // 分布图维度（默认机台）
  const [diagStatus, setDiagStatus] = useState("all"); // 诊断明细「诊断状态」表头筛选

  const stats = useMemo(() => codeStats(code, from, to), [code, from, to]);
  const momPct =
    stats.prevCount > 0 ? (stats.momCount / stats.prevCount) * 100 : stats.count > 0 ? 100 : 0;

  // 缺陷名称选项：随草稿态 部位/类别 联动过滤（仅列出范围内的档案项）
  const codeOptions = useMemo(
    () =>
      DEFECT_CATALOG.filter(
        (c) => (draftPart === "all" || c.part === draftPart) && (draftGrade === "all" || c.grade === draftGrade)
      ),
    [draftPart, draftGrade]
  );

  // 图表数据：当前时间窗内该缺陷代码的记录
  const curRecords = useMemo(
    () => filterByRange(DEFECT_RECORDS, from, to).filter((r) => code === "all" || r.code === code),
    [code, from, to]
  );
  // 分布图数据：当前维度全部取值（不合并「其他」）
  const distData = useMemo(() => distAll(curRecords, distDim), [curRecords, distDim]);
  const freqData = useMemo(() => freqTrendOf(code, from, to), [code, from, to]);

  // 诊断明细：按 名称/部位/类别/诊断状态 + 检验日期（关联发生记录的日期）过滤，倒序
  const diagnoses = useMemo(() => {
    return listDiagnoses()
      .filter((d) => {
        const cat = catalogOf(d.code);
        const occDate = occurrenceContextOf(d.code, d.recordDate)?.date ?? d.recordDate;
        const judged = !!(d.causeType && d.conclusion);
        return (
          (code === "all" || d.code === code) &&
          (part === "all" || cat?.part === part) &&
          (grade === "all" || cat?.grade === grade) &&
          (diagStatus === "all" || (diagStatus === "judged" ? judged : !judged)) &&
          occDate >= from &&
          occDate <= to
        );
      })
      .sort((a, b) => b.recordDate.localeCompare(a.recordDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, part, grade, diagStatus, from, to, rev]);

  const totalPages = Math.max(1, Math.ceil(diagnoses.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = diagnoses.slice((safePage - 1) * pageSize, safePage * pageSize);

  // 查询：提交草稿态到应用态
  function handleSearch() {
    setPart(draftPart);
    setGrade(draftGrade);
    setCode(draftCode);
    setFrom(draftFrom);
    setTo(draftTo);
    setPage(1);
  }

  function handleReset() {
    setDraftPart("all");
    setDraftGrade("all");
    setDraftCode("all");
    setDraftFrom(defaultRange.from);
    setDraftTo(defaultRange.to);
    setPart("all");
    setGrade("all");
    setCode("all");
    setFrom(defaultRange.from);
    setTo(defaultRange.to);
    setPage(1);
  }

  // 部位/类别（草稿态）变化：当前选中名称不在新过滤范围内时自动重置为「全部」
  function changeDraftPart(v: string) {
    setDraftPart(v);
    const cat = draftCode === "all" ? undefined : catalogOf(draftCode);
    if (cat && v !== "all" && cat.part !== v) setDraftCode("all");
  }

  function changeDraftGrade(v: string) {
    setDraftGrade(v);
    const cat = draftCode === "all" ? undefined : catalogOf(draftCode);
    if (cat && v !== "all" && cat.grade !== v) setDraftCode("all");
  }

  const dateCls =
    "px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
  const selCls =
    "px-2.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";

  const th = "text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";
  const cardCls =
    "rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">缺陷诊断</h1>

      {/* 筛选区：部位 / 类别 / 缺陷名称 / 检验日期 + 查询/重置（点查询后生效） */}
      <Card>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">缺陷部位</span>
            <select value={draftPart} onChange={(e) => changeDraftPart(e.target.value)} className={selCls}>
              <option value="all">全部</option>
              {PART_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">类别</span>
            <select value={draftGrade} onChange={(e) => changeDraftGrade(e.target.value)} className={selCls}>
              <option value="all">全部</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">缺陷名称</span>
            <div className="w-60">
              <SearchSelect
                options={[
                  { value: "all", label: "全部" },
                  ...codeOptions.map((c) => ({ value: c.code, label: `${c.name} ${c.code}` })),
                ]}
                value={draftCode}
                onChange={setDraftCode}
                placeholder="搜索..."
              />
            </div>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">检验日期</span>
            <input type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} className={dateCls} />
            <span className="text-xs text-gray-400">至</span>
            <input type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} className={dateCls} />
          </label>
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>
            重置
          </Button>
        </div>
      </Card>

      {/* 3 指标卡（标题 + 数值两行） */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className={cardCls}>
          <div className="mb-1 text-xs text-gray-500">缺陷发生次数</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{stats.count}</span>
            <span className="text-sm text-gray-400">次</span>
          </div>
        </div>

        <div className={cardCls}>
          <div className="mb-1 text-xs text-gray-500">较上一周期</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${badUpCls(stats.momCount)}`}>
              {momPct > 0 ? "↑" : momPct < 0 ? "↓" : ""}
              {Math.abs(momPct).toFixed(1)}%
            </span>
            <span className={`text-sm ${badUpCls(stats.momCount)}`}>
              {stats.momCount > 0 ? "+" : ""}
              {stats.momCount}次
            </span>
          </div>
        </div>

        <div className={cardCls}>
          <div className="mb-1 text-xs text-gray-500">占同部位缺陷比例</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{stats.sharePct.toFixed(1)}</span>
            <span className="text-sm text-gray-400">%</span>
            <span className="ml-1 text-xs text-gray-400">
              {stats.shareNum}/{stats.shareDen}条
            </span>
          </div>
        </div>
      </div>

      {/* 2 图表：频次趋势 + 缺陷发生次数分布（TAB 切换 机台/牌号/班组） */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="近期频次趋势">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={freqData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={md} tick={{ fontSize: 10 }} stroke="#9ca3af" minTickGap={28} />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { date: string; count: number; abnormal: boolean };
                    return (
                      <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
                        <p className="text-gray-500">日期：{md(d.date)}</p>
                        <p className="text-gray-800">发生次数：{d.count}条</p>
                        {d.abnormal && <p className="text-red-500">异常上升</p>}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="发生次数"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={renderTrendDot}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding={false}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-800">缺陷发生次数分布</h3>
            {/* 维度切换 tab：默认机台，展示全部取值 */}
            <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5">
              {DIST_DIMS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDistDim(key)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    distDim === key
                      ? "bg-white font-medium text-primary-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3">
            <RankBarChart data={distData} labelMode={distDim === "brand" ? "countPct" : "count"} />
          </div>
        </Card>
      </div>

      {/* 诊断明细列表 */}
      <Card padding={false}>
        <div className="border-b border-gray-50 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-800">诊断明细</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-100">
                <th className={th}>工序</th>
                <th className={th}>缺陷部位</th>
                <th className={th}>缺陷名称</th>
                <th className={th}>缺陷代码</th>
                <th className={th}>责任岗位</th>
                <th className={th}>AI诊断原因</th>
                <th className={th}>原因分类</th>
                <th className={th}>诊断结论</th>
                {/* 诊断状态：表头内嵌筛选（全部/已判定/待判定） */}
                <th className={th}>
                  <div className="flex items-center">
                    诊断状态
                    <select
                      value={diagStatus}
                      onChange={(e) => {
                        setDiagStatus(e.target.value);
                        setPage(1);
                      }}
                      className="ml-1 max-w-[96px] truncate rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs font-normal text-gray-600 outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="all">全部</option>
                      <option value="judged">已判定</option>
                      <option value="pending">待判定</option>
                    </select>
                  </div>
                </th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-sm text-gray-400">
                    所选条件下暂无诊断明细
                  </td>
                </tr>
              ) : (
                pageRows.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{d.process}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{catalogOf(d.code)?.part ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{catalogOf(d.code)?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-gray-700">{d.code}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{d.post}</td>
                    <td className="max-w-[180px] truncate px-3 py-2.5 text-xs text-gray-600" title={d.aiCause}>
                      {d.aiCause}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {d.causeType ? (
                        <span className="text-gray-700">{d.causeType}</span>
                      ) : (
                        <span className="text-gray-400">待判定</span>
                      )}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2.5 text-xs" title={d.conclusion}>
                      {d.conclusion ? (
                        <span className="text-gray-700">{d.conclusion}</span>
                      ) : (
                        <span className="text-gray-400">待填写</span>
                      )}
                    </td>
                    {/* 诊断状态：与操作按钮同口径（原因分类 + 诊断结论均已填写 = 已判定） */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {d.causeType && d.conclusion ? (
                        <span className="font-medium text-green-600">已判定</span>
                      ) : (
                        <span className="text-gray-500">待判定</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:bg-primary-50" onClick={() => setEditing(d)}>
                        {d.causeType && d.conclusion ? "查看" : "判定"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 px-4 py-3">
          <Pagination
            total={diagnoses.length}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {/* 查看已判定 / 判定未判定：共用缺陷诊断详情抽屉 */}
      <DefectDiagnosisDrawer
        item={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => setRev((n) => n + 1)}
      />
    </div>
  );
}
