"use client";

import { useParams, useRouter } from "next/navigation";
import { conversationRecords, formatDuration, STATUS_STYLE } from "@/lib/mock-data/conversation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ConversationLogPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rec = conversationRecords.find((r) => r.id === params.id);

  if (!rec) {
    return (
      <Card>
        <div className="py-16 text-center">
          <p className="text-sm text-gray-500 mb-4">未找到该对话记录，可能已被删除</p>
          <button
            onClick={() => router.push("/settings/conversation")}
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            返回对话管理
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部：返回 + 标题 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/settings/conversation")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
        >
          <span>←</span>
          <span>返回对话管理</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900">详细日志</h1>
      </div>

      <Card>
        <div className="space-y-5">
          {/* 会话标题 + 状态 */}
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-gray-800">{rec.title}</h2>
            <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_STYLE[rec.status]}`}>{rec.status}</span>
          </div>

          {/* 元信息 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div><span className="text-gray-400">用户：</span>{rec.user}</div>
            <div><span className="text-gray-400">数据模型：</span>{rec.dataModel}</div>
            <div><span className="text-gray-400">问题类型：</span>{rec.questionType}</div>
            <div><span className="text-gray-400">耗时：</span>{formatDuration(rec.durationSec)}</div>
            <div><span className="text-gray-400">用户评价：</span>{rec.feedback}</div>
            <div><span className="text-gray-400">开始时间：</span>{rec.startTime}</div>
          </div>

          {/* 输入 */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">输入</div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{rec.log.input}</div>
          </div>

          {/* 推理步骤 */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">推理步骤</div>
            <ol className="space-y-1.5 list-decimal list-inside text-sm text-gray-600">
              {rec.log.reasoning.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>

          {/* 异常信息 / 输出 */}
          {rec.log.error ? (
            <div>
              <div className="text-xs font-medium text-red-500 mb-1">异常信息</div>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">{rec.log.error}</div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">输出</div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{rec.log.output}</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
