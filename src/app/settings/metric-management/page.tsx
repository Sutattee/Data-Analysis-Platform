"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { metricList } from "@/lib/mock-data/metric-management";
import type { MetricManage } from "@/types";

// 只读字段
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1 break-words">{value ?? "—"}</span>
    </div>
  );
}

export default function MetricManagementPage() {
  const toast = useToast();
  const [metrics, setMetrics] = useState<MetricManage[]>(() => metricList.map((m) => ({ ...m })));

  // 搜索
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // 导入
  const [importOpen, setImportOpen] = useState(false);
  const [dupMode, setDupMode] = useState<"skip" | "overwrite">("skip");
  const [file, setFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");

  // 详情
  const [detailTarget, setDetailTarget] = useState<MetricManage | null>(null);

  // 达标反推设置（详情抽屉内编辑）
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [showReverseAdd, setShowReverseAdd] = useState(false);
  const [newReverseItem, setNewReverseItem] = useState("");

  const reverseItems = detailTarget?.reverseItems ?? [];

  // 反推内容变更：同步更新列表与详情抽屉
  function updateReverseItems(next: string[]) {
    if (!detailTarget) return;
    setMetrics((prev) => prev.map((m) => (m.id === detailTarget.id ? { ...m, reverseItems: next } : m)));
    setDetailTarget({ ...detailTarget, reverseItems: next });
  }
  // AI 生成：重置为指标配置的推荐内容
  function regenReverseItems() {
    const recommend = metricList.find((x) => x.id === detailTarget?.id)?.reverseItems ?? [];
    updateReverseItems([...recommend]);
    toast("已按 AI 推荐内容重新生成", "success");
  }
  function commitReverseEdit() {
    if (editingIdx === null) return;
    const v = editingText.trim();
    if (v) {
      updateReverseItems(reverseItems.map((it, i) => (i === editingIdx ? v : it)));
      toast("已保存", "success");
    }
    setEditingIdx(null);
  }
  function confirmReverseDelete() {
    if (deleteIdx === null) return;
    updateReverseItems(reverseItems.filter((_, i) => i !== deleteIdx));
    toast("已删除", "success");
    setDeleteIdx(null);
  }
  function addReverseItem() {
    const v = newReverseItem.trim();
    if (!v) {
      toast("请输入反推内容", "warning");
      return;
    }
    updateReverseItems([...reverseItems, v]);
    setNewReverseItem("");
    setShowReverseAdd(false);
    toast("已新增反推内容", "success");
  }
  function closeDetail() {
    setDetailTarget(null);
    setEditingIdx(null);
    setEditingText("");
    setDeleteIdx(null);
    setShowReverseAdd(false);
    setNewReverseItem("");
  }

  const filtered = useMemo(() => {
    const kw = applied.trim().toLowerCase();
    if (!kw) return metrics;
    return metrics.filter(
      (m) => m.nameCn.toLowerCase().includes(kw) || m.code.toLowerCase().includes(kw)
    );
  }, [metrics, applied]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSearch() { setApplied(keyword); setPage(1); }
  function handleReset() { setKeyword(""); setApplied(""); setPage(1); }

  // 下载模板（生成 csv 内容，模拟 xlsx 模板）
  function downloadTemplate() {
    const header = "指标中文名称,指标编码,业务域,业务定义,计算口径,小数位数,度量单位,同义词(选填),负责人,描述(选填)\n";
    const sample = "总利润,I_FIN_001,产品销售,,,2,元,,Frank,\n";
    const blob = new Blob(["﻿" + header + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "指标模板.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(f: File | null) {
    setImportError("");
    if (!f) { setFile(null); return; }
    const isXlsx = f.name.endsWith(".xlsx");
    if (!isXlsx) { setImportError("仅支持.xlsx格式"); return; }
    if (f.size > 50 * 1024 * 1024) { setImportError("文件大小不超过50MB"); return; }
    setFile(f);
  }

  function handleImportConfirm() {
    if (!file) { setImportError("上传文件不能为空"); return; }
    toast(`已导入指标文件（${dupMode === "skip" ? "跳过同名" : "覆盖同名"}）`, "success");
    setImportOpen(false);
    setFile(null);
    setImportError("");
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">指标管理</h1>
      </div>

      {/* 搜索 + 导入 */}
      <Card padding>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="搜索指标中文名称/指标编码"
            className="flex-1 min-w-[260px] max-w-[360px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
          <Button className="ml-auto" onClick={() => { setImportOpen(true); setFile(null); setImportError(""); }}>导入指标</Button>
        </div>
      </Card>

      {/* 指标列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>指标中文名称</th>
                <th className={th}>指标编码</th>
                <th className={th}>业务域</th>
                <th className={th}>同义词</th>
                <th className={th}>描述</th>
                <th className={th}>负责人</th>
                <th className={th}>创建时间</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-sm text-gray-400">暂无数据</td></tr>
              ) : paged.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.nameCn}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{m.code}</td>
                  <td className="px-4 py-3 text-gray-600">{m.domain}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px]"><div className="truncate" title={m.synonyms}>{m.synonyms || "—"}</div></td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px]"><div className="truncate" title={m.description}>{m.description}</div></td>
                  <td className="px-4 py-3 text-gray-600">{m.owner}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{m.createdAt}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setDetailTarget(m)}>查看</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination total={total} page={safePage} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </Card>

      {/* 导入指标弹窗 */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="本地导入">
        <div className="space-y-4">
          {/* 重名处理 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">重名处理</label>
            <div className="flex gap-5">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                <input type="radio" checked={dupMode === "skip"} onChange={() => setDupMode("skip")} className="accent-primary-600" />
                跳过同名指标
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                <input type="radio" checked={dupMode === "overwrite"} onChange={() => setDupMode("overwrite")} className="accent-primary-600" />
                覆盖已有同名指标
              </label>
            </div>
          </div>

          {/* 上传文件 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">上传文件</label>
            <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
              <span className="text-3xl text-gray-300 mb-2">📁</span>
              <span className="text-sm text-primary-600 font-medium">点击上传</span>
              {file && <span className="text-xs text-gray-500 mt-1">{file.name}</span>}
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
            </label>
            <div className="text-xs text-gray-400 mt-1.5">支持.xlsx格式，文件大小不超过50MB</div>
            <div className="mt-1.5">
              <button onClick={downloadTemplate} className="text-sm text-primary-600 hover:text-primary-700">下载指标模板.xlsx</button>
            </div>
            {importError && <p className="mt-1.5 text-xs text-red-500">{importError}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>取消</Button>
            <Button onClick={handleImportConfirm}>确认</Button>
          </div>
        </div>
      </Modal>

      {/* 指标详情抽屉：基础信息 / 目标值管理 / 达标反推设置 */}
      <Drawer
        open={detailTarget !== null}
        onClose={closeDetail}
        title="指标详情"
        width={560}
        footer={
          <div className="flex">
            <Button onClick={closeDetail}>取消</Button>
          </div>
        }
      >
        {detailTarget && (
          <div className="space-y-3">
            {/* 一、基础信息 */}
            <div className="text-sm font-semibold text-gray-800">基础信息</div>
            <Field label="中文名称" value={detailTarget.nameCn} />
            <Field label="指标编码" value={<code className="text-xs">{detailTarget.code}</code>} />
            <Field label="业务域" value={detailTarget.domain} />
            <Field label="业务定义" value={detailTarget.definition} />
            <Field label="统计口径" value={detailTarget.formula} />
            <Field label="计算公式" value={detailTarget.calcFormula} />
            <Field label="小数位数" value={String(detailTarget.decimals)} />
            <Field label="度量单位" value={detailTarget.unit} />
            <Field label="同义词" value={detailTarget.synonyms} />
            <Field label="描述" value={detailTarget.description} />
            <Field label="负责人" value={detailTarget.owner} />
            <Field label="创建时间" value={detailTarget.createdAt} />
            <Field label="更新时间" value={detailTarget.updatedAt} />

            {/* 二、目标值管理 */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="mb-2 text-sm font-semibold text-gray-800">目标值管理</div>
              {detailTarget.target ? (
                <Field
                  label="考核目标"
                  value={
                    <span>
                      {detailTarget.target.direction} {detailTarget.target.value} {detailTarget.unit}
                      <span className="ml-2 text-xs text-gray-400">用于目标达成预测与达标条件反推</span>
                    </span>
                  }
                />
              ) : (
                <p className="text-sm text-gray-400">暂未配置目标值</p>
              )}
            </div>

            {/* 三、达标反推设置 */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800">达标反推设置</div>
                {detailTarget.target && (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={regenReverseItems}>
                      AI 生成
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowReverseAdd(true)}>
                      + 新增
                    </Button>
                  </div>
                )}
              </div>

              {detailTarget.target ? (
                <div className="space-y-2">
                  <div className="flex items-center text-xs text-gray-400">
                    <span>内容由 AI 生成，仅供参考。</span>
                    <span className="ml-auto">共 {reverseItems.length} 条</span>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">反推内容</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-28">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {reverseItems.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="py-10 text-center text-sm text-gray-400">暂无反推内容</td>
                          </tr>
                        ) : (
                          reverseItems.map((item, i) => (
                            <tr key={`${item}_${i}`} className="hover:bg-gray-50">
                              <td className="px-3 py-2.5">
                                {editingIdx === i ? (
                                  <input
                                    autoFocus
                                    maxLength={50}
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") commitReverseEdit();
                                      else if (e.key === "Escape") setEditingIdx(null);
                                    }}
                                    onBlur={commitReverseEdit}
                                    className="w-full px-2 py-1 border border-primary-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  />
                                ) : (
                                  <span className="text-sm text-gray-700">{item}</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                {editingIdx === i ? (
                                  <div className="inline-flex gap-1">
                                    <button
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={commitReverseEdit}
                                      className="px-2 py-0.5 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                    >
                                      保存
                                    </button>
                                    <button
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => setEditingIdx(null)}
                                      className="px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingIdx(i);
                                        setEditingText(item);
                                      }}
                                      className="px-2 py-0.5 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      onClick={() => setDeleteIdx(i)}
                                      className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                      删除
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {showReverseAdd && (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        maxLength={50}
                        value={newReverseItem}
                        onChange={(e) => setNewReverseItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addReverseItem();
                          else if (e.key === "Escape") {
                            setShowReverseAdd(false);
                            setNewReverseItem("");
                          }
                        }}
                        placeholder="输入反推内容（不超过50字）"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="self-center text-xs text-gray-400 whitespace-nowrap">{newReverseItem.length}/50</span>
                      <Button size="sm" onClick={addReverseItem}>保存</Button>
                      <Button size="sm" variant="secondary" onClick={() => { setShowReverseAdd(false); setNewReverseItem(""); }}>取消</Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">该指标未配置目标值，暂不支持达标反推设置</p>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* 反推内容删除确认 */}
      <Modal open={deleteIdx !== null} onClose={() => setDeleteIdx(null)} title="确认删除" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">确定删除该反推内容吗？删除后不可恢复。</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteIdx(null)}>取消</Button>
            <Button variant="danger" onClick={confirmReverseDelete}>确定</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
