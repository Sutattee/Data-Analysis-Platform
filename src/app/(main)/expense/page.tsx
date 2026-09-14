import { redirect } from "next/navigation";

// 一级菜单「费用预算执行」含二级菜单，直接访问落到默认子页「费用总览」。
export default function ExpensePage() {
  redirect("/expense/overview");
}
