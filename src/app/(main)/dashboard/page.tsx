import { redirect } from "next/navigation";

// 一级菜单「评价模型」含二级菜单只做折叠，直接访问落到默认子页「生产管理」。
export default function DashboardPage() {
  redirect("/dashboard/production");
}
