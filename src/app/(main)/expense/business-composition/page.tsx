"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Card } from "@/components/ui/Card";
import { BizFillModal } from "@/components/expense-analysis/BizFillModal";
import { useApp } from "@/lib/store/AppContext";
import {
  EXPENSE_INDICATORS, indicatorDataOf, DEPT_STATS, type ExpenseIndicator,
} from "@/lib/mock-data/expense-indicators";
import { bizRowsOf, sumBizRows, isBizFilingEnabled, setBizFilingEnabled } from "@/lib/mock-data/biz-composition";
import { MONTH_LABELS } from "@/lib/mock-data/expense-overview";

const th = "text-left px-4 py-3";
const ALL_DEPT = "全部部门";

// 业务构成：按登录账号部门/角色展示本部门预算指标（部门管理员仅本部门；管理员可筛选查看/填报任意部门），
// 支持填报弹窗（业务项 × 12 个月计划）与一键导出 .xlsx
export default function BusinessCompositionPage() {
  const { state } = useApp();
  const toast = useToast();
  const user = state.user;
  const isDeptAdmin = !!user?.dept; // 部门管理员仅能查看/填报本部门

  const [deptFilter, setDeptFilter] = useState(ALL_DEPT); // 管理员的部门筛选
  const [filingEnabled, setFilingEnabled] = useState(isBizFilingEnabled); // 填报功能开关（仅超管可切换）
  const [filling, setFilling] = useState<ExpenseIndicator | null>(null);
  const [viewing, setViewing] = useState<ExpenseIndicator | null>(null);

  // 填报权限：开关全局控制（关闭后部门管理员与超级管理员操作列均仅「查看」）
  const canFill = filingEnabled;

  // 列表数据：部门管理员=本部门；管理员=筛选部门或全部
  const list = useMemo(() => {
    if (!user) return [];
    if (isDeptAdmin) return EXPENSE_INDICATORS.filter((i) => i.dept === user.dept);
    return deptFilter === ALL_DEPT ? EXPENSE_INDICATORS : EXPENSE_INDICATORS.filter((i) => i.dept === deptFilter);
  }, [user, isDeptAdmin, deptFilter]);

  // 导出范围名（文件名前缀）
  const scopeName = isDeptAdmin ? (user?.dept ?? "") : deptFilter;

  // 一次性导出当前范围内全部预算指标及各指标的业务项填报内容（.xlsx）
  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const header = [
      "所属部门", "预算指标编码", "预算指标名称", "业务预算批复数(万)", "实际执行（万）", "业务项",
      ...MONTH_LABELS, "12个月合计",
    ];
    const aoa: (string | number)[][] = [header];
    for (const ind of list) {
      const rows = bizRowsOf(ind);
      const executed = indicatorDataOf(ind.id).executed;
      for (const row of rows) {
        aoa.push([
          ind.dept, ind.code, ind.name, ind.budget, executed, row.name,
          ...row.months, sumBizRows([row]),
        ]);
      }
      if (rows.length === 0) aoa.push([ind.dept, ind.code, ind.name, ind.budget, executed, "", ...Array(12).fill(""), 0]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "业务构成");
    XLSX.writeFile(wb, `${scopeName || ALL_DEPT}_预算指标业务构成.xlsx`);
    toast("导出成功", "success");
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* 标题行 + 右上角：部门筛选（管理员）/ 导出 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">业务构成</h1>
          {isDeptAdmin && (
            <p className="mt-0.5 text-sm text-gray-500">
              {user.dept}｜{user.role}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isDeptAdmin && (
            <>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-primary-400 focus:outline-none"
              >
                <option value={ALL_DEPT}>{ALL_DEPT}</option>
                {DEPT_STATS.map((d) => (
                  <option key={d.dept} value={d.dept}>{d.dept}</option>
                ))}
              </select>
              {/* 填报功能开关：控制各部门管理员的填报权限（超管不受限，全局持久化） */}
              <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5">
                <span className="text-sm text-gray-600">填报功能</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={filingEnabled}
                  onClick={() => {
                    const next = !filingEnabled;
                    setFilingEnabled(next);
                    setBizFilingEnabled(next);
                  }}
                  className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    filingEnabled ? "bg-primary-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      filingEnabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className={`text-xs ${filingEnabled ? "text-green-600" : "text-gray-400"}`}>
                  {filingEnabled ? "已开启" : "已关闭"}
                </span>
              </div>
            </>
          )}
          <Button size="sm" onClick={handleExport}>⬇ 导出</Button>
        </div>
      </div>

      {/* 预算指标列表（整页滚动查看全部） */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                {!isDeptAdmin && <th className={th}>所属部门</th>}
                <th className={th}>预算指标编码</th>
                <th className={th}>预算指标名称</th>
                <th className={th}>业务预算批复数(万)</th>
                <th className={th}>实际执行（万）</th>
                <th className={th}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((ind) => (
                <tr key={ind.id} className="hover:bg-gray-50">
                  {!isDeptAdmin && <td className="px-4 py-3 text-gray-500">{ind.dept}</td>}
                  <td className="px-4 py-3 text-gray-500">{ind.code}</td>
                  <td className="px-4 py-3 text-gray-900">{ind.name}</td>
                  <td className="px-4 py-3 text-gray-600">{ind.budget.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{indicatorDataOf(ind.id).executed.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setViewing(ind)}
                        className="text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        查看
                      </button>
                      {canFill && (
                        <button
                          onClick={() => setFilling(ind)}
                          className="text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          填报
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 填报弹窗 / 只读查看弹窗 */}
      {filling && <BizFillModal indicator={filling} onClose={() => setFilling(null)} />}
      {viewing && <BizFillModal indicator={viewing} readOnly onClose={() => setViewing(null)} />}
    </div>
  );
}
