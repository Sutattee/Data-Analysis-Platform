import { redirect } from "next/navigation";

// 一级菜单「生产管理」含二级菜单，直接访问落到默认子页「设备运行效率」。
export default function ProductionPage() {
  redirect("/production/equipment-efficiency");
}
