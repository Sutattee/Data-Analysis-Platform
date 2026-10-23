"use client";

import { useEffect, useState, type ReactNode } from "react";

// 流式输出组件：将文本按快速打字机节奏逐字输出（约 125 字/秒），
// 营造 AI 即时生成的观感（智能诊断、缺陷预测智能解读等共用）；
// 文本变化时从头重打，输出完成前以光标 ▍ 提示生成中；
// 开始输出前用不间断空格占位，保持表格单元格行高稳定不跳动。
export function StreamText({
  text,
  delay = 0,
  speed = 2, // 每 tick 输出字符数
  tickMs = 16, // tick 间隔（≈一帧）
  className,
  caret = false, // 生成中是否显示光标
  suffix, // 输出完成后才显示的后缀（如数值单位）
  instant = false, // 直接展示全文（诊断已结束后回看执行过程，不重放打字）
}: {
  text: string;
  delay?: number;
  speed?: number;
  tickMs?: number;
  className?: string;
  caret?: boolean;
  suffix?: ReactNode;
  instant?: boolean;
}) {
  const full = text ?? "";
  // 记录已输出长度与对应文本：text 变化后的首帧先清空（避免用旧长度闪现全文），再从头重打
  const [st, setSt] = useState({ text: full, n: instant ? full.length : 0 });
  const shown = st.text === full ? full.slice(0, st.n) : "";
  const done = shown.length >= full.length;

  useEffect(() => {
    if (instant) {
      setSt({ text: full, n: full.length });
      return;
    }
    setSt({ text: full, n: 0 });
    if (!full) return;
    let i = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        i = Math.min(i + speed, full.length);
        setSt({ text: full, n: i });
        if (i >= full.length) clearInterval(timer);
      }, tickMs);
    }, delay);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [full, delay, speed, tickMs, instant]);

  return (
    <span className={className}>
      {shown || (full ? " " : "")}
      {suffix != null && done ? suffix : null}
      {caret && !done && <span className="ml-0.5 animate-pulse text-primary-500">▍</span>}
    </span>
  );
}

// 条形生长：延迟后宽度从 0 过渡到目标值（贡献度等数值条），与逐字文本节奏配合
export function GrowBar({
  width,
  delay = 0,
  duration = 800,
  className = "h-full rounded bg-primary-600",
}: {
  width: number; // 目标宽度百分比（0~100，自动收敛）
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`transition-[width] ease-out ${className}`}
      style={{ width: `${on ? Math.min(Math.max(width, 0), 100) : 0}%`, transitionDuration: `${duration}ms` }}
    />
  );
}
