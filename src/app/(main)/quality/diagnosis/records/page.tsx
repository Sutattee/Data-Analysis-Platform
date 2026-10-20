"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import {
  DIAG_CATALOG,
  catalogOf,
  causeSourceOf,
  causeTextOf,
  diagCatalogOf,
  listDiagnoses,
  periodRange,
  type DiagnosisItem,
} from "@/lib/mock-data/quality-defect";
import { DefectDiagnosisDrawer } from "@/components/quality-defect/DefectDiagnosisDrawer";

// 档案双口径查找：诊断域数据为 3 缺陷口径；缺陷分析页人工判定可能追加全量档案缺陷的记录
function catOf(code: string) {
  return catalogOf(code) ?? diagCatalogOf(code);
}

// 表头筛选字段（诊断人）
interface HeadFilters {
  diagnoser: string;
}

const DEFAULT_HEAD: HeadFilters = { diagnoser: "all" };

// 诊断时间 2026/09/02 10:12:35 → ISO 日期 2026-09-02（与 date 输入比较）；未修正行回退登记日期
function diagDateOf(d: DiagnosisItem): string {
  return d.diagnosedAt ? d.diagnosedAt.slice(0, 10).replaceAll("/", "-") : d.recordDate;
}

// 诊断记录：仅已判定（人工修正过 = 原因类型人工补录）的记录；
// 筛选区为草稿态，点「查询」提交生效；表头列筛选即时联动
export default function DiagnosisRecordsPage() {
  const defaultRange = periodRange(1);
  // 草稿态（筛选区控件绑定）与应用态（驱动数据）分离，查询按钮提交
  const [draftCode, setDraftCode] = useState("all");
  const [draftFrom, setDraftFrom] = useState(defaultRange.from);
  const [draftTo, setDraftTo] = useState(defaultRange.to);
  const [code, setCode] = useState("all");
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [head, setHead] = useState<HeadFilters>(DEFAULT_HEAD);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewing, setViewing] = useState<DiagnosisItem | null>(null); // 查看详情抽屉目标行
  const [rev, setRev] = useState(0); // 原因修正保存后刷新列表（会话级 store 版本号）

  // 基础数据：仅已判定（人工修正过）记录，按 缺陷代码 + 诊断时间范围 过滤（数据量小，直接计算）
  const base = useMemo(
    () =>
      listDiagnoses()
        .filter((d) => d.causeText && (code === "all" || d.code === code) && diagDateOf(d) >= from && diagDateOf(d) <= to)
        .sort((a, b) => diagDateOf(b).localeCompare(diagDateOf(a))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, from, to, rev]
  );

  // 表头筛选选项（随基础数据联动）
  function uniqValues(pick: (d: DiagnosisItem) => string): string[] {
    return Array.from(new Set(base.map(pick).filter(Boolean))).sort();
  }

  // 最终行：叠加表头筛选
  const rows = base.filter((d) => head.diagnoser === "all" || d.diagnoser === head.diagnoser);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  // 查询：提交草稿态到应用态（表头筛选保持即时联动）
  function handleSearch() {
    setCode(draftCode);
    setFrom(draftFrom);
    setTo(draftTo);
    setPage(1);
  }

  function handleReset() {
    setDraftCode("all");
    setDraftFrom(defaultRange.from);
    setDraftTo(defaultRange.to);
    setCode("all");
    setFrom(defaultRange.from);
    setTo(defaultRange.to);
    setHead(DEFAULT_HEAD);
    setPage(1);
  }

  const dateCls =
    "px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
  const selCls =
    "w-60 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
  const headSelCls =
    "ml-1 max-w-[130px] truncate rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs font-normal text-gray-600 outline-none focus:ring-1 focus:ring-primary-500";
  const th = "text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  // 表头筛选 th：列名 + 内嵌 select（全部 + 去重值）
  function FilterTh({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
  }) {
    return (
      <th className={th}>
        <div className="flex items-center">
          {label}
          <select value={value} onChange={(e) => { onChange(e.target.value); setPage(1); }} className={headSelCls}>
            <option value="all">全部</option>
            {options.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">诊断记录</h1>

      {/* 筛选区：缺陷名称（固定选项，不支持搜索）+ 诊断时间范围 + 查询/重置（点查询后生效） */}
      <Card>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">缺陷名称</span>
            <select value={draftCode} onChange={(e) => setDraftCode(e.target.value)} className={selCls}>
              <option value="all">全部</option>
              {DIAG_CATALOG.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} {c.code}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">诊断时间</span>
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

      {/* 记录列表：名称/代码列置前，诊断人表头支持筛选 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-100">
                <th className={th}>缺陷名称</th>
                <th className={th}>缺陷代码</th>
                <th className={th}>缺陷部位</th>
                <th className={th}>工序</th>
                <th className={th}>责任岗位</th>
                <th className={th}>缺陷原因</th>
                <th className={th}>原因类型</th>
                <FilterTh
                  label="诊断人"
                  value={head.diagnoser}
                  options={uniqValues((d) => d.diagnoser ?? "")}
                  onChange={(v) => setHead((h) => ({ ...h, diagnoser: v }))}
                />
                <th className={th}>诊断时间</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-sm text-gray-400">
                    所选条件下暂无诊断记录
                  </td>
                </tr>
              ) : (
                pageRows.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{catOf(d.code)?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-gray-700">{d.code}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{catOf(d.code)?.part ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{d.process}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{d.post}</td>
                    <td className="max-w-[280px] truncate px-3 py-2.5 text-xs text-gray-600" title={causeTextOf(d)}>
                      {causeTextOf(d)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {causeSourceOf(d) === "人工补录" ? (
                        <span className="font-medium text-primary-700">人工补录</span>
                      ) : (
                        <span className="text-gray-500">AI生成</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{d.diagnoser ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">{d.diagnosedAt ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:bg-primary-50" onClick={() => setViewing(d)}>
                        查看
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
            total={rows.length}
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

      {/* 查看详情：与诊断详情抽屉一致（缺陷原因展示 + 可修正，保存后列表同源刷新） */}
      <DefectDiagnosisDrawer
        item={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
        onSaved={() => setRev((n) => n + 1)}
      />
    </div>
  );
}
