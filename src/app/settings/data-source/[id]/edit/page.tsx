"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDataSources, updateDataSource } from "@/lib/store/data-source-store";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import {
  DataSourceForm,
  DataSourceFormValues,
} from "@/components/data-source/DataSourceForm";

export default function EditDataSourcePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const dataSources = useDataSources();
  const toast = useToast();

  // 等待客户端挂载 + store 水合后再判定记录是否存在（避免 SSR/首屏闪烁）
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  const record = dataSources.find((d) => d.id === id);

  function back() {
    router.push("/settings/data-source");
  }

  function handleSubmit(values: DataSourceFormValues) {
    updateDataSource(id, values);
    toast(`数据源「${values.name}」修改已保存`, "success");
    back();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] gap-4">
      <div className="flex-shrink-0">
        <button
          onClick={back}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-1"
        >
          <span>←</span>
          <span>返回数据源管理</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900">编辑数据源</h1>
      </div>

      {!ready ? (
        <div className="flex-1 flex justify-center items-center">
          <Spinner />
        </div>
      ) : !record ? (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center">
          <div className="py-16 text-center">
            <p className="text-sm text-gray-500 mb-4">未找到该数据源，可能已被删除</p>
            <button
              onClick={back}
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              返回数据源管理
            </button>
          </div>
        </div>
      ) : (
        /* 白色卡片铺满剩余页面区域 */
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <DataSourceForm mode="edit" initial={record} onSubmit={handleSubmit} onCancel={back} />
        </div>
      )}
    </div>
  );
}
