"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const mockUsers = [
  { id: "u1", username: "admin", role: "管理员", status: "active", lastLogin: "2026-07-08 08:30" },
  { id: "u2", username: "zhangsan", role: "数据分析师", status: "active", lastLogin: "2026-07-08 09:15" },
  { id: "u3", username: "lisi", role: "生产主管", status: "active", lastLogin: "2026-07-07 16:20" },
  { id: "u4", username: "wangwu", role: "设备工程师", status: "inactive", lastLogin: "2026-06-30 10:00" },
  { id: "u5", username: "zhaoliu", role: "质量工程师", status: "active", lastLogin: "2026-07-08 07:45" },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">用户管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统用户账号</p>
        </div>
        <Button>+ 新建用户</Button>
      </div>
      <Card title="用户列表" padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">用户名</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">角色</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">状态</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">最后登录</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{u.username}</td>
                  <td className="px-5 py-3 text-gray-600">{u.role}</td>
                  <td className="px-5 py-3">
                    <Badge variant={u.status === "active" ? "success" : "default"}>
                      {u.status === "active" ? "正常" : "停用"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{u.lastLogin}</td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50">编辑</Button>
                    <Button variant="ghost" size="sm">权限</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
