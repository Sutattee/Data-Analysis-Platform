"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import {
  catalogOf,
  diagnosisOfCode,
  displayDiagId,
  displayRecordId,
  formatRecordDate,
  occurrenceContextOf,
  shiftLabelOf,
  saveDiagnosisById,
  upsertDiagnosisByCode,
  type CauseType,
  type DefectRecord,
  type DiagnosisItem,
} from "@/lib/mock-data/quality-defect";

const CAUSE_TYPES: CauseType[] = ["设备", "材料", "操作"];

// 当前时间 → 2026/09/23 09:20:00（诊断时间只读展示格式）
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

// 缺陷诊断抽屉：上半归因分析（档案数据 + 关联机台/牌号），下半人工判定；
// 判定仅支持填写一次——已判定后再打开为只读展示（不可修改），
// 未判定时展示填写表单（不展示诊断人/诊断时间字段）；
// 入口：缺陷分析明细行（record）与诊断明细行（item），
// 保存后缺陷分析抽屉 / 缺陷诊断明细 / 诊断记录三处同源同步
export function DefectDiagnosisDrawer({
  record,
  item,
  open,
  onClose,
  onSaved,
}: {
  record?: DefectRecord | null;
  item?: DiagnosisItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { state } = useApp();
  const toast = useToast();
  const [causeType, setCauseType] = useState<CauseType>("设备");
  const [conclusion, setConclusion] = useState("");

  // 归因上下文：诊断明细行（item）优先，其次缺陷明细行（record）
  const code = item?.code ?? record?.code ?? "";
  const catalog = code ? catalogOf(code) : undefined;
  // 判定记录：item 场景以该行为准；record 场景按代码回显（优先已判定）
  const linked = item ?? (code ? diagnosisOfCode(code) : undefined);
  const judged = linked?.conclusion ? linked : undefined;
  // 归因区机台：item 自身关联机台 / 代码关联判定机台
  const machine = item?.machine ?? linked?.machine ?? "-";
  // 发生上下文（批次/牌号/班组）：缺陷明细行即发生记录本体；
  // 诊断明细行按登记日期关联当天发生记录，无则回退最近一次
  const occ = record ?? (item ? occurrenceContextOf(item.code, item.recordDate) : undefined);

  // 切换目标时清空表单（已判定为只读展示，不使用表单值）
  useEffect(() => {
    setCauseType("设备");
    setConclusion("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, record?.id]);

  function handleSave() {
    if (!code) return;
    if (!conclusion.trim()) {
      toast("请填写诊断结论", "warning");
      return;
    }
    const user = state.user?.nickname || state.user?.username || "—";
    if (item) {
      saveDiagnosisById(item.id, { causeType, conclusion: conclusion.trim() }, { user, now: formatNow() });
    } else {
      upsertDiagnosisByCode(code, { causeType, conclusion: conclusion.trim() }, { user, now: formatNow() });
    }
    toast("保存成功", "success");
    onSaved();
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="缺陷诊断详情"
      width={520}
      footer={
        <div className="flex justify-end gap-2">
          {judged ? (
            <Button variant="secondary" onClick={onClose}>
              关闭
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                取消
              </Button>
              <Button onClick={handleSave}>保存</Button>
            </>
          )}
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
          <Field label="诊断记录ID">
            <span className="font-mono text-xs">{linked ? displayDiagId(linked) : "—"}</span>
          </Field>
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

      {/* 归因分析：仅 AI 诊断原因 */}
      <section className="mt-6">
        <h4 className="mb-2 text-sm font-semibold text-gray-800">归因分析</h4>
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <Field label="AI诊断原因">{catalog?.aiCause ?? item?.aiCause ?? "—"}</Field>
        </div>
      </section>

      {/* 人工判定：已判定只读展示；未判定展示填写表单（仅一次） */}
      <section className="mt-6">
        <h4 className="mb-2 text-sm font-semibold text-gray-800">人工判定</h4>
        {judged ? (
          <div className="rounded-xl bg-gray-50 px-4 py-2">
            <Field label="原因分类">{judged.causeType}</Field>
            <Field label="诊断结论">{judged.conclusion}</Field>
            <Field label="诊断人">{judged.diagnoser ?? "—"}</Field>
            <Field label="诊断时间">{judged.diagnosedAt ?? "—"}</Field>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600">原因分类</label>
              <select
                value={causeType}
                onChange={(e) => setCauseType(e.target.value as CauseType)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500"
              >
                {CAUSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm text-gray-600">诊断结论</label>
                <span className="text-xs text-gray-400">{conclusion.length}/200</span>
              </div>
              <textarea
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                maxLength={200}
                rows={4}
                placeholder="请输入诊断结论（最多200字）"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </section>
    </Drawer>
  );
}
