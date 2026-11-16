// 平台 Logo：智能分析平台
// 设计语言：纯色品牌蓝圆角方块 + 白色几何「D」
// D 为填充式标准字形（竖笔 + 半圆碗形，笔画粗细统一 4px），
// 双轮廓 + evenodd 挖出字腔；矢量路径不依赖系统字体，小尺寸下依然清晰
// 纯内联 SVG，无外部资源依赖

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="智能分析平台 Logo"
      className="flex-shrink-0"
    >
      {/* 圆角方块底：品牌蓝（blue-600）*/}
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#2563EB" />
      {/* 白色字母 D：外轮廓 + 内字腔（evenodd 挖空，笔画 4px） */}
      <path
        d="M12 10 H19 A10 10 0 0 1 19 30 H12 Z M16 14 H19 A6 6 0 0 1 19 26 H16 Z"
        fill="white"
        fillRule="evenodd"
      />
    </svg>
  );
}
