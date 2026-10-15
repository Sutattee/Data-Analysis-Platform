import { redirect } from "next/navigation";

// 工艺质量 · 告警中心：默认进入告警记录
export default function QualityAlertPage() {
  redirect("/quality/alert/records");
}
