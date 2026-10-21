"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { diagCatalogOf, displayRecordId } from "@/lib/mock-data/quality-defect";
import {
  defectRateOf,
  ensureProgress,
  getDiagVersion,
  getTask,
  gradeLabelOf,
  latestVersion,
  startDiagnosis,
  subscribeDiag,
} from "@/lib/mock-data/defect-diagnosis-flow";
import { AiDiagnosisWorkspace } from "./AiDiagnosisWorkspace";
import { HumanJudgmentWorkspace } from "./HumanJudgmentWorkspace";
import { judgeBadgeOf } from "./DiagnosisTaskCard";

const num = (n: number) => n.toLocaleString("en-US");

// 诊断详情页：紧凑摘要（标题+处理状态 / 灰色小字信息行 / 浅蓝条异常表现）+ 更多基本信息折叠 +
// 步骤指引（①智能诊断 —— ② 人工判定）+ 双工作区（切换保留状态，Agent 执行过程仅智能诊断页展示）；
// ?start=1 进入即自动启动智能诊断；?tab=judge 直达人工判定
export function DiagnosisDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useApp();
  const toast = useToast();

  useSyncExternalStore(subscribeDiag, getDiagVersion);

  const task = getTask(id);
  const [tab, setTab] = useState<"ai" | "judge">(searchParams.get("tab") === "judge" ? "judge" : "ai");
  const [moreOpen, setMoreOpen] = useState(false);
  const canOperate = !!state.user?.role?.includes("管理员");

  // 诊断中任务恢复推进 + ?start=1 自动启动（仅未诊断且有权限时）
  useEffect(() => {
    if (!task) return;
    ensureProgress(task.id);
    if (searchParams.get("start") === "1") {
      if (task.status === "未诊断" && canOperate) {
        startDiagnosis(task.id);
        toast("已启动智能诊断", "success");
      }
      router.replace(`/quality/diagnosis/defect/${task.id}?tab=ai`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!task) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <span className="text-3xl">🔍</span>
        <p className="text-sm text-gray-500">诊断任务不存在或已被移除</p>
        <Button variant="secondary" onClick={() => router.push("/quality/diagnosis/defect")}>
          返回缺陷诊断列表
        </Button>
      </div>
    );
  }

  const isStorage = !!task.storage;
  const rate = defectRateOf(task);
  const anomaly = isStorage
    ? `储存时长 ${task.storage!.stored} ｜ 上限 ${task.storage!.limit} ｜ 超限 ${task.storage!.over}`
    : `缺陷数 ${num(task.occurrence.count)} ｜ 抽检数 ${num(task.occurrence.sampled)} ｜ 缺陷率 ${
        rate === null ? "—" : `${rate.toFixed(2)}%`
      }`;
  const timeLabel = task.timeType === "检验时间" ? "检验" : "发现";
  const shortTime = `${task.occurrence.date.slice(5)} ${task.occurrence.time}`;

  const version = latestVersion(task);
  const lastJudgment = task.judgments[task.judgments.length - 1];
  const diagRecordId = `ZD${task.occurrence.date.replace(/-/g, "")}${task.id.slice(-3)}`;

  function handleStart() {
    startDiagnosis(task!.id);
    toast(task!.aiVersions.length > 0 ? "已重新启动智能诊断" : "已启动智能诊断", "success");
  }

  const summaryField = (label: string, value: string) => (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="shrink-0 text-xs text-gray-400">{label}</span>
      <span className="truncate text-sm text-gray-700" title={value}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 标题：返回 + 缺陷名称 + 处理状态标签 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/quality/diagnosis/defect")}>
          ← 返回
        </Button>
        <h1 className="text-xl font-bold text-gray-900">{task.occurrence.name}</h1>
        {judgeBadgeOf(task)}
      </div>

      {/* 紧凑摘要：灰色小字信息行 + 浅蓝条异常表现 */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
          <span>
            {isStorage ? "箱储对象" : "机台"}{" "}
            <span className="text-gray-500">
              {isStorage ? `${task.storage!.object}（${task.storage!.objectCode}）` : task.occurrence.machine}
            </span>
          </span>
          <span>
            批次 <span className="text-gray-500">{isStorage ? task.storage!.batch : task.occurrence.batch}</span>
          </span>
          <span>
            牌号 <span className="text-gray-500">{task.occurrence.brand}</span>
          </span>
          <span>
            班组 <span className="text-gray-500">{task.occurrence.shift}</span>
          </span>
          <span>
            {timeLabel} <span className="text-gray-500">{shortTime}</span>
          </span>
        </div>
        <div className="mt-3 rounded-lg bg-primary-50 px-4 py-2.5 text-sm text-primary-700">{anomaly}</div>

        {/* 更多基本信息（可折叠） */}
        <div className="mt-3 border-t border-gray-50 pt-3">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="text-xs text-gray-400 transition-colors hover:text-primary-600"
          >
            {moreOpen ? "收起基本信息 ▴" : "更多基本信息 ▾"}
          </button>
          {moreOpen && (
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5 md:grid-cols-3">
              {summaryField("缺陷记录ID", displayRecordId(task.occurrence))}
              {summaryField("诊断记录ID", diagRecordId)}
              {summaryField("缺陷类别", gradeLabelOf(task))}
              {summaryField("工序", diagCatalogOf(task.code)?.process ?? "—")}
              {summaryField("对象编码", isStorage ? task.storage!.objectCode : "—")}
              {summaryField("诊断时间", lastJudgment?.judgedAt ?? version?.finishedAt ?? "—")}
              {summaryField("数据截至时间", version?.evidences[0]?.asOf ?? "—")}
            </div>
          )}
        </div>
      </div>

      {/* 步骤指引：①智能诊断 —— ② 人工判定（可点击切换，hidden 切换保留双方状态） */}
      <div className="flex items-center">
        <button onClick={() => setTab("ai")} className="group flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              tab === "ai"
                ? "bg-primary-600 text-white"
                : "bg-primary-50 text-primary-600"
            }`}
          >
            {tab === "judge" ? "✓" : "1"}
          </span>
          <span className={`text-sm ${tab === "ai" ? "font-medium text-gray-900" : "text-gray-500 group-hover:text-gray-700"}`}>
           智能诊断
          </span>
        </button>
        <span className={`mx-4 h-px w-12 ${tab === "judge" ? "bg-primary-400" : "bg-gray-300"}`} />
        <button onClick={() => setTab("judge")} className="group flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              tab === "judge"
                ? "bg-primary-600 text-white"
                : "border border-gray-300 bg-white text-gray-400 group-hover:border-primary-300 group-hover:text-primary-500"
            }`}
          >
            2
          </span>
          <span className={`text-sm ${tab === "judge" ? "font-medium text-gray-900" : "text-gray-500 group-hover:text-gray-700"}`}>
            人工判定
          </span>
        </button>
      </div>

      <div className={tab === "ai" ? "" : "hidden"}>
        <AiDiagnosisWorkspace
          task={task}
          canOperate={canOperate}
          onStart={handleStart}
          onEnterJudgment={() => setTab("judge")}
        />
      </div>
      <div className={tab === "judge" ? "" : "hidden"}>
        <HumanJudgmentWorkspace
          task={task}
          canOperate={canOperate}
          onBackToAi={() => setTab("ai")}
        />
      </div>
    </div>
  );
}
