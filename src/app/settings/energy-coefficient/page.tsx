"use client";

// 折标系数管理：统一维护能源折标准煤系数 / 能源碳排放因子及其历史版本
// 筛选（能源类型 / 系数类型 / 状态 / 生效日期）+ 系数列表 + 新增/编辑抽屉 + 查看/停用弹窗
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { CoefficientFormDrawer } from "@/components/settings/CoefficientFormDrawer";
import {
  COEFF_TYPES,
  ENERGY_TYPES,
  disableCoefficient,
  formatExpression,
  listCoefficients,
} from "@/lib/mock-data/energy-coefficients";
import type { CoeffStatus, CoefficientVersion } from "@/types";

// 状态三态映射：待生效=warning / 生效中=success / 已失效=default
function StatusBadge({ status }: { status: CoeffStatus }) {
  const variant =
    status === "待生效" ? "warning" : status === "生效中" ? "success" : ("default" as const);
  return <Badge variant={variant}>{status}</Badge>;
}

// 只读字段（查看弹窗用）
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 flex-shrink-0 pt-0.5 text-xs text-gray-400">{label}</span>
      <span className="flex-1 break-words text-sm text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

export default function EnergyCoefficientPage() {
  const toast = useToast();
  const { state } = useApp();
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";

  const [rows, setRows] = useState<CoefficientVersion[]>(() => listCoefficients());

  // 筛选条件
  const [fEnergy, setFEnergy] = useState("all");
  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fDate, setFDate] = useState("");

  // 交互态
  const [loading, setLoading] = useState(true);
  const [formBase, setFormBase] = useState<{ base: CoefficientVersion | null } | null>(null);
  const [viewTarget, setViewTarget] = useState<CoefficientVersion | null>(null);
  const [disableTarget_, setDisableTarget_] = useState<CoefficientVersion | null>(null);
  const [disableReason, setDisableReason] = useState("");

  // 筛选条件变更时模拟加载
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [fEnergy, fType, fStatus, fDate]);

  // 过滤：能源类型 / 系数类型 / 状态 / 生效日期（该日期落于生效周期内）
  const filtered = useMemo(() => {
    return rows.filter((c) => {
      if (fEnergy !== "all" && c.energyType !== fEnergy) return false;
      if (fType !== "all" && c.coeffType !== fType) return false;
      if (fStatus !== "all" && c.status !== fStatus) return false;
      if (fDate && !(c.effectiveStart <= fDate && c.effectiveEnd >= fDate)) return false;
      return true;
    });
  }, [rows, fEnergy, fType, fStatus, fDate]);

  function reload() {
    setRows(listCoefficients());
  }

  function handleReset() {
    setFEnergy("all");
    setFType("all");
    setFStatus("all");
    setFDate("");
  }

  function openDisable(c: CoefficientVersion) {
    setDisableTarget_(c);
    setDisableReason("");
  }

  function confirmDisable() {
    if (!disableTarget_) return;
    const reason = disableReason.trim();
    if (!reason) {
      toast("请填写停用原因", "warning");
      return;
    }
    if (reason.length > 200) {
      toast("停用原因不能超过 200 字", "warning");
      return;
    }
    disableCoefficient(disableTarget_.id, { user: currentUser, now: formatNow(), reason });
    setDisableTarget_(null);
    reload();
    toast("已停用（不生成新版本，恢复需新增版本）", "success");
  }

  const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">折标系数管理</h1>
      </div>

      {/* 筛选区 + 新增按钮 */}
      <Card padding>
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectCls} value={fEnergy} onChange={(e) => setFEnergy(e.target.value)}>
            <option value="all">能源类型：全部</option>
            {ENERGY_TYPES.map((t) => (
              <option key={t} value={t}>
                能源类型：{t}
              </option>
            ))}
          </select>
          <select className={selectCls} value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="all">系数类型：全部</option>
            {COEFF_TYPES.map((t) => (
              <option key={t} value={t}>
                系数类型：{t}
              </option>
            ))}
          </select>
          <select className={selectCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="all">状态：全部</option>
            <option value="待生效">状态：待生效</option>
            <option value="生效中">状态：生效中</option>
            <option value="已失效">状态：已失效</option>
          </select>
          <input
            type="date"
            className={selectCls}
            value={fDate}
            onChange={(e) => setFDate(e.target.value)}
            title="筛选该日期处于生效周期内的版本"
          />
          {fDate && (
            <span className="text-xs text-gray-400">生效日期 {fDate} 处于生效周期内</span>
          )}
          <Button variant="secondary" onClick={handleReset}>
            重置
          </Button>
          <Button className="ml-auto" onClick={() => setFormBase({ base: null })}>
            + 新增系数
          </Button>
        </div>
      </Card>

      {/* 系数列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>能源类型</th>
                <th className={th}>系数类型</th>
                <th className={th}>能源来源</th>
                <th className={th}>换算关系</th>
                <th className={th}>生效周期</th>
                <th className={th}>状态</th>
                <th className={th}>版本号</th>
                <th className={th}>创建时间</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-sm text-gray-400">
                    加载中…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-sm text-gray-400">
                    暂无符合条件的系数
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.energyType}</td>
                    <td className="px-4 py-3 text-gray-600">{c.coeffType}</td>
                    <td className="px-4 py-3 text-gray-600">{c.energySource}</td>
                    <td className="px-4 py-3 text-gray-800">{formatExpression(c)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {c.effectiveStart} 至 {c.effectiveEnd}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.version}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {c.createdAt}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setViewTarget(c)}
                          className="rounded px-1.5 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => setFormBase({ base: c })}
                          className="rounded px-1.5 py-0.5 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                          title="编辑将基于该版本生成新版本，原记录保留"
                        >
                          编辑
                        </button>
                        {(c.status === "待生效" || c.status === "生效中") && (
                          <button
                            onClick={() => openDisable(c)}
                            className="rounded px-1.5 py-0.5 text-xs text-red-500 transition-colors hover:bg-red-50"
                          >
                            停用
                          </button>
                        )}
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
            共 {filtered.length} 条；历史版本永久保留，编辑将生成新版本；能耗 / 碳排放计算按统计日期自动匹配当时生效的系数
          </div>
        )}
      </Card>

      {/* 新增/编辑表单抽屉 */}
      <CoefficientFormDrawer
        open={formBase !== null}
        onClose={() => setFormBase(null)}
        baseVersion={formBase?.base ?? null}
        onSaved={reload}
      />

      {/* 版本详情查看弹窗 */}
      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title={`系数详情（${viewTarget?.version ?? ""}）`}
      >
        {viewTarget && (
          <div className="space-y-2.5">
            <Field label="能源类型" value={viewTarget.energyType} />
            <Field label="系数类型" value={viewTarget.coeffType} />
            <Field label="能源来源" value={viewTarget.energySource} />
            <Field label="换算关系" value={formatExpression(viewTarget)} />
            <Field label="生效周期" value={`${viewTarget.effectiveStart} 至 ${viewTarget.effectiveEnd}`} />
            <Field label="状态" value={<StatusBadge status={viewTarget.status} />} />
            <Field label="版本号" value={viewTarget.version} />
            <Field label="创建信息" value={`${viewTarget.createdAt}（${viewTarget.createdBy}）`} />
            <Field label="来源依据" value={viewTarget.basis} />
            {viewTarget.remark && <Field label="备注" value={viewTarget.remark} />}
            {viewTarget.changeNote && <Field label="变更说明" value={viewTarget.changeNote} />}
            {viewTarget.replacedAt && <Field label="被替代时间" value={viewTarget.replacedAt} />}
            {viewTarget.disabledAt && (
              <Field
                label="停用记录"
                value={`${viewTarget.disabledAt}（${viewTarget.disabledBy}）：${viewTarget.disableReason}`}
              />
            )}
          </div>
        )}
      </Modal>

      {/* 停用确认弹窗：记录停用原因，不生成新版本 */}
      <Modal
        open={disableTarget_ !== null}
        onClose={() => setDisableTarget_(null)}
        title={`停用系数（${disableTarget_?.version ?? ""}）`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            停用后该版本立即置为「已失效」，不生成新版本；如需恢复，请新增版本。能耗 / 碳排放计算将不再匹配该版本。
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              停用原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              maxLength={200}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
              placeholder="请填写停用原因（不超过 200 字）"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{disableReason.length}/200</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setDisableTarget_(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={confirmDisable}>
              确认停用
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
