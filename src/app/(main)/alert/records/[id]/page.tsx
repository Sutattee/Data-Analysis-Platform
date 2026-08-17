"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertLevelBadge, AlertStatusText } from "@/components/alert/alertBadges";
import { AlertStatusModal } from "@/components/alert/AlertStatusModal";
import { useApp } from "@/lib/store/AppContext";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";
import type { AlertRecord } from "@/types";

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

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
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";

  const original = ALERT_RECORDS.find((r) => r.id === params.id);
  const [record, setRecord] = useState<AlertRecord | undefined>(original ? { ...original } : undefined);
  const [modalMode, setModalMode] = useState<"mark" | null>(null);
  // 是否从能源总览「异常详情抽屉」跳入（存在恢复快照时一键返回抽屉）
  const [fromDrawer, setFromDrawer] = useState(false);

  useEffect(() => {
    setFromDrawer(!!sessionStorage.getItem("anomaly-drawer-return"));
  }, []);

  // 记录最近访问（首页「告警记录」条目；创建人恒为"系统"）
  useEffect(() => {
    if (!original) return;
    addRecentVisit({
      id: `rv-alert-${original.id}`,
      title: `${original.title}（${original.status}）`,
      board: original.domain === "能耗管理" ? "能源消耗" : original.domain === "质量管理" ? "工艺质量" : "生产管理",
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

  function handleConfirm(note?: string) {
    setRecord((prev) =>
      prev
        ? { ...prev, status: "已处理", handleNote: note || undefined, handledAt: formatNow(), handledBy: currentUser }
        : prev
    );
    setModalMode(null);
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
            <Field label="处理状态" value={<AlertStatusText status={record.status} />} />
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
            <Field label="发生时间" value={record.triggerTime} />
            <Field label="持续时间" value={record.duration} />
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
          <div className="space-y-4">
            <Field
              label="异常原因"
              value={record.causeSummary || <span className="text-gray-400">暂未识别到明确原因</span>}
            />
            {record.causeSummary && <Field label="原因类型" value={record.causeType || undefined} />}
            <Field label="处置建议" value={record.suggestion} />
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
            <Field label="处置说明" value={record.handleNote || "—"} />
          </div>
        </Card>
      </div>

      {/* ===== 底部固定：操作按钮 ===== */}
      <div className="flex-shrink-0 flex justify-center gap-2 pt-3 border-t border-gray-100">
        <Button onClick={() => router.back()}>{fromDrawer ? "返回异常详情" : "返回"}</Button>
      </div>

      <AlertStatusModal
        open={modalMode !== null}
        mode={modalMode ?? "mark"}
        onClose={() => setModalMode(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
