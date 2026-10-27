"use client";

// 管控值管理（指标值管理 · 管控值页签）：统一维护三类管控值
// 顶部筛选（指标分类 / 指标名称 / 启停状态）+「新增」主按钮；列表支持直接启停、编辑、变更记录；
// 默认按最近更新时间倒序，分页展示
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { ControlFormDrawer } from "@/components/settings/ControlFormDrawer";
import { ControlHistoryDrawer } from "@/components/settings/ControlHistoryDrawer";
import {
  CATEGORY_LABEL,
  controlMetricOf,
  controlText,
  listControlConfigs,
  toggleControlEnabled,
} from "@/lib/mock-data/metric-controls";
import type { ControlCategory, MetricControlConfig } from "@/types";

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

const PAGE_SIZE = 10;

export function ControlManagement({ user }: { user: string }) {
  const toast = useToast();
  const [tick, setTick] = useState(0); // store 变更后刷新列表
  const [fCategory, setFCategory] = useState<ControlCategory | "">("");
  const [fName, setFName] = useState("");
  const [fEnabled, setFEnabled] = useState<"" | "1" | "0">("");
  const [page, setPage] = useState(1);
  const [formBase, setFormBase] = useState<MetricControlConfig | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<MetricControlConfig | null>(null);

  const list = useMemo(
    () =>
      listControlConfigs({
        category: fCategory,
        nameKw: fName,
        enabled: fEnabled === "" ? undefined : fEnabled === "1",
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fCategory, fName, fEnabled, tick]
  );

  // 页码校正（筛选结果变少时回落到最后一页）
  const total = list.length;
  const safePage = Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const paged = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function applyFilter(reset: () => void) {
    reset();
    setPage(1);
  }

  // 列表内直接启停：切换后立即生效并留痕
  function handleToggle(c: MetricControlConfig, enabled: boolean) {
    toggleControlEnabled(c.id, enabled, { user, now: formatNow() });
    setTick((t) => t + 1);
    toast(
      enabled
        ? `「${c.metricName}」管控值已启用，后续管控判断使用当前配置`
        : `「${c.metricName}」管控值已停用，相关页面将展示「管控值未启用」`,
      enabled ? "success" : "warning"
    );
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <>
      {/* 筛选区 + 新增按钮 */}
      <Card padding>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={selectCls}
            value={fCategory}
            onChange={(e) => applyFilter(() => setFCategory(e.target.value as ControlCategory | ""))}
            title="按指标分类筛选"
          >
            <option value="">全部分类</option>
            {(Object.keys(CATEGORY_LABEL) as ControlCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          <input
            className={`${selectCls} w-48`}
            value={fName}
            onChange={(e) => applyFilter(() => setFName(e.target.value))}
            placeholder="指标名称关键词"
            title="按指标名称关键词筛选"
          />
          <select
            className={selectCls}
            value={fEnabled}
            onChange={(e) => applyFilter(() => setFEnabled(e.target.value as "" | "1" | "0"))}
            title="按启停状态筛选"
          >
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">停用</option>
          </select>
          <Button
            className="ml-auto"
            onClick={() => {
              setFormBase(null);
              setFormOpen(true);
            }}
          >
            + 新增
          </Button>
        </div>
      </Card>

      {/* 管控值列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>指标分类</th>
                <th className={th}>指标名称</th>
                <th className={th}>管控条件</th>
                <th className={th}>单位</th>
                <th className={th}>启停状态</th>
                <th className={th}>最近更新时间</th>
                <th className={th}>更新人</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                    当前筛选条件下暂无管控值配置
                  </td>
                </tr>
              ) : (
                paged.map((c) => {
                  const def = controlMetricOf(c.metricId);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{CATEGORY_LABEL[c.category]}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{c.metricName}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {controlText({ ...c, decimals: def?.decimals ?? 2, unit: c.unit })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{c.unit}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggle(c, !c.enabled)}
                          className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            c.enabled ? "bg-primary-600" : "bg-gray-300"
                          }`}
                          title={c.enabled ? "点击停用" : "点击启用"}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              c.enabled ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        <span className={`ml-2 text-xs ${c.enabled ? "text-green-600" : "text-gray-400"}`}>
                          {c.enabled ? "启用" : "停用"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{c.updatedAt}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{c.updatedBy}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => {
                              setFormBase(c);
                              setFormOpen(true);
                            }}
                            className="rounded px-1.5 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => setHistoryTarget(c)}
                            className="rounded px-1.5 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                          >
                            变更记录
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 px-4 py-3">
          <Pagination total={total} page={safePage} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </Card>

      {/* 新增 / 编辑表单抽屉 */}
      <ControlFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        baseConfig={formBase}
        user={user}
        onSaved={() => setTick((t) => t + 1)}
      />

      {/* 变更记录抽屉 */}
      <ControlHistoryDrawer config={historyTarget} open={historyTarget !== null} onClose={() => setHistoryTarget(null)} />
    </>
  );
}
