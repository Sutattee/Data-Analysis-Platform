"use client";

// 对象管理 - 关联指标滑出窗：为指定对象关联多个指标（按业务域分组、支持搜索、多选勾选）
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/store/AppContext";
import { metricOptionsGrouped, updateObject } from "@/lib/mock-data/objects";
import type { ObjectRelation } from "@/types";

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function LinkMetricsDrawer({
  open,
  onClose,
  object,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  object: ObjectRelation | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { state } = useApp();
  const currentUser = state.user?.nickname || state.user?.username || "当前用户";
  const [selected, setSelected] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");

  // 打开时回填该对象已关联的指标
  useEffect(() => {
    if (open && object) {
      setSelected(object.metrics.map((m) => m.metricId));
      setKeyword("");
    }
  }, [open, object]);

  const groups = metricOptionsGrouped();

  // 按关键字过滤（指标中文名称 / 指标编码），并移除空分组
  const filteredGroups = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return groups;
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) => o.label.toLowerCase().includes(kw) || o.hint.toLowerCase().includes(kw)
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [groups, keyword]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSave() {
    if (!object) return;
    // 按分组顺序重建指标引用（metricId → 完整引用）
    const allOptions = groups.flatMap((g) => g.options);
    const metrics = allOptions.filter((o) => selected.includes(o.value)).map((o) => {
      const g = groups.find((x) => x.options.some((y) => y.value === o.value));
      return { metricId: o.value, nameCn: o.label, code: o.hint, domain: g?.domain ?? "" };
    });
    updateObject(object.id, { metrics }, { user: currentUser, now: formatNow() });
    toast("关联指标已保存", "success");
    onClose();
    onSaved();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={object ? `为${object.name}关联指标` : "关联指标"}
      width={480}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 搜索 */}
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索指标中文名称/指标编码"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
        />

        {/* 按业务域分组的指标复选列表 */}
        {filteredGroups.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">未找到匹配的指标</p>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map((g) => (
              <div key={g.domain}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">{g.domain}</span>
                  <span className="text-xs text-gray-400">已选 {g.options.filter((o) => selected.includes(o.value)).length}/{g.options.length}</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {g.options.map((o) => {
                    const checked = selected.includes(o.value);
                    return (
                      <label
                        key={o.value}
                        className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors ${
                          checked ? "bg-primary-50/50" : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={checked}
                          onChange={() => toggle(o.value)}
                        />
                        <span className="flex-1 text-sm text-gray-800">{o.label}</span>
                        <span className="font-mono text-xs text-gray-400">{o.hint}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
