"use client";

interface ReportPreviewProps {
  content: string;
  onBack: () => void;
}

export function ReportPreview({ content, onBack }: ReportPreviewProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          ← 返回模板选择
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  );
}
