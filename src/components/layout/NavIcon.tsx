// 导航图标：将 emoji 字符串映射为彩色色块矢量 SVG 图标
// 未映射的 emoji 保持原样渲染（向后兼容）

const ICON_MAP: Record<string, React.ReactNode> = {
  // ===== 能源消耗板块 =====
  "📊": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#3B82F6" />
      <rect x="5" y="10" width="2.5" height="5" rx="0.5" fill="white" />
      <rect x="8.75" y="7" width="2.5" height="8" rx="0.5" fill="white" />
      <rect x="12.5" y="5" width="2.5" height="10" rx="0.5" fill="white" />
    </svg>
  ),
  "🖥️": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="3" width="16" height="11" rx="2" fill="#10B981" />
      <rect x="4" y="5" width="12" height="7" rx="1" fill="white" opacity="0.3" />
      <rect x="7" y="15" width="6" height="2" rx="0.5" fill="#10B981" />
    </svg>
  ),
  "📈": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#8B5CF6" />
      <path d="M5 14L8 10L11 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15" cy="6" r="1.2" fill="white" />
    </svg>
  ),
  "🧪": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#F59E0B" />
      <path d="M8 5V9L5 14C4.5 15 5.2 16 6.3 16H13.7C14.8 16 15.5 15 15 14L12 9V5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M7 5H13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "📑": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2" fill="#06B6D4" />
      <rect x="6" y="5" width="8" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="8" width="8" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="11" width="5" height="1.5" rx="0.75" fill="white" />
      <rect x="3" y="2" width="2" height="16" rx="1" fill="#0891B2" />
    </svg>
  ),
  "🗓️": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="3" width="16" height="15" rx="2" fill="#EC4899" />
      <rect x="2" y="3" width="16" height="4" rx="2" fill="#DB2777" />
      <rect x="5" y="9" width="3" height="2.5" rx="0.5" fill="white" />
      <rect x="9" y="9" width="3" height="2.5" rx="0.5" fill="white" />
      <rect x="13" y="9" width="3" height="2.5" rx="0.5" fill="white" opacity="0.5" />
      <rect x="5" y="13" width="3" height="2.5" rx="0.5" fill="white" opacity="0.5" />
    </svg>
  ),
  "📋": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2" fill="#6366F1" />
      <rect x="6" y="5" width="8" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="8" width="8" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="11" width="6" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="14" width="4" height="1.5" rx="0.75" fill="white" opacity="0.5" />
    </svg>
  ),
  "📚": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="3" width="16" height="14" rx="2" fill="#14B8A6" />
      <rect x="4" y="5" width="5" height="10" rx="1" fill="white" opacity="0.9" />
      <rect x="10" y="5" width="5" height="10" rx="1" fill="white" opacity="0.6" />
      <path d="M6 7H8M6 9H8M6 11H8" stroke="#14B8A6" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  ),

  // ===== 原智能应用模块（现归属能源消耗板块） =====
  "⚠️": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#F59E0B" />
      <path d="M10 6V11" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="14" r="1.2" fill="white" />
    </svg>
  ),
  "🛠️": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#6366F1" />
      <path d="M7 13L13 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 6L14 8L13 9L11 7Z" fill="white" />
      <path d="M6 12L8 14L7 15L5 13Z" fill="white" />
    </svg>
  ),
  "💬": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="3" width="16" height="14" rx="3" fill="#3B82F6" />
      <circle cx="7" cy="10" r="1" fill="white" />
      <circle cx="10" cy="10" r="1" fill="white" />
      <circle cx="13" cy="10" r="1" fill="white" />
    </svg>
  ),
  "🔗": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#F97316" />
      <circle cx="7" cy="10" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="13" cy="10" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M9.5 10H10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "📄": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2" fill="#8B5CF6" />
      <rect x="6" y="5" width="8" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="8" width="8" height="1.5" rx="0.75" fill="white" />
      <rect x="6" y="11" width="5" height="1.5" rx="0.75" fill="white" />
    </svg>
  ),

  // ===== 费用预算执行 / 生产管理板块 =====
  // 业务构成：收据票据（锯齿底边 + 明细行）
  "🧾": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#06B6D4" />
      <path d="M6 4.5H14V15.5L12.7 14.6L11.4 15.5L10 14.6L8.6 15.5L7.3 14.6L6 15.5Z" fill="white" />
      <rect x="8" y="7" width="4" height="1.2" rx="0.6" fill="#06B6D4" />
      <rect x="8" y="9.5" width="4" height="1.2" rx="0.6" fill="#06B6D4" opacity="0.7" />
      <rect x="8" y="12" width="2.5" height="1.2" rx="0.6" fill="#06B6D4" opacity="0.5" />
    </svg>
  ),
  // 设备运行效率：八齿齿轮
  "⚙️": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#6366F1" />
      <g fill="white">
        <rect x="9" y="3" width="2" height="3" rx="0.5" />
        <rect x="9" y="14" width="2" height="3" rx="0.5" />
        <rect x="3" y="9" width="3" height="2" rx="0.5" />
        <rect x="14" y="9" width="3" height="2" rx="0.5" />
        <rect x="9" y="3" width="2" height="3" rx="0.5" transform="rotate(45 10 10)" />
        <rect x="9" y="3" width="2" height="3" rx="0.5" transform="rotate(135 10 10)" />
        <rect x="9" y="3" width="2" height="3" rx="0.5" transform="rotate(225 10 10)" />
        <rect x="9" y="3" width="2" height="3" rx="0.5" transform="rotate(315 10 10)" />
      </g>
      <circle cx="10" cy="10" r="4.2" fill="white" />
      <circle cx="10" cy="10" r="1.8" fill="#6366F1" />
    </svg>
  ),
  // 辅料消耗：绕线线轴（上下法兰 + 绕线纹理）
  "🧵": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#F97316" />
      <rect x="5.5" y="3.5" width="9" height="2.5" rx="1" fill="white" />
      <rect x="5.5" y="14" width="9" height="2.5" rx="1" fill="white" />
      <rect x="7" y="6" width="6" height="8" fill="white" opacity="0.9" />
      <path d="M7 7.8H13M7 9.9H13M7 12H13" stroke="#F97316" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  ),

  // ===== 工艺质量板块 =====
  // 工艺参数推荐：调音推子（双轨滑块，推子一高一低示意调节）
  "🎚️": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#06B6D4" />
      <rect x="6.25" y="4" width="1.5" height="12" rx="0.75" fill="white" opacity="0.5" />
      <rect x="12.25" y="4" width="1.5" height="12" rx="0.75" fill="white" opacity="0.5" />
      <rect x="3.75" y="6.5" width="6.5" height="2.2" rx="1.1" fill="white" />
      <rect x="9.75" y="11" width="6.5" height="2.2" rx="1.1" fill="white" />
    </svg>
  ),
  // 诊断：听诊器（U 形耳管 + 膜片）
  "🩺": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#10B981" />
      <path d="M6 4.5V9C6 11 7.5 12.5 10 12.5C12.5 12.5 14 11 14 9V4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="6" cy="4" r="1" fill="white" />
      <circle cx="14" cy="4" r="1" fill="white" />
      <path d="M10 12.5V13.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="15.3" r="2" fill="white" />
      <circle cx="10" cy="15.3" r="0.8" fill="#10B981" />
    </svg>
  ),

  // ===== 一级导航 =====
  "🏠": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#3B82F6" />
      <path d="M5 10L10 5L15 10V15C15 15.5 14.5 16 14 16H6C5.5 16 5 15.5 5 15V10Z" fill="white" />
      <rect x="8" y="12" width="4" height="4" rx="0.5" fill="#3B82F6" />
    </svg>
  ),
  "🛰️": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#8B5CF6" />
      <circle cx="10" cy="10" r="4" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="10" cy="10" r="1.5" fill="white" />
      <path d="M10 4V6M10 14V16M4 10H6M14 10H16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "🏭": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#10B981" />
      <rect x="4" y="8" width="4" height="8" rx="0.5" fill="white" />
      <rect x="9" y="6" width="4" height="10" rx="0.5" fill="white" />
      <rect x="14" y="10" width="2" height="6" rx="0.5" fill="white" opacity="0.7" />
      <rect x="5" y="4" width="1.5" height="4" rx="0.5" fill="white" opacity="0.7" />
    </svg>
  ),
  "✅": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#10B981" />
      <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "⚡": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#F59E0B" />
      <path d="M11 4L6 11H10L9 16L14 9H10L11 4Z" fill="white" />
    </svg>
  ),
  "🤖": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#6366F1" />
      <rect x="5" y="6" width="10" height="8" rx="2" fill="white" />
      <circle cx="8" cy="10" r="1" fill="#6366F1" />
      <circle cx="12" cy="10" r="1" fill="#6366F1" />
      <path d="M10 4V6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="3.5" r="0.8" fill="white" />
    </svg>
  ),
  "🧠": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#EC4899" />
      <path d="M10 5C7 5 5 7 5 10C5 13 7 15 10 15C13 15 15 13 15 10C15 7 13 5 10 5Z" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M10 5V15M7 8H13M7 12H13" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  ),
};

