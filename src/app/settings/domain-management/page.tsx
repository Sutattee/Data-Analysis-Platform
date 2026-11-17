"use client";

// 业务域管理：全局业务域字典维护。
// 列表：业务域名称 / 操作（编辑、删除）；右上角「新增业务域」→ 右侧滑出抽屉（名称必填，ID 系统自动生成）。
// 删除保护：业务域仍被指标管理/报告模板/标准问答等模块引用时禁止删除，弹窗提示解除关联后再删除。
import { useState } from "react";
import { BUSINESS_DOMAINS_SEED, getDomainReferences, generateDomainId, type BusinessDomain } from "@/lib/mock-data/business-domains";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

// 删除受阻提示：被引用业务域（展示各模块引用数量）
function BlockedDeleteModal({
  domain,
  onClose,
}: {
  domain: { name: string; refs: { module: string; count: number }[] } | null;
  onClose: () => void;
}) {
  return (
    <Modal open={!!domain} onClose={onClose} title="无法删除" size="sm">
      {domain && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            业务域<span className="font-medium">「{domain.name}」</span>已被以下业务模块引用，请解除关联后再删除：
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            {domain.refs.map((r) => (
              <li key={r.module} className="flex items-center gap-2">
                <span className="text-gray-400">•</span>
                {r.module}
                <span className="text-gray-400">（{r.count} 项）</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end pt-1">
            <Button variant="secondary" onClick={onClose}>知道了</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function DomainManagementPage() {
  const toast = useToast();
  const [domains, setDomains] = useState<BusinessDomain[]>(BUSINESS_DOMAINS_SEED);

  // 新增/编辑抽屉（editing 非空 = 编辑，空 = 新增）
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessDomain | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  // 删除受阻弹窗
  const [blocked, setBlocked] = useState<{ name: string; refs: { module: string; count: number }[] } | null>(null);

  function openCreate() {
    setEditing(null);
    setName("");
    setNameError("");
    setDrawerOpen(true);
  }
  function openEdit(d: BusinessDomain) {
    setEditing(d);
    setName(d.name);
    setNameError("");
    setDrawerOpen(true);
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("请输入业务域名称");
      return;
    }
    // 同名校验（与自身以外的业务域重名即拒绝）
    if (domains.some((d) => d.name === trimmed && d.id !== editing?.id)) {
      setNameError("业务域名称已存在，请更换");
      return;
    }
    if (editing) {
      setDomains((prev) => prev.map((d) => (d.id === editing.id ? { ...d, name: trimmed } : d)));
      toast("业务域修改成功", "success");
    } else {
      // ID 由系统自动生成，用户无需填写
      setDomains((prev) => [{ id: generateDomainId(), name: trimmed }, ...prev]);
      toast("业务域新增成功", "success");
    }
    setDrawerOpen(false);
  }

  function handleDelete(d: BusinessDomain) {
    const refs = getDomainReferences(d.name);
    if (refs.length > 0) {
      // 仍被引用：禁止删除，提示解除关联后再删除
      setBlocked({ name: d.name, refs });
      return;
    }
    setDomains((prev) => prev.filter((x) => x.id !== d.id));
    toast("业务域删除成功", "success");
  }

  return (
    <div className="space-y-4">
      {/* 标题行：左侧标题 + 右上角「新增业务域」 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">业务域管理</h1>
        <Button onClick={openCreate}>+ 新增业务域</Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">业务域名称</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 w-32">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {domains.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{d.name}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => openEdit(d)}>编辑</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(d)}>删除</Button>
                  </td>
                </tr>
              ))}
              {domains.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-sm text-gray-400">暂无业务域，点击右上角「新增业务域」创建</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 新增/编辑抽屉：右侧滑出，业务域名称必填，ID 系统自动生成 */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "编辑业务域" : "新增业务域"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">业务域 ID</label>
              <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50 select-all">{editing.id}</div>
              <p className="text-xs text-gray-400 mt-1">ID 由系统自动生成，不可修改</p>
            </div>
          )}
          <Input
            label="业务域名称"
            required
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(""); }}
            placeholder="例如：生产管理、能源消耗、工艺质量"
            error={nameError}
          />
        </div>
      </Drawer>

      {/* 删除受阻提示：被引用的业务域禁止删除 */}
      <BlockedDeleteModal domain={blocked} onClose={() => setBlocked(null)} />
    </div>
  );
}
