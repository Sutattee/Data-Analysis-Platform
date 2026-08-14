import { redirect } from "next/navigation";

// 一级菜单「预测分析」含二级菜单只做折叠，不直接落地；
// 直接访问 /energy/forecast 时重定向到默认子页「预测总览」。
export default function ForecastIndexPage() {
  redirect("/energy/forecast/overview");
}
