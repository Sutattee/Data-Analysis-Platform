import { redirect } from "next/navigation";

// 一级菜单"预警中心"因含二级菜单只做折叠，不直接落地；
// 直接访问 /alert 时重定向到默认子页"预警记录"。
export default function AlertIndexPage() {
  redirect("/alert/records");
}
