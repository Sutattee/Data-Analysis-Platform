"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { rateSeries } from "@/lib/mock-data/expense-indicators";
import {
  controllableRowsUnderSubject, controllableRowsUnderDept, controllableRowOf,
  summarizeControllable, controllableInterpretation, controllableSubjectNameOf, CONTROLLABLE_DEPTS,
} from "@/lib/mock-data/controllable-cost";
import {
  expenseDevRuleOf, worstAbnormalRow, expenseAlertRecordFor,
} from "@/lib/mock-data/expense-alerts";
import { ControllableCatalog, type ControllableCatalogTab } from "@/components/expense-analysis/ControllableCatalog";
import { IndicatorFieldGrid, type IndicatorFieldTone } from "@/components/expense-analysis/IndicatorFieldGrid";
import { MonthlyBarsChart } from "@/components/expense-analysis/MonthlyBarsChart";
import { ExecutionRateLines } from "@/components/expense-analysis/ExecutionRateLines";
import { InterpretationBlock } from "@/components/expense-analysis/InterpretationBlock";
import { DeptIndicatorCards, IndicatorTable } from "@/components/expense-analysis/DeptIndicatorCards";
import { ExpenseStatusBadge } from "@/components/expense-analysis/ExpenseStatusBadge";
import { Card } from "@/components/ui/Card";

const DETAIL_BASE = "/expense/analysis/per-box-cost/indicator";

// 异常状态「查看告警详情」：蓝色文字链接（仅异常时展示）
function AlertDetailButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
      onClick={onClick}
    >
      查看告警详情
    </button>
  );
}

// 费用分析 - 可控费用：全部预算指标中可通过控费措施进一步压降的部分
// （布局与「全部费用」一致：左目录 + 右侧字段/双图/解读/部门分组列表；数值与全部费用同源；
//  tab/科目/部门 同步 URL query，异常状态展示「查看告警详情」入口）
export default function ControllableCostPage() {
  // useSearchParams（tab/subject/dept 初始化）需 Suspense 边界
  return (
    <Suspense fallback={null}>
      <ControllableCostView />
    </Suspense>
  );
}

