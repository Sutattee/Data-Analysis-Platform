import { redirect } from "next/navigation";

// 一级菜单「工艺质量」含二级菜单，直接访问落到默认子页「总览」。
export default function QualityPage() {
  redirect("/quality/overview");
}
