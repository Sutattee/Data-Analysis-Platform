"use client";

import type { DiagTask } from "@/lib/mock-data/defect-diagnosis-flow";

// 来源说明（灰色小字）：人工判定原因从质检平台自动同步
const SOURCE_NOTE = "从质检平台自动获取人工判定的原因";

// 人工判定环节：从质检平台自动拉取人工填报的最终缺陷原因与补充核查说明，只读展示；
// 不在本平台录入（无单选/输入/采纳/确认/加入知识库等交互）；
// 同步失败展示「获取失败。」，质检平台未填写展示「质检平台暂未填写人工判定原因」
export function HumanJudgmentWorkspace({ task }: { task: DiagTask }) {
  // 质检平台接口异常，同步失败
  if (task.qcSyncFailed) {
    return (
      <div className="max-w-2xl space-y-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-800">人工判定</div>
          <p className="mt-3 text-sm text-gray-500">获取失败。</p>
        </div>
        <p className="text-xs text-gray-400">{SOURCE_NOTE}</p>
      </div>
    );
  }

  const last = task.judgments[task.judgments.length - 1];

  // 质检平台尚未填写该缺陷的人工判定原因
  if (!last) {
    return (
      <div className="max-w-2xl space-y-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-800">人工判定</div>
          <p className="mt-3 text-sm text-gray-500">质检平台暂未填写人工判定原因</p>
        </div>
        <p className="text-xs text-gray-400">{SOURCE_NOTE}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mt-1 space-y-3">
          {last.conclusion === "原因已确定" && (
            <div>
              <div className="text-sm text-gray-600">最终缺陷原因</div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{last.finalCause}</p>
            </div>
          )}
          {last.checkNote && (
            <div>
              <div className="text-[11px] font-medium text-gray-400">补充核查说明</div>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-gray-500">{last.checkNote}</p>
            </div>
          )}
          <p className="text-xs text-gray-400">{SOURCE_NOTE}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 border-t border-gray-50 pt-3 text-xs text-gray-400">
            <span>判定人：<span className="text-gray-600">{last.judge}</span></span>
            <span>判定时间：<span className="text-gray-600">{last.judgedAt}</span></span>
          </div>
        </div>
      </div>

      {task.judgments.length > 1 && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-medium text-gray-500">历史判定版本</div>
          <div className="space-y-1.5">
            {[...task.judgments].reverse().map((j) => (
              <div key={j.version} className="flex items-baseline gap-3 text-xs text-gray-500">
                <span className="w-8 shrink-0 font-mono text-gray-400">V{j.version}</span>
                <span className="min-w-0 flex-1 truncate" title={j.finalCause ?? "—"}>{j.finalCause ?? "—"}</span>
                <span className="shrink-0 text-gray-400">{j.judge} · {j.judgedAt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
