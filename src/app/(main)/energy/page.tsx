import { redirect } from "next/navigation";

// 能源消耗一级入口：默认进入二级首项「能源总览」
export default function EnergyPage() {
  redirect("/energy/overview");
}
