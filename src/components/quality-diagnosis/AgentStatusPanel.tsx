"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { AgentNode, AgentNodeStatus, AiVersion } from "@/lib/mock-data/defect-diagnosis-flow";

// 状态词（展示口径）：完成 → 已完成，跳过 → 已跳过，其余原样
function statusWord(s: AgentNodeStatus): string {
  if (s === "完成") return "已完成";
  if (s === "跳过") return "已跳过";
  return s;
}

function secsOf(ms?: number): string {
  if (!ms) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// Agent 执行过程（仅 AI 诊断工作区展示）：执行中 / 失败自动展开，完成收起为「查看执行过程」；
// 步骤以纯文字行展示「节点：状态（耗时）」，失败节点内嵌「重试」
export function AgentStatusPanel({
  version,
  onRetry,
  canRetry,
}: {
  version?: AiVersion;
  onRetry?: () => void;
  canRetry?: boolean;
}) {
  const running = !!version && !version.finishedAt;
  const hasFail = !!version?.nodes.some((n) => n.status === "失败");
  const [open, setOpen] = useState(running || hasFail);

  // 执行状态变化时：执行中或失败自动展开，正常完成默认收起
  useEffect(() => {
    setOpen(running || hasFail);
  }, [version?.version, running, hasFail]);

  if (!version) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-4 text-sm text-gray-400">
        尚未启动 AI 诊断
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* 执行中仅显示进度提示（自动展开，不可收起）；诊断结束后才展示「查看执行过程 / 收起」入口 */}
        {!running && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-sm font-medium text-gray-900 transition-colors hover:text-primary-600"
          >
            {open ? "查看执行过程 ▴" : "查看执行过程 ▾"}
          </button>
        )}
        {running && (
          <span className="text-sm text-primary-700">
            AI 诊断执行中<span className="ml-0.5 inline-block animate-pulse">…</span>
          </span>
        )}
        {hasFail && <span className="text-sm text-red-600">AI 诊断未完成（数据获取失败）</span>}
      </div>

      {open && (
        <div className="mt-3 space-y-2.5 border-t border-gray-50 pt-3">
          {version.nodes.map((n: AgentNode) => (
            <div key={n.key}>
              <p className="text-sm text-gray-700">
                {n.name}：{statusWord(n.status)}
                {n.ms ? `（耗时 ${secsOf(n.ms)}）` : ""}
              </p>
              {n.summary && <p className="mt-0.5 pl-4 text-xs leading-5 text-gray-500">{n.summary}</p>}
              {n.details && n.details.length > 0 && (
                <ul className="mt-0.5 space-y-0.5 pl-4">
                  {n.details.map((d) => (
                    <li key={d} className="truncate text-[11px] text-gray-400" title={d}>· {d}</li>
                  ))}
                </ul>
              )}
              {n.error && (
                <div className="mt-1 ml-4 flex flex-wrap items-center gap-2 rounded bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
                  <span>{n.error}</span>
                  {onRetry && canRetry && n.status === "失败" && (
                    <Button size="sm" variant="secondary" onClick={onRetry}>
                      重试
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
