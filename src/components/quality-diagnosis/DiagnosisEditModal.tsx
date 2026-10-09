"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import {
  saveDiagnosisById,
  type CauseType,
  type DiagnosisItem,
} from "@/lib/mock-data/quality-defect";

const CAUSE_TYPES: CauseType[] = ["设备", "材料", "操作"];

// 当前时间 → 2026/09/23 09:20:00
function formatNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 编辑诊断结论弹窗：原因分类 + 诊断结论（≤200字）；
// 保存后诊断明细列表与诊断记录页同源同步
export function DiagnosisEditModal({
  item,
  onClose,
  onSaved,
}: {
  item: DiagnosisItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { state } = useApp();
  const toast = useToast();
  const [causeType, setCauseType] = useState<CauseType>("设备");
  const [conclusion, setConclusion] = useState("");

  // 切换目标项时回显已有判定
  useEffect(() => {
    if (item) {
      setCauseType(item.causeType ?? "设备");
      setConclusion(item.conclusion ?? "");
    }
  }, [item]);

  function handleSave() {
    if (!item) return;
    if (!conclusion.trim()) {
      toast("请填写诊断结论", "warning");
      return;
    }
    const user = state.user?.nickname || state.user?.username || "—";
    saveDiagnosisById(item.id, { causeType, conclusion: conclusion.trim() }, { user, now: formatNow() });
    toast("保存成功", "success");
    onSaved();
    onClose();
  }

  return (
    <Modal open={!!item} onClose={onClose} title="编辑诊断结论">
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

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button onClick={handleSave}>保存</Button>
      </div>
    </Modal>
  );
}
