// 管理驾驶舱：独立全屏大屏路由（不在 (main) 主布局组内，无侧边栏/登录守卫壳），
// 自带 PRD 顶部标题栏与 1920×1080 等比缩放画布；全局状态（收藏/历史）由根布局 AppProvider 提供
import "@/components/cockpit/cockpit.css";
import { CockpitView } from "@/components/cockpit/CockpitView";

export default function CockpitPage() {
  return <CockpitView />;
}
