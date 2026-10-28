"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { AlertLevelBadge } from "@/components/alert/alertBadges";
import { ColumnFilter } from "@/components/alert/ColumnFilter";
import { useApp } from "@/lib/store/AppContext";
import { useToast } from "@/components/ui/Toast";
import { ALERT_RECORDS, orgPathOf, EMPTY_ORG_FILTER, type OrgFilter } from "@/lib/mock-data/alerts";
import { EXPENSE_ALERT_METRIC_NAMES, EXPENSE_ALERT_METRIC_SUFFIX, expenseSubjectOfMetric } from "@/lib/mock-data/expense-alerts";
import { TYPE_DISPLAY, QUALITY_MACHINES, qualityCycleUnitOf } from "@/lib/mock-data/quality-alerts";
import { DEPT_STATS } from "@/lib/mock-data/expense-indicators";
import { EXPENSE_NODES } from "@/lib/mock-data/expense-overview";
import { OrgCascaderFilter } from "@/components/alert/OrgCascaderFilter";
import { SearchSelect } from "@/components/forecast/SearchSelect";
import {
  getAlertStrategies,
  getAlertStrategy,
  removeAlertStrategy,
  updateAlertStrategy,
  formatConditions,
} from "@/lib/mock-data/alert-strategies";
import type { AlertStrategy } from "@/types";

interface StratFilter {
  keyword: string;
  type: string;
  enabled: string;
  dept: string;      // 费用口径：部门筛选（"" = 全部部门）
  subjectId: string; // 费用口径：费用科目筛选（"all" = 全部费用）
  machine: string;   // 质量口径：机台筛选（"" = 全部机台）
}
const EMPTY_FILTER: StratFilter = { keyword: "", type: "", enabled: "", dept: "", subjectId: "all", machine: "" };

// 费用科目下拉选项：全角空格缩进表层级（同费用总览 ExpenseHeader）
const SUBJECT_OPTIONS = EXPENSE_NODES.map((n) => ({
  value: n.id,
  label: `${"　".repeat(n.depth)}${n.name}`,
}));

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

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

