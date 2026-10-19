"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  DEFECT_RECORDS,
  diagnosisOfCode,
  filterRecords,
  formatRecordDate,
  type DefectFilters,
  type DefectRecord,
} from "@/lib/mock-data/quality-defect";

// 类别着色：A类红 / B类橙，C、D 保持黑色
const gradeCls = (g: string) =>
  g === "A" ? "text-red-600" : g === "B" ? "text-orange-500" : "text-gray-600";

// 缺陷明细表：随顶部筛选联动，默认按检验日期倒序；
// 自身支持按缺陷名称/代码关键词筛选；滚动区域 + 表头固定；
// 缺陷代码/名称链接跳缺陷诊断页，整行与「缺陷诊断」打开诊断抽屉
export function DefectDetailTable({
  filters,
  onOpen,
}: {
  filters: DefectFilters;
  onOpen: (r: DefectRecord) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [diagStatus, setDiagStatus] = useState("all"); // 诊断状态筛选：全部/已判定/待判定

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return filterRecords(DEFECT_RECORDS, filters)
      .filter((r) => !kw || r.name.toLowerCase().includes(kw) || r.code.toLowerCase().includes(kw))
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [filters, keyword]);

  // 诊断状态在渲染路径过滤（判定状态随会话内保存实时变化，不走 useMemo）
  const visibleRows = rows.filter((r) => {
    if (diagStatus === "all") return true;
    const judged = !!diagnosisOfCode(r.code)?.conclusion;
    return diagStatus === "judged" ? judged : !judged;
  });

  const th = "text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <Card padding={false}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-800">缺陷明细</h3>
        {/* 明细自身筛选：缺陷名称/代码关键词 */}
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索缺陷名称/缺陷代码"
          className="w-56 px-3 py-1.5 rounded-lg border border-gray-300 text-xs outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="border-b border-gray-100">
              <th className={th}>缺陷部位</th>
              <th className={th}>缺陷名称</th>
              <th className={th}>缺陷代码</th>
              <th className={th}>类别</th>
              <th className={th}>缺陷数量</th>
              <th className={th}>抽检数量</th>
              <th className={th}>缺陷率</th>
              <th className={th}>检验日期</th>
              {/* 诊断状态：表头内嵌筛选（全部/已判定/待判定） */}
              <th className={th}>
                <div className="flex items-center">
                  诊断状态
                  <select
                    value={diagStatus}
                    onChange={(e) => setDiagStatus(e.target.value)}
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
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-sm text-gray-400">
                  当前筛选条件下暂无缺陷记录
                </td>
              </tr>
            ) : (
              visibleRows.map((r) => {
                // 人工判定状态：按缺陷代码取会话内最新判定（渲染时实时计算）
                const judged = !!diagnosisOfCode(r.code)?.conclusion;
                return (
                <tr
                  key={r.id}
                  onClick={() => onOpen(r)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{r.part}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/quality/diagnosis/defect?code=${r.code}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/quality/diagnosis/defect?code=${r.code}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-xs text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td className={`px-3 py-2.5 whitespace-nowrap ${gradeCls(r.grade)}`}>{r.grade}类</td>
                  <td className="px-3 py-2.5 whitespace-nowrap font-medium text-gray-800">{r.count}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{r.sampled}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
                    {((r.count / r.sampled) * 100).toFixed(2)}%
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
                    {formatRecordDate(r)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {judged ? (
                      <span className="font-medium text-green-600">已判定</span>
                    ) : (
                      <span className="text-gray-500">待判定</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(r);
                      }}
                    >
                      {judged ? "查看" : "诊断"}
                    </Button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
        共 {visibleRows.length} 条 · 列表支持上下滚动
      </div>
    </Card>
  );
}
