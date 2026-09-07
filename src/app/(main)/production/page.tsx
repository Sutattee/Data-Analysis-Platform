import { redirect } from "next/navigation";

// 一级菜单「生产管理」含二级菜单，直接访问落到默认子页「辅料消耗」。
export default function ProductionPage() {
  redirect("/production/materials");
}
