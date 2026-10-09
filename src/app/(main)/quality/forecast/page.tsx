import { redirect } from "next/navigation";

// 二级菜单「质量风险预测」只做折叠，直接访问时重定向到默认子页「稳定性预测」。
export default function QualityForecastPage() {
  redirect("/quality/forecast/stability");
}
