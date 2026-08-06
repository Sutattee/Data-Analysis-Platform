"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  conversationRecords,
  formatDuration,
  SAMPLE_ELIGIBLE_TYPES,
  STATUS_STYLE,
  ConversationItem,
  ConvStatus,
} from "@/lib/mock-data/conversation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";

const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";
const dtCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";

const STATUS_OPTIONS: ("all" | ConvStatus)[] = ["all", "正常", "异常", "中断", "运行中"];

function normTime(v: string) {
  return v ? v.replace("T", " ") : "";
}

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ConversationPage() {
  const router = useRouter();
  const toast = useToast();
  const [records, setRecords] = useState<ConversationItem[]>(() =>
    JSON.parse(JSON.stringify(conversationRecords))
  );

  // 筛选
  const [fUser, setFUser] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fFeedback, setFFeedback] = useState("all");
  const [fSample, setFSample] = useState("all");
  const [showMore, setShowMore] = useState(false);

  // 行勾选
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 分页 / 交互
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (fUser && !r.user.toLowerCase().includes(fUser.trim().toLowerCase())) return false;
      if (fTitle && !r.title.toLowerCase().includes(fTitle.trim().toLowerCase())) return false;
      if (fStatus !== "all" && r.status !== fStatus) return false;
      if (fFeedback !== "all" && r.feedback !== fFeedback) return false;
      if (fSample === "in" && !r.inSampleSet) return false;
      if (fSample === "out" && r.inSampleSet) return false;
      if (fStart && r.startTime < normTime(fStart)) return false;
      if (fEnd && r.startTime > normTime(fEnd)) return false;
      return true;
    });
  }, [records, fUser, fTitle, fStatus, fFeedback, fSample, fStart, fEnd]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allChecked = filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleAll() {
    if (allChecked) setSelectedIds([]);
    else setSelectedIds(filtered.map((r) => r.id));
  }

  function addToSample(id: string) {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, inSampleSet: true } : r)));
    toast("已加入问题样本集", "success");
  }

  function copyTitle(text: string) {
    navigator.clipboard?.writeText(text);
    toast("已复制对话名称", "success");
  }

  function refresh() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast("数据已刷新", "success");
    }, 500);
  }

  function exportCsv() {
    // 优先导出勾选行，否则导出全部筛选结果
    const targets = selectedIds.length > 0 ? filtered.filter((r) => selectedIds.includes(r.id)) : filtered;
    if (targets.length === 0) {
      toast("没有可导出的数据", "warning");
      return;
    }
    const headers = ["用户", "对话名称", "耗时", "对话状态", "用户评价", "样本问题集", "数据模型", "问题类型", "开始时间"];
    const rows = targets.map((r) => [
      r.user, r.title, formatDuration(r.durationSec), r.status, r.feedback,
      r.inSampleSet ? "已加入" : "未加入", r.dataModel, r.questionType, r.startTime,
    ]);
    const csv = "﻿" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "对话记录.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast(`已导出 ${targets.length} 条记录${selectedIds.length > 0 ? "（所选）" : ""}`, "success");
  }

  function resetFilters() {
    setFUser(""); setFTitle(""); setFStart(""); setFEnd("");
    setFStatus("all"); setFFeedback("all"); setFSample("all");
    setPage(1);
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";
  const td = "px-4 py-3 text-sm";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">对话管理</h1>
      </div>

      {/* 筛选区 */}
      <Card padding={false}>
        {/* 第一行（默认展示） */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <Input label="用户名" value={fUser} onChange={(e) => setFUser(e.target.value)} placeholder="模糊查询" />
          <Input label="对话名称" value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="模糊查询" />
          <div>
            <label className="block text-xs text-gray-500 mb-1">对话状态</label>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selectCls}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === "all" ? "全部" : s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">开始时间</label>
            <input type="datetime-local" step={1} value={fStart} onChange={(e) => setFStart(e.target.value)} className={dtCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">结束时间</label>
            <input type="datetime-local" step={1} value={fEnd} onChange={(e) => setFEnd(e.target.value)} className={dtCls} />
          </div>
        </div>
        {/* 第二行（更多筛选） */}
        {showMore && (
          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">用户评价</label>
              <select value={fFeedback} onChange={(e) => setFFeedback(e.target.value)} className={selectCls}>
                <option value="all">全部</option>
                <option value="点赞">点赞</option>
                <option value="点踩">点踩</option>
                <option value="未反馈">未反馈</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">问题样本集</label>
              <select value={fSample} onChange={(e) => setFSample(e.target.value)} className={selectCls}>
                <option value="all">全部</option>
                <option value="in">已加入</option>
                <option value="out">未加入</option>
              </select>
            </div>
          </div>
        )}
        <div className="px-4 pb-4 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => setShowMore(!showMore)}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            {showMore ? "收起筛选 ▴" : "更多筛选 ▾"}
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={resetFilters}>重置</Button>
            <Button onClick={() => setPage(1)}>搜索</Button>
          </div>
        </div>
      </Card>

      {/* 工具栏 + 表格 */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>共 <span className="font-medium text-gray-800">{total}</span> 条</span>
            {selectedIds.length > 0 && (
              <span>已选 <span className="font-medium text-primary-600">{selectedIds.length}</span> 条</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
              {loading ? "刷新中…" : "🔄 刷新"}
            </Button>
            <Button size="sm" onClick={exportCsv}>
              导出CSV{selectedIds.length > 0 ? `（${selectedIds.length}）` : ""}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-3.5 h-3.5 accent-primary-600" />
                </th>
                <th className={th}>用户</th>
                <th className={th}>对话名称</th>
                <th className={th}>耗时</th>
                <th className={th}>对话状态</th>
                <th className={th}>用户评价</th>
                <th className={th}>样本问题集</th>
                <th className={th}>开始时间</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-sm text-gray-400">暂无数据</td></tr>
              ) : paged.map((r) => {
                const eligible = SAMPLE_ELIGIBLE_TYPES.includes(r.questionType);
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} className="w-3.5 h-3.5 accent-primary-600" />
                    </td>
                    <td className={td + " text-gray-700"}>{r.user}</td>
                    {/* 对话名称：点击跳转，hover 显示完整标题 + 复制 */}
                    <td className={td}>
                      <div className="relative group inline-block max-w-[220px]">
                        <button
                          onClick={() => router.push(`/qa?query=${encodeURIComponent(r.log.input)}`)}
                          className="text-primary-600 hover:underline truncate block max-w-[220px]"
                          title=""
                        >
                          {r.title}
                        </button>
                        <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover:block w-max max-w-[360px] bg-gray-800 text-white text-xs rounded-md px-3 py-2 shadow-lg">
                          <div className="flex items-start gap-3">
                            <span className="break-all flex-1">{r.title}</span>
                            <button onClick={() => copyTitle(r.title)} className="text-blue-200 hover:text-white whitespace-nowrap">复制</button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={td + " text-gray-500 font-mono text-xs"}>{formatDuration(r.durationSec)}</td>
                    <td className={td}>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                    </td>
                    <td className={td}>
                      {r.feedback === "点赞" ? <span className="text-green-600 text-xs">👍 点赞</span>
                        : r.feedback === "点踩" ? <span className="text-red-500 text-xs">👎 点踩</span>
                        : <span className="text-gray-400 text-xs">未反馈</span>}
                    </td>
                    <td className={td}>
                      {r.inSampleSet
                        ? <span className="text-xs text-primary-600">已加入</span>
                        : <span className="text-xs text-gray-400">未加入</span>}
                    </td>
                    <td className={td + " text-gray-500 font-mono text-xs whitespace-nowrap"}>{r.startTime}</td>
                    <td className={td + " text-right whitespace-nowrap"}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/settings/conversation/${r.id}`)}
                          title="查看详细日志"
                          className="p-1.5 text-base text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors leading-none"
                        >
                          📋
                        </button>
                        {eligible ? (
                          <button
                            onClick={() => addToSample(r.id)}
                            title="加入问题样本集"
                            className="p-1.5 text-base text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors leading-none"
                          >
                            ➕
                          </button>
                        ) : (
                          <span title="该问题类型不支持加入样本集" className="p-1.5 text-base text-gray-300 leading-none">➕</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="px-5 py-3 border-t border-gray-100">
          <Pagination
            total={total}
            page={safePage}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
          />
        </div>
      </Card>
    </div>
  );
}
