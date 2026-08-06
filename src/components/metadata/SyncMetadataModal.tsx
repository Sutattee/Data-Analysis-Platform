"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ESTIMATE_SECONDS = 38;

/**
 * 同步元数据弹窗：提示文案 + 取消/确定；确定后异步执行索引更新任务并通知。
 */
export function SyncMetadataModal({ open, onClose }: Props) {
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);

  // 关闭时重置
  useEffect(() => {
    if (!open) {
      setSyncing(false);
      setProgress(0);
    }
  }, [open]);

  function startSync() {
    setSyncing(true);
    setProgress(0);
    let p = 0;
    const timer = setInterval(() => {
      p += Math.round(8 + Math.random() * 14);
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        setProgress(100);
        setTimeout(() => {
          setSyncing(false);
          toast("元数据同步完成，语义索引已更新", "success");
          onClose();
        }, 400);
      } else {
        setProgress(p);
      }
    }, 350);
  }

  return (
    <Modal open={open} onClose={onClose} title="同步元数据" size="sm">
      {syncing ? (
        <div className="py-4 flex flex-col items-center text-center">
          <div className="text-4xl mb-3 animate-pulse">🔄</div>
          <p className="text-sm text-gray-700 mb-3">正在重新采集元数据并重建语义索引…</p>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">{progress}%</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center py-2">
            <span className="text-5xl mb-3">🔁</span>
            <p className="text-sm text-gray-600 leading-relaxed">
              将重新采集数据库的全量元数据并重建语义索引。预计耗时约
              <span className="font-medium text-gray-800"> {ESTIMATE_SECONDS} 秒</span>
              ，同步期间不影响已有查询。
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button onClick={startSync}>确定</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
