"use client";

import { createContext, useCallback, useContext, useState, ReactNode, useEffect } from "react";

type ToastType = "success" | "danger" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastType, { box: string; icon: string }> = {
  success: { box: "bg-white border-l-4 border-green-500", icon: "✅" },
  danger: { box: "bg-white border-l-4 border-red-500", icon: "❌" },
  warning: { box: "bg-white border-l-4 border-yellow-500", icon: "⚠️" },
  info: { box: "bg-white border-l-4 border-primary-500", icon: "ℹ️" },
};

/**
 * 全局 Toast 提供者：右上角堆叠，3 秒自动消失。
 * 通过 useToast() 获取 toast(message, type)。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).slice(2);
      setItems((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), 3000);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast 容器 */}
      <div className="fixed top-4 right-4 z-[200] space-y-2 w-80 pointer-events-none">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const style = STYLES[item.type];
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`${style.box} shadow-lg rounded-lg px-4 py-3 flex items-start gap-2.5 pointer-events-auto transition-all duration-200 ${
        shown ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      }`}
    >
      <span className="text-base leading-5">{style.icon}</span>
      <span className="flex-1 text-sm text-gray-700 leading-5 break-words">{item.message}</span>
      <button
        onClick={onClose}
        className="text-gray-300 hover:text-gray-500 text-sm leading-5"
        aria-label="关闭"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
