"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * 全量同步进度弹窗：打开即开始，展示进度条与提示文字；
 * 同步完成后文案更新为"同步完成"，随后自动关闭。
 */
export function FullSyncModal({ open, onClose }: Props) {
  const toast = useToast();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setDone(false);
      return;
    }
    setProgress(0);
    setDone(false);
    let p = 0;
    const timer = setInterval(() => {
      p += Math.round(6 + Math.random() * 12);
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        setProgress(100);
        setDone(true); // 文案更新为"同步完成"
        toast("Sparta 数据全量同步完成", "success");
        setTimeout(() => onClose(), 900); // 自动关闭
      } else {
        setProgress(p);
      }
    }, 400);
    return () => clearInterval(timer);
    // 仅在打开/关闭时启停
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="全量同步中" size="sm">
      <div className="py-6 flex flex-col items-center text-center">
        <div className={`text-4xl mb-3 ${done ? "" : "animate-pulse"}`}>{done ? "✅" : "🔄"}</div>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          {done ? "同步完成" : "正在同步 Sparta 平台全量数据源与数据表元数据。"}
        </p>
        {!done && (
          <>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">{progress}%</p>
          </>
        )}
      </div>
    </Modal>
  );
}
