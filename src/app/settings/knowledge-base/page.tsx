"use client";

import { mockKnowledgeDocs } from "@/lib/mock-data/settings";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">企业知识库</h1>
          <p className="text-sm text-gray-500 mt-1">管理企业知识文档，构建AI知识基础</p>
        </div>
        <Button>+ 上传文档</Button>
      </div>
      <Card title="知识文档" padding={false}>
        <div className="divide-y divide-gray-50">
          {mockKnowledgeDocs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800">{doc.title}</span>
                  <Badge>{doc.category}</Badge>
                  <Badge
                    variant={
                      doc.status === "indexed" ? "success" :
                      doc.status === "processing" ? "warning" : "danger"
                    }
                  >
                    {doc.status === "indexed" ? "已索引" :
                     doc.status === "processing" ? "处理中" : "失败"}
                  </Badge>
                </div>
                <div className="text-xs text-gray-400">上传日期: {doc.uploadDate}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">查看</Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">删除</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
