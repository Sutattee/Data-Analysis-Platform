"use client";

// 重大事件 - 详情抽屉（四区：基本信息 / 事件经过 / 影响与证据 / 维护记录）
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { EventTimeline } from "./EventTimeline";
import { ConfirmStatusBadge, EventTypeBadge, FormationBadge } from "./eventBadges";
import { computeDuration, timeLabelOf } from "@/lib/mock-data/major-events";
import type { MajorEvent } from "@/types";

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 break-words">{value ?? "-"}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-semibold text-gray-800 border-l-4 border-primary-600 pl-2">{children}</h4>;
}

export function EventDetailDrawer({
  open,
  onClose,
  event,
  onEdit,
  onShowAlerts,
}: {
  open: boolean;
  onClose: () => void;
  event: MajorEvent | null;
  onEdit?: (e: MajorEvent) => void; // 传入了才显示「编辑」按钮（事件管理权限用户）
  onShowAlerts: (alertIds: string[]) => void; // 打开关联预警弹窗
}) {
  const e = event;
  // 时间轴是否完整：至少含「处置」或「恢复」节点（疑似事件仅有「发生」节点）
  const hasFullProcess = !!e?.timeline.some((t) => t.label.includes("处置") || t.label.includes("恢复") || t.label.includes("完成") || t.label.includes("结束"));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="事件详情"
      width={640}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>返回</Button>
          {e && onEdit && (
            <Button onClick={() => onEdit(e)}>编辑</Button>
          )}
        </div>
      }
    >
      {e && (
        <div className="space-y-6">
          {/* ① 基本信息 */}
          <section className="space-y-3">
            <SectionTitle>基本信息</SectionTitle>
            {e.isSuspected && e.status === "待确认" && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-100 px-3 py-2 text-xs text-yellow-700">
                ⚠ 疑似事件：当前仅有指标异常数据，缺少设备故障、检修、计划调整等业务证据，暂无法判断具体业务原因，请结合业务情况核实确认。
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="事件编号" value={<span className="font-mono">{e.id}</span>} />
              <Field label="事件类型" value={<EventTypeBadge type={e.type} />} />
              <div className="col-span-2">
                <Field label="事件标题" value={<span className="font-medium">{e.title}</span>} />
              </div>
              <Field label="发生时间" value={timeLabelOf(e)} />
              <Field label="持续时长" value={computeDuration(e.startTime, e.endTime)} />
              <Field label="形成方式" value={<FormationBadge formation={e.formation} />} />
              <Field label="确认状态" value={<ConfirmStatusBadge status={e.status} />} />
              <Field label="创建人" value={e.createdBy} />
              <Field label="创建时间" value={e.createdAt} />
            </div>
          </section>

          {/* ② 事件经过 */}
          <section className="space-y-3">
            <SectionTitle>事件经过</SectionTitle>
            <p className="text-sm leading-7 text-gray-700 whitespace-pre-wrap">{e.process}</p>
            {hasFullProcess ? (
              <EventTimeline items={e.timeline} />
            ) : (
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 text-xs text-gray-400">
                暂无完整事件经过（缺少处置与恢复过程信息）
              </div>
            )}
          </section>

          {/* ③ 影响与证据 */}
          <section className="space-y-3">
            <SectionTitle>影响与证据</SectionTitle>
            <Field label="影响对象" value={e.objects.join("／")} />
            <Field
              label="影响指标"
              value={
                e.metrics.length ? (
                  <span className="flex flex-wrap gap-1">
                    {e.metrics.map((m) => (
                      <span key={m} className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600">{m}</span>
                    ))}
                  </span>
                ) : (
                  "-"
                )
              }
            />
            <Field label="影响摘要" value={e.impactSummary || "-"} />
            <Field
              label="关联预警"
              value={
                e.alertIds.length ? (
                  <button
                    onClick={() => onShowAlerts(e.alertIds)}
                    className="text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    {e.alertIds.length} 条，点击查看
                  </button>
                ) : (
                  "无"
                )
              }
            />
            {e.formation !== "人工补录" && (
              <Field
                label="AI 识别依据"
                value={<span className="text-gray-600">{e.aiBasis || "-"}</span>}
              />
            )}
          </section>

          {/* ④ 维护记录 */}
          <section className="space-y-3">
            <SectionTitle>维护记录</SectionTitle>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="最后修改人" value={e.updatedBy ?? "—"} />
              <Field label="最后修改时间" value={e.updatedAt ?? "—"} />
            </div>
            {e.status === "已排除" && e.excludeReason && (
              <Field label="排除原因" value={<span className="text-gray-500">{e.excludeReason}</span>} />
            )}
            {e.revisions.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs text-gray-400">修订记录（{e.revisions.length} 条，原始内容已保留）</span>
                <div className="space-y-1.5">
                  {e.revisions.map((r, i) => (
                    <div key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <span className="text-gray-400 font-mono mr-2">{r.time}</span>
                      <span className="font-medium text-gray-700 mr-2">{r.user}</span>
                      {r.summary}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">暂无人工修订记录</p>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
