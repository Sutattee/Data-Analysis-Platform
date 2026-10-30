"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppContext";
import { diagCatalogOf } from "@/lib/mock-data/quality-defect";
import {
  defectRateOf,
  ensureProgress,
  getDiagVersion,
  getTask,
  gradeLabelOf,
  startDiagnosis,
  subscribeDiag,
} from "@/lib/mock-data/defect-diagnosis-flow";
import { AiDiagnosisWorkspace } from "./AiDiagnosisWorkspace";
import { HumanJudgmentWorkspace } from "./HumanJudgmentWorkspace";
import { judgeBadgeOf } from "./DiagnosisTaskCard";

const num = (n: number) => n.toLocaleString("en-US");

// 诊断详情页：紧凑摘要（标题+处理状态 / 灰色小字单行信息 / 浅蓝条异常表现）+
// 步骤指引（①智能诊断 —— ② 人工判定）+ 双工作区（切换保留状态，Agent 执行过程仅智能诊断页展示）；
// ?start=1 进入即自动启动智能诊断；?tab=judge 直达人工判定
export function DiagnosisDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useApp();

  useSyncExternalStore(subscribeDiag, getDiagVersion);

  const task = getTask(id);
  const [tab, setTab] = useState<"ai" | "judge">(searchParams.get("tab") === "judge" ? "judge" : "ai");
  const canOperate = !!state.user?.role?.includes("管理员");

  // 诊断中任务恢复推进 + ?start=1 自动启动（仅未诊断且有权限时）
  useEffect(() => {
    if (!task) return;
    ensureProgress(task.id);
    if (searchParams.get("start") === "1") {
      if (task.status === "未诊断" && canOperate) {
        startDiagnosis(task.id);
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

  function handleStart() {
    startDiagnosis(task!.id);
  }

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

      {/* 紧凑摘要：基础信息单行（批次 · 牌号 · 班组 · 检验时间 · 缺陷类别 · 工序，不含机台/箱储对象）+ 浅蓝条异常表现 */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs text-gray-400">
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
          <span>
            缺陷类别 <span className="text-gray-500">{gradeLabelOf(task)}</span>
          </span>
          <span>
            工序 <span className="text-gray-500">{diagCatalogOf(task.code)?.process ?? "—"}</span>
          </span>
        </div>
        <div className="mt-3 w-fit rounded-lg bg-primary-50 px-4 py-2.5 text-sm text-primary-700">{anomaly}</div>
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
        <HumanJudgmentWorkspace task={task} />
      </div>
    </div>
  );
}
