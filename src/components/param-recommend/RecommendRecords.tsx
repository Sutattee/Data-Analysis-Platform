"use client";

// 推荐记录：默认收起，展开后展示筛选（批次搜索 + 生产日期，联动顶部产线/牌号）+ 分页表格 + 按筛选条件导出 CSV。
// 列口径：批次/牌号合并一列；未开工展示计划时间并标「计划」；待生产批次建议值=当前有效版本，已开工=锁定版本；
// 绝对差仅实际与建议均有效时计算；结果状态颜色标签；水分两位小数（计算用未舍入原值）。
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { StatusTag } from "./StatusTag";
import {
  absDiffOf,
  fmt2,
  recordsOf,
  resultOf,
  type BatchRecord,
  type NextRecommendation,
} from "@/lib/mock-data/param-recommend";

const thCls = "bg-gray-50 px-3 py-2 text-left text-xs font-medium whitespace-nowrap text-gray-500";
const tdCls = "px-3 py-2.5 text-sm whitespace-nowrap text-gray-700";

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** 建议值列：待生产→当前有效版本；已开工→锁定版本；无有效值→原因 */
function adviceCellOf(b: BatchRecord, rec: NextRecommendation): React.ReactNode {
  if (!b.started) {
    if (rec.status === "已生成" && rec.value !== undefined) {
      return (
        <span>
          {fmt2(rec.value)}
          <span className="ml-1 text-xs text-blue-600">当前版本</span>
        </span>
      );
    }
    if (rec.status === "数据不足") return <span className="text-gray-400">历史数据不足 {rec.validCount}/10</span>;
    if (rec.status === "超出工艺范围") return <span className="text-gray-400">未生成有效推荐：超出工艺范围</span>;
    return <span className="text-gray-400">推荐生成失败</span>;
  }
  if (b.dryingAdvice !== null) return fmt2(b.dryingAdvice);
  return <span className="text-gray-400">{b.adviceReason ?? "无有效推荐"}</span>;
}

