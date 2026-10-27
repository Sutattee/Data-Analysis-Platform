"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { ALERT_RECORDS, applyHandledOverride, confirmAlertHandled, alertManualState, markAlertManualPending, saveAlertManualCause, setAlertFeedbackHelpful } from "@/lib/mock-data/alerts";
import { expenseAlertRecordById } from "@/lib/mock-data/expense-alerts";
import { qualityDetailFieldsOf, qualityCycleUnitOf, TYPE_DISPLAY } from "@/lib/mock-data/quality-alerts";
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

// 原因/处置建议行（质量口径融合区）：单项一行展示「标签：内容」；
// 多项（以「；」分隔）时分别编号分行
function CauseSuggestionLine({ label, text }: { label: string; text: string }) {
  const items = text.split(/[；;]/).map((s) => s.trim()).filter(Boolean);
  if (items.length <= 1) {
    return <p className="break-words">{label}：{text}</p>;
  }
  return (
    <div className="space-y-1">
      <p className="break-words">{label}：</p>
      {items.map((item, i) => (
        <p key={i} className="break-words">{i + 1}. {item}</p>
      ))}
    </div>
  );
}

// 告警记录详情（/alert/records/[id] 与 /production/alert/records/[id] 共用）
// basePath：面包屑与最近访问的返回路径（生产管理入口传 /production/alert/records）
// layout="expense"：费用口径字段（所属部门单值 + 预算执行率/计划执行进度/执行进度偏差三件套）
// layout="quality"：工艺质量口径字段（批次按告警类型区分展示 + 预测型预测窗口 + 处理情况字段区）
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
  // 反馈与人工补录会话状态：feedback → 已帮助/没帮助选中态（问题区常驻展示）；
  // text → 已填写（展示块 + 修正）；仅 pending → 待填写（输入框常驻，离开再进入仍展开）
  const initialManual = original ? alertManualState(original.id) : { pending: false };
  const [record, setRecord] = useState<AlertRecord | undefined>(
    original ? { ...applyHandledOverride(original), manualCause: initialManual.text } : undefined
  );

  // 质量口径「是否有帮助」反馈（选中态会话持久化）：有问题/没帮助两个选项；
  // 点击后记录置为已处理，另一按钮消失，保留选中蓝色按钮 +「已反馈」提示，问题区不消失；
  // 「没帮助」另展开人工补录输入框（≤300 字），补录内容独立展示、不覆盖 AI 生成内容
  const [feedback, setFeedback] = useState<"helpful" | "nothelpful" | undefined>(initialManual.feedback);
  const [manualEditing, setManualEditing] = useState(initialManual.pending && !initialManual.text);
  const [manualDraft, setManualDraft] = useState("");

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

  // 当前时间 YYYY-MM-DD HH:mm（处理时间取值）
  function formatNow(): string {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // 反馈即处理：未处理的记录点击有帮助/没帮助后置为已处理（已处理保持原处理人/时间）
  function markHandled() {
    if (!record || record.handledBy) return;
    const user = state.user?.nickname || state.user?.username || "当前用户";
    const at = formatNow();
    confirmAlertHandled(record.id, user, at);
    setRecord((prev) => (prev ? { ...prev, handledBy: user, handledAt: at } : prev));
  }

  // 有帮助：记录置为已处理，问题区保留选中蓝色「已帮助」+「已反馈」
  function handleHelpful() {
    if (feedback) return;
    setFeedback("helpful");
    markHandled();
    if (record) setAlertFeedbackHelpful(record.id);
  }

  // 没帮助：记录置为已处理，问题区保留选中蓝色「没帮助」+「已反馈」，并展开人工补录输入框
  // （标记待补录：未填写时输入框常驻，支持后续进入页面再次填写）
  function startManual() {
    if (feedback) return;
    setFeedback("nothelpful");
    markHandled();
    if (record) markAlertManualPending(record.id);
    setManualDraft("");
    setManualEditing(true);
  }

  // 人工补录：内容独立展示于 AI 生成内容下方，不覆盖 AI 内容；
  // 写入会话覆盖（保存后重进为展示块 + 修正，不再展开输入框）
  function saveManual() {
    const text = manualDraft.trim();
    if (!text) {
      toast("请输入原因和实际处置措施", "warning");
      return;
    }
    if (record) saveAlertManualCause(record.id, text);
    setRecord((prev) => (prev ? { ...prev, manualCause: text } : prev));
    setManualEditing(false);
    toast("人工补录已保存", "success");
  }

  // 处理情况「确认」（费用口径 = 确认已处理）：
  // 状态置为已处理，处理人记为周婷（模拟数据），确认时间取当前
  function handleConfirm() {
    if (!record || record.handledBy) return;
    const at = formatNow();
    confirmAlertHandled(record.id, "周婷", at);
    setRecord((prev) => (prev ? { ...prev, handledBy: "周婷", handledAt: at } : prev));
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
              {/* 扩展字段按指标展示（批次/班组/牌号的支持组合因指标而异；机台（原告警对象）不展示）；
                  批次值由数据层按类型生成：实测「第 2417 批」/ 预测「第 2418 批（3个批次后）」 */}
              {qualityDetailFieldsOf(record.metricName).map((f) => {
                if (f === "machine") return null;
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
              {/* 缺陷预测类记录：预测基准时间（数据截止时刻，追溯字段） */}
              {record.baseTime && <Field label="预测基准时间" value={record.baseTime} />}
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
              {/* 缺陷预测类记录：模型版本（追溯字段，如「缺陷风险滚动预测模型 v2.3」） */}
              {record.modelVersion && <Field label="模型版本" value={record.modelVersion} />}
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

        {/* 原因与处置建议：质量口径融合为一条内容（两段陈述）+ 原因类型 + 是否有帮助（没帮助转人工补录）；其他口径只读分列 */}
        <Card title="原因与处置建议">
          {isQuality ? (
            <div className="space-y-4">
              {/* AI 生成内容（保留原位，不随人工补录变化）：原因 / 处置建议 分行展示，多项时编号 */}
              <div className="space-y-2 text-sm leading-relaxed text-gray-800">
                <CauseSuggestionLine label="原因" text={record.causeSummary || "当前数据不足，暂无法确定异常原因"} />
                <CauseSuggestionLine label="处置建议" text={record.suggestion || "—"} />
              </div>
              <p className="text-xs text-gray-400">原因由 AI 分析数据自动生成</p>

              {/* 是否有帮助：预置已处理的记录不展示；其余始终展示（反馈后不消失）——
                  未反馈 = 线框双按钮；有帮助 → 选中蓝色「已帮助」；没帮助 → 选中蓝色「没帮助」，
                  均带「已反馈」提示，另一按钮消失 */}
              {!original?.handledBy && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">是否有帮助？</span>
                  {feedback === "helpful" ? (
                    <>
                      <Button size="sm">👍 已帮助</Button>
                      <span className="text-sm text-gray-400">已反馈</span>
                    </>
                  ) : feedback === "nothelpful" ? (
                    <>
                      <Button size="sm">👎 没帮助</Button>
                      <span className="text-sm text-gray-400">已反馈</span>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={handleHelpful}>👍 有帮助</Button>
                      <Button size="sm" variant="outline" onClick={startManual}>👎 没帮助</Button>
                    </>
                  )}
                </div>
              )}

              {/* 人工补录内容：展示于「是否有帮助？」下方，灰底块半宽，支持「修正」再次编辑 */}
              {record.manualCause && !manualEditing && (
                <div className="w-full md:w-1/2 space-y-2 rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">人工补录</span>
                    <Button size="sm" onClick={() => { setManualDraft(record.manualCause ?? ""); setManualEditing(true); }}>
                      修正
                    </Button>
                  </div>
                  <p className="whitespace-pre-line break-words text-sm leading-relaxed text-gray-800">
                    {record.manualCause}
                  </p>
                </div>
              )}

              {/* 人工补录输入框（点击「没帮助」后展开；灰底块与展示块同为半宽） */}
              {manualEditing && (
                <div className="w-full md:w-1/2 space-y-2 rounded-xl bg-gray-50 p-4">
                  <span className="block text-sm font-medium text-gray-700">人工补录</span>
                  <textarea
                    value={manualDraft}
                    onChange={(e) => setManualDraft(e.target.value.slice(0, 300))}
                    placeholder="请输入原因和实际处置措施"
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    rows={5}
                    maxLength={300}
                  />
                  {/* 操作行：首次补录仅「保存」（输入框常驻直至填写）；修正编辑另带「取消」退回展示块 */}
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-gray-400 mr-auto">{manualDraft.length}/300</span>
                    <Button size="sm" onClick={saveManual}>保存</Button>
                    {record.manualCause && (
                      <Button size="sm" variant="secondary" onClick={() => setManualEditing(false)}>取消</Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* 异常原因 */}
              <div>
                <span className="block text-xs text-gray-400 mb-2">异常原因</span>
                <p className="text-sm text-gray-800 break-words">
                  {record.causeSummary || <span className="text-gray-400">暂未识别到明确原因</span>}
                </p>
                {record.causeSummary && (
                  <p className="text-xs text-gray-400 mt-1">原因类型：{record.causeType || "—"}</p>
                )}
              </div>

              {/* 处置建议 */}
              <div>
                <span className="block text-xs text-gray-400 mb-2">处置建议</span>
                <p className="text-sm text-gray-800 break-words">{record.suggestion || "—"}</p>
              </div>
            </div>
          )}
        </Card>

        {/* 处理情况（费用/质量口径：处理人 + 状态；质量口径不带区块标题，字段直接展示，
            另含处理时间；点击有帮助/没帮助后置为已处理） */}
        {(isExpense || isQuality) && (
          <Card title={isQuality ? undefined : "处理情况"}>
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
              {isQuality && <Field label="处理时间" value={record.handledAt} />}
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

      {/* 底部处理按钮（未处理时展示，居中）：费用口径 =「确认已处理」；点击后状态置为已处理并提示 */}
      {isExpense && !record.handledBy && (
        <div className="flex-shrink-0 flex justify-center gap-3">
          <Button onClick={() => handleConfirm()}>确认已处理</Button>
        </div>
      )}
    </div>
  );
}
