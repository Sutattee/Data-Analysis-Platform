"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { AlertLevelBadge, AlertStatusText } from "@/components/alert/alertBadges";
import { ColumnFilter } from "@/components/alert/ColumnFilter";
import { useApp } from "@/lib/store/AppContext";
import { useToast } from "@/components/ui/Toast";
import { ALERT_RECORDS, orgPathOf, EMPTY_ORG_FILTER, type OrgFilter } from "@/lib/mock-data/alerts";
import { OrgCascaderFilter } from "@/components/alert/OrgCascaderFilter";
import {
  getAlertStrategies,
  removeAlertStrategy,
  updateAlertStrategy,
  formatConditions,
} from "@/lib/mock-data/alert-strategies";
import type { AlertStrategy } from "@/types";

interface StratFilter {
  keyword: string;
  type: string;
  domain: string;
  enabled: string;
}
const EMPTY_FILTER: StratFilter = { keyword: "", type: "", domain: "", enabled: "" };

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

// 启用前校验配置完整性
function validateStrategy(s: AlertStrategy): { ok: boolean; msg: string } {
  if (!s.name.trim()) return { ok: false, msg: "告警名称缺失" };
  if (s.conditions.length === 0) return { ok: false, msg: "触发条件缺失" };
  for (const c of s.conditions) {
    if (!c.metric.trim() || !c.baselineValue.trim()) return { ok: false, msg: "触发条件不完整" };
  }
  if (s.scope === "指定对象" && s.objects.length === 0) return { ok: false, msg: "指定对象未选择" };
  if (s.receivers.length === 0) return { ok: false, msg: "接收人未配置" };
  if (s.notifyMethods.length === 0) return { ok: false, msg: "通知方式未配置" };
  return { ok: true, msg: "" };
}

type Phase = "loading" | "success" | "error";
type ConfirmModal = { kind: "delete" | "disable"; id: string } | null;

