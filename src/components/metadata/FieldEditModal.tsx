"use client";

import { useEffect, useState } from "react";
import { MetadataField, MetadataTable } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TagInput } from "./TagInput";

interface Props {
  open: boolean;
  field: MetadataField | null;
  allTables: MetadataTable[];
  existingSynonyms: string[];
  onClose: () => void;
  onSave: (patch: { businessMeaning: string; synonyms: string[]; fk: { table: string; field: string } | null }) => void;
}

const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";

export function FieldEditModal({ open, field, allTables, existingSynonyms, onClose, onSave }: Props) {
  const toast = useToast();
  const [businessMeaning, setBusinessMeaning] = useState("");
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [fkTable, setFkTable] = useState("");
  const [fkField, setFkField] = useState("");

  // 打开时初始化
  useEffect(() => {
    if (open && field) {
      setBusinessMeaning(field.businessMeaning);
      setSynonyms(field.synonyms);
      setFkTable(field.fk?.table ?? "");
      setFkField(field.fk?.field ?? "");
    }
  }, [open, field]);

  if (!field) return null;

  const targetTables = allTables.map((t) => t.name);
  const targetFields = allTables.find((t) => t.name === fkTable)?.fields.map((f) => f.name) ?? [];

  // 外键目标表是否已不存在（被删除）
  const fkTargetMissing =
    field.fk != null && fkTable === field.fk.table && !targetTables.includes(field.fk.table);

  function handleSave() {
    // 同义词重复校验（与其它字段/表的同义词）
    const dup = synonyms.find((s) => existingSynonyms.includes(s));
    if (dup) {
      toast(`同义词「${dup}」与其他字段重复，请修改`, "warning");
      return;
    }
    const fk =
      fkTable && fkField ? { table: fkTable, field: fkField } : null;
    onSave({ businessMeaning: businessMeaning.trim(), synonyms, fk });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="编辑字段元数据" size="md">
      <div className="space-y-4">
        {/* 字段名 / 数据类型（只读） */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">字段名</label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono text-gray-600">{field.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">数据类型</label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono text-gray-600">{field.dataType}</div>
          </div>
        </div>

        {/* 业务含义 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">业务含义</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={3}
            value={businessMeaning}
            onChange={(e) => setBusinessMeaning(e.target.value)}
            placeholder="请输入该字段的业务含义，帮助 AI 更准确理解数据"
          />
        </div>

        {/* 同义词 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">同义词标签</label>
          <TagInput value={synonyms} onChange={setSynonyms} placeholder="为字段添加同义词，提升自然语言查询召回率" />
        </div>

        {/* 外键关联：目标表 → 目标字段 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">外键关联</label>
          <div className="grid grid-cols-2 gap-3">
            <select
              className={selectCls}
              value={fkTable}
              onChange={(e) => {
                setFkTable(e.target.value);
                setFkField("");
              }}
            >
              <option value="">选择目标表</option>
              {targetTables.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className={selectCls}
              value={fkField}
              onChange={(e) => setFkField(e.target.value)}
              disabled={!fkTable}
            >
              <option value="">选择目标字段</option>
              {targetFields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          {fkTargetMissing && (
            <p className="mt-1.5 text-xs text-red-500">⚠ 目标表「{field.fk!.table}」已不存在，请重新选择或清空该外键关联。</p>
          )}
          <p className="mt-1.5 text-xs text-gray-400">
            标注外键关系后，分析引擎将自动支持跨表关联查询。
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}
