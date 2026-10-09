import { redirect } from "next/navigation";

// 二级菜单「诊断」只做折叠，直接访问时重定向到默认子页「缺陷诊断」。
export default function QualityDiagnosisPage() {
  redirect("/quality/diagnosis/defect");
}
