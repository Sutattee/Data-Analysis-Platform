"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { reportTemplates, generateReportContent } from "@/lib/mock-data/reports";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ReportTemplate } from "@/types";

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [selectedTpl, setSelectedTpl] = useState<string | null>(searchParams.get("type") || null);
  const [requirement, setRequirement] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [previewTpl, setPreviewTpl] = useState<ReportTemplate | null>(null);

  const handleGenerate = (tplId?: string) => {
    const id = tplId || selectedTpl || "rt1";
    setSelectedTpl(id);
    const content = generateReportContent(id);
    if (requirement.trim()) {
      setGeneratedContent(`## 📝 基于需求的定制报告\n\n**您的需求**: ${requirement}\n\n---\n\n${content}`);
    } else {
      setGeneratedContent(content);
    }
  };

  if (generatedContent) {
    return (
      <div className="max-w-4xl mx-auto">
        <ReportPreview content={generatedContent} onBack={() => setGeneratedContent(null)} />
      </div>
    );
  }

  const grouped: Record<string, typeof reportTemplates> = {};
  reportTemplates.forEach((t) => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });

  return (
    <div className="flex flex-col items-center h-[calc(100vh-80px)] overflow-auto">
      {/* 居中区域 */}
      <div className="max-w-3xl w-full mx-auto pt-12 pb-8 flex-shrink-0">
        {/* 标题：图标在文字左边 */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">📄</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">报告生成</h2>
            <p className="text-sm text-gray-500">选择模板或输入需求，AI自动生成数据分析报告</p>
          </div>
        </div>

        {/* 输入区 */}
        <div className="relative">
          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="例：生成一份本月热轧产线质量分析报告，重点分析表面缺陷趋势..."
            rows={5}
            className="w-full px-4 py-3 pb-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none shadow-sm"
          />
          {/* 选择模板按钮 — 放在输入框内部左下角 */}
          <div className="absolute left-3 bottom-3 flex gap-2">
            <button
              onClick={() => {
                // 展开小弹窗选择模板
                const tplList = document.getElementById("tpl-quick-select");
                if (tplList) tplList.classList.toggle("hidden");
              }}
              className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
            >
              📋 选择模板
            </button>
          </div>
          {/* 生成按钮 */}
          <button
            onClick={() => handleGenerate()}
            className="absolute right-3 bottom-3 px-4 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            🪄 生成报告
          </button>
        </div>

        {/* 快速模板选择 */}
        <div id="tpl-quick-select" className="hidden mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex flex-wrap gap-2">
            {reportTemplates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => { setPreviewTpl(tpl); document.getElementById("tpl-quick-select")?.classList.add("hidden"); }}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedTpl === tpl.id ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
              >
                {tpl.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 模板列表（下方可滚动查看更多）— 左对齐 */}
      <div className="max-w-3xl w-full mx-auto pb-12">
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-gray-500 mb-3">{category}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setPreviewTpl(tpl)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTpl === tpl.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <h5 className="text-sm font-medium text-gray-800 mb-1">{tpl.name}</h5>
                    <p className="text-xs text-gray-500">{tpl.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 模板预览：使用模板 */}
      <Modal open={!!previewTpl} onClose={() => setPreviewTpl(null)} title={previewTpl?.name} size="lg">
        {previewTpl && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{previewTpl.description}</p>
            <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 max-h-[50vh] overflow-auto border border-gray-100">
              {generateReportContent(previewTpl.id)}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setPreviewTpl(null)}>关闭</Button>
              <Button onClick={() => {
                setRequirement((prev) => prev + (prev ? "\n" : "") + `【使用模板：${previewTpl.name}】`);
                setSelectedTpl(previewTpl.id);
                setPreviewTpl(null);
              }}>使用模板</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