// 头像下拉菜单图标
const MENU_ICON_MAP: Record<string, React.ReactNode> = {
  settings: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#6B7280" />
      <circle cx="10" cy="10" r="3" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M10 4V6M10 14V16M4 10H6M14 10H16M5.8 5.8L7.2 7.2M12.8 12.8L14.2 14.2M5.8 14.2L7.2 12.8M12.8 7.2L14.2 5.8" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#3B82F6" />
      <circle cx="10" cy="8" r="2.5" fill="white" />
      <path d="M5 16C5 13.5 7 12 10 12C13 12 15 13.5 15 16" fill="white" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#EF4444" />
      <path d="M8 10H15M15 10L12 7M15 10L12 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 5H6C5.4 5 5 5.4 5 6V14C5 14.6 5.4 15 6 15H12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

// 个人中心图标
const PROFILE_ICON_MAP: Record<string, React.ReactNode> = {
  avatar: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#8B5CF6" />
      <rect x="5" y="5" width="10" height="10" rx="2" fill="white" />
      <circle cx="10" cy="9" r="2" fill="#8B5CF6" />
      <path d="M7 14C7 12.5 8.3 11.5 10 11.5C11.7 11.5 13 12.5 13 14" fill="#8B5CF6" />
    </svg>
  ),
  nickname: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#3B82F6" />
      <path d="M6 13L12 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 6L14 9L13 10L10 7Z" fill="white" />
      <path d="M5 12L8 15L7 16L4 13Z" fill="white" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#10B981" />
      <rect x="6" y="4" width="8" height="12" rx="1.5" fill="white" />
      <rect x="7" y="6" width="6" height="7" rx="0.5" fill="#10B981" opacity="0.3" />
      <circle cx="10" cy="14.5" r="0.8" fill="#10B981" />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#F59E0B" />
      <rect x="4" y="6" width="12" height="8" rx="1" fill="white" />
      <path d="M4 7L10 11L16 7" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  password: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#EF4444" />
      <rect x="6" y="9" width="8" height="7" rx="1.5" fill="white" />
      <path d="M7 9V7C7 5.3 8.3 4 10 4C11.7 4 13 5.3 13 7V9" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="10" cy="12.5" r="1" fill="#EF4444" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#6B7280" />
      <path d="M8 10H15M15 10L12 7M15 10L12 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 5H6C5.4 5 5 5.4 5 6V14C5 14.6 5.4 15 6 15H12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

// 智能问数工具栏图标（小尺寸，适配 toolbar pill 按钮）
const QA_TOOLBAR_ICONS = {
  model: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#3B82F6" />
      <rect x="3.5" y="8" width="2" height="4" rx="0.5" fill="white" />
      <rect x="7" y="5.5" width="2" height="6.5" rx="0.5" fill="white" />
      <rect x="10.5" y="4" width="2" height="8" rx="0.5" fill="white" />
    </svg>
  ),
  knowledge: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#8B5CF6" />
      <rect x="3" y="3.5" width="10" height="9" rx="1" fill="white" />
      <path d="M8 3.5V12.5" stroke="#8B5CF6" strokeWidth="0.8" />
      <path d="M3 5H8M8 5H13" stroke="#8B5CF6" strokeWidth="0.5" opacity="0.4" />
    </svg>
  ),
  skill: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#10B981" />
      <circle cx="8" cy="8" r="4" stroke="white" strokeWidth="1.2" fill="none" />
      <circle cx="8" cy="8" r="1.5" fill="white" />
    </svg>
  ),
  modelSwitch: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#6366F1" />
      <rect x="3.5" y="4.5" width="9" height="7" rx="1.5" fill="white" />
      <circle cx="6" cy="8" r="0.8" fill="#6366F1" />
      <circle cx="10" cy="8" r="0.8" fill="#6366F1" />
      <path d="M8 2.5V4.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
      <circle cx="8" cy="2" r="0.6" fill="white" />
    </svg>
  ),
};

