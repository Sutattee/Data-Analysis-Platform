"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const mockRoles = [
  { id: "r1", name: "管理员", memberCount: 2, permissions: ["全部权限"], description: "系统超级管理员" },
  { id: "r2", name: "数据分析师", memberCount: 5, permissions: ["数据查看", "报表生成", "AI问答"], description: "可查看数据和使用AI功能" },
  { id: "r3", name: "生产主管", memberCount: 12, permissions: ["生产数据查看", "报表查看"], description: "可查看生产相关数据" },
  { id: "r4", name: "设备工程师", memberCount: 8, permissions: ["设备数据查看", "巡检报告"], description: "可查看设备相关数据" },
  { id: "r5", name: "普通用户", memberCount: 30, permissions: ["AI问答", "报告查看"], description: "基础功能使用权限" },
];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">角色管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统角色与权限分配</p>
        </div>
        <Button>+ 新建角色</Button>
      </div>
      <Card title="角色列表" padding={false}>
        <div className="divide-y divide-gray-50">
          {mockRoles.map((role) => (
            <div key={role.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800">{role.name}</span>
                  <Badge>{role.memberCount} 人</Badge>
                </div>
                <p className="text-xs text-gray-500 mb-1.5">{role.description}</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((p) => (
                    <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50">编辑</Button>
                <Button variant="ghost" size="sm">权限配置</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
