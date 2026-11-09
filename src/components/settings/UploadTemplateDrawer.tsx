"use client";

// 上传模板抽屉：分析报告页上传 DOCX/PDF 文档，Excel 报表页上传 XLSX 文件；
// 支持点击与拖拽，选择即校验（格式 / 大小 / 0 字节损坏），不通过则红字说明并阻止提交。
// 业务域：下拉单选（默认「生产管理」），供问数「选择模板」按业务域筛选。
import { useEffect, useRef, useState } from "react";
import type { UploadedTemplate } from "@/types";
import { useApp } from "@/lib/store/AppContext";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { extOf, formatFileSize, nameOf, validateUploadFile } from "@/lib/mock-data/report-templates-admin";

// 业务域候选（平台业务域口径，与选择模板弹窗筛选一致）
const DOMAIN_OPTIONS = ["生产管理", "能源消耗", "工艺质量", "费用预算执行"];

function formatNow(): string {
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const d = new Date();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function UploadTemplateDrawer({
  open,
  kind,
  onClose,
  onUploaded,
}: {
  open: boolean;
  kind: "analysis" | "excel"; // 跟随页面当前页签
  onClose: () => void;
  onUploaded: (t: UploadedTemplate) => void;
}) {
  const toast = useToast();
  const { state } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [domain, setDomain] = useState<string>("生产管理");

  // 关闭或切换页签时清空已选，避免跨类型残留
  useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setDragging(false);
      setDomain("生产管理");
    }
  }, [open, kind]);

  function pick(f: File | null) {
    if (!f) return;
    const err = validateUploadFile(f.name, f.size, kind);
    setError(err);
    setFile(f);
    if (err) toast(err, "warning");
  }

  function confirmUpload() {
    if (!file) return;
    const err = validateUploadFile(file.name, file.size, kind);
    if (err) {
      setError(err);
      toast(err, "warning");
      return;
    }
    onUploaded({
      id: `ut-${Date.now().toString(36)}`,
      kind,
      name: nameOf(file.name),
      format: extOf(file.name) as UploadedTemplate["format"],
      sizeBytes: file.size,
      enabled: true,
      uploader: state.user?.username ?? "admin",
      uploadedAt: formatNow(),
      domain,
    });
  }

  const isAnalysis = kind === "analysis";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="上传模板"
      width={480}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={confirmUpload} disabled={!file || !!error}>确认</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 上传区域：点击选择 / 拖拽 */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-primary-500 bg-primary-50" : "border-gray-300 hover:border-primary-400"
          }`}
        >
          <div className="text-4xl">{isAnalysis ? "📄" : "📊"}</div>
          <p className="mt-3 text-sm text-gray-600">
            <span className="text-primary-600 font-medium">{isAnalysis ? "点击上传文件" : "点击上传报表"}</span>
            {" / 拖拽到此区域"}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            {isAnalysis
              ? "支持上传 1 个DOCX/PDF 文档，大小 ≤ 100MB，不超过 25 万字"
              : "支持上传 1 个XLSX文件，大小 ≤ 100MB，累计不超过 10,000 行"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={isAnalysis ? ".docx,.pdf" : ".xlsx"}
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0] ?? null);
            e.target.value = ""; // 允许再次选择同名文件
          }}
        />

        {/* 业务域：下拉单选（问数「选择模板」按业务域筛选时生效） */}
        <div>
          <label htmlFor="upload-domain" className="text-xs text-gray-500 font-medium">业务域</label>
          <select
            id="upload-domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            aria-label="业务域"
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {DOMAIN_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* 校验不通过：说明原因并阻止提交 */}
        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* 已选文件 */}
        {file && (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
            <span className="text-xl">{isAnalysis ? "📄" : "📊"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
            </div>
            <button
              onClick={() => { setFile(null); setError(null); }}
              aria-label="移除文件"
              className="text-gray-400 hover:text-gray-600 text-lg leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
