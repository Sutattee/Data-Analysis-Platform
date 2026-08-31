"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { useApp } from "@/lib/store/AppContext";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";
import { generateAnomalyReply } from "@/lib/mock-data/anomaly-ai";
import type { AlertRecord } from "@/types";

// 详情字段
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 break-words">{value ?? "-"}</span>
    </div>
  );
}

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, addRecentVisit } = useApp();
  const isAdmin = state.user?.role === "管理员";

  const original = ALERT_RECORDS.find((r) => r.id === params.id);
  const [record, setRecord] = useState<AlertRecord | undefined>(original ? { ...original } : undefined);

  // 异常原因修正
  const [causeEditing, setCauseEditing] = useState(false);
  const [causeDraft, setCauseDraft] = useState("");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // 处置建议修正
  const [suggestionEditing, setSuggestionEditing] = useState(false);
  const [suggestionDraft, setSuggestionDraft] = useState("");

  // 记录最近访问（首页「告警记录」条目；创建人恒为"系统"）
  useEffect(() => {
    if (!original) return;
    addRecentVisit({
      id: `rv-alert-${original.id}`,
      title: original.title,
      board: original.domain,
      contentType: "告警记录",
      creator: "系统",
      editable: false,
      route: `/alert/records/${original.id}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original?.id]);

  if (!record) {
    return (
      <div className="space-y-6">
        <Link href="/alert/records" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
          ← 告警记录
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-xl border border-gray-100">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-sm text-gray-500">告警不存在或已被删除</p>
        </div>
      </div>
    );
  }

  // 异常原因：进入编辑模式
  function startCauseEdit() {
    setCauseDraft(record?.causeSummary || "");
    setCauseEditing(true);
  }

  // 异常原因：保存修正
  function saveCause() {
    setRecord((prev) => prev ? { ...prev, causeSummary: causeDraft.trim(), causeType: "人工补录" } : prev);
    setCauseEditing(false);
  }

  // AI辅助：生成原因建议
  function handleAiGenerate() {
    if (!aiInput.trim() || !record) return;
    setAiLoading(true);
    // 模拟延迟后生成回复
    setTimeout(() => {
      // 构造 AnomalyDetail 兼容对象
      const mockDetail = {
        metricName: record.metricName,
        current: record.valueLabel,
        baseline: record.baselineLabel,
        deviation: record.deviation,
        triggerTime: record.triggerTime,
        cause: record.causeSummary,
      };
      const reply = generateAnomalyReply(mockDetail as any, aiInput, []);
      setAiResult(reply.causeText || reply.content);
      setAiLoading(false);
    }, 800);
  }

  // AI辅助：采纳结果
  function adoptAiResult() {
    setCauseDraft(aiResult);
    setAiPanelOpen(false);
    setAiInput("");
    setAiResult("");
  }

  // 处置建议：进入编辑模式
  function startSuggestionEdit() {
    setSuggestionDraft(record?.suggestion || "");
    setSuggestionEditing(true);
  }

  // 处置建议：保存修正
  function saveSuggestion() {
    setRecord((prev) => prev ? { ...prev, suggestion: suggestionDraft.trim() } : prev);
    setSuggestionEditing(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] gap-4">
      {/* ===== 顶部固定：面包屑 + 标题 ===== */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
          <Link href="/alert/records" className="hover:text-primary-600">告警记录</Link>
          <span>/</span>
          <span className="text-gray-600">告警记录详情</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900">{record.title}</h1>
            <p className="text-xs text-gray-400">告警编号：{record.id}</p>
          </div>
        </div>
      </div>

      {/* ===== 中间滚动：分块信息 ===== */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        {/* 基本信息 */}
        <Card title="基本信息">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            <Field label="告警编号" value={record.id} />
            <Field label="告警等级" value={<AlertLevelBadge level={record.level} />} />
            <Field label="业务域" value={record.domain} />
            <Field label="告警对象编号" value={<span className="font-mono text-xs">{record.objectCode}</span>} />
            <Field label="告警对象名称" value={record.objectName} />
            <Field label="告警触发时间" value={record.triggerTime} />
          </div>
        </Card>

        {/* 核心告警数据 */}
        <Card title="核心告警数据">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            <Field label="指标名称" value={record.metricName} />
            <Field label="告警值" value={record.valueLabel} />
            <Field label="基准 / 阈值" value={record.baselineLabel} />
            <Field label="偏离程度" value={record.deviation} />
          </div>
        </Card>

        {/* 判定依据 */}
        <Card title="判定依据">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <Field
              label="告警策略名称"
              value={
                isAdmin ? (
                  <button
                    onClick={() => router.push("/alert/management")}
                    className="text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    {record.strategyName}
                  </button>
                ) : (
                  record.strategyName
                )
              }
            />
            <Field label="触发条件" value={record.triggerCondition} />
          </div>
        </Card>

        {/* 原因与处置建议 */}
        <Card title="原因与处置建议">
          <div className="space-y-5">
            {/* 异常原因 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">异常原因</span>
                {!causeEditing && (
                  <Button size="sm" onClick={startCauseEdit}>修正</Button>
                )}
              </div>
              {causeEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={causeDraft}
                    onChange={(e) => setCauseDraft(e.target.value)}
                    placeholder="请输入异常原因分析..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={saveCause}>保存</Button>
                    <Button size="sm" variant="secondary" onClick={() => setCauseEditing(false)}>取消</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAiPanelOpen(true)}>🤖 AI辅助</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-800 break-words">
                  {record.causeSummary || <span className="text-gray-400">暂未识别到明确原因</span>}
                </p>
              )}
              {record.causeSummary && !causeEditing && (
                <p className="text-xs text-gray-400 mt-1">原因类型：{record.causeType || "—"}</p>
              )}
            </div>

            {/* 处置建议 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">处置建议</span>
                {!suggestionEditing && (
                  <Button size="sm" onClick={startSuggestionEdit}>修正</Button>
                )}
              </div>
              {suggestionEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={suggestionDraft}
                    onChange={(e) => setSuggestionDraft(e.target.value.slice(0, 500))}
                    placeholder="请填写实际采取的措施和处置结果"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{suggestionDraft.length}/500</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={saveSuggestion}>保存</Button>
                      <Button size="sm" variant="secondary" onClick={() => setSuggestionEditing(false)}>取消</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-800 break-words">{record.suggestion || "—"}</p>
              )}
            </div>
          </div>
        </Card>

        {/* 责任与处理情况 */}
        <Card title="责任与处理情况">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            <Field label="接收人" value={record.receiver} />
            <Field
              label="通知方式"
              value={
                <span className="flex flex-wrap gap-1">
                  {record.notifyMethods.map((m) => (
                    <span key={m} className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600">{m}</span>
                  ))}
                </span>
              }
            />
            <Field
              label="通知状态"
              value={
                <span className={record.notifyStatus === "已发送" ? "text-green-600" : "text-red-600"}>
                  {record.notifyStatus}
                </span>
              }
            />
          </div>
        </Card>
      </div>

      {/* AI辅助面板 */}
      <Drawer
        open={aiPanelOpen}
        onClose={() => { setAiPanelOpen(false); setAiInput(""); setAiResult(""); }}
        title="AI辅助 - 异常原因分析"
        width={480}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">补充信息</label>
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="请补充您掌握的异常现象、设备状态、操作变化或相关事件..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={4}
            />
          </div>
          <Button onClick={handleAiGenerate} disabled={!aiInput.trim() || aiLoading}>
            {aiLoading ? "分析中..." : "🤖 生成分析"}
          </Button>
          {aiResult && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs text-blue-600 font-medium mb-2">AI分析结果：</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{aiResult}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={adoptAiResult}>✅ 采纳并回填</Button>
                <Button size="sm" variant="secondary" onClick={() => { setAiInput(""); setAiResult(""); }}>重新生成</Button>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400">
            提示：AI分析仅供参考，采纳后将回填至异常原因输入框，需点击「保存」才会生效。
          </p>
        </div>
      </Drawer>
    </div>
  );
}
