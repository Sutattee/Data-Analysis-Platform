import { redirect } from "next/navigation";

// 一级菜单「重大事件年鉴」含二级菜单只做折叠，不直接落地；
// 直接访问 /energy/yearbook 时重定向到默认子页「事件列表」。
export default function YearbookIndexPage() {
  redirect("/energy/yearbook/events");
}