function ControllableCostView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<ControllableCatalogTab>(
    searchParams.get("tab") === "dept" ? "dept" : "subject"
  );
  const [subject, setSubject] = useState(searchParams.get("subject") || "all");
  const [dept, setDept] = useState<string | null>(searchParams.get("dept"));

  // 状态变更同步 URL（replace 不产生历史记录，返回时 query 仍在）
  function syncUrl(next: { tab?: ControllableCatalogTab; subject?: string; dept?: string | null }) {
    const q = new URLSearchParams();
    const t = next.tab ?? tab;
    const s = next.subject ?? subject;
    const d = next.dept !== undefined ? next.dept : dept;
    q.set("tab", t);
    if (t === "subject" && s !== "all") q.set("subject", s);
    if (t === "dept" && d) q.set("dept", d);
    router.replace(`/expense/analysis/per-box-cost?${q.toString()}`, { scroll: false });
  }

  function handleTabChange(t: ControllableCatalogTab) {
    const nextDept = t === "dept" && dept === null ? CONTROLLABLE_DEPTS[0].dept : dept; // 切到部门 TAB 默认选中第一个部门
    setTab(t);
    if (t === "dept" && dept === null) setDept(nextDept);
    syncUrl({ tab: t, dept: nextDept });
  }

  // 跳转该范围内等级最高异常指标的告警记录详情（from 记录来源页，详情页「返回」回此）
  function jumpToAlert(rows: { id: string; name: string; dept: string }[], from: string) {
    const worst = worstAbnormalRow(rows, (r) => controllableRowOf(r.id).deviation);
    if (!worst) return;
    const rec = expenseAlertRecordFor(worst.name, worst.dept);
    if (!rec) return;
    router.push(`/expense/alert/records/${rec.id}?from=${encodeURIComponent(from)}`);
  }

  // 科目视图（含「全部费用」；subject 为科目树节点 id）
  const subjectName = controllableSubjectNameOf(subject);
  const subjectRows = controllableRowsUnderSubject(subject);
  const summary = summarizeControllable(subjectRows);
  const subjectAbnormal = expenseDevRuleOf(summary.deviation) !== null;
  const subjectFields = [
    { label: "预算批复", value: `¥${summary.budget.toLocaleString()} 万` },
    { label: "实际执行", value: `¥${summary.executed.toLocaleString()} 万` },
    { label: "剩余预算", value: `¥${summary.remaining.toLocaleString()} 万` },
    { label: "资金计划应执行", value: `${summary.planProgress}%` },
    { label: "预算执行率", value: `${summary.rate}%` },
    {
      label: "执行进度偏差",
      value: `${summary.deviation > 0 ? "+" : ""}${summary.deviation} pct`,
      tone: (subjectAbnormal ? "danger" : "default") as IndicatorFieldTone,
    },
    // 状态：告警中心定时检测口径（五级告警标签，正常绿色）
    { label: "状态", value: "", content: <ExpenseStatusBadge deviation={summary.deviation} /> },
  ];

  // 部门视图
  const deptRows = dept !== null ? controllableRowsUnderDept(dept) : [];
  const dd = dept !== null ? summarizeControllable(deptRows) : null;
  const deptDeviation = dd ? Math.round((dd.rate - dd.planProgress) * 10) / 10 : 0;
  const deptAbnormal = dd ? expenseDevRuleOf(deptDeviation) !== null : false;

  return (
    <div className="flex items-start gap-4">
      <ControllableCatalog
        tab={tab}
        onTabChange={handleTabChange}
        subject={subject}
        onSubjectChange={(s) => { setSubject(s); syncUrl({ subject: s }); }}
        dept={dept}
        onDeptChange={(d) => { setDept(d); syncUrl({ dept: d }); }}
      />

      <div className="min-w-0 flex-1 space-y-4">
        {tab === "subject" ? (
          <>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{subjectName}</h1>
            </div>
            <IndicatorFieldGrid
              fields={subjectFields}
              action={subjectAbnormal ? (
                <AlertDetailButton
                  onClick={() =>
                    jumpToAlert(
                      subjectRows,
                      `/expense/analysis/per-box-cost?tab=subject${subject !== "all" ? `&subject=${subject}` : ""}`
                    )
                  }
                />
              ) : undefined}
            />
            <div className="grid gap-4 xl:grid-cols-2">
              <MonthlyBarsChart monthly={summary.monthly} />
              <ExecutionRateLines series={rateSeries(summary.monthly, summary.budget)} />
            </div>
            <InterpretationBlock text={controllableInterpretation(subjectName, subjectRows, summary)} />
            {subject !== "all" && (
              <DeptIndicatorCards
                indicators={subjectRows}
                dataOf={controllableRowOf}
                detailBase={DETAIL_BASE}
                returnTo={`/expense/analysis/per-box-cost?tab=subject&subject=${subject}`}
              />
            )}
          </>
        ) : dd && dept ? (
          <>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{dept}</h1>
            </div>
            <IndicatorFieldGrid
              fields={[
                { label: "预算指标数", value: `${deptRows.length} 个指标` },
                { label: "合计执行率", value: `${dd.rate}%` },
                { label: "资金计划应执行", value: `${dd.planProgress}%` },
                {
                  label: "执行进度偏差",
                  value: `${deptDeviation > 0 ? "+" : ""}${deptDeviation} pct`,
                  tone: (deptAbnormal ? "danger" : "default") as IndicatorFieldTone,
                },
                // 状态：告警中心定时检测口径（五级告警标签，正常绿色）
                { label: "状态", value: "", content: <ExpenseStatusBadge deviation={deptDeviation} /> },
              ]}
              action={deptAbnormal ? (
                <AlertDetailButton
                  onClick={() => jumpToAlert(deptRows, `/expense/analysis/per-box-cost?tab=dept&dept=${encodeURIComponent(dept)}`)}
                />
              ) : undefined}
            />
            <div className="grid gap-4 xl:grid-cols-2">
              <MonthlyBarsChart monthly={dd.monthly} />
              <ExecutionRateLines series={rateSeries(dd.monthly, dd.budget)} />
            </div>
            <InterpretationBlock text={controllableInterpretation(dept, deptRows, dd)} />
            <Card title={`${dept}｜预算指标列表`} padding={false}>
              <IndicatorTable
                indicators={deptRows}
                dataOf={controllableRowOf}
                detailBase={DETAIL_BASE}
                returnTo={`/expense/analysis/per-box-cost?tab=dept&dept=${encodeURIComponent(dept)}`}
              />
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
