"use client";

// 报告模板管理：顶部双页签（分析报告模板 | Excel报表模版）+ 右上角「上传模板」；
// 列表含 模板名称/文件格式/文件大小/启停状态(开关)/上传人/上传时间/操作(预览、删除)。
// 启用中的上传模板联动智能问数「选择模板」弹窗（停用/删除后不再提供选择）。
import { useMemo, useState } from "react";
import type { UploadedTemplate } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { UploadTemplateDrawer } from "@/components/settings/UploadTemplateDrawer";
import {
  addUploadedTemplate,
  formatFileSize,
  listUploadedTemplates,
  removeUploadedTemplate,
  toggleUploadedTemplateEnabled,
  uploadedToTemplateItem,
} from "@/lib/mock-data/report-templates-admin";

// 顶部页签：分析报告模板 | Excel报表模版
const TABS = [
  { key: "analysis", label: "分析报告模板" },
  { key: "excel", label: "Excel报表模版" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// 只读字段（预览弹窗用）
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 flex-shrink-0 pt-0.5 text-xs text-gray-400">{label}</span>
      <span className="flex-1 break-words text-sm text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

export default function ReportTemplatesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("analysis");
  const [tick, setTick] = useState(0); // mock 内存态变更后强制刷新

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<UploadedTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UploadedTemplate | null>(null);

  // mock 内存态变更（启停/删除/上传）后靠 tick 失效重取
  const rows = useMemo(() => listUploadedTemplates(tab), [tab, tick]);

  function handleUploaded(t: UploadedTemplate) {
    addUploadedTemplate(t);
    setUploadOpen(false);
    setTick((n) => n + 1);
    toast(`「${t.name}」上传成功，已默认启用`, "success");
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    removeUploadedTemplate(deleteTarget.id);
    setDeleteTarget(null);
    setTick((n) => n + 1);
    toast(`「${deleteTarget.name}」已删除，启用中的模板已同步下架`, "success");
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">报告模板</h1>
        <p className="text-sm text-gray-500 mt-1">管理报告与报表模板文件，启用后可供智能问数选择使用</p>
      </div>

      {/* 页签 + 右上角上传入口 */}
      <div className="flex items-center gap-1.5" role="tablist" aria-label="模板类型">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-700"
              }`}
            >
              {t.label}
            </button>
          );
        })}
        <Button className="ml-auto" onClick={() => setUploadOpen(true)}>上传模板</Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>模板名称</th>
                <th className={th}>文件格式</th>
                <th className={th}>文件大小</th>
                <th className={th}>启停状态</th>
                <th className={th}>上传人</th>
                <th className={th}>上传时间</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    暂无模板，点击右上角「上传模板」
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-800">{t.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.format}</td>
                    <td className="px-4 py-3 text-gray-600">{formatFileSize(t.sizeBytes)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* 启停开关：启用后可供问数选择生成报告 */}
                        <button
                          onClick={() => {
                            toggleUploadedTemplateEnabled(t.id);
                            setTick((n) => n + 1);
                            toast(t.enabled ? `「${t.name}」已停用，不再提供选择` : `「${t.name}」已启用，可供智能问数选择使用`, "success");
                          }}
                          aria-label={t.enabled ? "停用" : "启用"}
                          className={`inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                            t.enabled ? "bg-primary-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              t.enabled ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        <span className={`text-xs ${t.enabled ? "text-primary-600" : "text-gray-400"}`}>
                          {t.enabled ? "启用" : "停用"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.uploader}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.uploadedAt}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setPreviewTarget(t)}
                        className="rounded px-1.5 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                      >
                        预览
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
                        className="ml-1 rounded px-1.5 py-0.5 text-xs text-red-500 transition-colors hover:bg-red-50"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 上传抽屉（kind 跟随当前页签） */}
      <UploadTemplateDrawer
        open={uploadOpen}
        kind={tab}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
      />

      {/* 预览弹窗：文件信息 + 通用结构预览 */}
      <Modal open={previewTarget !== null} onClose={() => setPreviewTarget(null)} title={previewTarget?.name ?? ""}>
        {previewTarget && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
              <Field label="文件格式" value={previewTarget.format} />
              <Field label="文件大小" value={formatFileSize(previewTarget.sizeBytes)} />
              <Field label="启停状态" value={previewTarget.enabled ? "启用" : "停用"} />
              <Field label="上传人" value={previewTarget.uploader} />
              <Field label="上传时间" value={previewTarget.uploadedAt} />
            </div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans bg-gray-50 rounded-lg p-4 border border-gray-100">
              {uploadedToTemplateItem(previewTarget).preview}
            </pre>
          </div>
        )}
      </Modal>

      {/* 删除二次确认 */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="删除模板" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            确认删除「<span className="font-medium text-gray-800">{deleteTarget?.name}</span>
            」模板文件？删除后不可找回，启用中的模板将同时从智能问数下架。
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" onClick={confirmDelete}>确认删除</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
