"use client";

// 选择模板弹窗：顶部 tab（分析报告模板 / Excel报表模版）+ 业务域筛选，
// 下方左右分区（约1:2，分割线区分）：左=模板目录列表，右=模板内容预览
// （Excel 模板用工作表只读预览）；右下角「取消」（灰线框）+「使用模板」（蓝）。
import { useEffect, useState } from "react";
import type { ReportTemplateItem } from "@/types";
import { REPORT_TEMPLATES_ANALYSIS, REPORT_TEMPLATES_EXCEL } from "@/lib/mock-data/report-gen";
import { listUploadedTemplates, uploadedToTemplateItem } from "@/lib/mock-data/report-templates-admin";
import { DomainFilter } from "@/components/shared/DomainFilter";
import { ExcelPreview } from "@/components/shared/ExcelPreview";

type TemplateKind = "analysis" | "excel";

const TABS: { key: TemplateKind; label: string }[] = [
  { key: "analysis", label: "分析报告模板" },
  { key: "excel", label: "Excel报表模版" },
];

export function TemplatePickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (t: ReportTemplateItem) => void;
}) {
  const [kind, setKind] = useState<TemplateKind>("analysis");
  const [selected, setSelected] = useState<ReportTemplateItem | null>(null);
  const [domain, setDomain] = useState("全部");

  // 打开时重置到分析模板 tab 并清空选中与业务域筛选
  useEffect(() => {
    if (open) {
      setKind("analysis");
      setSelected(null);
      setDomain("全部");
    }
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // 内置模板 + 启用中的上传模板（管理后台上传并启用后在此可选，停用/删除后不再提供）
  const allOfKind = [
    ...(kind === "analysis" ? REPORT_TEMPLATES_ANALYSIS : REPORT_TEMPLATES_EXCEL),
    ...listUploadedTemplates(kind).filter((t) => t.enabled).map(uploadedToTemplateItem),
  ];
  // 业务域筛选：候选 = 当前 tab 可见模板的域去重；「全部」不过滤
  const domainOptions = Array.from(new Set(allOfKind.map((t) => t.domain ?? "通用")));
  const list = domain === "全部" ? allOfKind : allOfKind.filter((t) => (t.domain ?? "通用") === domain);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* 弹窗主体 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="选择模板"
        className="relative w-[960px] max-w-full max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* 标题栏：窗口名 + 右上角 X */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-semibold text-gray-800">选择模板</h3>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* tab 页签 + 业务域筛选（右侧） */}
        <div className="flex items-center gap-6 px-5 border-b border-gray-100 flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setKind(t.key); setSelected(null); setDomain("全部"); }}
              aria-selected={kind === t.key}
              role="tab"
              className={`relative py-2.5 text-sm transition-colors ${
                kind === t.key ? "text-primary-600 font-medium" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {kind === t.key && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary-600 rounded-full" />}
            </button>
          ))}
          <div className="ml-auto py-1.5">
            <DomainFilter value={domain} options={domainOptions} onChange={setDomain} />
          </div>
        </div>

        {/* 左右分区：左 1/3 目录列表 + 分割线 + 右预览 */}
        <div className="flex flex-1 min-h-0">
          <div className="w-1/3 min-w-0 border-r border-gray-100 overflow-y-auto p-3 space-y-1.5" role="listbox" aria-label="模板列表">
            {list.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  selected?.id === t.id
                    ? "border-primary-400 bg-primary-50"
                    : "border-gray-100 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 truncate">{t.kind === "excel" ? "📊" : "📄"} {t.name}</span>
                  <span className="ml-auto flex-shrink-0 text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">{t.domain ?? "通用"}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{t.description}</p>
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-0 overflow-y-auto p-5">
            {selected ? (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">{selected.name}</h4>
                <p className="text-xs text-gray-400 mb-3">{selected.description} ｜ 业务域：{selected.domain ?? "通用"}</p>
                {selected.kind === "excel" && selected.excelSheets?.length ? (
                  // Excel 模板：工作表只读预览（保留版式，支持页签切换、滚动与缩放）
                  <ExcelPreview sheets={selected.excelSheets} maxHeight={320} />
                ) : (
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans bg-gray-50 rounded-lg p-4 border border-gray-100">
                    {selected.preview}
                  </pre>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                请在左侧选择模板查看内容预览
              </div>
            )}
          </div>
        </div>

        {/* 底部右下角：「取消」灰色线框在左，「使用模板」蓝色在右 */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 bg-white text-gray-600 text-sm rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            使用模板
          </button>
        </div>
      </div>
    </div>
  );
}
