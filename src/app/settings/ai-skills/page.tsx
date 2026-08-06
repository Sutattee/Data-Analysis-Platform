"use client";

import { useMemo, useState } from "react";
import { allSkills, SKILL_ICON_OPTIONS, Skill } from "@/lib/mock-data/skills";
import { useApp } from "@/lib/store/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "builtin", label: "系统内置" },
  { key: "mine", label: "我的技能" },
];

interface FormState {
  name: string;
  desc: string;
  icon: string;
  color: string;
}

const EMPTY_FORM: FormState = { name: "", desc: "", icon: "🛠️", color: "bg-indigo-50 text-indigo-600" };

export default function AiSkillsPage() {
  const toast = useToast();
  const { state } = useApp();
  const isAdmin = state.user?.role === "管理员";

  const [skills, setSkills] = useState<Skill[]>(() => JSON.parse(JSON.stringify(allSkills)));
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // 创建/编辑弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      if (filter === "builtin" && s.category !== "builtin") return false;
      if (filter === "mine" && s.category !== "mine") return false;
      if (search && !s.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [skills, filter, search]);

  function toggleSkill(id: string) {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  // ---- 编辑 ----
  function openEdit(s: Skill) {
    setEditingId(s.id);
    setForm({ name: s.name, desc: s.desc, icon: s.icon, color: s.color });
    setModalOpen(true);
  }
  function submitForm() {
    const name = form.name.trim();
    if (!name) { toast("请输入技能名称", "warning"); return; }
    if (!form.desc.trim()) { toast("请输入技能简介", "warning"); return; }
    if (editingId) {
      setSkills((prev) => prev.map((s) => (s.id === editingId ? { ...s, name, desc: form.desc.trim(), icon: form.icon, color: form.color } : s)));
      toast("技能已更新", "success");
    } else {
      const newSkill: Skill = {
        id: "mine-" + Date.now().toString(36),
        name,
        desc: form.desc.trim(),
        icon: form.icon,
        color: form.color,
        category: "mine",
        enabled: true,
      };
      setSkills((prev) => [...prev, newSkill]);
      toast("技能已创建", "success");
    }
    setModalOpen(false);
  }

  // ---- 删除 ----
  function confirmDelete() {
    if (!deleteTarget) return;
    setSkills((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    toast("技能已删除", "success");
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">技能</h1>
      </div>

      {/* 筛选 + 搜索 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 text-sm rounded-md transition-colors ${
                filter === f.key ? "bg-white text-primary-700 font-medium shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索技能名称"
          className="w-[240px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* 卡片网格（每行三个） */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-400">暂无技能</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const canToggle = s.category === "mine" || isAdmin;
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 relative hover:shadow-md transition-shadow flex flex-col">
                {/* 开关（右上角） */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => canToggle && toggleSkill(s.id)}
                    disabled={!canToggle}
                    className={`inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${s.enabled ? "bg-primary-600" : "bg-gray-300"} ${!canToggle ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    title={!canToggle ? "仅管理员可操作" : s.enabled ? "点击关闭" : "点击开启"}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${s.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>

                {/* 卡通图（圆角矩形） */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${s.color}`}>
                  {s.icon}
                </div>

                {/* 标题 + 标签 */}
                <div className="mt-3 flex items-center gap-2 pr-12">
                  <h3 className="font-semibold text-gray-800 truncate">{s.name}</h3>
                  <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    s.category === "builtin" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                  }`}>
                    {s.category === "builtin" ? "内置" : "我的"}
                  </span>
                </div>

                {/* 一句话简介（超出 ...） */}
                <p className="text-sm text-gray-500 mt-1 truncate">{s.desc}</p>

                {/* 我的技能：编辑/删除 */}
                {s.category === "mine" && (
                  <div className="mt-3 flex gap-2 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => openEdit(s)}
                      className="px-2.5 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 创建/编辑弹窗 */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "编辑技能" : "新建技能"}>
        <div className="space-y-4">
          <Input
            label="技能名称"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="请输入技能名称"
            maxLength={30}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">技能简介</label>
            <textarea
              value={form.desc}
              onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
              rows={2}
              maxLength={60}
              placeholder="一句话介绍该技能的能力"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">图标</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.icon}
                  onClick={() => setForm((f) => ({ ...f, icon: opt.icon, color: opt.color }))}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl transition-all ${
                    form.icon === opt.icon ? `${opt.color} ring-2 ring-primary-400` : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={submitForm}>{editingId ? "保存" : "创建"}</Button>
          </div>
        </div>
      </Modal>

      {/* 删除确认 */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="确认删除技能？" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">删除后不可恢复，确定删除「<span className="font-medium text-gray-800">{deleteTarget?.name}</span>」吗？</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" onClick={confirmDelete}>确定</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