export function RecommendRecords({
  line,
  brand,
  rec,
  onDetail,
}: {
  line: string;
  brand: string;
  rec: NextRecommendation;
  onDetail: (b: BatchRecord) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 顶部产线 / 牌号切换 → 数据集变化，回第 1 页
  useEffect(() => {
    setPage(1);
  }, [line, brand]);

  // 记录（含待生产、不含取消）→ 批次/工单模糊搜索 + 生产日期范围 → 时间倒序
  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    return recordsOf(line, brand)
      .filter((b) => !k || b.batch.toLowerCase().includes(k) || b.workOrder.toLowerCase().includes(k))
      .filter((b) => {
        const d = (b.startAt ?? b.planStart).slice(0, 10);
        return (!from || d >= from) && (!to || d <= to);
      })
      .sort((a, b) => (b.startAt ?? b.planStart).localeCompare(a.startAt ?? a.planStart));
  }, [line, brand, kw, from, to]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function resetFilters() {
    setKw("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function exportCsv() {
    if (filtered.length === 0) {
      toast("当前筛选下无可导出的记录", "warning");
      return;
    }
    const header = ["批次", "牌号", "工单号", "生产时间", "烘丝建议值(%)", "建议版本", "烘丝实际值(%)", "绝对差(pct)", "加香实际值(%)", "物料关联", "结果状态"];
    const body = filtered.map((b) => {
      const advice =
        !b.started && rec.status === "已生成" && rec.value !== undefined
          ? fmt2(rec.value)
          : b.dryingAdvice !== null
            ? fmt2(b.dryingAdvice)
            : (b.adviceReason ?? "无有效推荐");
      const adviceVer = b.started ? (b.adviceVersion ?? "") : (rec.version ?? "");
      const diff = absDiffOf(b);
      return [
        b.batch,
        b.brand,
        b.workOrder,
        b.started ? (b.startAt ?? b.planStart) : `${b.planStart}（计划）`,
        advice,
        adviceVer,
        b.dryingActual !== null ? fmt2(b.dryingActual) : "待回传",
        diff !== null ? diff.toFixed(2) : "",
        b.flavorActual !== null ? fmt2(b.flavorActual) : "待回传",
        b.flavorLink,
        resultOf(b),
      ];
    });
    const csv = "﻿" + [header, ...body].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `推荐记录_${line}_${brand === "全部" ? "全部牌号" : brand}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`已按当前筛选导出 ${filtered.length} 条记录`, "success");
  }

  const inputCls =
    "rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500";

  return (
    <Card
      title="推荐记录"
      headerRight={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
        >
          {open ? "收起推荐记录 ▴" : "展开推荐记录 ▾"}
        </button>
      }
    >
      {!open ? (
        <p className="py-1 text-sm text-gray-400">
          共 {recordsOf(line, brand).length} 条记录（含待生产批次），点击「展开推荐记录」查看、筛选与导出。
        </p>
      ) : (
        <div className="space-y-3">
          {/* 筛选行：联动顶部产线/牌号 */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={kw}
              onChange={(e) => {
                setKw(e.target.value);
                setPage(1);
              }}
              placeholder="搜索批次号 / 工单号"
              className={`${inputCls} w-48`}
            />
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span>生产日期</span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className={inputCls}
              />
              <span>~</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className={inputCls}
              />
            </div>
            {(kw || from || to) && (
              <button type="button" onClick={resetFilters} className="text-sm text-gray-400 hover:text-gray-600">
                清除筛选
              </button>
            )}
            <span className="ml-auto flex items-center gap-3">
              <span className="text-xs text-gray-400">共 {total} 条</span>
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-700"
              >
                导出 CSV
              </button>
            </span>
          </div>

          {/* 表格 */}
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className={thCls}>批次 / 牌号</th>
                  <th className={thCls}>生产时间</th>
                  <th className={thCls}>烘丝建议值（%）</th>
                  <th className={thCls}>烘丝实际值（%）</th>
                  <th className={thCls}>绝对差（pct）</th>
                  <th className={thCls}>加香实际值（%）</th>
                  <th className={thCls}>结果状态</th>
                  <th className={thCls}>操作</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-400">
                      当前筛选下暂无记录
                    </td>
                  </tr>
                ) : (
                  paged.map((b) => {
                    const diff = absDiffOf(b);
                    return (
                      <tr key={b.batch} className="border-t border-gray-50 hover:bg-gray-50/60">
                        <td className={tdCls}>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">{b.batch}</span>
                            <span className="text-xs text-gray-400">
                              {b.brand} · {b.workOrder}
                            </span>
                          </div>
                        </td>
                        <td className={tdCls}>
                          {b.started ? (
                            b.startAt ?? b.planStart
                          ) : (
                            <span>
                              {b.planStart}
                              <span className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-500">计划</span>
                            </span>
                          )}
                        </td>
                        <td className={tdCls}>{adviceCellOf(b, rec)}</td>
                        <td className={tdCls}>
                          {b.dryingActual !== null ? fmt2(b.dryingActual) : <span className="text-gray-400">待回传</span>}
                        </td>
                        <td className={tdCls}>{diff !== null ? diff.toFixed(2) : "—"}</td>
                        <td className={tdCls}>
                          {b.flavorActual !== null ? (
                            <span>
                              {fmt2(b.flavorActual)}
                              {b.flavorLink === "待核对" && (
                                <span className="ml-1 text-xs text-amber-600">（待核对）</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400">待回传</span>
                          )}
                        </td>
                        <td className={tdCls}>
                          <StatusTag text={resultOf(b)} />
                        </td>
                        <td className={tdCls}>
                          <button
                            type="button"
                            onClick={() => onDetail(b)}
                            className="font-medium text-primary-600 transition-colors hover:text-primary-700"
                          >
                            详情
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            total={total}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>
      )}
    </Card>
  );
}
