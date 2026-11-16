import { redirect } from "next/navigation";

// /home 为旧版首页地址：现统一跳转智能问数（未登录时由 (main) 布局守卫转登录页）
export default function HomePage() {
  redirect("/qa");
}
