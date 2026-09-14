"use client";

// 目标值管理（指标详情抽屉内区块）：
// 当前生效目标卡片 + 历史版本列表（查看/编辑并新建版本/停用）+ 新增目标值
// 仅 SUPPORTED_TARGET_METRICS 中的指标开放配置，其余指标显示不支持提示
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import {
  disableTarget,
  formatTargetStandard,
  isTargetSupported,
  listTargets,
} from "@/lib/mock-data/metric-targets";
import type { MetricManage, MetricTargetVersion, TargetVersionStatus } from "@/types";
import { TargetFormDrawer } from "./TargetFormDrawer";

// 状态三态映射：待生效=warning / 生效中=success / 已失效=default
function StatusBadge({ status }: { status: TargetVersionStatus }) {
  const variant =
    status === "待生效" ? "warning" : status === "生效中" ? "success" : ("default" as const);
  return <Badge variant={variant}>{status}</Badge>;
}

// 只读字段（详情弹窗用）
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 flex-shrink-0 pt-0.5 text-xs text-gray-400">{label}</span>
      <span className="flex-1 break-words text-sm text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function TargetManagement({ metric }: { metric: MetricManage }) {
  const toast = useToast();
  const { state } = useApp();
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";

  const supported = isTargetSupported(metric.id);
  const [versions, setVersions] = useState<MetricTargetVersion[]>(() => listTargets(metric.id));

  // 表单抽屉：null=关闭；{ base: null }=新增；{ base: version }=编辑生成新版本
  const [formBase, setFormBase] = useState<{ base: MetricTargetVersion | null } | null>(null);
  const [viewTarget, setViewTarget] = useState<MetricTargetVersion | null>(null);
  const [disableTarget_, setDisableTarget_] = useState<MetricTargetVersion | null>(null);
  const [disableReason, setDisableReason] = useState("");

  function reload() {
    setVersions(listTargets(metric.id));
  }

  function openDisable(t: MetricTargetVersion) {
    setDisableTarget_(t);
    setDisableReason("");
  }

  function confirmDisable() {
    if (!disableTarget_) return;
    const reason = disableReason.trim();
    if (!reason) {
      toast("请填写停用原因", "warning");
      return;
    }
    if (reason.length > 200) {
      toast("停用原因不能超过 200 字", "warning");
      return;
    }
    disableTarget(disableTarget_.id, { user: currentUser, now: formatNow(), reason });
    setDisableTarget_(null);
    reload();
    toast("已停用（不生成新版本，恢复需编辑生成新版本）", "success");
  }

  // ===== 不支持配置的指标 =====
  if (!supported) {
    return <p className="text-sm text-gray-400">该指标暂不支持目标值配置</p>;
  }

  const th = "text-left px-2.5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-3">
      {/* 历史版本列表 + 新增入口 */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setFormBase({ base: null })}>
          + 新增目标值
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className={th}>版本号</th>
              <th className={th}>考核周期</th>
              <th className={th}>目标标准</th>
              <th className={th}>生效周期</th>
              <th className={th}>状态</th>
              <th className={th}>生效时间</th>
              <th className={th}>创建时间</th>
              <th className={th}>创建人</th>
              <th className={`${th} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {versions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-sm text-gray-400">
                  暂无目标值版本
                </td>
              </tr>
            ) : (
              versions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-2.5 py-2.5 font-mono font-medium text-gray-700">{t.version}</td>
                  <td className="px-2.5 py-2.5 text-gray-600">{t.period}</td>
                  <td className="px-2.5 py-2.5 text-gray-800">
                    {formatTargetStandard(t, metric.decimals)}
                  </td>
                  <td className="px-2.5 py-2.5 whitespace-nowrap text-gray-600">
                    {t.effectiveStart} 至 {t.effectiveEnd}
                  </td>
                  <td className="px-2.5 py-2.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-2.5 py-2.5 whitespace-nowrap text-gray-500">{t.effectiveTime}</td>
                  <td className="px-2.5 py-2.5 whitespace-nowrap text-gray-500">{t.createdAt}</td>
                  <td className="px-2.5 py-2.5 whitespace-nowrap text-gray-500">{t.createdBy}</td>
                  <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => setViewTarget(t)}
                        className="rounded px-1.5 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => setFormBase({ base: t })}
                        className="rounded px-1.5 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                        title="编辑将基于该版本生成新版本，原记录保留"
                      >
                        编辑并新建版本
                      </button>
                      {(t.status === "待生效" || t.status === "生效中") && (
                        <button
                          onClick={() => openDisable(t)}
                          className="rounded px-1.5 py-0.5 text-xs text-red-500 transition-colors hover:bg-red-50"
                        >
                          停用
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新增/编辑表单抽屉（覆盖在指标详情抽屉之上） */}
      <TargetFormDrawer
        open={formBase !== null}
        onClose={() => setFormBase(null)}
        metric={metric}
        baseVersion={formBase?.base ?? null}
        onSaved={reload}
      />

      {/* 版本详情查看弹窗 */}
      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title={`目标值版本详情（${viewTarget?.version ?? ""}）`}
      >
        {viewTarget && (
          <div className="space-y-2.5">
            <Field label="指标名称" value={viewTarget.metricName} />
            <Field label="考核周期" value={viewTarget.period} />
            <Field label="目标标准" value={formatTargetStandard(viewTarget, metric.decimals)} />
            <Field
              label="判断方向"
              value={
                viewTarget.direction === "处于目标区间"
                  ? "处于目标区间"
                  : `${viewTarget.direction}目标值`
              }
            />
            <Field label="生效周期" value={`${viewTarget.effectiveStart} 至 ${viewTarget.effectiveEnd}`} />
            <Field label="状态" value={<StatusBadge status={viewTarget.status} />} />
            <Field label="生效时间" value={viewTarget.effectiveTime} />
            <Field label="是否启用" value={viewTarget.enabled ? "启用" : "停用"} />
            <Field label="创建时间" value={`${viewTarget.createdAt}（${viewTarget.createdBy}）`} />
            <Field label="目标依据" value={viewTarget.basis} />
            <Field label="备注" value={viewTarget.remark} />
            {viewTarget.changeNote && <Field label="变更说明" value={viewTarget.changeNote} />}
            {viewTarget.replacedAt && <Field label="被替代时间" value={viewTarget.replacedAt} />}
            {viewTarget.disabledAt && (
              <Field
                label="停用记录"
                value={`${viewTarget.disabledAt}（${viewTarget.disabledBy}）：${viewTarget.disableReason}`}
              />
            )}
          </div>
        )}
      </Modal>

      {/* 停用确认弹窗：记录停用原因，不生成新版本 */}
      <Modal
        open={disableTarget_ !== null}
        onClose={() => setDisableTarget_(null)}
        title={`停用目标值（${disableTarget_?.version ?? ""}）`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            停用后该版本立即置为「已失效」，不生成新版本；如需恢复，请通过「编辑并新建版本」生成新版本。
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              停用原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              maxLength={200}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
              placeholder="请填写停用原因（不超过 200 字）"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{disableReason.length}/200</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setDisableTarget_(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={confirmDisable}>
              确认停用
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
