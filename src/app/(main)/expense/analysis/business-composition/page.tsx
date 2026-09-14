import { redirect } from "next/navigation";

// 「业务构成」已调整为与「费用分析」同级的二级菜单，路由上移；旧路径保留跳转。
export default function BusinessCompositionRedirectPage() {
  redirect("/expense/business-composition");
}
