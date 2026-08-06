// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// 格式化数字（添加千分位）
export function formatNumber(num: number): string {
  return num.toLocaleString("zh-CN");
}

// 格式化百分比变化
export function formatChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

// 获取趋势箭头类名
export function getTrendColor(trend: "up" | "down" | "flat"): string {
  switch (trend) {
    case "up":   return "text-green-600";
    case "down": return "text-red-600";
    case "flat": return "text-gray-400";
  }
}

// 获取趋势箭头符号
export function getTrendArrow(trend: "up" | "down" | "flat"): string {
  switch (trend) {
    case "up":   return "↑";
    case "down": return "↓";
    case "flat": return "→";
  }
}

// 格式化日期
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 格式化日期时间（精确到秒），统一格式 YYYY-MM-DD HH:mm:ss
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

// 模拟延迟
export function delay(ms: number = 800): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// localStorage 安全读写
export function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}
