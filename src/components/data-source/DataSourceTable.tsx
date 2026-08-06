"use client";

import { DataSourceRecord } from "@/types";
import { getTypeLabel } from "@/lib/mock-data/data-source";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  records: DataSourceRecord[];
  loading: boolean;
  startIndex: number; // 当前页首条序号
  testingId: string | null;
  onNameClick: (rec: DataSourceRecord) => void;
  onEdit: (rec: DataSourceRecord) => void;
  onDelete: (rec: DataSourceRecord) => void;
  onTest: (rec: DataSourceRecord) => void;
}

const thCls = "text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap";

/**
 * 数据源列表表格：序号、名称(蓝色可点击)、类型、状态(圆点+标签)、
 * 负责人、创建时间、更新时间、操作(测试链接/编辑/删除)。
 */
export function DataSourceTable({
  records,
  loading,
  startIndex,
  testingId,
  onNameClick,
  onEdit,
  onDelete,
  onTest,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className={thCls}>序号</th>
            <th className={thCls}>数据源名称</th>
            <th className={thCls}>数据源类型</th>
            <th className={thCls}>可用状态</th>
            <th className={thCls}>负责人</th>
            <th className={thCls}>备注</th>
            <th className={thCls}>更新时间</th>
            <th className={`${thCls} text-right`}>操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            <tr>
              <td colSpan={8} className="py-20">
                <div className="flex justify-center">
                  <Spinner />
                </div>
              </td>
            </tr>
          ) : records.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-20 text-center text-sm text-gray-400">
                暂无数据
              </td>
            </tr>
          ) : (
            records.map((rec, i) => (
              <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{startIndex + i}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <button
                    onClick={() => onNameClick(rec)}
                    className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                  >
                    {rec.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{getTypeLabel(rec.type)}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        rec.status === "available" ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <Badge variant={rec.status === "available" ? "success" : "default"}>
                      {rec.status === "available" ? "可用" : "不可用"}
                    </Badge>
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{rec.owner}</td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap max-w-[220px] truncate" title={rec.remark}>
                  {rec.remark || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{rec.updatedAt}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => onTest(rec)}
                      disabled={testingId === rec.id}
                      className="px-2.5 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {testingId === rec.id ? (
                        <>
                          <Spinner size="sm" /> 测试中
                        </>
                      ) : (
                        "测试链接"
                      )}
                    </button>
                    <button
                      onClick={() => onEdit(rec)}
                      className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => onDelete(rec)}
                      className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
