import { QualityOverviewCards } from "@/components/quality/QualityOverviewCards";
import { DefectModule } from "@/components/quality/DefectModule";
import { ProcessControlModule } from "@/components/quality/ProcessControlModule";
import { AiAssistant } from "@/components/energy-overview/AiAssistant";
import { QUALITY_AI_QUESTIONS, QUALITY_INSIGHT_COMMAND } from "@/lib/mock-data/quality";

// 工艺质量总览（全宽布局，整页压缩至一屏不滚动）：标题 → 5 指标卡一行 → 缺陷四图并列 → 过程管控全宽表格；
// 右下角 AI 助手（推荐问题由本页数据生成；面板顶部「智能解读」一键生成仪表盘三方面解读）
export default function QualityOverviewPage() {
  return (
    <AiAssistant
      questions={QUALITY_AI_QUESTIONS}
      inputPlaceholder="问一句本页数据"
      welcomeText="您好，我是工艺质量智能分析助手。可以问我本页的缺陷分布、过程管控指标情况，我来帮你快速定位问题。"
      insightCommand={QUALITY_INSIGHT_COMMAND}
    >
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-gray-900">质量总览</h1>

        <QualityOverviewCards />

        <DefectModule />

        <ProcessControlModule />
      </div>
    </AiAssistant>
  );
}
