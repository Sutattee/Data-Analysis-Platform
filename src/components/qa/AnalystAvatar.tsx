// 插画风格「大数据分析专家」卡通形象：蓝渐变圆球 + 年轻分析师（寸头、长脸、长方形框眼镜、西装领带）+ 迷你柱状图徽章
export function AnalystAvatar() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="aa-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <clipPath id="aa-clip">
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      {/* 背景圆球 */}
      <circle cx="32" cy="32" r="30" fill="url(#aa-bg)" />
      <g clipPath="url(#aa-clip)">
        {/* 西装外套 */}
        <path d="M11 64 C11 50.5 20.5 44.5 32 44.5 C43.5 44.5 53 50.5 53 64 Z" fill="#1e2a4a" />
        {/* 白衬衫领口 */}
        <path d="M26.8 44.6 L32 52.8 L37.2 44.6 L37.2 47.2 L32 54.8 L26.8 47.2 Z" fill="#ffffff" />
        {/* 西装翻领 */}
        <path d="M26.8 44.6 L21.8 48.8 L25.8 55.8 L27.8 52.2 Z" fill="#2b3d63" />
        <path d="M37.2 44.6 L42.2 48.8 L38.2 55.8 L36.2 52.2 Z" fill="#2b3d63" />
        {/* 领带：结 + 身 */}
        <path d="M30.5 46.9 L33.5 46.9 L32.7 49.3 L31.3 49.3 Z" fill="#2563eb" />
        <path d="M31.3 49.3 L32.7 49.3 L34 58.5 L32 61.3 L30 58.5 Z" fill="#3b82f6" />
        {/* 脖子 */}
        <rect x="29.2" y="39.5" width="5.6" height="7" rx="2.4" fill="#ffdcb8" />
        {/* 耳朵 */}
        <circle cx="22.6" cy="27.5" r="1.9" fill="#ffdcb8" />
        <circle cx="41.4" cy="27.5" r="1.9" fill="#ffdcb8" />
        {/* 长脸：鹅蛋形，下巴拉长收窄 */}
        <path
          d="M23 23 C23 17 26.8 13.8 32 13.8 C37.2 13.8 41 17 41 23 C41 30.3 39 37.6 35.5 40.4 C34.2 41.6 33.1 42.1 32 42.1 C30.9 42.1 29.8 41.6 28.5 40.4 C25 37.6 23 30.3 23 23 Z"
          fill="#ffdcb8"
        />
        {/* 寸头（圆平头）：紧贴头皮的短茬，均匀一条发际线，无分缝 */}
        <path
          d="M22.4 22.5 C21.4 16.2 25.8 12.6 32 12.6 C38.2 12.6 42.6 16.2 41.6 22.5 C41.4 21.4 41.1 20.5 40.7 19.7 C40.2 20.4 39.6 20.8 39 21 C36.7 21.6 27.3 21.6 25 21 C24.4 20.8 23.8 20.4 23.3 19.7 C22.9 20.5 22.6 21.4 22.4 22.5 Z"
          fill="#2f2a38"
        />
        {/* 寸头短茬质感：细密点状发茬 */}
        <g fill="#524a5e">
          <circle cx="27" cy="16.6" r="0.55" />
          <circle cx="30" cy="15.2" r="0.55" />
          <circle cx="33.2" cy="15.6" r="0.55" />
          <circle cx="36.4" cy="16.8" r="0.55" />
          <circle cx="28.6" cy="18.6" r="0.55" />
          <circle cx="32" cy="17.8" r="0.55" />
          <circle cx="35.2" cy="18.8" r="0.55" />
        </g>
        {/* 两侧与后颈推剪渐变（发际线收窄） */}
        <path d="M22.4 22.5 C22.6 21.4 22.9 20.5 23.3 19.7 L25 21 C24.2 21.6 23.2 22.1 22.4 22.5 Z" fill="#3d3746" />
        <path d="M41.6 22.5 C41.4 21.4 41.1 20.5 40.7 19.7 L39 21 C39.8 21.6 40.8 22.1 41.6 22.5 Z" fill="#3d3746" />
        {/* 眉毛 */}
        <path d="M25.6 24 Q28.4 22.8 31 23.9" stroke="#2f2a38" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <path d="M33 23.9 Q35.6 22.8 38.4 24" stroke="#2f2a38" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        {/* 长方形框眼镜（细框，透明镜片） */}
        <rect x="24.6" y="25.9" width="6.4" height="4.4" rx="1.1" fill="#ffffff" fillOpacity="0.35" stroke="#31415e" strokeWidth="1.2" />
        <rect x="33" y="25.9" width="6.4" height="4.4" rx="1.1" fill="#ffffff" fillOpacity="0.35" stroke="#31415e" strokeWidth="1.2" />
        <line x1="31" y1="28.1" x2="33" y2="28.1" stroke="#31415e" strokeWidth="1.2" />
        <line x1="24.6" y1="27.6" x2="23.2" y2="27.2" stroke="#31415e" strokeWidth="1" />
        <line x1="39.4" y1="27.6" x2="40.8" y2="27.2" stroke="#31415e" strokeWidth="1" />
        {/* 眼睛（对准镜片中心） */}
        <circle cx="27.8" cy="28.1" r="1.15" fill="#1f2733" />
        <circle cx="36.2" cy="28.1" r="1.15" fill="#1f2733" />
        {/* 自信浅笑 */}
        <path d="M29.4 35 Q32 37.2 34.6 35" stroke="#c2784a" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        {/* 数据点缀 */}
        <circle cx="11.5" cy="16" r="1.6" fill="#dbeafe" />
        <circle cx="17" cy="10.5" r="1.1" fill="#dbeafe" />
        <circle cx="8.5" cy="24" r="1.1" fill="#dbeafe" />
      </g>
      {/* 迷你柱状图徽章 */}
      <circle cx="49" cy="47.5" r="12" fill="#ffffff" />
      <rect x="42.5" y="48.5" width="3.6" height="5.5" rx="1.2" fill="#93c5fd" />
      <rect x="47.6" y="44.5" width="3.6" height="9.5" rx="1.2" fill="#3b82f6" />
      <rect x="52.7" y="40.5" width="3.6" height="13.5" rx="1.2" fill="#f97316" />
      <circle cx="54.5" cy="38.8" r="1.5" fill="#22c55e" />
    </svg>
  );
}
