"use client";

import { ReactNode, useEffect, useState } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number; // px，默认 480
  padding?: boolean; // 内容区内边距，默认 true；嵌入全高布局组件时传 false
}

/**
 * 右侧滑出抽屉：遮罩 + 从右滑入面板，ESC 关闭、锁定 body 滚动，
 * 支持进入/退出过渡动画。
 */
export function Drawer({ open, onClose, title, children, footer, width = 480, padding = true }: DrawerProps) {
  const [render, setRender] = useState(open);
  const [slideIn, setSlideIn] = useState(false);

  useEffect(() => {
    if (open) {
      setRender(true);
      document.body.style.overflow = "hidden";
      const raf = requestAnimationFrame(() => setSlideIn(true));
      return () => cancelAnimationFrame(raf);
    }
    // 关闭：先收起，过渡结束后卸载
    setSlideIn(false);
    document.body.style.overflow = "";
    const timer = setTimeout(() => setRender(false), 300);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩层 */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          slideIn ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      {/* 面板 */}
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute top-0 right-0 h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          slideIn ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: `min(${width}px, 100vw)` }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
        )}
        <div className={`flex-1 min-h-0 overflow-auto ${padding ? "p-6" : ""}`}>{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
