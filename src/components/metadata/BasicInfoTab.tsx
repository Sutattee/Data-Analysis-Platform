"use client";

import { useEffect, useState } from "react";
import { MetadataTable, TableType } from "@/types";
import { getTypeLabel } from "@/lib/mock-data/data-source";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TagInput } from "./TagInput";

const TABLE_TYPES: TableType[] = ["物理表", "视图", "维度表", "事实表"];

interface Props {
  table: MetadataTable;
  onSave: (patch: Partial<MetadataTable>) => void;
  readOnly?: boolean;
  editing?: boolean; // 受控：是否处于编辑模式（编辑入口由面板表头触发）
  onEditingChange?: (v: boolean) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 items-start py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 pt-1.5">{label}</span>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";

/**
 * 基础信息：默认展示模式（字段紧贴顶部），编辑入口在面板表头；
 * 进入编辑模式后展示表单，底部 取消/保存。
 */
export function BasicInfoTab({ table, onSave, readOnly = false, editing = false, onEditingChange }: Props) {
  const [draft, setDraft] = useState({
    chineseName: table.chineseName,
    tableType: table.tableType,
    synonyms: table.synonyms,
    description: table.description,
  });

  // 进入编辑模式时用最新表数据初始化草稿
  useEffect(() => {
    if (editing) {
      setDraft({
        chineseName: table.chineseName,
        tableType: table.tableType,
        synonyms: table.synonyms,
        description: table.description,
      });
    }
  }, [editing, table]);

  function cancel() {
    onEditingChange?.(false);
  }

  function save() {
    onSave({
      chineseName: draft.chineseName.trim() || table.chineseName,
      tableType: draft.tableType,
      synonyms: draft.synonyms,
      description: draft.description.trim(),
    });
    onEditingChange?.(false);
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <div>
          <Row label="表名称">
            <span className="font-mono text-gray-500">{table.name}</span>
          </Row>
          <Row label="表中文名">
            <input
              className={inputCls}
              value={draft.chineseName}
              onChange={(e) => setDraft((d) => ({ ...d, chineseName: e.target.value }))}
              placeholder="请输入表中文名"
            />
          </Row>
          <Row label="所属数据源">
            <span className="text-gray-500">{table.databaseName}</span>
          </Row>
          <Row label="表类型">
            <select
              className={inputCls}
              value={draft.tableType}
              onChange={(e) => setDraft((d) => ({ ...d, tableType: e.target.value as TableType }))}
            >
              {TABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Row>
          <Row label="表名同义词">
            <TagInput
              value={draft.synonyms}
              onChange={(tags) => setDraft((d) => ({ ...d, synonyms: tags }))}
              placeholder="添加表名同义词/别名"
            />
          </Row>
          <Row label="描述">
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="请输入表的业务描述"
            />
          </Row>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="secondary" onClick={cancel}>
            取消
          </Button>
          <Button onClick={save}>保存</Button>
        </div>
      </div>
    );
  }

  // 展示模式（编辑入口已移至面板表头，字段紧贴顶部）
  return (
    <div>
      <Row label="表名称">
        <span className="font-mono">{table.name}</span>
      </Row>
      <Row label="表中文名">{table.chineseName || "—"}</Row>
      <Row label="所属数据源">
        <span>{table.databaseName}</span>
        <Badge variant="info" className="ml-2">
          {getTypeLabel(table.typeKey)}
        </Badge>
      </Row>
      <Row label="表类型">
        <Badge>{table.tableType}</Badge>
      </Row>
      <Row label="表名同义词">
        {table.synonyms.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {table.synonyms.map((s) => (
              <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </Row>
      <Row label="描述">
        <span className="text-gray-600 leading-relaxed">{table.description || "—"}</span>
      </Row>
    </div>
  );
}
