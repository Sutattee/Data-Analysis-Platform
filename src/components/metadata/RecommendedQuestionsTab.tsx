"use client";

import { useState } from "react";
import { MetadataTable } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface RecommendedQuestion {
  id: string;
  question: string;
}

// 基于表结构 AI 生成推荐问题
function generateQuestions(table: MetadataTable): RecommendedQuestion[] {
  const name = table.chineseName || table.name;
  const fields = table.fields;
  const numericFields = fields.filter((f) => /int|decimal|bigint/i.test(f.dataType));
  const timeFields = fields.filter((f) => /date|time/i.test(f.dataType));
  const dimensionFields = fields.filter((f) => /varchar|text/i.test(f.dataType));

  const qs: string[] = [];
  qs.push(`查询${name}的详细记录`);
  qs.push(`各维度下${name}的汇总统计`);

  if (dimensionFields.length > 0) {
    qs.push(`按${dimensionFields[0].name}分组统计${name}`);
  }
  if (numericFields.length > 0) {
    qs.push(`${numericFields[0].name}的分布与对比分析`);
    if (numericFields.length > 1) {
      qs.push(`${numericFields[0].name}与${numericFields[1].name}的交叉分析`);
    }
  }
  if (timeFields.length > 0) {
    qs.push(`${name}按时间趋势变化`);
    qs.push(`${name}环比/同比分析`);
  }
  qs.push(`${name} TOP 10 排名`);
  if (numericFields.length > 0) {
    qs.push(`${name}异常值检测`);
  }

  return qs.slice(0, 8).map((q, i) => ({ id: `${table.id}_rq_${i}`, question: q }));
}

export function RecommendedQuestionsTab({ table }: { table: MetadataTable }) {
  const toast = useToast();
  const [questions, setQuestions] = useState<RecommendedQuestion[]>(() => generateQuestions(table));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RecommendedQuestion | null>(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");

  function startEdit(q: RecommendedQuestion) {
    setEditingId(q.id);
    setEditingText(q.question);
  }
  function commitEdit() {
    if (!editingId) return;
    const v = editingText.trim();
    if (v) {
      setQuestions((prev) => prev.map((q) => (q.id === editingId ? { ...q, question: v } : q)));
      toast("已保存", "success");
    }
    setEditingId(null);
  }
  function cancelEdit() {
    setEditingId(null);
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    setQuestions((prev) => prev.filter((q) => q.id !== deleteTarget.id));
    toast("已删除", "success");
    setDeleteTarget(null);
  }
  function addQuestion() {
    const v = newQuestion.trim();
    if (!v) {
      toast("请输入问题", "warning");
      return;
    }
    setQuestions((prev) => [...prev, { id: `${table.id}_manual_${Date.now().toString(36)}`, question: v }]);
    setNewQuestion("");
    setShowAddInput(false);
    toast("已新增推荐问题", "success");
  }

  const th = "text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      {/* 提示 */}
      <div className="text-xs text-gray-400 flex items-center gap-1.5">
        <span>问题由 AI 生成，仅供参考。</span>
        <span className="ml-auto">共 {questions.length} 条</span>
      </div>

      {/* 列表 */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className={th}>问题</th>
              <th className={`${th} text-right w-32`}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {questions.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-12 text-center text-sm text-gray-400">暂无推荐问题</td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    {editingId === q.id ? (
                      <input
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          else if (e.key === "Escape") cancelEdit();
                        }}
                        onBlur={commitEdit}
                        className="w-full px-2 py-1 border border-primary-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <span className="text-sm text-gray-700">{q.question}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {editingId === q.id ? (
                      <div className="inline-flex gap-1">
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={commitEdit}
                          className="px-2 py-0.5 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={cancelEdit}
                          className="px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => startEdit(q)}
                          className="px-2 py-0.5 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => setDeleteTarget(q)}
                          className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新增 */}
      {showAddInput ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addQuestion();
              else if (e.key === "Escape") { setShowAddInput(false); setNewQuestion(""); }
            }}
            placeholder="输入推荐问题"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button size="sm" onClick={addQuestion}>保存</Button>
          <Button size="sm" variant="secondary" onClick={() => { setShowAddInput(false); setNewQuestion(""); }}>取消</Button>
        </div>
      ) : (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setShowAddInput(true)}>+ 新增</Button>
        </div>
      )}

      {/* 删除确认 */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="确认删除" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">确定删除该推荐问题吗？</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" onClick={confirmDelete}>确定</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
