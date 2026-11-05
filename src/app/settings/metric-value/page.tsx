"use client";

// 指标值管理：顶部三页签（目标值 | 指标值 | 管控值）切换
// - 目标值：选择支持配置的指标 → 当前生效目标 + 历史版本列表 + 新增目标值（原「目标值管理」页迁入）
// - 指标值：固定维护「工业总产值」的月度值（无法通过业务系统自动获取、需人工填报），
//   月份筛选 + 记录列表 + 新增/编辑抽屉 + 查看/删除弹窗
// - 管控值：三类管控值统一维护（过程管控指标 / 缺陷部位缺陷率 / 缺陷指标）
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { MetricValueFormDrawer } from "@/components/settings/MetricValueFormDrawer";
import { TargetManagement } from "@/components/settings/TargetManagement";
import { ControlManagement } from "@/components/settings/ControlManagement";
import { metricList } from "@/lib/mock-data/metric-management";
import { SUPPORTED_TARGET_METRICS } from "@/lib/mock-data/metric-targets";
import {
  FIXED_METRIC,
  listMetricValues,
  monthLabel,
  removeMetricValue,
} from "@/lib/mock-data/metric-values";
import type { MetricManage, MetricValueRecord } from "@/types";

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

// 顶部页签：目标值 | 指标值 | 管控值
const TABS = [
  { key: "target", label: "目标值" },
  { key: "value", label: "指标值" },
  { key: "control", label: "管控值" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function MetricValuePage() {
  const toast = useToast();
  const { state } = useApp();

  const [tab, setTab] = useState<TabKey>("target");

  // 目标值页签：仅支持配置目标值的指标可选；默认「全部指标」聚合视图
  const targetMetrics = useMemo(
    () =>
      SUPPORTED_TARGET_METRICS
        .map((id) => metricList.find((m) => m.id === id))
        .filter((m): m is MetricManage => !!m),
    []
  );
  const [targetMetricId, setTargetMetricId] = useState("");
  const targetMetric = targetMetricId
    ? targetMetrics.find((m) => m.id === targetMetricId) ?? null
    : null;

  const [rows, setRows] = useState<MetricValueRecord[]>(() => listMetricValues());

  // 筛选条件（数据月份，精确匹配；仅指标值页签使用）
  const [fMonth, setFMonth] = useState("");

  // 交互态
  const [loading, setLoading] = useState(true);
  const [formBase, setFormBase] = useState<{ base: MetricValueRecord | null } | null>(null);
  const [viewTarget, setViewTarget] = useState<MetricValueRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MetricValueRecord | null>(null);

  // 切换页签 / 筛选条件变更时模拟加载
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [tab, fMonth]);

  // 过滤：数据月份（记录月份精确匹配所选月份）
  const filtered = useMemo(
    () => rows.filter((r) => !fMonth || r.month === fMonth),
    [rows, fMonth]
  );

  function reload() {
    setRows(listMetricValues());
  }

  function handleReset() {
    setFMonth("");
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    removeMetricValue(deleteTarget.id);
    setDeleteTarget(null);
    reload();
    toast("记录已删除，不再参与指标计算和数据分析", "success");
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">指标值管理</h1>
      </div>

      {/* 页签：目标值 | 指标值 | 管控值 */}
      <div className="flex gap-1.5" role="tablist" aria-label="维护类型">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-700"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 目标值：指标筛选（全部指标/单指标）+ 历史版本列表 + 新增目标值 */}
      {tab === "target" && targetMetrics.length > 0 && (
        <Card padding>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">指标</span>
            <select
              value={targetMetricId}
              onChange={(e) => setTargetMetricId(e.target.value)}
              className={selectCls}
            >
              <option value="">全部指标</option>
              {targetMetrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameCn}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4">
            {/* key 随筛选变化重挂载：切换指标时版本列表同步刷新 */}
            <TargetManagement key={targetMetricId} metric={targetMetric} metrics={targetMetrics} />
          </div>
        </Card>
      )}

      {/* 指标值：月份筛选 + 记录列表 + 新增按钮 */}
      {tab === "value" && (
        <>
          <Card padding>
            <div className="flex flex-wrap items-center gap-2">
              {/* 数据月份筛选：精确匹配该月记录 */}
              <input
                type="month"
                className={selectCls}
                value={fMonth}
                onChange={(e) => setFMonth(e.target.value)}
                title="筛选数据月份为该月份的记录"
              />
              {fMonth && <span className="text-xs text-gray-400">数据月份：{monthLabel(fMonth)}</span>}
              <Button variant="secondary" onClick={handleReset}>
                重置
              </Button>
              <Button className="ml-auto" onClick={() => setFormBase({ base: null })}>
                + 新增
              </Button>
            </div>
          </Card>

          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className={th}>指标名称</th>
                    <th className={th}>数据月份</th>
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
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{monthLabel(r.month)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {fmtValue(r.value, FIXED_METRIC.decimals)}
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
                共 {filtered.length} 条
              </div>
            )}
          </Card>
        </>
      )}

      {/* 管控值：三类管控值统一维护（筛选 + 新增 + 列表启停/编辑/变更记录） */}
      {tab === "control" && <ControlManagement user={state.user?.nickname || state.user?.username || "当前用户"} />}

      {/* 新增/编辑表单抽屉（指标值页签） */}
      <MetricValueFormDrawer
        open={formBase !== null}
        onClose={() => setFormBase(null)}
        baseRecord={formBase?.base ?? null}
        user={state.user?.nickname || state.user?.username || "当前用户"}
        onSaved={reload}
      />

      {/* 记录详情查看弹窗（指标值页签） */}
      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title={`指标值详情（${viewTarget?.id ?? ""}）`}
      >
        {viewTarget && (
          <div className="space-y-2.5">
            <Field label="指标名称" value={viewTarget.metricName} />
            <Field label="数据月份" value={monthLabel(viewTarget.month)} />
            <Field
              label="指标值"
              value={`${fmtValue(viewTarget.value, FIXED_METRIC.decimals)} ${viewTarget.unit}`}
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

      {/* 删除二次确认弹窗（指标值页签） */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除指标值记录"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            确认删除「{deleteTarget?.metricName}（{deleteTarget ? monthLabel(deleteTarget.month) : ""}）」？
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
