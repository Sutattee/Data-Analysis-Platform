"use client";

// 指标值维护：维护无法通过业务系统自动获取、需人工填报的指标数据（如企业工业总产值）
// 筛选（指标搜索 / 统计周期）+ 记录列表 + 新增/编辑抽屉 + 查看/删除弹窗
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { MetricValueFormDrawer } from "@/components/settings/MetricValueFormDrawer";
import {
  MAINTAINABLE_METRICS,
  listMetricValues,
  monthLabel,
  periodLabel,
  removeMetricValue,
} from "@/lib/mock-data/metric-values";
import type { MetricValueRecord } from "@/types";

// 只读字段（查看弹窗用）
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 flex-shrink-0 pt-0.5 text-xs text-gray-400">{label}</span>
      <span className="flex-1 break-words text-sm text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

// 指标值格式：千分位 + 指标小数位
function fmtValue(v: number, decimals: number): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function MetricValuePage() {
  const toast = useToast();
  const { state } = useApp();

  const [rows, setRows] = useState<MetricValueRecord[]>(() => listMetricValues());

  // 筛选条件
  const [fKeyword, setFKeyword] = useState("");
  const [fMonth, setFMonth] = useState("");

  // 交互态
  const [loading, setLoading] = useState(true);
  const [formBase, setFormBase] = useState<{ base: MetricValueRecord | null } | null>(null);
  const [viewTarget, setViewTarget] = useState<MetricValueRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MetricValueRecord | null>(null);

  // 筛选条件变更时模拟加载
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [fKeyword, fMonth]);

  // 过滤：指标关键词（名称/编码模糊匹配）/ 统计周期（记录周期覆盖所选月份）
  const filtered = useMemo(() => {
    const kw = fKeyword.trim().toLowerCase();
    return rows.filter((r) => {
      if (kw) {
        const code = (MAINTAINABLE_METRICS.find((m) => m.id === r.metricId)?.code ?? "").toLowerCase();
        if (!r.metricName.toLowerCase().includes(kw) && !code.includes(kw)) return false;
      }
      if (fMonth && !(r.periodStart <= fMonth && r.periodEnd >= fMonth)) return false;
      return true;
    });
  }, [rows, fKeyword, fMonth]);

  function reload() {
    setRows(listMetricValues());
  }

  function handleReset() {
    setFKeyword("");
    setFMonth("");
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    removeMetricValue(deleteTarget.id);
    setDeleteTarget(null);
    reload();
    toast("记录已删除，不再参与指标计算和数据分析", "success");
  }

  // 指标小数位（列表指标值格式化用）
  const decimalsOf = (metricId: string) =>
    MAINTAINABLE_METRICS.find((m) => m.id === metricId)?.decimals ?? 2;

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">指标值维护</h1>
      </div>

      {/* 筛选区 + 新增按钮 */}
      <Card padding>
        <div className="flex flex-wrap items-center gap-2">
          {/* 指标搜索框：按指标名称/编码模糊匹配 */}
          <input
            type="text"
            className={`${selectCls} w-56`}
            value={fKeyword}
            onChange={(e) => setFKeyword(e.target.value)}
            placeholder="搜索指标"
          />
          <input
            type="month"
            className={selectCls}
            value={fMonth}
            onChange={(e) => setFMonth(e.target.value)}
            title="筛选统计周期覆盖该月份的记录"
          />
          {fMonth && <span className="text-xs text-gray-400">{monthLabel(fMonth)}处于统计周期内</span>}
          <Button variant="secondary" onClick={handleReset}>
            重置
          </Button>
          <Button className="ml-auto" onClick={() => setFormBase({ base: null })}>
            + 新增
          </Button>
        </div>
      </Card>

      {/* 指标值列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>指标名称</th>
                <th className={th}>统计周期</th>
                <th className={th}>指标值</th>
                <th className={th}>单位</th>
                <th className={th}>数据来源</th>
                <th className={th}>更新时间</th>
                <th className={th}>更新人</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                    加载中…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                    暂无符合条件的指标值记录
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.metricName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{periodLabel(r)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {fmtValue(r.value, decimalsOf(r.metricId))}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.unit}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-gray-600" title={r.source}>
                      {r.source ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {r.updatedAt ?? r.createdAt}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {r.updatedBy ?? r.createdBy}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setViewTarget(r)}
                          className="rounded px-1.5 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => setFormBase({ base: r })}
                          className="rounded px-1.5 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="rounded px-1.5 py-0.5 text-xs text-red-500 transition-colors hover:bg-red-50"
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
        {!loading && (
          <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">
            共 {filtered.length} 条；相同指标和统计周期不得重复；删除后的记录不再参与指标计算和数据分析
          </div>
        )}
      </Card>

      {/* 新增/编辑表单抽屉 */}
      <MetricValueFormDrawer
        open={formBase !== null}
        onClose={() => setFormBase(null)}
        baseRecord={formBase?.base ?? null}
        user={state.user?.nickname || state.user?.username || "当前用户"}
        onSaved={reload}
      />

      {/* 记录详情查看弹窗 */}
      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title={`指标值详情（${viewTarget?.id ?? ""}）`}
      >
        {viewTarget && (
          <div className="space-y-2.5">
            <Field label="指标名称" value={viewTarget.metricName} />
            <Field label="统计周期" value={periodLabel(viewTarget)} />
            <Field
              label="指标值"
              value={`${fmtValue(viewTarget.value, decimalsOf(viewTarget.metricId))} ${viewTarget.unit}`}
            />
            <Field label="数据来源" value={viewTarget.source} />
            {viewTarget.remark && <Field label="备注" value={viewTarget.remark} />}
            <Field
              label="创建信息"
              value={`${viewTarget.createdAt}（${viewTarget.createdBy}）`}
            />
            <Field
              label="更新信息"
              value={viewTarget.updatedAt ? `${viewTarget.updatedAt}（${viewTarget.updatedBy}）` : undefined}
            />
          </div>
        )}
      </Modal>

      {/* 删除二次确认弹窗 */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除指标值记录"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            确认删除「{deleteTarget?.metricName}（{deleteTarget ? periodLabel(deleteTarget) : ""}，{deleteTarget?.dataType}）」？
            删除后的记录不再参与指标计算和数据分析，且不可恢复。
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              确认删除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
