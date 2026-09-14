"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  ExpenseConditionBuilder,
  isRangeOperator,
  blankDraft,
  type ExpenseConditionDraft,
} from "@/components/alert/ExpenseConditionBuilder";
import { ExpenseDeviationThresholdNote } from "@/components/alert/ExpenseDeviationThresholdNote";
import { useApp } from "@/lib/store/AppContext";
import { ALERT_LEVELS } from "@/lib/mock-data/alerts";
import {
  defaultNotifyTemplate,
  addAlertStrategy,
  updateAlertStrategy,
} from "@/lib/mock-data/alert-strategies";
import {
  EXPENSE_ALERT_METRIC_SUFFIX,
  EXPENSE_ALERT_METRIC_NAMES,
  expenseDeptsOfMetric,
} from "@/lib/mock-data/expense-alerts";
import type { AlertStrategy, AlertCondition, AlertLevel, AlertOperator } from "@/types";

// 表单数据（仅需求文档字段；其余类型必填字段保存时自动补齐）
interface FormData {
  name: string;
  description: string;
  level: AlertLevel;
  conditions: ExpenseConditionDraft[];
  relation: "且" | "或";
}

const EMPTY: FormData = {
  name: "",
  description: "",
  level: "预警",
  conditions: [blankDraft()],
  relation: "且",
};

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 编辑回填：多条同配置条件（同判断方式+数值）聚合为一条（指标合并多选）
function toFormData(s: AlertStrategy): FormData {
  const drafts: ExpenseConditionDraft[] = [];
  for (const c of s.conditions) {
    if (!EXPENSE_ALERT_METRIC_NAMES.has(c.metric) || !c.metric.endsWith(EXPENSE_ALERT_METRIC_SUFFIX)) continue;
    const name = c.metric.slice(0, -EXPENSE_ALERT_METRIC_SUFFIX.length);
    const isRange = isRangeOperator(c.operator) || c.baselineType === "正常区间";
    const [lo = "", hi = ""] = isRange ? c.baselineValue.split("～") : [c.baselineValue, ""];
    const found = drafts.find(
      (d) => d.operator === c.operator && (isRangeOperator(d.operator) ? `${d.valueLo}～${d.valueHi}` === c.baselineValue : d.valueLo === c.baselineValue)
    );
    if (found) {
      if (!found.metrics.includes(name)) found.metrics.push(name); // 同配置条件聚合（指标合并多选）
    } else {
      drafts.push({ metrics: [name], operator: c.operator, valueLo: lo, valueHi: hi });
    }
  }
  return {
    name: s.name,
    description: s.description ?? "",
    level: s.level,
    conditions: drafts.length > 0 ? drafts : [blankDraft()],
    relation: s.relation,
  };
}

const labelCls = "block text-sm font-medium text-gray-700 mb-1";
const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

// 功能提示气泡（hover 显示）
function Tip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group/tip ml-1 align-middle text-gray-400 hover:text-primary-500 cursor-help">
      <span className="text-xs leading-none">❓</span>
      <span className="absolute left-4 top-1/2 -translate-y-1/2 hidden group-hover/tip:block z-30 w-max max-w-[280px] px-3 py-2 rounded-md bg-gray-800 text-white text-xs leading-relaxed shadow-lg">
        {text}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-800" />
      </span>
    </span>
  );
}

