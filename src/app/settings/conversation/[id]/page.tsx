"use client";

// 对话管理 · 详细日志：只读代码视图（技术日志）
// 头部展示 请求ID / 会话ID / 请求时间 / 执行状态 / 总耗时；
// 按执行时间顺序展示 意图识别 → 元数据检索 → DSL生成 → SQL生成与执行 → 结果处理 → 图表生成 → 回答生成 全链路日志，
// 含实际执行的 DSL、SQL、查询参数、数据源与表名、返回行数与结果摘要；异常记录错误码、失败原因及错误堆栈。
// 支持关键词搜索（高亮）、复制（当前筛选结果）、下载（完整日志）；错误日志突出显示；内容只读、敏感信息已脱敏。
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  conversationRecords,
  buildTechLog,
  formatDuration,
  STATUS_STYLE,
  type LogLevel,
  type TechLogLine,
} from "@/lib/mock-data/conversation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

// 日志级别 → 代码视图配色（错误红色突出）
const LEVEL_STYLE: Record<LogLevel, string> = {
  INFO: "text-sky-400",
  DEBUG: "text-emerald-400",
  WARN: "text-amber-400",
  ERROR: "text-red-400 font-semibold",
};

// 关键词高亮（大小写不敏感，命中所有出现位置）
function Highlight({ text, kw }: { text: string; kw: string }) {
  const k = kw.trim().toLowerCase();
  if (!k) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let pos = lower.indexOf(k);
  let key = 0;
  while (pos !== -1) {
    if (pos > i) parts.push(text.slice(i, pos));
    parts.push(
      <mark key={key++} className="bg-yellow-400/40 text-yellow-200 rounded-sm px-0.5">
        {text.slice(pos, pos + k.length)}
      </mark>
    );
    i = pos + k.length;
    pos = lower.indexOf(k, i);
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
}

function lineText(l: TechLogLine): string {
  return `${l.ts} [${l.level}] [${l.stage}] ${l.message}`;
}

export default function ConversationLogPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [kw, setKw] = useState("");

  const rec = conversationRecords.find((r) => r.id === params.id);
  const log = useMemo(() => (rec ? buildTechLog(rec) : null), [rec]);

  if (!rec || !log) {
    return (
      <Card>
        <div className="py-16 text-center">
          <p className="text-sm text-gray-500 mb-4">未找到该对话记录，可能已被删除</p>
          <button
            onClick={() => router.push("/settings/conversation")}
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            返回对话管理
          </button>
        </div>
      </Card>
    );
  }

  // 关键词过滤（匹配时间戳/级别/环节/内容）
  const k = kw.trim().toLowerCase();
  const visible = k
    ? log.lines.filter((l) => lineText(l).toLowerCase().includes(k))
    : log.lines;

  function copyLog() {
    navigator.clipboard?.writeText(visible.map(lineText).join("\n"));
    toast(`已复制 ${visible.length} 条日志`, "success");
  }

  function downloadLog() {
    const blob = new Blob([log!.lines.map(lineText).join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${log!.requestId}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast("日志文件已下载", "success");
  }

  const metaItem = (label: string, value: React.ReactNode, mono = false) => (
    <div className="min-w-0">
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className={`text-sm text-gray-800 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 顶部：返回 + 标题 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/settings/conversation")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
        >
          <span>←</span>
          <span>返回对话管理</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900">详细日志</h1>
      </div>

      {/* 请求元信息 */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-gray-800">{rec.title}</h2>
            <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_STYLE[rec.status]}`}>{rec.status}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {metaItem("请求 ID", log.requestId, true)}
            {metaItem("会话 ID", log.sessionId, true)}
            {metaItem("请求时间", log.requestTime)}
            {metaItem("执行状态", log.status)}
            {metaItem("总耗时", `${formatDuration(rec.durationSec)}（${log.totalMs}ms）`)}
            {metaItem("用户", rec.user)}
            {metaItem("数据模型", rec.dataModel)}
            {metaItem("问题类型", rec.questionType)}
            {metaItem("用户评价", rec.feedback)}
          </div>
          {/* 输入 */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">输入</div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{rec.log.input}</div>
          </div>
        </div>
      </Card>

      {/* 技术日志：只读代码视图 */}
      <Card padding={false}>
        <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-700">执行日志</div>
          <span className="text-xs text-gray-400">
            {visible.length}/{log.lines.length} 条
          </span>
          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="搜索关键词，如 SQL、ERROR、表名"
            className="flex-1 min-w-[220px] max-w-[360px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={copyLog}>复制</Button>
            <Button size="sm" onClick={downloadLog}>下载</Button>
          </div>
        </div>

        <div className="rounded-b-lg bg-gray-900 overflow-hidden">
          <div className="max-h-[640px] overflow-auto p-4 font-mono text-xs leading-relaxed">
            {visible.length === 0 ? (
              <div className="py-10 text-center text-gray-500">无匹配日志</div>
            ) : (
              visible.map((l, i) => (
                <div
                  key={i}
                  className={`flex gap-3 whitespace-pre-wrap break-all rounded px-2 -mx-2 py-0.5 ${
                    l.level === "ERROR" ? "bg-red-500/15" : ""
                  }`}
                >
                  <span className="text-gray-600 select-none flex-shrink-0 text-right w-6">{i + 1}</span>
                  <span className="text-gray-500 flex-shrink-0">{l.ts}</span>
                  <span className={`flex-shrink-0 ${LEVEL_STYLE[l.level]}`}>[{l.level}]</span>
                  <span className="text-indigo-300 flex-shrink-0">[{l.stage}]</span>
                  <span className="text-gray-200 flex-1">
                    <Highlight text={l.message} kw={kw} />
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
          日志为只读视图，不可编辑；敏感信息已脱敏，密钥、密码等凭证不会写入日志。
        </div>
      </Card>
    </div>
  );
}
