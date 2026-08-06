"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataSourceRecord } from "@/types";
import {
  useDataSources,
  removeDataSource,
} from "@/lib/store/data-source-store";
import { mockTestConnection } from "@/lib/mock-data/data-source";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Pagination } from "@/components/ui/Pagination";
import { FilterBar } from "@/components/data-source/FilterBar";
import { DataSourceTable } from "@/components/data-source/DataSourceTable";
import { DataSourceDetail } from "@/components/data-source/DataSourceDetail";

const PAGE_SIZE_DEFAULT = 10;

export default function DataSourceListPage() {
  const router = useRouter();
  const toast = useToast();
  const dataSources = useDataSources();

  // 筛选条件
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  // 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  // 交互态
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DataSourceRecord | null>(null);

  // 筛选条件变更时模拟加载 + 回到第 1 页
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [type, status, keyword]);

  // 关键字 / 类型 / 状态
  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  // 过滤
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return dataSources.filter((d) => {
      if (type !== "all" && d.type !== type) return false;
      if (status !== "all" && d.status !== status) return false;
      if (kw && !(`${d.name} ${d.owner}`.toLowerCase().includes(kw))) return false;
      return true;
    });
  }, [dataSources, type, status, keyword]);

  // 分页
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  // 详情记录
  const detailRecord = detailId ? dataSources.find((d) => d.id === detailId) ?? null : null;

  // ===== 操作 =====
  async function handleTest(rec: DataSourceRecord) {
    setTestingId(rec.id);
    const res = await mockTestConnection(rec);
    setTestingId(null);
    if (res.success) {
      toast(`连接成功（耗时 ${res.latencyMs}ms）`, "success");
    } else {
      toast(`连接失败：${res.message}`, "danger");
    }
  }

  function handleEdit(rec: DataSourceRecord) {
    router.push(`/settings/data-source/${rec.id}/edit`);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    removeDataSource(deleteTarget.id);
    toast(`已删除数据源「${deleteTarget.name}」`, "success");
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      {/* 顶部：标题 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">数据源管理</h1>
      </div>

      {/* 筛选区 + 操作按钮（同一行） */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
        <FilterBar
          type={type}
          status={status}
          keyword={keyword}
          onTypeChange={resetPage(setType)}
          onStatusChange={resetPage(setStatus)}
          onKeywordChange={resetPage(setKeyword)}
          onSearch={() => setPage(1)}
          actions={
            <>
              <Button onClick={() => router.push("/settings/data-source/integrate")}>集成 Sparta 数据</Button>
              <Button onClick={() => router.push("/settings/data-source/create")}>+ 新增数据源</Button>
            </>
          }
        />
      </div>

      {/* 列表 */}
      <Card padding={false}>
        <DataSourceTable
          records={paged}
          loading={loading}
          startIndex={(safePage - 1) * pageSize + 1}
          testingId={testingId}
          onNameClick={(rec) => setDetailId(rec.id)}
          onEdit={handleEdit}
          onDelete={(rec) => setDeleteTarget(rec)}
          onTest={handleTest}
        />
      </Card>

      {/* 分页 */}
      {!loading && total > 0 && (
        <Pagination
          total={total}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
        />
      )}

      {/* 详情抽屉 */}
      <Drawer
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title="数据源详情"
        width={480}
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setDetailId(null)}>
              关闭
            </Button>
          </div>
        }
      >
        {detailRecord ? (
          <DataSourceDetail record={detailRecord} />
        ) : (
          <div className="py-16 text-center text-sm text-gray-400">加载中…</div>
        )}
      </Drawer>

      {/* 删除二次确认 */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除确认"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            确定要删除数据源「<span className="font-medium text-gray-800">{deleteTarget?.name}</span>」吗？删除后不可恢复。
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              确认删除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
