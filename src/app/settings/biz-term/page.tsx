"use client";

import { useState } from "react";
import { mockBizTerms } from "@/lib/mock-data/settings";
import { BizTerm } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export default function BizTermPage() {
  const [terms, setTerms] = useState<BizTerm[]>(mockBizTerms);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editItem, setEditItem] = useState<BizTerm | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const toast = useToast();
  // 导入
  const [importOpen, setImportOpen] = useState(false);
  const [dupMode, setDupMode] = useState<"skip" | "overwrite">("skip");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");

  function handleImportFile(f: File | null) {
    setImportError("");
    if (!f) { setImportFile(null); return; }
    if (!f.name.endsWith(".xlsx")) { setImportError("仅支持.xlsx格式"); return; }
    if (f.size > 50 * 1024 * 1024) { setImportError("文件大小不超过50MB"); return; }
    setImportFile(f);
  }
  function handleImportConfirm() {
    if (!importFile) { setImportError("上传文件不能为空"); return; }
    toast(`已导入业务术语文件（${dupMode === "skip" ? "跳过同名" : "覆盖同名"}）`, "success");
    setImportOpen(false);
    setImportFile(null);
    setImportError("");
  }
  function downloadTermTemplate() {
    const header = "名称,同义词,说明\n";
    const sample = "标准箱,箱、大箱、卷烟箱,卷烟产量的标准计量单位\n单箱卷烟综合能耗,单箱综合能耗、单箱能耗、箱均能耗,标准指标\n";
    const blob = new Blob(["﻿" + header + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "业务术语模板.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = terms.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.synonyms.toLowerCase().includes(search.toLowerCase()) ||
    t.definition.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map((t) => t.id));
  };

  const deleteSelected = () => {
    setTerms((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
    setSelectedIds([]);
  };

  const handleSave = (item: BizTerm) => {
    if (editItem) {
      setTerms((prev) => prev.map((t) => (t.id === item.id ? item : t)));
    } else {
      setTerms((prev) => [{ ...item, id: "bt" + Date.now(), creator: "当前用户", updatedAt: new Date().toISOString().slice(0, 10) }, ...prev]);
    }
    setEditItem(null);
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">业务术语</h1>
      </div>

      <Card padding={false}>
        {/* 工具条：搜索 + 查询 + 删除 + 新增（同一行） */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-wrap">
          <div className="w-[280px] flex-shrink-0">
            <Input placeholder="搜索名称、同义词、说明..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => setSearch(search.trim())}>查询</Button>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={deleteSelected} disabled={selectedIds.length === 0}>🗑 删除</Button>
            <Button onClick={() => { setEditItem(null); setShowAdd(true); }}>+ 新增</Button>
            <Button variant="secondary" onClick={() => { setImportOpen(true); setImportFile(null); setImportError(""); }}>导入业务术语</Button>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-4 py-2.5"><input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="w-3.5 h-3.5" /></th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">名称</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">同义词</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">说明</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">创建人</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">更新时间</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((term) => (
                <tr key={term.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5"><input type="checkbox" checked={selectedIds.includes(term.id)} onChange={() => toggleSelect(term.id)} className="w-3.5 h-3.5" /></td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{term.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{term.synonyms}</td>
                  <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{term.definition}</td>
                  <td className="px-4 py-2.5 text-gray-500">{term.creator}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{term.updatedAt}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => { setEditItem(term); setShowAdd(true); }}>编辑</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setTerms((prev) => prev.filter((t) => t.id !== term.id)); }}>删除</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editItem ? "编辑业务术语" : "新增业务术语"}>
        <TermForm initial={editItem} onSave={handleSave} onCancel={() => setShowAdd(false)} />
      </Modal>

      {/* 导入弹窗 */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="本地导入">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">重名处理</label>
            <div className="flex gap-5">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                <input type="radio" checked={dupMode === "skip"} onChange={() => setDupMode("skip")} className="accent-primary-600" />
                跳过同名术语
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                <input type="radio" checked={dupMode === "overwrite"} onChange={() => setDupMode("overwrite")} className="accent-primary-600" />
                覆盖已有同名术语
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">上传文件</label>
            <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
              <span className="text-3xl text-gray-300 mb-2">📁</span>
              <span className="text-sm text-primary-600 font-medium">点击上传</span>
              {importFile && <span className="text-xs text-gray-500 mt-1">{importFile.name}</span>}
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)} />
            </label>
            <div className="text-xs text-gray-400 mt-1.5">支持.xlsx格式，文件大小不超过50MB</div>
            <div className="mt-1.5">
              <button onClick={downloadTermTemplate} className="text-sm text-primary-600 hover:text-primary-700">下载业务术语模板.xlsx</button>
            </div>
            {importError && <p className="mt-1.5 text-xs text-red-500">{importError}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>取消</Button>
            <Button onClick={handleImportConfirm}>确认</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TermForm({ initial, onSave, onCancel }: { initial: BizTerm | null; onSave: (t: BizTerm) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name || "");
  const [synonyms, setSynonyms] = useState(initial?.synonyms || "");
  const [definition, setDefinition] = useState(initial?.definition || "");

  return (
    <div className="space-y-4">
      <Input label="名称" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="同义词" value={synonyms} onChange={(e) => setSynonyms(e.target.value)} placeholder="多个以逗号分隔" />
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">说明</label>
        <textarea value={definition} onChange={(e) => setDefinition(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave({ id: initial?.id || "", name, synonyms, definition, domain: initial?.domain || "通用", creator: initial?.creator || "当前用户", updatedAt: new Date().toISOString().slice(0, 10) })}>保存</Button>
        <Button variant="secondary" onClick={onCancel}>取消</Button>
      </div>
    </div>
  );
}
