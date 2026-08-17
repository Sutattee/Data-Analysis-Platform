"use client";

// 年鉴报告 - 结构化章节编辑（报告名称 + 三章固定标题正文）
// 保存记录修改人 / 时间 / 变更摘要（editLog），不改变纳入事件快照
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { getReport, isReportNameDuplicated, updateReport } from "@/lib/mock-data/major-events";
import type { YearbookReport } from "@/types";

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const CHAPTERS = [
  { key: "overview" as const, title: "一、年度事件概览", rows: 8, max: 3000 },
  { key: "chronicle" as const, title: "二、重大事件纪要", rows: 14, max: 10000 },
  { key: "analysis" as const, title: "三、综合分析与管理建议", rows: 8, max: 5000 },
];

const textareaCls =
  "w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm leading-6 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200";

export function ReportEdit() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { state } = useApp();
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";

  // 编辑期间报告数据不变，初始化一次即可
  const [report] = useState<YearbookReport | undefined>(() => getReport(params.id));
  const [name, setName] = useState(report?.name ?? "");
  const [sections, setSections] = useState(report?.sections ?? { overview: "", chronicle: "", analysis: "" });
  const [nameError, setNameError] = useState("");

  if (!report) {
    return (
      <div className="space-y-6">
        <Link href="/energy/yearbook/reports" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
          ← 年鉴报告
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-xl border border-gray-100">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-sm text-gray-500">报告不存在或已被删除</p>
        </div>
      </div>
    );
  }

  // 仅报告管理权限用户可编辑
  if (state.user?.role !== "管理员") {
    return (
      <div className="space-y-6">
        <Link href={`/energy/yearbook/reports/${report.id}`} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
          ← 返回报告详情
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-xl border border-gray-100">
          <span className="text-4xl mb-3">🔒</span>
          <p className="text-sm text-gray-500">仅具有报告管理权限的用户可编辑报告</p>
        </div>
      </div>
    );
  }

  // 箭头函数（非提升声明）以保留上方对 report 的非空收窄
  const handleSave = () => {
    const finalName = name.trim();
    if (!finalName) {
      setNameError("请输入报告名称");
      return;
    }
    if (finalName.length > 100) {
      setNameError("报告名称不能超过 100 字");
      return;
    }
    if (isReportNameDuplicated(report.year, finalName, report.id)) {
      setNameError("该年度已存在同名报告，请修改名称");
      return;
    }
    setNameError("");

    const now = formatNow();
    // 变更摘要：改名 + 被修改的章节
    const changedChapters = CHAPTERS.filter((c) => sections[c.key] !== report.sections[c.key]).map((c) => c.title);
    const notes: string[] = [];
    if (finalName !== report.name) notes.push("报告名称");
    if (changedChapters.length) notes.push(changedChapters.join("、"));
    updateReport(report.id, {
      name: finalName,
      sections: { ...sections },
      updatedAt: now,
      updatedBy: currentUser,
      editLog: [...report.editLog, { time: now, user: currentUser, note: notes.length ? `修改了${notes.join("、")}` : "保存报告" }],
    });
    toast("报告已保存", "success");
    // 带版本参数返回详情页，确保读取最新内容
    router.replace(`/energy/yearbook/reports/${report.id}?v=${Date.now()}`);
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* 面包屑 + 操作 */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
          <Link href="/energy/yearbook/reports" className="hover:text-primary-600">年鉴报告</Link>
          <span>/</span>
          <Link href={`/energy/yearbook/reports/${report.id}`} className="hover:text-primary-600">报告详情</Link>
          <span>/</span>
          <span className="text-gray-600">编辑报告</span>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900">编辑报告</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push(`/energy/yearbook/reports/${report.id}`)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </div>
      </div>

      <Card padding>
        {/* 报告名称 */}
        <div className="max-w-xl">
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            报告名称 <span className="text-red-500">*</span>
          </label>
          <input
            maxLength={100}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              nameError ? "border-red-400 focus:ring-red-400" : "border-gray-300"
            }`}
            placeholder="请输入报告名称"
          />
          <div className="mt-1 flex justify-between">
            {nameError ? <p className="text-xs text-red-500">{nameError}</p> : <span />}
            <span className="text-xs text-gray-400">{name.length}/100</span>
          </div>
        </div>

        {/* 只读信息 */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
          <span>报告年度：{report.year} 年</span>
          <span>报告周期：{report.periodStart} 至 {report.periodEnd}</span>
          <span>纳入事件：{report.includedEvents.length} 件（快照，不可编辑）</span>
          <span>生成：{report.generatedAt}（{report.generatedBy}）</span>
        </div>

        <div className="border-t border-gray-100 my-5" />

        {/* 三章正文（固定目录结构） */}
        <div className="space-y-6">
          {CHAPTERS.map((c) => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">{c.title}</label>
                <span className="text-xs text-gray-400">{sections[c.key].length}/{c.max}</span>
              </div>
              <textarea
                rows={c.rows}
                maxLength={c.max}
                className={textareaCls}
                value={sections[c.key]}
                onChange={(e) => setSections((prev) => ({ ...prev, [c.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-400">
          说明：编辑仅修改报告正文，不改变生成时纳入的事件快照；保存后将记录修改人、修改时间与变更摘要。
        </p>
      </Card>
    </div>
  );
}
