import { redirect } from "next/navigation";

// 数据模型已迁移至主布局 /data-assets/data-model（数据资产下），此旧路由重定向过去
export default function DataModelRedirect() {
  redirect("/data-assets/data-model");
}
