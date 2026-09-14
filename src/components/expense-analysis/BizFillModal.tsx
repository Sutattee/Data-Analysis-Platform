"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ExpenseIndicator } from "@/lib/mock-data/expense-indicators";
import { bizRowsOf, saveBizRows, sumBizRows, type BizRow } from "@/lib/mock-data/biz-composition";

// 编辑态行：月份用 string 便于清空重输（空串保存时按未填写校验）
interface EditRow {
  id: string;
  name: string;
  months: string[];
}

const MONTH_COLS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
// 金额输入框样式（行内编辑）
const numInput =
  "w-14 px-1 py-1 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400";

// 预算指标填报弹窗：业务项 × 12 个月预算计划，行内编辑、+新增/删除，保存校验合计 == 批复数
// readOnly：只读查看模式（填报功能关闭后部门管理员仅可查看；内容不可编辑、无新增/删除）
export function BizFillModal({
  indicator, readOnly = false, onClose,
}: { indicator: ExpenseIndicator; readOnly?: boolean; onClose: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<EditRow[]>(() =>
    bizRowsOf(indicator).map((r: BizRow) => ({
      id: r.id,
      name: r.name,
      months: r.months.map((v) => String(v)),
    }))
  );
  const [seq, setSeq] = useState(0); // 新增行 id 自增序号

  // 弹窗打开期间锁定页面滚动 + Esc 关闭（与 Modal 组件同款行为）
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // 月份输入：仅保留数字与小数点
  const setMonth = (rowIdx: number, monthIdx: number, value: string) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === rowIdx ? { ...r, months: r.months.map((m, j) => (j === monthIdx ? value.replace(/[^\d.]/g, "") : m)) } : r
      )
    );
  };

  // +新增：追加一行空白业务项
  const addRow = () => {
    setSeq((s) => s + 1);
    setRows((prev) => [...prev, { id: `n${seq + 1}`, name: "", months: Array(12).fill("") }]);
  };

  // 当前合计（万，未填月份按 0 计）
  const total = rows.reduce(
    (s, r) => s + r.months.reduce((a, m) => a + (m === "" || isNaN(Number(m)) ? 0 : Number(m)), 0),
    0
  );

  const handleSave = () => {
    if (rows.length === 0) {
      toast("请至少填写一个业务项", "danger");
      return;
    }
    // 必填校验：业务项名称与 12 个月计划金额均不可为空
    const incomplete = rows.some((r) => !r.name.trim() || r.months.some((m) => m === "" || isNaN(Number(m))));
    if (incomplete) {
      toast("请完整填写业务项名称及各月计划金额", "danger");
      return;
    }
    // 合计校验：全部业务项 12 个月计划合计必须等于业务预算批复数
    const sum = sumBizRows(rows.map((r) => ({ ...r, months: r.months.map(Number) })));
    if (sum > indicator.budget + 1e-9) {
      toast("计划金额不能高于业务预算批复数", "danger");
      return;
    }
    if (sum < indicator.budget - 1e-9) {
      toast("计划金额不能低于业务预算批复数", "danger");
      return;
    }
    saveBizRows(indicator.id, rows.map((r) => ({ ...r, months: r.months.map(Number) })));
    toast("保存成功", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-[1320px] flex-col rounded-xl bg-white shadow-xl">
        {/* 头部：标题 + 次级标题（批复数）+ 填报提示；右上角关闭 */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">{indicator.name}</h3>
            <p className="mt-0.5 text-xs text-gray-500">业务预算批复数 {indicator.budget.toLocaleString()} 万</p>
            <p className="mt-1 text-xs text-gray-400">
              {readOnly
                ? "查看该预算指标已填报的业务项及1—12月预算计划。"
                : "请填写各业务项及其1—12月预算计划，各业务项年度预算计划合计不得超过或低于该业务的预算批复数。"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 业务项 × 12 个月计划 行内编辑表格（仅纵向滚动，无横向滚动条） */}
        <div className="overflow-y-auto p-6 pt-4">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                <th className="px-3 py-2 text-left">业务项</th>
                {MONTH_COLS.map((m) => (
                  <th key={m} className="px-1 py-2 text-right">{m}</th>
                ))}
                <th className="px-3 py-2 text-center">
                  {!readOnly && (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                      onClick={addRow}
                    >
                      +新增
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, i) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="block w-40 truncate text-xs text-gray-700">{row.name}</span>
                    ) : (
                      <input
                        value={row.name}
                        maxLength={20}
                        placeholder="必填，最多20字"
                        onChange={(e) =>
                          setRows((prev) => prev.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))
                        }
                        className="w-40 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400"
                      />
                    )}
                  </td>
                  {row.months.map((m, j) => (
                    <td key={j} className="px-1 py-2 text-right">
                      {readOnly ? (
                        <span className="block w-14 text-xs text-gray-600">{m === "" ? "—" : m}</span>
                      ) : (
                        <input value={m} inputMode="decimal" className={numInput} onChange={(e) => setMonth(i, j, e.target.value)} />
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    {!readOnly && (
                      <button
                        type="button"
                        className="text-xs text-gray-400 hover:text-red-500"
                        onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-6 text-center text-xs text-gray-400">
                    {readOnly ? "暂无业务项" : "暂无业务项，点击表头「+新增」添加"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* 合计提示：辅助填报对齐批复数 */}
          <p className="mt-3 text-right text-xs text-gray-500">
            当前合计 <span className={Math.abs(total - indicator.budget) < 1e-9 ? "font-medium text-green-600" : "font-medium text-orange-500"}>{round(total)} 万</span>
          </p>
        </div>

        {/* 底部：右下角 取消/保存（只读模式仅「关闭」） */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-3">
          {readOnly ? (
            <Button variant="secondary" size="sm" onClick={onClose}>
              关闭
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                取消
              </Button>
              <Button size="sm" onClick={handleSave}>
                保存
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 数值四舍五入（去浮点尾数，用于展示）
function round(v: number, d = 4): number {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}
