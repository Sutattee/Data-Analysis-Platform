"use client";

export type IndicatorFieldTone = "default" | "danger" | "success";

export interface IndicatorField {
  label: string;
  value: string;
  tone?: IndicatorFieldTone; // 偏差/状态等字段可带色
  content?: React.ReactNode; // 自定义内容（如状态标签节点），存在时替代 value 文本展示
}

// 字段面板：label 上、value 下（grid 自适应 2/3/6 列，字段间距统一）；
// action 作为末位字段「操作」（灰色 label + 内容，如「查看告警详情」链接）紧跟「状态」右侧、上下对齐
export function IndicatorFieldGrid({ fields, action }: { fields: IndicatorField[]; action?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:grid-cols-3 xl:grid-cols-6">
      {fields.map((f) => (
        <div key={f.label}>
          <p className="text-xs text-gray-400">{f.label}</p>
          {f.content ? (
            <div className="mt-1.5">{f.content}</div>
          ) : (
            <p
              className={`mt-1.5 truncate text-lg font-bold ${
                f.tone === "danger" ? "text-red-600" : f.tone === "success" ? "text-emerald-600" : "text-gray-800"
              }`}
              title={f.value}
            >
              {f.value}
            </p>
          )}
        </div>
      ))}
      {action && (
        <div>
          <p className="text-xs text-gray-400">操作</p>
          <div className="mt-1.5">{action}</div>
        </div>
      )}
    </div>
  );
}