// 新建/编辑数据告警（费用预算执行板块，按需求文档精简字段：
// 告警名称 / 策略说明 / 告警等级 / 触发条件 / 检测周期；操作 = 取消、保存）
export function ExpenseAlertStrategyForm({
  mode,
  initial,
  listPath = "/expense/alert/management",
}: {
  mode: "new" | "edit";
  initial?: AlertStrategy;
  listPath?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { state } = useApp();
  const isAdmin = state.user?.role === "管理员";

  const [data, setData] = useState<FormData>(initial ? toFormData(initial) : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [condErrors, setCondErrors] = useState<string[]>([]);

  function set<K extends keyof FormData>(key: K, v: FormData[K]) {
    setData((prev) => ({ ...prev, [key]: v }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const ce: string[] = [];
    if (!data.name.trim()) e.name = "请输入告警名称";
    data.conditions.forEach((c, i) => {
      const miss: string[] = [];
      if (c.metrics.length === 0) miss.push("数据指标");
      const isNum = (v: string) => v.trim() !== "" && !isNaN(Number(v));
      if (!isNum(c.valueLo)) miss.push(isRangeOperator(c.operator) ? "下限值" : "数值");
      if (isRangeOperator(c.operator) && !isNum(c.valueHi)) miss.push("上限值");
      if (miss.length === 0 && isRangeOperator(c.operator) && Number(c.valueLo) >= Number(c.valueHi)) {
        ce[i] = "区间下限需小于上限（如 15-20）";
        return;
      }
      ce[i] = miss.length ? `请完善${miss.join("、")}` : "";
    });
    const hasCondError = ce.some((x) => x);
    setErrors(e);
    setCondErrors(ce);
    if (Object.keys(e).length || hasCondError) toast("请完善表单必填项", "warning");
    return Object.keys(e).length === 0 && !hasCondError;
  }

  function buildStrategy(): AlertStrategy {
    // 多选指标展开为多条条件（同判断方式/数值），关系沿用表单所选 且/或
    const conditions: AlertCondition[] = data.conditions.flatMap((d) =>
      d.metrics.map((name) => ({
        metric: name + EXPENSE_ALERT_METRIC_SUFFIX,
        operator: d.operator as AlertOperator,
        baselineType: isRangeOperator(d.operator) ? ("正常区间" as const) : ("基准值" as const),
        baselineValue: isRangeOperator(d.operator) ? `${d.valueLo}～${d.valueHi}` : d.valueLo,
      }))
    );
    // 告警对象 = 所选指标关联部门并集（自动带入）
    const objects = Array.from(new Set(conditions.flatMap((c) => expenseDeptsOfMetric(c.metric))));
    return {
      id: initial?.id ?? `AS-${Date.now().toString(36).toUpperCase()}`,
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      type: "当前异常",
      domain: "费用预算执行",
      scope: "指定对象",
      objects,
      conditions,
      relation: data.relation,
      level: data.level,
      detectCycle: "每月",
      notifyTemplate: defaultNotifyTemplate(),
      notifyMethods: ["邮件"],
      receivers: ["张伟", "李强"],
      repeatAlert: false,
      enabled: initial?.enabled ?? false, // 新建默认停用
      updatedAt: formatNow(),
    };
  }

  function handleSave() {
    if (!validate()) return;
    const s = buildStrategy();
    if (mode === "new") {
      addAlertStrategy(s);
      toast("新建成功", "success");
    } else {
      updateAlertStrategy(s);
      toast("保存成功", "success");
    }
    router.push(listPath);
  }

  // 非管理员不应进入此页（外壳页也会拦截），此处兜底
  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <span className="text-4xl mb-3">🔒</span>
        <p className="text-sm text-gray-500">暂无权限，仅管理员可{mode === "new" ? "新建" : "编辑"}数据告警</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* 中部滚动表单 */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
          {/* 告警名称 */}
          <Input label="告警名称" required placeholder="请输入" value={data.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />

          {/* 告警等级 */}
          <div>
            <label className={labelCls}>告警等级 <span className="text-red-500">*</span></label>
            <select className={selectCls} value={data.level} onChange={(e) => set("level", e.target.value as AlertLevel)}>
              {ALERT_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">配置触发后生成的等级。</p>
          </div>

          {/* 策略说明 */}
          <div className="md:col-span-2">
            <label className={labelCls}>策略说明</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              placeholder="请输入"
              value={data.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* 触发条件 */}
          <div className="md:col-span-2">
            <label className={labelCls}>触发条件 <span className="text-red-500">*</span></label>
            <ExpenseConditionBuilder
              conditions={data.conditions}
              relation={data.relation}
              errors={condErrors}
              onChange={(conditions, relation) => setData((prev) => ({ ...prev, conditions, relation }))}
            />
            <div className="mt-3">
              <ExpenseDeviationThresholdNote />
            </div>
          </div>

          {/* 检测周期（费用口径仅「每月」） */}
          <div>
            <label className={labelCls}>
              检测周期 <span className="text-red-500">*</span>
              <Tip text="即配置告警策略的执行频率；启用后持续监测，若后续检测数据恢复正常则不再触发告警，并自动将对应数据的异常状态更新为“正常”。" />
            </label>
            <select className={selectCls} value="每月" onChange={() => { /* 仅「每月」一个选项 */ }}>
              <option value="每月">每月</option>
            </select>
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="flex justify-center items-center gap-3 pt-4 mt-4 border-t border-gray-100 flex-shrink-0">
        <Button variant="secondary" onClick={() => router.push(listPath)}>取消</Button>
        <Button onClick={handleSave}>保存</Button>
      </div>
    </div>
  );
}
