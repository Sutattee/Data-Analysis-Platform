import { redirect } from "next/navigation";

// 二级菜单"告警中心"因含三级菜单只做折叠，不直接落地；
// 直接访问 /expense/alert 时重定向到默认子页"告警记录"。
export default function ExpenseAlertIndexPage() {
  redirect("/expense/alert/records");
}
