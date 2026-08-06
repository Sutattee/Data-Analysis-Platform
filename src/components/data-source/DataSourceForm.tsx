"use client";

import { useState } from "react";
import { DataSourceRecord, DataSourceTypeKey } from "@/types";
import { dataSourceTypes, mockTestConnectionCreate } from "@/lib/mock-data/data-source";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export interface DataSourceFormValues {
  name: string;
  type: DataSourceTypeKey;
  uniqueKey: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password?: string;
  owner: string;
  remark?: string;
  status: "available" | "unavailable";
}

interface Props {
  mode: "create" | "edit";
  initial?: DataSourceRecord;
  onSubmit: (values: DataSourceFormValues) => void;
  onCancel: () => void;
}

// 切换类型时自动带出默认端口
const PORT_BY_TYPE: Record<DataSourceTypeKey, string> = {
  mysql: "3306",
  oracle: "1521",
  postgresql: "5432",
  sqlserver: "1433",
  clickhouse: "8123",
  api: "443",
};

/**
 * 数据源新增/编辑共用表单，含必填校验。
 */
export function DataSourceForm({ mode, initial, onSubmit, onCancel }: Props) {
  const toast = useToast();
  const [values, setValues] = useState<DataSourceFormValues>({
    name: initial?.name ?? "",
    type: initial?.type ?? "mysql",
    uniqueKey: initial?.uniqueKey ?? "",
    host: initial?.host ?? "",
    port: initial?.port ?? "3306",
    database: initial?.database ?? "",
    username: initial?.username ?? "",
    password: initial?.password ?? "",
    owner: initial?.owner ?? "",
    remark: initial?.remark ?? "",
    status: initial?.status ?? "available",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);

  function set<K extends keyof DataSourceFormValues>(key: K, v: DataSourceFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!values.name.trim()) e.name = "请输入数据源名称";
    if (!values.uniqueKey.trim()) e.uniqueKey = "请输入唯一标识";
    if (!values.host.trim()) e.host = "请输入地址";
    if (!values.port.trim()) e.port = "请输入端口";
    if (!values.database.trim()) e.database = "请输入数据库名称";
    if (!values.username.trim()) e.username = "请输入用户名";
    if (!values.owner.trim()) e.owner = "请输入负责人";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(values);
  }

  async function handleTest() {
    if (!values.host.trim() || !values.port.trim() || !values.database.trim() || !values.username.trim()) {
      toast("请先完整填写地址、端口、数据库名、用户名", "warning");
      return;
    }
    setTesting(true);
    const res = await mockTestConnectionCreate({
      type: values.type,
      host: values.host.trim(),
      port: values.port.trim(),
      database: values.database.trim(),
      username: values.username.trim(),
      password: values.password ?? "",
    });
    setTesting(false);
    toast(res.success ? `连接成功（耗时 ${res.latencyMs}ms）` : res.message, res.success ? "success" : "danger");
  }

  const selectCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex-1 min-h-0 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="数据源名称"
          required
          value={values.name}
          error={errors.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="请输入数据源名称"
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            数据源类型<span className="text-red-500 ml-0.5">*</span>
          </label>
          <select
            value={values.type}
            className={selectCls}
            onChange={(e) => {
              const t = e.target.value as DataSourceTypeKey;
              // 编辑态保留原端口；新增态随类型带出默认端口
              setValues((prev) => ({ ...prev, type: t, port: mode === "edit" ? prev.port : PORT_BY_TYPE[t] }));
            }}
          >
            {dataSourceTypes.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="数据源唯一标识"
          required
          value={values.uniqueKey}
          error={errors.uniqueKey}
          onChange={(e) => set("uniqueKey", e.target.value)}
          placeholder="如 mysql_brb"
        />
        <Input
          label="端口号"
          required
          value={values.port}
          error={errors.port}
          onChange={(e) => set("port", e.target.value)}
          placeholder="如 3306"
        />

        <Input
          label="地址"
          required
          value={values.host}
          error={errors.host}
          onChange={(e) => set("host", e.target.value)}
          placeholder="如 172.13.18.32"
        />
        <Input
          label="数据库名称"
          required
          value={values.database}
          error={errors.database}
          onChange={(e) => set("database", e.target.value)}
          placeholder="如 mysql_phl"
        />

        <Input
          label="用户名"
          required
          value={values.username}
          error={errors.username}
          onChange={(e) => set("username", e.target.value)}
          placeholder="如 root"
        />
        <Input
          label="密码"
          type="password"
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="••••••"
        />

        <Input
          label="负责人"
          required
          value={values.owner}
          error={errors.owner}
          onChange={(e) => set("owner", e.target.value)}
          placeholder="请输入负责人"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">备注</label>
        <textarea
          value={values.remark}
          rows={2}
          onChange={(e) => set("remark", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          placeholder="选填，数据源用途说明"
        />
      </div>

      </div>

      {/* ===== 底部操作按钮（居中）===== */}
      <div className="flex justify-center items-center gap-3 pt-4 mt-4 border-t border-gray-100 flex-shrink-0">
        <Button variant="secondary" onClick={handleTest} disabled={testing}>
          {testing ? (
            <span className="inline-flex items-center gap-1.5">
              <Spinner size="sm" /> 测试中...
            </span>
          ) : (
            "测试连接"
          )}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSubmit}>{mode === "create" ? "确认新增" : "保存修改"}</Button>
      </div>
    </div>
  );
}
