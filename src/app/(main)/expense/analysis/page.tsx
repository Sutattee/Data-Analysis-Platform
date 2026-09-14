import { redirect } from "next/navigation";

// 二级菜单「费用分析」含三级菜单只做折叠，不直接落地；
// 直接访问 /expense/analysis 时重定向到默认子页「全部费用」。
export default function ExpenseAnalysisIndexPage() {
  redirect("/expense/analysis/all");
}
