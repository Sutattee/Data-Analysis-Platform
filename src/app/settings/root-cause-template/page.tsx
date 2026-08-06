"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { rootCauseTemplates, RootCauseTemplate } from "@/lib/mock-data/root-cause-templates";

function nowStr() {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// JSON 编辑器（textarea + 行号 + 校验 + 格式化）
function JsonEditor({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const lines = value.split("\n").length;
  return (
    <div>
      <div className="flex border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-50 text-gray-400 text-xs font-mono py-2 px-2 select-none text-right leading-5 flex-shrink-0">
          {Array.from({ length: Math.max(lines, 1) }, (_, i) => (<div key={i}>{i + 1}</div>))}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={18}
          spellCheck={false}
          className="flex-1 p-2 text-xs font-mono leading-5 resize-none focus:outline-none bg-white"
          placeholder='{\n  "模板名称": "...",\n  "根因维度": []\n}'
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function RootCauseTemplatePage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<RootCauseTemplate[]>(() => rootCauseTemplates.map((t) => ({ ...t })));
  const [detailTarget, setDetailTarget] = useState<RootCauseTemplate | null>(null);
  const [editTarget, setEditTarget] = useState<RootCauseTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RootCauseTemplate | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  function handleSave(item: RootCauseTemplate) {
    if (templates.some((t) => t.id === item.id)) {
      setTemplates((prev) => prev.map((t) => (t.id === item.id ? { ...item, updatedAt: nowStr() } : t)));
    } else {
      setTemplates((prev) => [{ ...item, id: "rct" + Date.now(), createdAt: nowStr(), updatedAt: nowStr() }, ...prev]);
    }
    toast("保存成功", "success");
    setEditTarget(null);
    setAddOpen(false);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    toast("已删除", "success");
    setDeleteTarget(null);
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">领域根因模板</h1>
        <Button onClick={() => setAddOpen(true)}>+ 新增模板</Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>模板名称</th>
                <th className={th}>模板内容</th>
                <th className={th}>创建人</th>
                <th className={th}>更新时间</th>
                <th className={th}>创建时间</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[320px]">
                    <div className="line-clamp-2 whitespace-pre-line text-xs font-mono">{t.content}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.creator}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{t.updatedAt}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{t.createdAt}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setDetailTarget(t)}>查看</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditTarget(t)}>编辑</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(t)}>删除</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 模板详情抽屉 */}
      <Drawer open={detailTarget !== null} onClose={() => setDetailTarget(null)} title="模板详情" width={560}
        footer={<div className="flex"><Button onClick={() => setDetailTarget(null)}>取消</Button></div>}>
        {detailTarget && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">模板名称</div>
              <div className="text-sm text-gray-800">{detailTarget.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">模板内容</div>
              <pre className="bg-gray-800 text-gray-100 rounded-lg p-3 text-xs font-mono overflow-auto leading-relaxed whitespace-pre max-h-[50vh]">{detailTarget.content}</pre>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="text-xs text-gray-400 mb-1">创建人</div>
                <div className="text-sm text-gray-800">{detailTarget.creator}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">创建时间</div>
                <div className="text-sm text-gray-800">{detailTarget.createdAt}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">更新时间</div>
                <div className="text-sm text-gray-800">{detailTarget.updatedAt}</div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 编辑/新增抽屉 */}
      {(editTarget || addOpen) && (
        <TemplateEditDrawer
          target={editTarget}
          onClose={() => { setEditTarget(null); setAddOpen(false); }}
          onSave={handleSave}
        />
      )}

      {/* 删除确认 */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="删除确认" size="sm">
        <p className="text-sm text-gray-600">确认删除该根因模板吗？</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="danger" onClick={handleDelete}>确定</Button>
        </div>
      </Modal>
    </div>
  );
}

function TemplateEditDrawer({
  target, onClose, onSave,
}: { target: RootCauseTemplate | null; onClose: () => void; onSave: (t: RootCauseTemplate) => void }) {
  const [name, setName] = useState(target?.name || "");
  const [content, setContent] = useState(target?.content || '{\n  "模板名称": "",\n  "根因维度": []\n}');
  const [error, setError] = useState("");

  function formatJson() {
    try {
      const parsed = JSON.parse(content);
      setContent(JSON.stringify(parsed, null, 2));
      setError("");
    } catch (e) {
      setError(`JSON 语法错误：${(e as Error).message}`);
    }
  }

  function handleSaveClick() {
    // 校验 JSON
    try {
      JSON.parse(content);
    } catch (e) {
      setError(`JSON 语法错误：${(e as Error).message}`);
      return;
    }
    // 校验必填
    if (!name.trim()) {
      setError("模板名称不能为空");
      return;
    }
    // 校验 JSON 内必填字段
    try {
      const parsed = JSON.parse(content);
      if (!parsed.模板名称) { setError("JSON 内缺少必填字段：模板名称"); return; }
      if (!Array.isArray(parsed.根因维度)) { setError("JSON 内「根因维度」必须为数组"); return; }
    } catch {
      return;
    }
    setError("");
    onSave({
      id: target?.id || "",
      name: name.trim(),
      content,
      creator: target?.creator || "当前用户",
      createdAt: target?.createdAt || "",
      updatedAt: "",
    });
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={target ? "编辑模板" : "新增模板"}
      width={640}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleSaveClick}>保存</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：重点网格能耗根因模板"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">模板内容（JSON）</label>
            <button onClick={formatJson} className="text-xs text-primary-600 hover:text-primary-700">自动格式化</button>
          </div>
          <JsonEditor value={content} onChange={(v) => { setContent(v); setError(""); }} error={error} />
        </div>
      </div>
    </Drawer>
  );
}