// 智能问数消息气泡图标（小尺寸，适配聊天区）
const QA_BUBBLE_ICONS = {
  thinking: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#8B5CF6" />
      <circle cx="5" cy="8" r="1" fill="white" />
      <circle cx="8" cy="8" r="1" fill="white" />
      <circle cx="11" cy="8" r="1" fill="white" />
    </svg>
  ),
  knowledge: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#3B82F6" />
      <rect x="3" y="3.5" width="10" height="9" rx="1" fill="white" />
      <path d="M8 3.5V12.5" stroke="#3B82F6" strokeWidth="0.8" />
    </svg>
  ),
  calculation: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#F59E0B" />
      <rect x="3" y="3" width="10" height="4" rx="0.8" fill="white" />
      <rect x="3.5" y="8.5" width="2" height="2" rx="0.4" fill="white" />
      <rect x="7" y="8.5" width="2" height="2" rx="0.4" fill="white" />
      <rect x="10.5" y="8.5" width="2" height="2" rx="0.4" fill="white" />
      <rect x="3.5" y="11.5" width="2" height="2" rx="0.4" fill="white" />
      <rect x="7" y="11.5" width="5.5" height="2" rx="0.4" fill="white" />
    </svg>
  ),
  favorite: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#F59E0B" />
      <path d="M8 4L9.5 7L13 7.5L10.5 10L11 13.5L8 12L5 13.5L5.5 10L3 7.5L6.5 7Z" fill="white" />
    </svg>
  ),
  unfavorite: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#D1D5DB" />
      <path d="M8 4L9.5 7L13 7.5L10.5 10L11 13.5L8 12L5 13.5L5.5 10L3 7.5L6.5 7Z" fill="white" />
    </svg>
  ),
  followUp: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#3B82F6" />
      <circle cx="5.5" cy="5.5" r="1.5" fill="white" opacity="0.7" />
      <circle cx="10.5" cy="5.5" r="1.5" fill="white" opacity="0.7" />
      <path d="M4 10C4 10 5.5 12 8 12C10.5 12 12 10 12 10" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  queryResult: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#3B82F6" />
      <rect x="3.5" y="8" width="2" height="4" rx="0.5" fill="white" />
      <rect x="7" y="5.5" width="2" height="6.5" rx="0.5" fill="white" />
      <rect x="10.5" y="4" width="2" height="8" rx="0.5" fill="white" />
    </svg>
  ),
  dataInterpret: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#10B981" />
      <path d="M4 11L6.5 7L9 9L12 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chartRecommend: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#8B5CF6" />
      <path d="M4 12L6.5 7L9 9L12 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="4" r="1" fill="white" />
    </svg>
  ),
};

