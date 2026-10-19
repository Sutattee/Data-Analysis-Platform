"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import {
  saveDiagnosisCauseById,
  type DiagnosisItem,
} from "@/lib/mock-data/quality-defect";

// 当前时间 → 2026/09/23 09:20:00
function formatNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 编辑缺陷原因弹窗（≤500字）：保存后诊断明细列表与诊断记录页同源同步
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
  const [causeText, setCauseText] = useState("");

  // 切换目标项时回显当前展示原因（人工修正文字优先，否则 AI 生成原因）
  useEffect(() => {
    if (item) {
      setCauseText(item.causeText ?? item.aiCause);
    }
  }, [item]);

  function handleSave() {
    if (!item) return;
    if (!causeText.trim()) {
      toast("请填写缺陷原因", "warning");
      return;
    }
    const user = state.user?.nickname || state.user?.username || "—";
    saveDiagnosisCauseById(item.id, causeText.trim(), { user, now: formatNow() });
    toast("保存成功", "success");
    onSaved();
    onClose();
  }

  return (
    <Modal open={!!item} onClose={onClose} title="编辑缺陷原因">
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm text-gray-600">缺陷原因</label>
            <span className="text-xs text-gray-400">{causeText.length}/500</span>
          </div>
          <textarea
            value={causeText}
            onChange={(e) => setCauseText(e.target.value)}
            maxLength={500}
            rows={5}
            placeholder="请输入缺陷原因（最多500字）"
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