export function AlertStrategiesList() {
  const router = useRouter();
  const { state } = useApp();
  const toast = useToast();
  const isAdmin = state.user?.role === "管理员";

  // 仅展示能耗管理方向的告警策略
  const [strategies, setStrategies] = useState<AlertStrategy[]>(() =>
    getAlertStrategies().filter((s) => s.domain === "能耗管理" && s.type === "当前异常")
  );
  const [filter, setFilter] = useState<StratFilter>(EMPTY_FILTER);
  const [applied, setApplied] = useState<StratFilter>(EMPTY_FILTER);
  const [orgFilter, setOrgFilter] = useState<OrgFilter>(EMPTY_ORG_FILTER);
  const [phase, setPhase] = useState<Phase>("loading");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirm, setConfirm] = useState<ConfirmModal>(null);
  const [viewTarget, setViewTarget] = useState<AlertStrategy | null>(null);
  const [recordsTarget, setRecordsTarget] = useState<AlertStrategy | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runLoad() {
    setPhase("loading");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPhase("success"), 500);
  }
  useEffect(() => {
    runLoad();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const sorted = useMemo(() => {
    // 组织层级筛选：全厂/车间/网格/设备
    const { workshop, grid, equipment } = orgFilter;
    function matchStrategyOrg(s: AlertStrategy): boolean {
      if (!workshop && !grid && !equipment) return true;
      if (s.scope === "全部适用对象") return true; // 适用全部对象，始终命中
      // 指定对象：任一对象名命中即保留
      return s.objects.some((name) => {
        const p = orgPathOf(name);
        if (equipment) {
          const ep = orgPathOf(equipment);
          return !!ep.grid && p.grid === ep.grid && (!workshop || p.workshop === workshop);
        }
        if (grid) return p.grid === grid && (!workshop || p.workshop === workshop);
        if (workshop) return p.workshop === workshop;
        return true;
      });
    }
    const filtered = strategies.filter(
      (s) =>
        (!applied.keyword.trim() || s.name.toLowerCase().includes(applied.keyword.trim().toLowerCase())) &&
        (!applied.domain || s.domain === applied.domain) &&
        (!applied.enabled || (applied.enabled === "启用" ? s.enabled : !s.enabled)) &&
        matchStrategyOrg(s)
    );
    return [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [strategies, applied, orgFilter]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilter =
    (Object.keys(applied) as (keyof StratFilter)[]).some((k) => applied[k].trim() !== "") ||
    orgFilter.workshop !== "" || orgFilter.grid !== "" || orgFilter.equipment !== "";

  function handleSearch() {
    setApplied((prev) => ({ ...prev, keyword: filter.keyword, domain: filter.domain }));
    setPage(1);
    runLoad();
  }
  function handleReset() {
    setFilter(EMPTY_FILTER);
    setApplied(EMPTY_FILTER);
    setOrgFilter(EMPTY_ORG_FILTER);
    setPage(1);
    runLoad();
  }
  // 表头筛选：即时应用
  function applyColumnFilter(key: "enabled", v: string) {
    setApplied((prev) => ({ ...prev, [key]: v }));
    setPage(1);
  }

  // 启用（先校验）
  function handleEnable(s: AlertStrategy) {
    const v = validateStrategy(s);
    if (!v.ok) {
      toast(`启用失败：${v.msg}，请编辑补全`, "warning");
      return;
    }
    updateAlertStrategy({ ...s, enabled: true });
    setStrategies((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: true } : x)));
    toast("已启用", "success");
  }
  // 停用（二次确认在 modal）
  function handleConfirm() {
    if (!confirm) return;
    if (confirm.kind === "delete") {
      removeAlertStrategy(confirm.id);
      setStrategies((prev) => prev.filter((x) => x.id !== confirm.id));
      toast("已删除", "success");
    } else {
      updateAlertStrategyById(confirm.id, { enabled: false });
      toast("已停用，历史告警不受影响", "success");
    }
    setConfirm(null);
  }
  function updateAlertStrategyById(id: string, patch: Partial<AlertStrategy>) {
    updateAlertStrategy({ ...(strategies.find((x) => x.id === id) as AlertStrategy), ...patch });
    setStrategies((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  // 指标去重展示
  const metricsOf = (s: AlertStrategy) => Array.from(new Set(s.conditions.map((c) => c.metric))).join("、");
  // 该策略关联的告警记录（按领域+类型模拟关联）
  const recordsOf = (s: AlertStrategy) =>
    ALERT_RECORDS.filter((r) => r.domain === s.domain && r.type === s.type).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* 搜索 + 筛选 */}
      <Card padding>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="搜索告警名称"
            className="w-[280px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
          {isAdmin && (
            <Button className="ml-auto" onClick={() => router.push("/alert/management/new")}>+ 新建数据告警</Button>
          )}
        </div>
        <div className="mt-3">
          <OrgCascaderFilter value={orgFilter} onChange={setOrgFilter} />
        </div>
      </Card>

      {/* 列表 */}
      <Card padding={false}>
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-24">
            <Spinner />
            <p className="text-sm text-gray-400 mt-3">加载中…</p>
          </div>
        )}
        {phase === "error" && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-4xl mb-3">⚠️</span>
            <p className="text-sm text-gray-500">加载失败，请稍后重试</p>
            <Button variant="secondary" className="mt-3" onClick={runLoad}>重新加载</Button>
          </div>
        )}
        {phase === "success" && total === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-4xl mb-3">{hasFilter ? "🔍" : "📭"}</span>
            <p className="text-sm text-gray-500">{hasFilter ? "无筛选结果" : "暂无告警策略"}</p>
            {hasFilter && <Button variant="secondary" className="mt-3" onClick={handleReset}>重置筛选</Button>}
          </div>
        )}
        {phase === "success" && total > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                  <th className="text-left px-4 py-3">告警名称</th>
                  <th className="text-left px-4 py-3">数据指标</th>
                  <th className="text-left px-4 py-3">触发条件</th>
                  <th className="text-left px-4 py-3">
                    <span className="inline-flex items-center gap-0.5">
                      启用状态
                      <ColumnFilter options={["启用", "停用"]} value={applied.enabled} onChange={(v) => applyColumnFilter("enabled", v)} />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3">更新时间</th>
                  <th className="text-right px-4 py-3 sticky right-0 bg-gray-50 z-10">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{metricsOf(s)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[220px]">
                      <div className="truncate" title={formatConditions(s)}>{formatConditions(s)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={s.enabled ? "text-green-600 font-medium" : "text-gray-400"}>
                        {s.enabled ? "启用" : "停用"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.updatedAt}</td>
                    <td className="px-4 py-3 sticky right-0 bg-white z-10">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setViewTarget(s)}>查看</Button>
                        <Button variant="ghost" size="sm" onClick={() => setRecordsTarget(s)}>告警记录</Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/alert/management/${s.id}/edit`)}>编辑</Button>
                            {s.enabled ? (
                              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700" onClick={() => setConfirm({ kind: "disable", id: s.id })}>停用</Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => handleEnable(s)}>启用</Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setConfirm({ kind: "delete", id: s.id })}>删除</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {phase === "success" && total > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              total={total}
              page={safePage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
            />
          </div>
        )}
      </Card>

      {/* 删除 / 停用 二次确认 */}
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === "delete" ? "删除数据告警" : "停用数据告警"}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {confirm?.kind === "delete"
            ? "是否确认删除此告警？"
            : "停用后不再生成新告警，历史告警不受影响。"}
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setConfirm(null)}>取消</Button>
          <Button variant={confirm?.kind === "delete" ? "danger" : "primary"} onClick={handleConfirm}>
            {confirm?.kind === "delete" ? "确定" : "确认停用"}
          </Button>
        </div>
      </Modal>

      {/* 查看（只读详情） */}
      <Drawer open={viewTarget !== null} onClose={() => setViewTarget(null)} title="告警策略详情" width={560}>
        {viewTarget && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <AlertLevelBadge level={viewTarget.level} />
              <span className={viewTarget.enabled ? "text-green-600 font-medium" : "text-gray-400"}>
                {viewTarget.enabled ? "启用" : "停用"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{viewTarget.name}</h2>
            {viewTarget.description && <p className="text-gray-500">{viewTarget.description}</p>}
            <DetailRow label="业务域" value={viewTarget.domain} />
            <DetailRow label="适用范围" value={`${viewTarget.scope}${viewTarget.scope === "指定对象" ? `（${viewTarget.objects.join("、")}）` : ""}`} />
            <DetailRow label="检测周期" value={viewTarget.detectCycle} />
            <DetailRow label="条件关系" value={viewTarget.conditions.length > 1 ? `满足${viewTarget.relation === "且" ? "全部" : "任一"}条件（${viewTarget.relation}）` : "—"} />
            <div>
              <div className="text-xs text-gray-400 mb-1">触发条件</div>
              <div className="text-gray-800 space-y-1">
                {viewTarget.conditions.map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded px-3 py-2">
                    {formatConditions({ conditions: [c], relation: viewTarget.relation })}
                  </div>
                ))}
              </div>
            </div>
            <DetailRow label="接收人" value={viewTarget.receivers.join("、")} />
            <DetailRow label="通知方式" value={viewTarget.notifyMethods.join("、")} />
            <DetailRow label="重复提醒" value={viewTarget.repeatAlert ? `开启，最多 ${viewTarget.repeatCount} 次，间隔 ${viewTarget.repeatInterval} 分钟` : "关闭"} />
            <DetailRow label="更新时间" value={viewTarget.updatedAt} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setViewTarget(null)}>关闭</Button>
              {isAdmin && (
                <Button onClick={() => { const t = viewTarget; setViewTarget(null); router.push(`/alert/management/${t.id}/edit`); }}>编辑</Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* 告警记录（该策略关联的历史记录） */}
      <Drawer open={recordsTarget !== null} onClose={() => setRecordsTarget(null)} title="告警记录" width={620}>
        {recordsTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">策略「{recordsTarget.name}」关联的告警记录（按领域与类型匹配）：</p>
            {recordsOf(recordsTarget).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-3xl mb-2">📭</span>
                <p className="text-sm">该策略暂无告警记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recordsOf(recordsTarget).map((r) => (
                  <div key={r.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <AlertLevelBadge level={r.level} />
                        <span className="text-sm font-medium text-gray-800">{r.title}</span>
                      </div>
                      <AlertStatusText status={r.status} />
                    </div>
                    <div className="text-xs text-gray-400">{r.id} · {r.objectName} · {r.triggerTime}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-20 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value}</span>
    </div>
  );
}