// 模拟测算页面图标（预测类型卡片）
const FORECAST_TYPE_ICONS: Record<string, React.ReactNode> = {
  "未来值预测": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#8B5CF6" />
      <path d="M5 14L8 10L11 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15" cy="6" r="1.2" fill="white" />
    </svg>
  ),
  "条件测算": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#F59E0B" />
      <path d="M8 5V9L5 14C4.5 15 5.2 16 6.3 16H13.7C14.8 16 15.5 15 15 14L12 9V5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M7 5H13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "能否达标预测": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#10B981" />
      <circle cx="10" cy="10" r="5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="10" cy="10" r="2" fill="white" />
    </svg>
  ),
  "达标反推": (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#EF4444" />
      <path d="M14 8C14 8 12 6 10 6C8 6 6 8 6 10C6 12 8 14 10 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M10 14L12 12M10 14L12 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// 年鉴报告卡片图标（大尺寸，适配卡片展示）
const YEARBOOK_REPORT_ICON = (
  <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
    <rect x="4" y="3" width="24" height="26" rx="3" fill="#14B8A6" />
    <rect x="8" y="7" width="16" height="18" rx="2" fill="white" opacity="0.9" />
    <rect x="11" y="10" width="10" height="2" rx="1" fill="#14B8A6" />
    <rect x="11" y="14" width="10" height="2" rx="1" fill="#14B8A6" />
    <rect x="11" y="18" width="7" height="2" rx="1" fill="#14B8A6" opacity="0.6" />
    <rect x="4" y="3" width="4" height="26" rx="2" fill="#0D9488" />
  </svg>
);

export { ICON_MAP, MENU_ICON_MAP, PROFILE_ICON_MAP, QA_TOOLBAR_ICONS, QA_BUBBLE_ICONS, FORECAST_TYPE_ICONS, YEARBOOK_REPORT_ICON };

// 通用导航图标组件：传入 emoji 字符串，返回对应 SVG 或原始 emoji
export function NavIcon({ icon }: { icon: string }) {
  return <>{ICON_MAP[icon] ?? icon}</>;
}
