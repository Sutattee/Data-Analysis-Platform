"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store/AppContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AvatarUpload } from "@/components/profile/AvatarUpload";

// 手机号脱敏：178****1516
function maskPhone(phone: string): string {
  if (/^\d{11}$/.test(phone)) {
    return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
  }
  return phone;
}

// 邮箱脱敏：用户名保留前3位 + ****@域名，如 adm****@yongshan.com
function maskEmail(email: string): string {
  if (!email) return "未绑定";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, Math.min(3, name.length))}****@${domain}`;
}

// 已被其他账号占用的邮箱（mock，用于唯一性校验）
const OCCUPIED_EMAILS = ["zhangsan@yongshan.com", "lisi@yongshan.com", "wangwu@yongshan.com"];

// 分区标题
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">{children}</h3>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { state, updateUser, logout } = useApp();
  const user = state.user;

  // ----- 本地状态 -----
  const [nickname, setNickname] = useState(user?.nickname || user?.username || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [email, setEmail] = useState(user?.email || "");
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  // 密码弹窗
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");

  // 全局消息
  const [message, setMessage] = useState("");

  const showMsg = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2000);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ========== 各模块 handler ==========
  const handleAvatarConfirm = (dataUrl: string) => {
    updateUser({ avatar: dataUrl });
    showMsg("✅ 头像已保存");
  };
  const handleSaveNickname = () => {
    const v = nickname.trim();
    if (!v) { showMsg("❌ 名称不能为空"); return; }
    if (v.length < 2 || v.length > 20) { showMsg("❌ 名称需 2~20 个字符"); return; }
    if (!/^[一-龥a-zA-Z0-9_]+$/.test(v)) { showMsg("❌ 名称仅支持中英文、数字及下划线"); return; }
    updateUser({ nickname: v });
    showMsg("✅ 修改成功");
  };
  const handleSavePhone = () => {
    if (!/^\d{11}$/.test(phone)) { showMsg("❌ 请输入正确的手机号码！"); return; }
    updateUser({ phone });
    setIsEditingPhone(false);
    showMsg("✅ 修改成功");
  };
  const handleSaveEmail = () => {
    const v = email.trim();
    if (!v) { showMsg("❌ 邮箱不能为空"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { showMsg("❌ 请输入正确的邮箱地址！"); return; }
    if (OCCUPIED_EMAILS.includes(v.toLowerCase())) { showMsg("❌ 该邮箱已被其他账号绑定，请更换"); return; }
    updateUser({ email: v });
    setIsEditingEmail(false);
    showMsg("✅ 修改成功");
  };
  const handleChangePassword = () => {
    if (oldPwd !== user.password) { setPwdError("原密码不正确"); return; }
    if (newPwd.length < 8 || newPwd.length > 20) { setPwdError("新密码需 8~20 位"); return; }
    if (!/[a-zA-Z]/.test(newPwd) || !/\d/.test(newPwd)) { setPwdError("新密码需包含字母和数字"); return; }
    if (newPwd !== confirmPwd) { setPwdError("两次输入的密码不一致"); return; }
    updateUser({ password: newPwd });
    setPwdModalOpen(false);
    setOldPwd(""); setNewPwd(""); setConfirmPwd(""); setPwdError("");
    showMsg("✅ 密码修改成功");
    console.log("[密码修改日志]", { time: new Date().toISOString(), ip: "127.0.0.1 (模拟日志)" });
  };
  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // ========== 渲染 ==========
  return (
    <div className="min-h-screen bg-white">
      {/* 顶部：返回首页 + 标题（左上方） */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href="/home" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <span>←</span>
          <span>返回首页</span>
        </Link>
        <h1 className="text-lg font-semibold text-gray-800">个人中心</h1>
      </div>

      {/* 内容：单页紧凑布局，分割线分区 */}
      <div className="px-6 py-6">
        <div className="max-w-3xl">
          {/* 全局消息 */}
          {message && (
            <div className={`px-4 py-2.5 mb-4 rounded-lg text-sm ${
              message.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message}
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {/* 我的头像 */}
            <section className="py-4 first:pt-0">
              <SectionTitle>🖼️ 我的头像</SectionTitle>
              <AvatarUpload
                currentAvatar={user.avatar}
                fallbackText={user.nickname || user.username || "U"}
                onConfirm={handleAvatarConfirm}
              />
            </section>

            {/* 我的名称 */}
            <section className="py-4">
              <SectionTitle>✏️ 我的名称</SectionTitle>
              <div className="flex items-end gap-3">
                <div className="flex-1 max-w-md">
                  <Input label="昵称" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="2~20个字符，中英文、数字、下划线" />
                </div>
                <Button size="sm" onClick={handleSaveNickname}>确认修改</Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">支持中英文、数字及下划线，长度 2~20 个字符</p>
            </section>

            {/* 我的手机 */}
            <section className="py-4">
              <SectionTitle>📱 我的手机</SectionTitle>
              {isEditingPhone ? (
                <div className="flex items-end gap-3">
                  <div className="flex-1 max-w-md">
                    <Input label="手机号" value={phone} onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 11); setPhone(val); }} placeholder="请输入11位手机号码" type="tel" />
                  </div>
                  <Button size="sm" onClick={handleSavePhone}>确认修改</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsEditingPhone(false); setPhone(user.phone || ""); }}>取消</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between max-w-md">
                  <div>
                    <div className="text-sm text-gray-400 mb-0.5">已绑定手机</div>
                    <div className="text-base font-medium text-gray-800 tracking-wider">{maskPhone(user.phone || "")}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setIsEditingPhone(true)}>修改</Button>
                </div>
              )}
            </section>

            {/* 我的邮箱 */}
            <section className="py-4">
              <SectionTitle>📧 我的邮箱</SectionTitle>
              {isEditingEmail ? (
                <div className="flex items-end gap-3">
                  <div className="flex-1 max-w-md">
                    <Input label="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="请输入邮箱" type="email" />
                  </div>
                  <Button size="sm" onClick={handleSaveEmail}>确认修改</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsEditingEmail(false); setEmail(user.email || ""); }}>取消</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between max-w-md">
                  <div>
                    <div className="text-sm text-gray-400 mb-0.5">已绑定邮箱</div>
                    <div className="text-base font-medium text-gray-800">{maskEmail(user.email || "")}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setIsEditingEmail(true)}>修改</Button>
                </div>
              )}
            </section>

            {/* 我的密码 */}
            <section className="py-4">
              <SectionTitle>🔒 我的密码</SectionTitle>
              <div className="flex items-center justify-between max-w-md">
                <div>
                  <div className="text-sm text-gray-400 mb-0.5">登录密码</div>
                  <div className="text-base tracking-widest text-gray-400">······</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => { setPwdModalOpen(true); setPwdError(""); }}>修改</Button>
              </div>
              <Modal open={pwdModalOpen} onClose={() => setPwdModalOpen(false)} title="修改密码" size="sm">
                <div className="space-y-4">
                  <Input label="原密码" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} placeholder="请输入原密码" />
                  <Input label="新密码" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="8~20 位，含字母 + 数字" />
                  <Input label="确认新密码" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="再次输入新密码" />
                  {pwdError && <p className="text-xs text-red-500">{pwdError}</p>}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => { setPwdModalOpen(false); setPwdError(""); setOldPwd(""); setNewPwd(""); setConfirmPwd(""); }}>取消</Button>
                    <Button onClick={handleChangePassword}>确认</Button>
                  </div>
                </div>
              </Modal>
            </section>

            {/* 退出登录 */}
            <section className="py-4">
              <Button variant="secondary" onClick={handleLogout}>🚪 退出登录</Button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
