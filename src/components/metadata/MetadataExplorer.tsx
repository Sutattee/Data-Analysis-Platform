"use client";

import { useEffect, useMemo, useState } from "react";
import { ReactNode } from "react";
import { MetadataTable, MetadataField } from "@/types";
import { allMetadataTables, matchTableKeyword } from "@/lib/mock-data/metadata";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { formatNumber } from "@/lib/utils";
import { MetadataTableList } from "./MetadataTableList";
import { BasicInfoTab } from "./BasicInfoTab";
import { FieldListTab } from "./FieldListTab";
import { RelationGraphTab } from "./RelationGraphTab";
import { DataPreviewTab } from "./DataPreviewTab";
import { RecommendedQuestionsTab } from "./RecommendedQuestionsTab";

type Tab = "basic" | "fields" | "relation" | "preview" | "recommended";
const TAB_LABELS: Record<Tab, string> = {
  basic: "基础信息",
  fields: "字段列表",
  relation: "关系图",
  preview: "数据预览",
  recommended: "推荐问题配置",
};

interface Props {
  readOnly?: boolean;
  defaultTab?: Tab;
  tabOrder?: Tab[];
  toolbarExtra?: ReactNode;
  showRecommended?: boolean;
}

/**
 * 元数据浏览主体：搜索 + 左侧数据源分组表列表 + 右侧 4 Tab 详情。
 * 供「元数据管理」(可编辑) 与「数据模型」(只读展示) 共用。
 */
export function MetadataExplorer({ readOnly = false, defaultTab = "basic", tabOrder, toolbarExtra, showRecommended = false }: Props) {
  const toast = useToast();
  const defaultOrder: Tab[] = showRecommended
    ? ["basic", "fields", "relation", "preview", "recommended"]
    : ["basic", "fields", "relation", "preview"];
  const order: Tab[] = tabOrder ?? defaultOrder;

  const [tables, setTables] = useState<MetadataTable[]>(() =>
    JSON.parse(JSON.stringify(allMetadataTables))
  );

  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(allMetadataTables[0]?.id ?? null);
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [detailLoading, setDetailLoading] = useState(false);
  const [basicEditing, setBasicEditing] = useState(false);

  const filteredTables = useMemo(
    () => tables.filter((t) => matchTableKeyword(t, keyword)),
    [tables, keyword]
  );

  // 搜索后保证选中合法
  useEffect(() => {
    const exists = filteredTables.find((t) => t.id === selectedId);
    if (!exists) setSelectedId(filteredTables[0]?.id ?? null);
  }, [filteredTables, selectedId]);

  // 切换表或切换 Tab 时退出基础信息编辑模式
  useEffect(() => {
    setBasicEditing(false);
  }, [selectedId, tab]);

  // 选中表时模拟详情加载
  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    const t = setTimeout(() => setDetailLoading(false), 300);
    return () => clearTimeout(t);
  }, [selectedId]);

  const selected = useMemo(
    () => tables.find((t) => t.id === selectedId) ?? null,
    [tables, selectedId]
  );

  function saveBasic(patch: Partial<MetadataTable>) {
    if (readOnly || !selectedId) return;
    setTables((prev) => prev.map((t) => (t.id === selectedId ? { ...t, ...patch } : t)));
    toast("保存成功", "success");
  }

  function saveField(fieldName: string, patch: Partial<MetadataField>) {
    if (readOnly || !selectedId) return;
    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedId
          ? { ...t, fields: t.fields.map((f) => (f.name === fieldName ? { ...f, ...patch } : f)) }
          : t
      )
    );
    toast("字段元数据已保存", "success");
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 搜索 + 查询 + 额外按钮 */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setKeyword(keyword.trim());
          }}
          placeholder="搜索表名、字段名或业务含义"
          className="w-[280px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Button onClick={() => setKeyword(keyword.trim())}>查询</Button>
        {toolbarExtra && <div className="ml-auto">{toolbarExtra}</div>}
      </div>

      {/* 左右两栏 */}
      <div className="flex-1 flex items-start gap-4 min-h-0">
        {/* 左侧：数据源分组表列表 */}
        <div className="w-60 flex-shrink-0 self-stretch bg-white rounded-xl border border-gray-100 shadow-sm p-3 overflow-hidden">
          <MetadataTableList tables={filteredTables} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* 右侧：详情（基础信息时按内容自适应高度，避免下方大块留白；其余 Tab 满高内部滚动） */}
        <div
          className={`flex-1 min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden ${
            tab === "basic" && selected ? "self-start" : "self-stretch"
          }`}
        >
          {selected ? (
            <>
              {/* 表头 */}
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3 flex-shrink-0 flex-wrap">
                <h3 className="font-semibold text-gray-800 font-mono">{selected.name}</h3>
                <span className="text-sm text-gray-500">{selected.chineseName}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  共 <span className="font-medium text-gray-600">{formatNumber(selected.rowCount)}</span> 行
                </span>
                {!readOnly && tab === "basic" && !basicEditing && (
                  <Button size="sm" onClick={() => setBasicEditing(true)}>
                    编辑
                  </Button>
                )}
              </div>

              {/* Tab 切换 */}
              <div className="flex gap-1 px-5 pt-3 flex-shrink-0 border-b border-gray-100">
                {order.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3.5 py-2 text-sm -mb-px border-b-2 transition-colors ${
                      tab === t
                        ? "border-primary-600 text-primary-600 font-medium"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-h-0 overflow-auto pt-3 px-5 pb-5">
                {detailLoading ? (
                  <div className="flex justify-center py-16">
                    <Spinner />
                  </div>
                ) : (
                  <>
                    {tab === "basic" && (
                      <BasicInfoTab
                        table={selected}
                        onSave={saveBasic}
                        readOnly={readOnly}
                        editing={basicEditing}
                        onEditingChange={setBasicEditing}
                      />
                    )}
                    {tab === "fields" && (
                      <FieldListTab table={selected} allTables={tables} onSaveField={saveField} readOnly={readOnly} />
                    )}
                    {tab === "relation" && <RelationGraphTab table={selected} />}
                    {tab === "preview" && <DataPreviewTab table={selected} />}
                    {tab === "recommended" && <RecommendedQuestionsTab key={selected.id} table={selected} />}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <span className="text-5xl mb-3">📋</span>
              <p className="text-sm">请从左侧选择一张数据表</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
