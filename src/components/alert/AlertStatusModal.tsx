"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface AlertStatusModalProps {
  open: boolean;
  /** mark=标记已处理；unmark=误处理（撤回为未处理） */
  mode: "mark" | "unmark";
  onClose: () => void;
  /** 确认回调；mark 模式会带上处理说明 */
  onConfirm: (note?: string) => void;
}

export function AlertStatusModal({ open, mode, onClose, onConfirm }: AlertStatusModalProps) {
  const [note, setNote] = useState("");
  const isMark = mode === "mark";

  // 打开时重置处理说明
  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={isMark ? "标记为已处理" : "标记为误处理"} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {isMark ? "是否确认已处理此预警？" : "是否确认误处理此预警？"}
        </p>

        {isMark && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">处理说明（选填）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="简要填写实际原因、采取措施或处理结果。例如：检查发现封签供给装置卡料，清理后设备恢复运行。"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button variant={isMark ? "primary" : "danger"} onClick={() => onConfirm(isMark ? note.trim() : undefined)}>
            {isMark ? "已处理" : "误处理"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
