"use client";

import { useState } from "react";
import { ExpenseHeader } from "@/components/expense-overview/ExpenseHeader";
import { ExpenseOverviewCards } from "@/components/expense-overview/ExpenseOverviewCards";
import { MonthlyTrendChart } from "@/components/expense-overview/MonthlyTrendChart";
import { AbnormalSubjectsPanel } from "@/components/expense-overview/AbnormalSubjectsPanel";
import { AiAssistant } from "@/components/energy-overview/AiAssistant";

// 费用总览：标题区（搜索 + 科目筛选）→ 核心指标卡 → 月度执行趋势 → 进度异常科目
// 外层 AiAssistant：右下角悬浮球 + 右侧滑出对话面板（同能耗总览页）
export default function ExpenseOverviewPage() {
  // 费用科目筛选状态（"all" = 全部费用），搜索框与下拉共用
  const [subjectId, setSubjectId] = useState("all");

  return (
    <AiAssistant>
      <div className="space-y-4">
        <ExpenseHeader subjectId={subjectId} onSubjectChange={setSubjectId} />
        <ExpenseOverviewCards subjectId={subjectId} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {/* 月度执行趋势占宽 3/5，进度异常科目占 2/5 */}
          <div className="xl:col-span-3">
            <MonthlyTrendChart subjectId={subjectId} />
          </div>
          <div className="xl:col-span-2">
            <AbnormalSubjectsPanel subjectId={subjectId} />
          </div>
        </div>
      </div>
    </AiAssistant>
  );
}
