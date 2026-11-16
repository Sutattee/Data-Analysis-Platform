import { redirect } from "next/navigation";

// 根路径默认进入智能问数（未登录时由 (main) 布局守卫转登录页）
export default function Home() {
  redirect("/qa");
}
