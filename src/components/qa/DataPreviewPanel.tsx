"use client";

// 数据预览面板（智能问数「选择数据范围」各数据表的预览抽屉）：
// - 复用 InlinePanel：与「报告生成」面板同宽（720px）、同右栏并列布局
//   （左侧对话区收窄可继续操作，无蒙层，ESC 可关闭）
// - 标题为数据表中文名称 + 英文名称；下方三个只读页签：字段列表 (n)｜数据预览｜推荐问题 (m)，
//   默认选中字段列表；底部右侧灰字「最多预览前100行数据」
// - 推荐问题来自后台「元数据管理」页配置（只读快照）；点击问题标题或「引用」按钮
//   将问题填充至对话输入框（onQuote 回调，面板保持打开）；切换数据表时保持当前页签
import { useState } from "react";
import { InlinePanel } from "./ReportDrawer";
import { getDataPreview } from "@/lib/mock-data/data-preview";

type TabKey = "fields" | "rows" | "questions";

const TABS: { key: TabKey; label: string }[] = [
  { key: "fields", label: "字段列表" },
  { key: "rows", label: "数据预览" },
  { key: "questions", label: "推荐问题" },
];

// 表头单元格：吸顶 + 灰底（滚动时固定在内容区顶部；横向滚动仅随表格移动）
const th = "sticky top-0 z-10 bg-gray-50 text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap";

export function DataPreviewPanel({
  tableId,
  tableName,
  tableEnName,
  onClose,
  onQuote,
}: {
  tableId: string | null;
  tableName?: string;
  tableEnName?: string;
  onClose: () => void;
  onQuote: (question: string) => void;
}) {
  const [tab, setTab] = useState<TabKey>("fields");
  const data = tableId ? getDataPreview(tableId) : undefined;

  // 页签标签（字段列表 / 推荐问题配置 带数量角标）
  function tabLabel(t: { key: TabKey; label: string }): string {
    if (!data) return t.label;
    if (t.key === "fields") return `${t.label} (${data.fields.length})`;
    if (t.key === "questions") return `${t.label} (${data.questions.length})`;
    return t.label;
  }

  return (
    <InlinePanel
      open={!!tableId}
      onClose={onClose}
      title={
        <>
          {tableName ?? "数据预览"}
          {tableEnName && (
            <span className="ml-2 font-mono text-xs font-normal text-gray-400">{tableEnName}</span>
          )}
        </>
      }
      width={720}
      padding={false}
      label="数据预览面板"
      footer={<p className="text-right text-xs text-gray-400">最多预览前100行数据</p>}
    >
      <div className="flex h-full flex-col">
        {/* 页签 */}
        <div className="flex gap-5 border-b border-gray-200 px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-2 -mb-px border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "border-primary-600 text-primary-700 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tabLabel(t)}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-h-0 overflow-auto">
          {!data ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-400">
              <span className="mb-3 text-4xl">🔍</span>
              <p className="text-sm">暂无该表的预览数据</p>
            </div>
          ) : tab === "fields" ? (
            /* 字段列表（只读，表头吸顶） */
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className={th}>字段名</th>
                  <th className={th}>数据类型</th>
                  <th className={th}>字段说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.fields.map((f) => (
                  <tr key={f.name} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{f.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{f.type}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{f.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "rows" ? (
            /* 数据预览（前100行，表头吸顶；表格超出面板宽度时随内容区横向滚动） */
            <table className="text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100">
                  {data.fields.map((f) => (
                    <th key={f.name} className={th}>{f.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-gray-50">
                    {data.fields.map((f) => (
                      <td key={f.name} className="px-3 py-2 text-gray-700">
                        {row[f.name] === "" ? "—" : String(row[f.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* 推荐问题（后台元数据管理配置的只读问题，点击引用至输入框） */
            <div className="space-y-2 p-5">
              {data.questions.map((q) => (
                <div
                  key={q}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 transition-colors hover:border-primary-200 hover:bg-primary-50/40"
                >
                  <button
                    onClick={() => onQuote(q)}
                    className="min-w-0 flex-1 text-left text-sm text-gray-800 transition-colors hover:text-primary-600"
                    title="引用该问题"
                  >
                    {q}
                  </button>
                  <button
                    onClick={() => onQuote(q)}
                    className="flex-shrink-0 rounded-md border border-primary-200 px-2.5 py-1 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                    title="引用该问题"
                  >
                    引用
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </InlinePanel>
  );
}
