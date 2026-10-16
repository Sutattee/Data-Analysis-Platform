"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { ALERT_RECORDS, applyHandledOverride, confirmAlertHandled } from "@/lib/mock-data/alerts";
import { expenseAlertRecordById } from "@/lib/mock-data/expense-alerts";
import { qualityDetailFieldsOf, qualityCycleUnitOf, TYPE_DISPLAY } from "@/lib/mock-data/quality-alerts";
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

// 告警记录详情（/alert/records/[id] 与 /production/alert/records/[id] 共用）
// basePath：面包屑与最近访问的返回路径（生产管理入口传 /production/alert/records）
// layout="expense"：费用口径字段（所属部门单值 + 预算执行率/计划执行进度/执行进度偏差三件套）
// layout="quality"：工艺质量口径字段（批次按告警类型区分展示 + 预测型预测窗口 + 处理情况卡与底部确认）
export function AlertRecordDetail({
  basePath = "/alert/records",
  layout = "default",
}: {
  basePath?: string;
  layout?: "default" | "expense" | "quality";
}) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { state, addRecentVisit } = useApp();
  const isAdmin = state.user?.role === "管理员";
  const isExpense = layout === "expense";
  const isQuality = layout === "quality";

  // 费用口径兜底：费用页「查看告警详情」按需生成的记录不在 ALERT_RECORDS（列表仅 30 条示例）；
  // 应用会话内「确认」处理覆盖（预置 handledBy 优先）
  const original = ALERT_RECORDS.find((r) => r.id === params.id)
    ?? (isExpense ? expenseAlertRecordById(params.id) : undefined);
  const [record, setRecord] = useState<AlertRecord | undefined>(
    original ? { ...applyHandledOverride(original) } : undefined
  );

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

  // 从辅料消耗页异常抽屉跳入时（存在抽屉快照），顶部展示返回按钮；
  // 返回后辅料页挂载时自动恢复异常详情抽屉
  const isProduction = basePath.startsWith("/production");
  const [fromMaterials, setFromMaterials] = useState(false);
  useEffect(() => {
    if (isProduction) setFromMaterials(!!sessionStorage.getItem("anomaly-drawer-return"));
  }, [isProduction]);

  // 费用口径：从费用页跳入时带 from 参数（须为本站路径），顶部展示「返回」按钮回来源费用详情页
  const [returnTo, setReturnTo] = useState("");
  useEffect(() => {
    if (!isExpense) return;
    const from = new URLSearchParams(window.location.search).get("from");
    if (from && from.startsWith("/")) setReturnTo(from);
  }, [isExpense]);

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
      route: `${basePath}/${original.id}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original?.id]);

  if (!record) {
    return (
      <div className="space-y-6">
        <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
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
        deviationValue: record.deviationValue,
        deviationRate: record.deviationRate,
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

  // 处理情况「确认」（质量口径 = 确认为异常/判为偶发双按钮，确认结果随按钮记录；费用口径 = 确认已处理）：
  // 状态置为已处理，处理人记为周婷（模拟数据），确认时间取当前
  function handleConfirm(result?: string) {
    if (!record || record.handledBy) return;
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    confirmAlertHandled(record.id, "周婷", at, result);
    setRecord((prev) => (prev ? { ...prev, handledBy: "周婷", handledAt: at, handleResult: result } : prev));
    toast("告警已处理", "success");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] gap-4">
      {/* ===== 顶部固定：面包屑 + 标题 ===== */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
          {isExpense || isQuality ? (
            <>
              <Link href={isExpense ? "/expense/alert" : "/quality/alert"} className="hover:text-primary-600">告警中心</Link>
              <span>/</span>
              <span className="text-gray-600">告警记录详情</span>
            </>
          ) : (
            <>
              <Link href={basePath} className="hover:text-primary-600">告警记录</Link>
              <span>/</span>
              <span className="text-gray-600">告警记录详情</span>
            </>
          )}
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900">{record.title}</h1>
          </div>
          {fromMaterials && (
            <Button variant="secondary" onClick={() => router.push("/production/materials")}>
              ← 返回辅料消耗
            </Button>
          )}
          {returnTo && (
            <Button variant="secondary" onClick={() => router.push(returnTo)}>
              ← 返回
            </Button>
          )}
        </div>
      </div>

      {/* ===== 中间滚动：分块信息 ===== */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        {/* 基本信息 */}
        <Card title="基本信息">
          {isQuality ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
              <Field label="告警等级" value={<AlertLevelBadge level={record.level} />} />
              <Field label="告警类型" value={TYPE_DISPLAY[record.type]} />
              <Field label="业务域" value={record.domain} />
              {/* 扩展字段按指标展示（批次/机台/班组/牌号的支持组合因指标而异，机台 = 告警对象）；
                  批次值由数据层按类型生成：实测「第 2417 批」/ 预测「第 2418 批（3个批次后）」 */}
              {qualityDetailFieldsOf(record.metricName).map((f) => {
                if (f === "machine") return <Field key={f} label="机台" value={record.objectName} />;
                if (f === "batch") return <Field key={f} label="批次" value={record.batch} />;
                if (f === "shift") return <Field key={f} label="班组" value={record.shift} />;
                return <Field key={f} label="牌号" value={record.brand} />;
              })}
              {/* 班次（白班/夜班，批/班周期指标按触发时间推定；月度指标无 → 不展示） */}
              {record.shiftLabel && <Field label="班次" value={record.shiftLabel} />}
              {/* 来源工序（SF 稳定性指标关联；结果类指标无 → 不展示） */}
              {record.process && <Field label="工序" value={record.process} />}
              {/* 工艺质量口径：预测风险型记录展示预测窗口（如「未来10个批次」）；实测异常不展示 */}
              {isQuality && record.type === "预测风险" && (
                <Field label="预测窗口" value={record.forecastWindow} />
              )}
              <Field label="告警触发时间" value={record.triggerTime} />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
              <Field label="告警编号" value={record.id} />
              <Field label="告警等级" value={<AlertLevelBadge level={record.level} />} />
              <Field label="业务域" value={record.domain} />
              {/* 费用口径：所属部门 = 触发告警的那个部门 */}
              {isExpense ? (
                <Field label="所属部门" value={record.objectName} />
              ) : (
                <Field label="告警对象" value={`${record.objectName}（${record.objectCode}）`} />
              )}
              <Field label="告警触发时间" value={record.triggerTime} />
            </div>
          )}
        </Card>

        {/* 核心告警数据（费用口径：预算执行率 / 计划执行进度 / 执行进度偏差） */}
        <Card title="核心告警数据">
          {isExpense ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
              <Field label="指标名称" value={record.metricLabel ?? record.metricName} />
              <Field label="预算执行率" value={record.executionRate} />
              <Field label="计划执行进度" value={record.planProgress} />
              <Field label="执行进度偏差" value={record.deviationLabel ?? record.deviationValue} />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
              <Field label="指标名称" value={record.metricName} />
              <Field label="告警值" value={record.valueLabel} />
              <Field label="基准 / 阈值" value={record.baselineLabel} />
              <Field label="偏离值" value={record.deviationValue} />
              <Field label="偏离率" value={record.deviationRate} />
            </div>
          )}
        </Card>

        {/* 判定依据 */}
        <Card title="判定依据">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <Field
              label="告警策略名称"
              value={
                isAdmin ? (
                  <button
                    onClick={() => router.push(basePath.replace("/records", "/management"))}
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
            {/* 工艺质量口径：飘移类记录展示连续同向偏离（如「3个批次」，单位随指标周期） */}
            {isQuality && record.consecutiveShifts != null && (
              <Field label="连续同向偏离" value={`${record.consecutiveShifts}个${qualityCycleUnitOf(record.metricName)}`} />
            )}
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
                  {record.causeSummary || (
                    <span className="text-gray-400">
                      {isQuality ? "当前数据不足，暂无法确定异常原因" : "暂未识别到明确原因"}
                    </span>
                  )}
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

        {/* 处理情况（费用/质量口径：处理人 + 状态；质量另含确认结果与确认时间；底部按钮确认后置为已处理） */}
        {(isExpense || isQuality) && (
          <Card title="处理情况">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
              <Field label="处理人" value={record.handledBy} />
              <Field
                label="状态"
                value={
                  <span className={record.handledBy ? "text-green-600" : "text-gray-900"}>
                    {record.handledBy ? "已处理" : "未处理"}
                  </span>
                }
              />
              {isQuality && <Field label="确认结果" value={record.handleResult} />}
              {isQuality && <Field label="确认时间" value={record.handledAt} />}
            </div>
          </Card>
        )}

        {/* 责任与处理情况（费用/质量口径不展示，质量已在处理情况卡内） */}
        {!isExpense && !isQuality && (
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
        )}
      </div>

      {/* 底部处理按钮（未处理时展示，居中）：质量口径 =「确认为异常」「判为偶发」双按钮，确认结果随按钮记录；
          费用口径 =「确认已处理」；点击后状态置为已处理并提示 */}
      {(isExpense || isQuality) && !record.handledBy && (
        <div className="flex-shrink-0 flex justify-center gap-3">
          {isQuality ? (
            <>
              <Button onClick={() => handleConfirm("确认为异常")}>确认为异常</Button>
              <Button onClick={() => handleConfirm("判为偶发")}>判为偶发</Button>
            </>
          ) : (
            <Button onClick={() => handleConfirm()}>确认已处理</Button>
          )}
        </div>
      )}

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
