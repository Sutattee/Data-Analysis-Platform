"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }
    const success = login(username, password);
    if (success) {
      router.replace("/qa");
    } else {
      setError("用户名或密码错误");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-fit shadow-lg shadow-primary-200">
            <Logo size={64} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">智能分析平台</h1>
          <p className="text-sm text-gray-500 mt-2">请登录您的账号</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <Input
            label="用户名"
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button className="w-full" size="lg" onClick={handleLogin}>
            登 录
          </Button>
          <p className="text-xs text-gray-400 text-center leading-5">
            管理员: admin / admin123<br />
            部门账号: bangong / caiwu / juanbao（密码 123456）
          </p>
        </div>
      </div>
    </div>
  );
}
