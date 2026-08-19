"use client";

// 达标反推设置 - 右侧滑出窗口（指标管理列表操作入口）
// 内容由 AI 生成，支持 AI 重新生成 / 新增 / 内联编辑 / 删除确认；仅支持配置目标值的指标开放
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { metricList } from "@/lib/mock-data/metric-management";
import type { MetricManage } from "@/types";

export function ReverseSettingsDrawer({
  open,
  onClose,
  metric,
  onUpdate, // 保存后回写列表数据
}: {
  open: boolean;
  onClose: () => void;
  metric: MetricManage | null;
  onUpdate: (reverseItems: string[]) => void;
}) {
  const toast = useToast();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState("");
  // 本地编辑态（以打开时的指标配置为初始值）
  const [items, setItems] = useState<string[]>([]);

  // 打开时回填该指标的达标反推内容
  useEffect(() => {
    if (open && metric) {
      setItems(metric.reverseItems ?? []);
      setEditingIdx(null);
      setEditingText("");
      setDeleteIdx(null);
      setShowAdd(false);
      setNewItem("");
    }
  }, [open, metric]);

  function commitUpdate(next: string[]) {
    setItems(next);
    onUpdate(next);
  }

  // AI 生成：重置为指标配置的推荐内容
  function regenItems() {
    const recommend = metricList.find((x) => x.id === metric?.id)?.reverseItems ?? [];
    commitUpdate([...recommend]);
    toast("已按 AI 推荐内容重新生成", "success");
  }
  function commitEdit() {
    if (editingIdx === null) return;
    const v = editingText.trim();
    if (v) {
      commitUpdate(items.map((it, i) => (i === editingIdx ? v : it)));
      toast("已保存", "success");
    }
    setEditingIdx(null);
  }
  function confirmDelete() {
    if (deleteIdx === null) return;
    commitUpdate(items.filter((_, i) => i !== deleteIdx));
    toast("已删除", "success");
    setDeleteIdx(null);
  }
  function addItem() {
    const v = newItem.trim();
    if (!v) {
      toast("请输入反推内容", "warning");
      return;
    }
    commitUpdate([...items, v]);
    setNewItem("");
    setShowAdd(false);
    toast("已新增反推内容", "success");
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={`达标反推设置${metric ? `（${metric.nameCn}）` : ""}`}
        width={480}
        footer={
          <div className="flex justify-end">
            <Button onClick={onClose}>关闭</Button>
          </div>
        }
      >
        {metric && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">
                内容由 AI 生成，仅供参考。
                <span className="ml-2">共 {items.length} 条</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={regenItems}>
                  AI 生成
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
                  + 新增
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">反推内容</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-28">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-10 text-center text-sm text-gray-400">暂无反推内容</td>
                    </tr>
                  ) : (
                    items.map((item, i) => (
                      <tr key={`${item}_${i}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5">
                          {editingIdx === i ? (
                            <input
                              autoFocus
                              maxLength={50}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit();
                                else if (e.key === "Escape") setEditingIdx(null);
                              }}
                              onBlur={commitEdit}
                              className="w-full px-2 py-1 border border-primary-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          ) : (
                            <span className="text-sm text-gray-700">{item}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {editingIdx === i ? (
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
                                onClick={() => setEditingIdx(null)}
                                className="px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingIdx(i);
                                  setEditingText(item);
                                }}
                                className="px-2 py-0.5 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => setDeleteIdx(i)}
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

            {showAdd && (
              <div className="flex gap-2">
                <input
                  autoFocus
                  maxLength={50}
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addItem();
                    else if (e.key === "Escape") {
                      setShowAdd(false);
                      setNewItem("");
                    }
                  }}
                  placeholder="输入反推内容（不超过50字）"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="self-center text-xs text-gray-400 whitespace-nowrap">{newItem.length}/50</span>
                <Button size="sm" onClick={addItem}>保存</Button>
                <Button size="sm" variant="secondary" onClick={() => { setShowAdd(false); setNewItem(""); }}>取消</Button>
              </div>
            )}

            <p className="text-xs leading-relaxed text-gray-400">
              达标反推内容用于「模拟测算 → 达标反推」的反推内容选项；修改后仅本次生效，历史测算记录不受影响。
            </p>
          </div>
        )}
      </Drawer>

      {/* 反推内容删除确认 */}
      <Modal open={deleteIdx !== null} onClose={() => setDeleteIdx(null)} title="确认删除" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">确定删除该反推内容吗？删除后不可恢复。</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteIdx(null)}>取消</Button>
            <Button variant="danger" onClick={confirmDelete}>确定</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
