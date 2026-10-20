"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import {
  catalogOf,
  diagCatalogOf,
  diagnosisOfCode,
  displayDiagId,
  displayRecordId,
  formatRecordDate,
  occurrenceContextOf,
  shiftLabelOf,
  saveDiagnosisCauseById,
  upsertDiagnosisCause,
  type DefectRecord,
  type DiagnosisItem,
} from "@/lib/mock-data/quality-defect";

// 当前时间 → 2026/09/23 09:20:00（诊断时间展示格式）
function formatNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-28 shrink-0 text-gray-500">{label}</span>
      <span className="flex-1 text-gray-800">{children}</span>
    </div>
  );
}

// 缺陷诊断抽屉：上半基本信息（档案数据 + 发生上下文），下半「缺陷原因」
// 分 4 个字段并列独立展示（原因 / 原因类型 / 诊断人 / 诊断时间）；
// 右上「修正」仅「原因」变为编辑（≤500字），其余字段不隐藏，
// 保存后原因类型变为「人工补录」并记录诊断人/诊断时间；
// 入口：缺陷分析明细行（record，variant="detail" 仅查看，标题「缺陷详情」、
// 不展示诊断记录ID与缺陷原因区块——诊断操作只在缺陷诊断页做）与诊断明细行（item），
// 保存后缺陷分析抽屉 / 缺陷诊断明细 / 诊断记录三处同源同步
export function DefectDiagnosisDrawer({
  record,
  item,
  open,
  onClose,
  onSaved,
  variant = "diagnosis",
}: {
  record?: DefectRecord | null;
  item?: DiagnosisItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  variant?: "diagnosis" | "detail";
}) {
  const { state } = useApp();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // 本抽屉内保存后的即时回显（store 已同步写入，此处保证不重开抽屉也能看到最新值）
  const [saved, setSaved] = useState<{ text: string; by: string; at: string } | null>(null);

  // 诊断上下文：诊断明细行（item）优先，其次缺陷明细行（record）；
  // 档案双口径：缺陷分析明细行走全量档案（catalogOf），诊断明细行走 3 缺陷口径（diagCatalogOf）
  const code = item?.code ?? record?.code ?? "";
  const catalog = code ? (catalogOf(code) ?? diagCatalogOf(code)) : undefined;
  // 诊断记录：item 场景以该行为准；record 场景按代码回显（优先已修正）
  const linked = item ?? (code ? diagnosisOfCode(code) : undefined);
  // 原因区机台：item 自身关联机台 / 代码关联诊断机台
  const machine = item?.machine ?? linked?.machine ?? "-";
  // 发生上下文（批次/牌号/班组）：缺陷明细行即发生记录本体；
  // 诊断明细行按登记日期关联当天发生记录，无则回退最近一次
  const occ = record ?? (item ? occurrenceContextOf(item.code, item.recordDate) : undefined);

  // 展示口径：本抽屉保存值 > store 人工修正 > AI 生成
  const revised = item?.causeText ?? linked?.causeText;
  const causeText = saved?.text ?? revised ?? (item?.aiCause ?? linked?.aiCause ?? catalog?.aiCause ?? "");
  const isManual = !!(saved || revised);
  const diagnoser = saved?.by ?? (revised ? (item?.diagnoser ?? linked?.diagnoser) : undefined);
  const diagnosedAt = saved?.at ?? (revised ? (item?.diagnosedAt ?? linked?.diagnosedAt) : undefined);

  // 切换目标时退出编辑并清空草稿与本地保存态
  useEffect(() => {
    setEditing(false);
    setDraft("");
    setSaved(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, record?.id]);

  function startEdit() {
    setDraft(causeText);
    setEditing(true);
  }

  function handleSave() {
    if (!draft.trim()) {
      toast("请填写缺陷原因", "warning");
      return;
    }
    const user = state.user?.nickname || state.user?.username || "—";
    const now = formatNow();
    const text = draft.trim();
    if (item) {
      saveDiagnosisCauseById(item.id, text, { user, now });
    } else if (code) {
      upsertDiagnosisCause(code, text, { user, now });
    }
    setSaved({ text, by: user, at: now });
    setEditing(false);
    toast("保存成功", "success");
    onSaved();
  }

  // detail 变体（缺陷分析页查看）：仅基本信息，不带诊断字段与修正入口
  const isDetail = variant === "detail";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isDetail ? "缺陷详情" : "缺陷诊断详情"}
      width={520}
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      {/* 基本信息：记录 ID + 缺陷档案 + 发生上下文 */}
      <section>
        <h4 className="mb-2 text-sm font-semibold text-gray-800">基本信息</h4>
        <div className="rounded-xl bg-gray-50 px-4 py-2">
          <Field label="缺陷记录ID">
            <span className="font-mono text-xs">{record ? displayRecordId(record) : occ ? displayRecordId(occ) : "—"}</span>
          </Field>
          {!isDetail && (
            <Field label="诊断记录ID">
              <span className="font-mono text-xs">{linked ? displayDiagId(linked) : "—"}</span>
            </Field>
          )}
          <Field label="缺陷代码">
            <span className="font-mono text-xs">{code || "—"}</span>
          </Field>
          <Field label="缺陷名称">{record?.name ?? catalog?.name ?? "—"}</Field>
          <Field label="缺陷部位">{record?.part ?? catalog?.part ?? "—"}</Field>
          <Field label="工序">{catalog?.process ?? "—"}</Field>
          <Field label="机台">{machine}</Field>
          <Field label="批次">{occ?.batch ?? "-"}</Field>
          <Field label="牌号">{occ?.brand ?? "-"}</Field>
          <Field label="班组">{occ?.shift ?? "-"}</Field>
          <Field label="班次">{occ ? shiftLabelOf(occ) : "-"}</Field>
          <Field label="责任岗位">{catalog?.post ?? "—"}</Field>
          <Field label="检验日期">{occ ? formatRecordDate(occ) : "—"}</Field>
        </div>
      </section>

      {/* 缺陷原因（仅诊断变体展示；detail 查看不带归因与人工判定信息）：
          原因 / 原因类型 / 诊断人 / 诊断时间 4 字段并列展示；
          修正时仅「原因」变为编辑框，其余字段不隐藏 */}
      {!isDetail && (
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">缺陷原因</h4>
          {!editing && (
            <Button size="sm" onClick={startEdit}>
              修正
            </Button>
          )}
        </div>
        <div className="rounded-xl bg-gray-50 px-4 py-2">
          <Field label="原因">
            {editing ? (
              <div className="space-y-2 py-1">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={500}
                  rows={5}
                  placeholder="请输入缺陷原因（最多500字）"
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{draft.length}/500</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      保存
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <span className="whitespace-pre-line leading-relaxed">{causeText || "—"}</span>
            )}
          </Field>
          <Field label="原因类型">{isManual ? "人工补录" : "AI生成"}</Field>
          <Field label="诊断人">{isManual ? (diagnoser ?? "—") : "—"}</Field>
          <Field label="诊断时间">{isManual ? (diagnosedAt ?? "—") : "—"}</Field>
        </div>
      </section>
      )}
    </Drawer>
  );
}
