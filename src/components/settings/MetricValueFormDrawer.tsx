"use client";

// 指标值维护 - 新增/编辑表单抽屉（月度值口径）
// 规则：指标固定「工业总产值」只读；数据月份年月选择器单选（每条记录对应一个自然月）；
// 单位随指标配置带出（只读）；相同数据月份判重；保存二次确认并记录操作人/时间
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  FIXED_METRIC, isMetricValueDuplicated, monthLabel, saveMetricValue,
} from "@/lib/mock-data/metric-values";
import type { MetricValueRecord } from "@/types";

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface FormState {
  month: string; // YYYY-MM 数据月份
  value: string; // 输入态，保存时转数值
  source: string;
  remark: string;
}

const EMPTY: FormState = { month: "", value: "", source: "", remark: "" };

function toFormState(r: MetricValueRecord | null): FormState {
  if (!r) return { ...EMPTY };
  return {
    month: r.month,
    value: String(r.value),
    source: r.source ?? "",
    remark: r.remark ?? "",
  };
}

const labelCls = "text-sm font-medium text-gray-700 mb-1";
const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
// 只读展示（灰底）：固定指标名称 / 单位
const readonlyCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50";

export function MetricValueFormDrawer({
  open,
  onClose,
  baseRecord, // null = 新增
  user,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  baseRecord: MetricValueRecord | null;
  user: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false); // 保存二次确认
  const [summary, setSummary] = useState<string[]>([]); // 变更摘要（确认弹窗展示）

  useEffect(() => {
    if (open) {
      setForm(toFormState(baseRecord));
      setErrors({});
      setConfirmOpen(false);
    }
  }, [open, baseRecord]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((errs) => {
      const next = { ...errs };
      delete next[key as string];
      return next;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.month) errs.month = "请选择数据月份";
    const v = form.value.trim();
    if (!v) errs.value = "请输入指标值";
    else if (!Number.isFinite(Number(v))) errs.value = "指标值仅允许输入有效数值";
    if (form.source.length > 100) errs.source = "数据来源不能超过 100 字";
    if (form.remark.length > 200) errs.remark = "备注不能超过 200 字";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // 轻量 diff：编辑时找出被修改的字段中文名（二次确认摘要）
  function diffFields(r: MetricValueRecord): string[] {
    const names: string[] = [];
    if (r.month !== form.month) names.push("数据月份");
    if (String(r.value) !== form.value.trim()) names.push("指标值");
    if ((r.source ?? "") !== form.source.trim()) names.push("数据来源");
    if ((r.remark ?? "") !== form.remark.trim()) names.push("备注");
    return names;
  }

  // 校验 + 月份判重 → 二次确认
  function handleSubmit() {
    if (!validate()) return;
    if (isMetricValueDuplicated({ month: form.month }, baseRecord?.id)) {
      toast(`${monthLabel(form.month)}数据已存在，请编辑原记录。`, "warning");
      return;
    }
    setSummary(baseRecord ? diffFields(baseRecord) : []);
    setConfirmOpen(true);
  }

  function handleSave() {
    const saved = saveMetricValue(
      {
        id: baseRecord?.id,
        month: form.month,
        value: Number(form.value.trim()),
        source: form.source.trim() || undefined,
        remark: form.remark.trim() || undefined,
      },
      { user, now: formatNow() }
    );
    setConfirmOpen(false);
    onClose();
    onSaved();
    toast(baseRecord ? "指标值记录已更新" : `指标值记录已新增（${saved.id}）`, "success");
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={baseRecord ? `编辑指标值（${baseRecord.id}）` : "新增指标值"}
        width={520}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSubmit}>保存</Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* 指标名称（固定指标，只读展示） */}
          <div>
            <label className={labelCls}>指标名称</label>
            <div className={readonlyCls} title="本页固定维护工业总产值指标">
              {FIXED_METRIC.nameCn}
            </div>
          </div>

          {/* 数据月份（年月选择器，单月） */}
          <div>
            <label className={labelCls}>
              数据月份 <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              className={inputCls}
              value={form.month}
              onChange={(e) => set("month", e.target.value)}
            />
            {errors.month && <p className="mt-1 text-xs text-red-500">{errors.month}</p>}
            <p className="mt-1 text-xs text-gray-400">每条记录对应一个自然月，年度由所选月份自动识别</p>
          </div>

          {/* 指标值 + 单位（随指标配置带出，只读） */}
          <div className="grid grid-cols-[1fr_120px] gap-4">
            <div>
              <label className={labelCls}>
                指标值 <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder="如：1,580.00"
                error={errors.value}
              />
            </div>
            <div>
              <label className={labelCls}>单位</label>
              <div className={`${readonlyCls} truncate`} title="单位根据指标配置自动带出，不允许修改">
                {FIXED_METRIC.unit}
              </div>
            </div>
          </div>

          {/* 数据来源 */}
          <div>
            <label className={labelCls}>数据来源</label>
            <input
              maxLength={100}
              className={inputCls}
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="请填写数据来源或提供部门，如：财务部门手工填报"
            />
            <div className="mt-1 flex justify-between">
              {errors.source ? <p className="text-xs text-red-500">{errors.source}</p> : <span />}
              <span className="text-xs text-gray-400">{form.source.length}/100</span>
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className={labelCls}>备注</label>
            <textarea
              rows={3}
              maxLength={200}
              className={`${inputCls} resize-none`}
              value={form.remark}
              onChange={(e) => set("remark", e.target.value)}
              placeholder="请填写补充说明"
            />
            <div className="mt-1 flex justify-between">
              {errors.remark ? <p className="text-xs text-red-500">{errors.remark}</p> : <span />}
              <span className="text-xs text-gray-400">{form.remark.length}/200</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            说明：相同数据月份只能存在一条有效记录，不得重复新增；保存与删除均需二次确认并记录操作人及操作时间。
          </p>
        </div>
      </Drawer>

      {/* 保存二次确认弹窗 */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="确认保存" size="sm">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            {baseRecord ? (
              <>
                确认保存对记录 <span className="font-mono text-xs">{baseRecord.id}</span> 的修改
                {summary.length ? <>（修改了{summary.join("、")}）</> : <>（内容无变化）</>}？
              </>
            ) : (
              <>
                确认新增 {monthLabel(form.month)} 的{FIXED_METRIC.nameCn}指标值？
              </>
            )}
            保存后将记录操作人及操作时间。
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>确认保存</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
