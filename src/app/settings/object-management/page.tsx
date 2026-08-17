"use client";

// 对象管理（页面标题：对象关系）：
// 统一维护企业内的对象结构及"对象-指标"关联关系
// 搜索（对象名称/指标中文名称/指标编码）+ 批量导入 + 列表 + 查看详情 + 关联指标滑出窗
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { LinkMetricsDrawer } from "@/components/settings/LinkMetricsDrawer";
import { listObjects } from "@/lib/mock-data/objects";
import type { ObjectRelation } from "@/types";

// 只读字段（查看详情单列排布）
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 flex-shrink-0 pt-0.5 text-xs text-gray-400">{label}</span>
      <span className="flex-1 break-words text-sm text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

export default function ObjectManagementPage() {
  const toast = useToast();
  const [rows, setRows] = useState<ObjectRelation[]>(() => listObjects());

  // 搜索
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 批量导入
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");

  // 查看详情 / 关联指标
  const [detail, setDetail] = useState<ObjectRelation | null>(null);
  const [linkTarget, setLinkTarget] = useState<ObjectRelation | null>(null);

  const filtered = useMemo(() => {
    const kw = applied.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter(
      (o) =>
        o.name.toLowerCase().includes(kw) ||
        o.metrics.some(
          (m) => m.nameCn.toLowerCase().includes(kw) || m.code.toLowerCase().includes(kw)
        )
    );
  }, [rows, applied]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSearch() {
    setApplied(keyword);
    setPage(1);
  }
  function handleReset() {
    setKeyword("");
    setApplied("");
    setPage(1);
  }

  function reload() {
    setRows(listObjects());
  }

  // 下载对象模板（csv 内容，模拟 xlsx 模板）
  function downloadTemplate() {
    const header = "对象名称,所属系统,所属组织,所属部门,对应仪表号\n";
    const sample = "卷包车间空调（门前）,中央空调（风机）,什邡卷烟厂,卷包车间,ET3C06_5\n";
    const blob = new Blob(["﻿" + header + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "对象模板.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(f: File | null) {
    setImportError("");
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.name.endsWith(".xlsx")) {
      setImportError("仅支持.xlsx格式");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setImportError("文件大小不超过50MB");
      return;
    }
    setFile(f);
  }

  function handleImportConfirm() {
    if (!file) {
      setImportError("上传文件不能为空");
      return;
    }
    toast("已导入对象文件（关联指标请在列表中逐个配置）", "success");
    setImportOpen(false);
    setFile(null);
    setImportError("");
    reload();
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">对象关系</h1>
        <p className="mt-1 text-sm text-gray-500">统一维护企业内的对象结构及对象-指标关联关系</p>
      </div>

      {/* 搜索 + 批量导入 */}
      <Card padding>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="搜索对象名称/指标中文名称/指标编码"
            className="min-w-[280px] max-w-[380px] flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>
            重置
          </Button>
          <Button
            className="ml-auto"
            onClick={() => {
              setImportOpen(true);
              setFile(null);
              setImportError("");
            }}
          >
            批量导入
          </Button>
        </div>
      </Card>

      {/* 对象列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>对象名称</th>
                <th className={th}>所属系统</th>
                <th className={th}>所属组织</th>
                <th className={th}>所属部门</th>
                <th className={th}>对应仪表号</th>
                <th className={th}>关联指标</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                paged.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{o.name}</td>
                    <td className="px-4 py-3 text-gray-600">{o.system}</td>
                    <td className="px-4 py-3 text-gray-600">{o.org}</td>
                    <td className="px-4 py-3 text-gray-600">{o.dept}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{o.meterNo}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {o.metrics.length === 0 ? (
                        <span className="text-xs text-gray-400">未关联指标</span>
                      ) : (
                        <div className="flex max-w-[280px] flex-wrap gap-1">
                          {o.metrics.map((m) => (
                            <span
                              key={m.metricId}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                              title={`${m.domain}｜${m.code}`}
                            >
                              {m.nameCn}
                              <span className="font-mono text-[10px] text-gray-400">{m.code}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setDetail(o)}
                          className="rounded px-2 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => setLinkTarget(o)}
                          className="rounded px-2 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                        >
                          关联指标
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
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
        </div>
      </Card>

      {/* 查看详情抽屉 */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="查看详情"
        width={480}
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setDetail(null)}>
              关闭
            </Button>
          </div>
        }
      >
        {detail && (
          <div className="space-y-2.5">
            <Field label="对象名称" value={detail.name} />
            <Field label="所属系统" value={detail.system} />
            <Field label="所属组织" value={detail.org} />
            <Field label="所属部门" value={detail.dept} />
            <Field label="对应仪表号" value={<code className="text-xs">{detail.meterNo}</code>} />
            <Field
              label="关联指标"
              value={
                detail.metrics.length === 0 ? (
                  <span className="text-xs text-gray-400">未关联指标</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.metrics.map((m) => (
                      <span
                        key={m.metricId}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                      >
                        {m.nameCn}
                        <span className="font-mono text-[10px] text-gray-400">{m.code}</span>
                      </span>
                    ))}
                  </div>
                )
              }
            />
            <Field label="创建时间" value={detail.createdAt} />
            <Field label="创建人" value={detail.createdBy} />
            {detail.updatedAt && (
              <Field label="更新时间" value={`${detail.updatedAt}（${detail.updatedBy}）`} />
            )}
          </div>
        )}
      </Drawer>

      {/* 关联指标滑出窗 */}
      <LinkMetricsDrawer
        open={linkTarget !== null}
        onClose={() => setLinkTarget(null)}
        object={linkTarget}
        onSaved={reload}
      />

      {/* 批量导入弹窗 */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="本地导入">
        <div className="space-y-4">
          {/* 上传文件 */}
          <div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-8 transition-colors hover:border-primary-300">
              <span className="mb-2 text-3xl text-gray-300">📁</span>
              <span className="text-sm font-medium text-primary-600">点击上传</span>
              {file && <span className="mt-1 text-xs text-gray-500">{file.name}</span>}
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="mt-1.5 text-xs text-gray-400">支持.xlsx格式，文件大小不超过50MB</div>
            <div className="mt-1.5">
              <button onClick={downloadTemplate} className="text-sm text-primary-600 hover:text-primary-700">
                下载对象模板.xlsx
              </button>
            </div>
            {importError && <p className="mt-1.5 text-xs text-red-500">{importError}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              取消
            </Button>
            <Button onClick={handleImportConfirm}>确认</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
