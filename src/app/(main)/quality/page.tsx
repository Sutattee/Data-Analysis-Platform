import { redirect } from "next/navigation";

// 一级菜单「工艺质量」含二级菜单，直接访问落到第一个子页「智能工作台」。
export default function QualityPage() {
  redirect("/quality/workbench");
}
