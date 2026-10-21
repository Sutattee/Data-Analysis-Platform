"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import {
  adoptAiText,
  confirmJudgment,
  type DiagTask,
} from "@/lib/mock-data/defect-diagnosis-flow";

// 真实时钟：判定保存时间（与诊断记录页修正时间口径一致）
function formatNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 人工判定工作区：单选「原因已确定 / 暂未查明」（首次不默认）；
// 切换保留草稿；采纳智能诊断结论一键填入（已有内容时直接在末尾追加，无弹窗）；确认后产生判定版本并可入库
export function HumanJudgmentWorkspace({
  task,
  canOperate,
  onBackToAi,
}: {
  task: DiagTask;
  canOperate: boolean;
  onBackToAi: () => void;
}) {
  const { state } = useApp();
  const toast = useToast();

  const [conclusion, setConclusion] = useState<"" | "原因已确定" | "暂未查明">(task.draft?.conclusion ?? "");
  const [finalCause, setFinalCause] = useState(task.draft?.finalCause ?? "");
  const [checkNote, setCheckNote] = useState(task.draft?.checkNote ?? "");
  const [addToKb, setAddToKb] = useState(task.draft?.addToKb ?? false);
  const [revising, setRevising] = useState(false);

  const last = task.judgments[task.judgments.length - 1];
  const readOnly = task.status === "已判定" && !revising;

  function startRevise() {
    if (!last) return;
    setRevising(true);
    setConclusion(last.conclusion);
    setFinalCause(last.finalCause ?? "");
    setCheckNote(last.checkNote ?? "");
    setAddToKb(false);
  }

  function handleAdopt() {
    const text = adoptAiText(task.id);
    if (!text) {
      toast("暂无可采纳的 AI 候选原因（未诊断或依据不足）", "warning");
      return;
    }
    // 已有内容时直接在末尾追加，不弹窗
    setFinalCause((prev) => (prev.trim() ? `${prev}\n${text}` : text));
  }

  function handleConfirm() {
    if (!conclusion) {
      toast("请先选择判定结论", "warning");
      return;
    }
    if (conclusion === "原因已确定" && !finalCause.trim()) {
      toast("请填写最终缺陷原因", "warning");
      return;
    }
    const user = state.user?.nickname || state.user?.username || "—";
    const res = confirmJudgment(
      task.id,
      { conclusion, finalCause, checkNote, addToKb },
      { user, now: formatNow() }
    );
    if (!res.ok) {
      toast(res.error, "danger");
      return;
    }
    setRevising(false);
    toast(
      res.judgment.kbCaseId ? "判定已保存，案例已同步知识库" : "判定已保存",
      "success"
    );
  }

  // ============ 已判定：只读展示最新判定（有权限可修订，产生新版本） ============
  if (readOnly && last) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  last.conclusion === "原因已确定" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {last.conclusion}
              </span>
            </div>
            {canOperate && (
              <Button variant="secondary" size="sm" onClick={startRevise}>
                修订判定
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {last.conclusion === "原因已确定" && (
              <div>
                <div className="text-[11px] font-medium text-gray-400">最终缺陷原因</div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{last.finalCause}</p>
              </div>
            )}
            {last.checkNote && (
              <div>
                <div className="text-[11px] font-medium text-gray-400">补充核查说明</div>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-gray-500">{last.checkNote}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 border-t border-gray-50 pt-3 text-xs text-gray-400">
              <span>判定人：<span className="text-gray-600">{last.judge}</span></span>
              <span>判定时间：<span className="text-gray-600">{last.judgedAt}</span></span>
              <span>参考智能诊断：<span className="text-gray-600">{last.aiVersion > 0 ? "已参考" : "—（人工独立判定）"}</span></span>
              {last.kbCaseId && <span className="text-cyan-700">📚 已入知识库（{last.kbCaseId}）</span>}
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
                  <span className="w-20 shrink-0">{j.conclusion}</span>
                  <span className="min-w-0 flex-1 truncate" title={j.finalCause ?? "暂未查明"}>{j.finalCause ?? "暂未查明"}</span>
                  <span className="shrink-0 text-gray-400">{j.judge} · {j.judgedAt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!canOperate && (
          <p className="text-center text-xs text-gray-400">当前角色无判定修订权限</p>
        )}
      </div>
    );
  }

  // ============ 编辑态：单选 + 原因 + 核查说明 + 入库 ============
  const disabled = !canOperate;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-gray-800">人工判定</div>

        {/* 判定结论单选：首次不默认 */}
        <div className="mt-4 flex items-center gap-6">
          <label className={`flex items-center gap-2 text-sm ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
            <input
              type="radio"
              name="judg-conclusion"
              checked={conclusion === "原因已确定"}
              onChange={() => setConclusion("原因已确定")}
              disabled={disabled}
              className="h-4 w-4 accent-primary-600"
            />
            <span className={conclusion === "原因已确定" ? "font-medium text-gray-800" : "text-gray-600"}>原因已确定</span>
          </label>
          <label className={`flex items-center gap-2 text-sm ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
            <input
              type="radio"
              name="judg-conclusion"
              checked={conclusion === "暂未查明"}
              onChange={() => setConclusion("暂未查明")}
              disabled={disabled}
              className="h-4 w-4 accent-primary-600"
            />
            <span className={conclusion === "暂未查明" ? "font-medium text-gray-800" : "text-gray-600"}>暂未查明</span>
          </label>
        </div>

        {/* 原因已确定：最终原因（必填）+ 采纳 AI；暂未查明时隐藏原因与入库 */}
        {conclusion === "原因已确定" && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm text-gray-600">
                最终缺陷原因 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{finalCause.length}/500</span>
                <Button size="sm" disabled={disabled} onClick={handleAdopt}>
                  采纳智能诊断结论
                </Button>
              </div>
            </div>
            <textarea
              value={finalCause}
              onChange={(e) => setFinalCause(e.target.value)}
              maxLength={500}
              rows={5}
              disabled={disabled}
              placeholder="请填写核查确认后的最终缺陷原因（最多500字）"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition-all placeholder:text-gray-300 focus:border-transparent focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            />
          </div>
        )}

        {/* 补充核查说明（选填，两种结论均可用） */}
        <div className="mt-4">
          <label className="mb-1 block text-sm text-gray-600">补充核查说明（选填）</label>
          <textarea
            value={checkNote}
            onChange={(e) => setCheckNote(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={disabled}
            placeholder="记录核查过程、复核数据与后续措施等"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition-all placeholder:text-gray-300 focus:border-transparent focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
          />
        </div>

        {/* 加入知识库（仅原因已确定可选） */}
        {conclusion === "原因已确定" && (
          <label className={`mt-3 flex items-center gap-2 text-sm text-gray-600 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={addToKb}
              onChange={(e) => setAddToKb(e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 accent-primary-600"
            />
            加入知识库（作为历史诊断案例供后续 AI 案例检索）
          </label>
        )}

        {!canOperate && (
          <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">当前角色无判定操作权限，仅可查看</p>
        )}
      </div>

      {/* 底部操作：上一步 / 确认判定 */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" onClick={onBackToAi}>上一步</Button>
        <Button disabled={disabled || !conclusion} onClick={handleConfirm}>确认判定</Button>
      </div>
    </div>
  );
}
