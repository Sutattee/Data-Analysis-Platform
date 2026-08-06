"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_CARDS } from "@/lib/constants";
import { demoCases, getDemoDetail } from "@/lib/mock-data/ai-demos";
import { DemoCard } from "@/components/ai-demo/DemoCard";
import { Modal } from "@/components/ui/Modal";

export default function AiDemoPage() {
  const router = useRouter();
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  const demo = demoCases.find((d) => d.id === selectedCase);

  const handleGoToResult = () => {
    if (!demo) return;
    if (demo.resultRoute === "/qa") {
      router.push(`/qa?query=${encodeURIComponent(demo.exampleQuery)}`);
    } else if (demo.resultRoute === "/reports") {
      router.push(`/reports?type=${demo.id === "report-gen" ? "rt1" : ""}`);
    } else {
      router.push(demo.resultRoute);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">AI能力演示</h1>
        <p className="text-sm text-gray-500 mt-1">点击卡片查看AI功能演示案例，体验智能分析能力</p>
      </div>

      {/* 6个卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_CARDS.map((card) => (
          <DemoCard
            key={card.id}
            title={card.title}
            description={card.description}
            icon={card.icon}
            onClick={() => setSelectedCase(card.id)}
          />
        ))}
      </div>

      {/* 案例详情弹窗 */}
      <Modal
        open={!!selectedCase}
        onClose={() => setSelectedCase(null)}
        title={demo ? `${demo.icon} ${demo.title} - 演示案例` : ""}
        size="lg"
      >
        {demo && (
          <div>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">
              {getDemoDetail(demo.category)}
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleGoToResult}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                🚀 查看实际效果
              </button>
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