// metrics：指标白名单。传入 → 仅展示监测白名单指标的策略（生产管理/费用预算执行告警中心）；
// 不传 → 展示全部并排除费用预算执行策略（能源告警中心维持原有口径，且排除质量 QAS 前缀）
// basePath：新建/编辑路由前缀（费用预算执行传 /expense/alert/management；缺省按 metrics 二分保持兼容）
// variant="expense"：费用口径列结构（含所属部门、无告警等级列）与 部门+费用科目 筛选区
// variant="quality"：工艺质量口径（QAS 前缀策略；实测异常+预测风险均展示，告警类型单列；机台筛选）
export function AlertStrategiesList({
  metrics,
  basePath,
  variant = "default",
}: {
  metrics?: string[];
  basePath?: string;
  variant?: "default" | "expense" | "quality";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useApp();
  const toast = useToast();
  const isAdmin = state.user?.role === "管理员";
  const isExpense = variant === "expense";
  const isQuality = variant === "quality";
  // 新建/编辑路由按板块区分：生产管理走 /production/alert/management
  const mgmtPath = basePath ?? (metrics ? "/production/alert/management" : "/alert/management");

  // 质量口径：QAS 前缀策略（实测异常 + 预测风险均展示）；
  // 其余默认展示「当前异常」类型的告警策略（能源口径排除费用与质量前缀）
  const [strategies, setStrategies] = useState<AlertStrategy[]>(() =>
    isQuality
      ? getAlertStrategies().filter((s) => s.id.startsWith("QAS"))
      : getAlertStrategies().filter(
          (s) =>
            s.type === "当前异常" &&
            !s.id.startsWith("QAS") &&
            (metrics
              ? s.conditions.some((c) => metrics.includes(c.metric))
              : !s.conditions.some((c) => EXPENSE_ALERT_METRIC_NAMES.has(c.metric)))
        )
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

  // 深链 ?view=<id>（告警记录详情页「告警策略名称」跳转）：自动打开该策略只读详情抽屉
  const deepLinkId = searchParams.get("view");
  useEffect(() => {
    if (!deepLinkId) return;
    const target = getAlertStrategy(deepLinkId);
    if (target) setViewTarget(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId]);

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
    // 组织层级筛选：全厂/车间/网格/设备（仅能源口径）
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
    // 费用口径：部门命中（关联部门全集）+ 费用科目命中（任一条件指标的科目子树）
    function matchExpenseFilters(s: AlertStrategy): boolean {
      if (applied.dept && !s.objects.includes(applied.dept)) return false;
      if (applied.subjectId !== "all") {
        const node = EXPENSE_NODES.find((n) => n.id === applied.subjectId);
        if (node) {
          const hit = s.conditions.some((c) => {
            const sp = expenseSubjectOfMetric(c.metric);
            return sp === node.path || sp.startsWith(node.path + "\\");
          });
          if (!hit) return false;
        }
      }
      return true;
    }
    // 关键字：告警名称；费用口径扩展匹配 所属部门/费用科目/指标名称
    const k = applied.keyword.trim().toLowerCase();
    function matchKeyword(s: AlertStrategy): boolean {
      if (!k) return true;
      if (s.name.toLowerCase().includes(k)) return true;
      if (!isExpense) return false;
      if (s.objects.some((o) => o.toLowerCase().includes(k))) return true;
      return s.conditions.some((c) => {
        const sp = expenseSubjectOfMetric(c.metric);
        return c.metric.toLowerCase().includes(k) || sp.toLowerCase().includes(k);
      });
    }
    // 质量口径：机台命中（策略告警对象含选中机台即保留）
    function matchQualityFilters(s: AlertStrategy): boolean {
      return !applied.machine || s.objects.includes(applied.machine);
    }
    const filtered = strategies.filter(
      (s) =>
        matchKeyword(s) &&
        (!applied.enabled || (applied.enabled === "启用" ? s.enabled : !s.enabled)) &&
        // 质量口径：告警类型表头筛选（实测异常/预测风险，存储枚举经展示文案映射比较）
        (!isQuality || !applied.type || TYPE_DISPLAY[s.type] === applied.type) &&
        (isExpense ? matchExpenseFilters(s) : isQuality ? matchQualityFilters(s) : matchStrategyOrg(s))
    );
    return [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [strategies, applied, orgFilter, isExpense, isQuality]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilter =
    (Object.keys(applied) as (keyof StratFilter)[]).some((k) => applied[k].trim() !== "" && applied[k] !== "all") ||
    orgFilter.workshop !== "" || orgFilter.grid !== "" || orgFilter.equipment !== "";

  function handleSearch() {
    setApplied((prev) => ({
      ...prev,
      keyword: filter.keyword,
      dept: filter.dept,
      subjectId: filter.subjectId,
      machine: filter.machine,
    }));
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
  function applyColumnFilter(key: "enabled" | "type", v: string) {
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

  // 指标去重展示（费用口径去掉「-执行进度偏差」后缀，展示指标名如「日常招待费」）
  const metricsOf = (s: AlertStrategy) =>
    Array.from(
      new Set(
        s.conditions.map((c) =>
          isExpense && c.metric.endsWith(EXPENSE_ALERT_METRIC_SUFFIX)
            ? c.metric.slice(0, -EXPENSE_ALERT_METRIC_SUFFIX.length)
            : c.metric
        )
      )
    ).join("、");
  // 该策略关联的告警记录：质量口径在 ZL 前缀记录中优先按策略名快照精确匹配，无命中回退指标匹配；
  // 其余按策略指标名精确匹配，无命中再回退领域+类型
  const recordsOf = (s: AlertStrategy) => {
    if (isQuality) {
      const zl = ALERT_RECORDS.filter((r) => r.id.startsWith("ZL"));
      const byName = zl.filter((r) => r.strategyName === s.name);
      if (byName.length > 0) return byName.slice(0, 6);
      const metricSet = new Set(s.conditions.map((c) => c.metric));
      return zl.filter((r) => metricSet.has(r.metricName)).slice(0, 6);
    }
    const metricSet = new Set(s.conditions.map((c) => c.metric));
    const byMetric = ALERT_RECORDS.filter((r) => metricSet.has(r.metricName) && r.type === s.type);
    const recs =
      byMetric.length > 0 ? byMetric : ALERT_RECORDS.filter((r) => r.domain === s.domain && r.type === s.type);
    return recs.slice(0, 6);
  };

  return (
    <div className="space-y-4">
      {/* 搜索 + 筛选 */}
      <Card padding>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder={isExpense ? "搜索告警名称、部门名称、费用名称、指标名称" : "搜索告警名称"}
            className="w-[480px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          {/* 质量口径：机台筛选紧随搜索框（查询/重置之前），与搜索同排 */}
          {isQuality && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">机台</span>
              <select
                className={selectCls}
                value={filter.machine}
                onChange={(e) => setFilter({ ...filter, machine: e.target.value })}
              >
                <option value="">全部机台</option>
                {QUALITY_MACHINES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
          <Button onClick={handleSearch}>查询</Button>
          <Button variant="secondary" onClick={handleReset}>重置</Button>
          {isAdmin && (
            <Button className="ml-auto" onClick={() => router.push(`${mgmtPath}/new`)}>+ 新建数据告警</Button>
          )}
        </div>
        {!isQuality && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {isExpense ? (
              /* 费用口径：部门 + 费用科目（同费用总览）组合筛选 */
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">部门</span>
                  <select
                    className={selectCls}
                    value={filter.dept}
                    onChange={(e) => setFilter({ ...filter, dept: e.target.value })}
                  >
                    <option value="">全部部门</option>
                    {DEPT_STATS.map((d) => (
                      <option key={d.dept} value={d.dept}>{d.dept}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">费用科目</span>
                  <div className="w-52">
                    <SearchSelect
                      options={SUBJECT_OPTIONS}
                      value={filter.subjectId}
                      onChange={(id) => setFilter({ ...filter, subjectId: id })}
                      placeholder="全部费用"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* 组织级联筛选仅能源域适用（辅料为全厂级指标） */
              !metrics && <OrgCascaderFilter value={orgFilter} onChange={setOrgFilter} />
            )}
          </div>
        )}
      </Card>

      {/* 区块小标题（费用口径） */}
      {isExpense && <div className="text-sm font-medium text-gray-700">告警列表</div>}

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
                  {/* 费用口径在数据指标后展示所属部门（该指标关联部门全集） */}
                  {isExpense && <th className="text-left px-4 py-3">所属部门</th>}
                  {/* 质量口径在数据指标后展示告警类型（实测异常/预测风险），支持表头筛选 */}
                  {isQuality && (
                    <th className="text-left px-4 py-3">
                      <span className="inline-flex items-center gap-0.5">
                        告警类型
                        <ColumnFilter options={["实测异常", "预测风险"]} value={applied.type} onChange={(v) => applyColumnFilter("type", v)} />
                      </span>
                    </th>
                  )}
                  <th className="text-left px-4 py-3">触发条件</th>
                  <th className="text-left px-4 py-3">告警等级</th>
                  {/* 质量口径：接收人 */}
                  {isQuality && <th className="text-left px-4 py-3">接收人</th>}
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
                    <td className="px-4 py-3 text-gray-800 max-w-[240px]">
                      <div className="truncate" title={s.name}>{s.name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{metricsOf(s)}</td>
                    {isExpense && (
                      <td className="px-4 py-3 text-gray-600 max-w-[240px]">
                        <div className="truncate" title={s.objects.join("、")}>{s.objects.join("、")}</div>
                      </td>
                    )}
                    {isQuality && (
                      <td className="px-4 py-3 text-gray-600">{TYPE_DISPLAY[s.type]}</td>
                    )}
                    <td className="px-4 py-3 text-gray-600 max-w-[220px]">
                      <div className="truncate" title={formatConditions(s)}>{formatConditions(s)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <AlertLevelBadge level={s.level} />
                    </td>
                    {/* 质量口径：接收人（超长截断） */}
                    {isQuality && (
                      <td className="px-4 py-3 text-gray-600 max-w-[160px]">
                        <div className="truncate" title={s.receivers.join("、")}>{s.receivers.join("、")}</div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={s.enabled ? "text-green-600 font-medium" : "text-gray-400"}>
                        {s.enabled ? "启用" : "停用"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.updatedAt}</td>
                    <td className="px-4 py-3 sticky right-0 bg-white z-10">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setViewTarget(s)}>查看</Button>
                        <Button variant="ghost" size="sm" onClick={() => setRecordsTarget(s)}>告警记录</Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`${mgmtPath}/${s.id}/edit`)}>编辑</Button>
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
            {/* 质量口径：告警类型（实测异常/预测风险展示文案） */}
            {isQuality && <DetailRow label="告警类型" value={TYPE_DISPLAY[viewTarget.type]} />}
            {/* 费用口径标签为「所属部门」（值同为该指标关联部门全集） */}
            <DetailRow
              label={isExpense ? "所属部门" : "告警对象"}
              value={`${viewTarget.objects.join("、") || "全部适用对象"}`}
            />
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
            {/* 质量口径：连续同向偏离（未配置不展示；单位随指标周期，如 3批次） */}
            {isQuality && viewTarget.conditions[0]?.consecutiveShifts != null && (
              <DetailRow
                label="连续同向偏离"
                value={`${viewTarget.conditions[0].consecutiveShifts}${qualityCycleUnitOf(viewTarget.conditions[0].metric)}`}
              />
            )}
            {/* 通知配置：接收人 / 通知方式（质量口径 = 企业微信）/ 重复提醒 */}
            <DetailRow label="接收人" value={viewTarget.receivers.join("、")} />
            <DetailRow label="通知方式" value={viewTarget.notifyMethods.join("、")} />
            <DetailRow label="重复提醒" value={viewTarget.repeatAlert ? `开启，最多 ${viewTarget.repeatCount} 次，间隔 ${viewTarget.repeatInterval} 分钟` : "关闭"} />
            {/* 质量口径：创建与编辑信息（创建人/创建时间/编辑人；未被编辑过显示 —） */}
            {isQuality && <DetailRow label="创建人" value={viewTarget.creator ?? "—"} />}
            {isQuality && <DetailRow label="创建时间" value={viewTarget.createdAt ?? "—"} />}
            {isQuality && <DetailRow label="编辑人" value={viewTarget.editedBy ?? "—"} />}
            <DetailRow label="更新时间" value={viewTarget.updatedAt} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setViewTarget(null)}>关闭</Button>
              {isAdmin && (
                <Button onClick={() => { const t = viewTarget; setViewTarget(null); router.push(`${mgmtPath}/${t.id}/edit`); }}>编辑</Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* 告警记录（该策略关联的历史记录） */}
      <Drawer open={recordsTarget !== null} onClose={() => setRecordsTarget(null)} title="告警记录" width={620}>
        {recordsTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">策略「{recordsTarget.name}」关联的告警记录（按{isQuality ? "策略与指标" : "领域与类型"}匹配）：</p>
            {recordsOf(recordsTarget).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-3xl mb-2">📭</span>
                <p className="text-sm">该策略暂无告警记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recordsOf(recordsTarget).map((r) => (
                  <div key={r.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertLevelBadge level={r.level} />
                      <span className="text-sm font-medium text-gray-800">{r.title}</span>
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
