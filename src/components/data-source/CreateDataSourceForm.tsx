"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataSourceTypeKey } from "@/types";
import { dataSourceTypes, mockTestConnectionCreate } from "@/lib/mock-data/data-source";
import { useDataSources, addDataSource } from "@/lib/store/data-source-store";
import { useApp } from "@/lib/store/AppContext";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

// ① 提示气泡：鼠标移入显示
function Tip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group/tip ml-1 align-middle text-gray-400 hover:text-primary-500 cursor-help">
      <span className="text-sm leading-none">①</span>
      <span className="absolute left-5 top-1/2 -translate-y-1/2 hidden group-hover/tip:block z-30 w-max max-w-[260px] px-3 py-2 rounded-md bg-gray-800 text-white text-xs leading-relaxed shadow-lg">
        {text}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-800" />
      </span>
    </span>
  );
}

interface FormValues {
  name: string;
  host: string;
  database: string;
  port: string;
  username: string;
  password: string;
  remark: string;
}

const EMPTY: FormValues = {
  name: "",
  host: "",
  database: "",
  port: "",
  username: "",
  password: "",
  remark: "",
};

// 校验正则
const RE_NAME = /^[一-龥A-Za-z0-9._-]+$/; // 中文、字母、数字、_、-、.
const RE_DATABASE = /^[A-Za-z0-9_-]+$/; // 字母、数字、_、-

// 支持完整表单的数据源类型 → 端口占位提示文字
const FORM_TYPES: Partial<Record<DataSourceTypeKey, string>> = {
  mysql: "请输入服务器端口号，如 3306",
  postgresql: "请输入服务器端口号，如5432",
};

// 新增页 Tab 顺序（PostgreSQL 在首位）→ 默认选中 PostgreSQL
const CREATE_TAB_ORDER: DataSourceTypeKey[] = [
  "postgresql", "mysql", "oracle", "sqlserver", "clickhouse", "api",
];
const createTabs = CREATE_TAB_ORDER.map(
  (k) => dataSourceTypes.find((t) => t.key === k)!
).filter(Boolean);

/**
 * 新增数据源表单：顶部按数据源类型切换 Tab，下方为连接配置表单。
 * MySQL / PostgreSQL 提供完整表单，其它类型显示「即将上新」。
 */
export function CreateDataSourceForm() {
  const router = useRouter();
  const toast = useToast();
  const { state } = useApp();
  const existing = useDataSources();

  const [activeType, setActiveType] = useState<DataSourceTypeKey>("postgresql");
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);

  // 当前类型是否提供完整表单，及其端口占位提示
  const portPlaceholder = activeType ? FORM_TYPES[activeType] : undefined;
  const showForm = portPlaceholder !== undefined;

  function set<K extends keyof FormValues>(key: K, v: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const name = values.name.trim();

    if (!name) e.name = "请输入数据源名称";
    else if (name.length > 50) e.name = "数据源名称最多 50 个字符";
    else if (!RE_NAME.test(name)) e.name = "仅支持中文、字母、数字、_、-、.";
    else if (existing.some((d) => d.name === name)) e.name = "数据源名称已存在，不可重复";

    if (!values.host.trim()) e.host = "请输入服务器地址";

    const db = values.database.trim();
    if (!db) e.database = "请输入数据库名称";
    else if (db.length > 64) e.database = "数据库名称最多 64 个字符";
    else if (!RE_DATABASE.test(db)) e.database = "仅支持字母、数字、_、-";

    const port = values.port.trim();
    if (!port) e.port = "请输入端口号";
    else if (!/^\d+$/.test(port)) e.port = "端口号必须为数字";
    else {
      const n = Number(port);
      if (n < 1 || n > 65535) e.port = "端口号范围为 1~65535";
    }

    if (!values.username.trim()) e.username = "请输入用户名";
    if (!values.password) e.password = "请输入密码";
    if (values.remark.length > 200) e.remark = "备注最多 200 个字符";

    setErrors(e);
    if (Object.keys(e).length > 0) toast("请完善表单必填项与格式", "warning");
    return Object.keys(e).length === 0;
  }

  async function handleTest() {
    if (!values.host.trim() || !values.port.trim() || !values.database.trim() || !values.username.trim() || !values.password) {
      toast("请先完整填写地址、端口、数据库名、用户名、密码", "warning");
      return;
    }
    setTesting(true);
    const res = await mockTestConnectionCreate({
      type: activeType,
      host: values.host.trim(),
      port: values.port.trim(),
      database: values.database.trim(),
      username: values.username.trim(),
      password: values.password,
    });
    setTesting(false);
    toast(res.success ? `连接成功（耗时 ${res.latencyMs}ms）` : res.message, res.success ? "success" : "danger");
  }

  function handleSubmit() {
    if (!validate()) return;
    const owner = state.user?.nickname || state.user?.username || "admin";
    try {
      addDataSource({
        name: values.name.trim(),
        type: activeType,
        uniqueKey: `${activeType}_${Date.now().toString(36)}`,
        host: values.host.trim(),
        database: values.database.trim(),
        port: values.port.trim(),
        username: values.username.trim(),
        password: values.password,
        owner,
        status: "available",
        remark: values.remark.trim(),
      });
      toast("新增成功", "success");
      router.push("/settings/data-source");
    } catch {
      toast("新增失败，请稍后重试", "danger");
    }
  }

  function back() {
    router.push("/settings/data-source");
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* ===== 顶部：数据源类型 Tab 导航 ===== */}
      <div className="border-b border-gray-200 flex-shrink-0">
        <div className="flex gap-1 overflow-x-auto">
          {createTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap -mb-px border-b-2 transition-colors ${
                activeType === t.key
                  ? "border-primary-600 text-primary-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 中部内容：表单（MySQL / PostgreSQL）/ 其它「即将上新」 ===== */}
      <div className="flex-1 min-h-0 pt-6">
        {showForm ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <Input
              label={
                <span>
                  数据源名称
                  <Tip text="不能与其他数据源重复，可以使用中文、字母、数字、_、-、.。" />
                </span>
              }
              required
              maxLength={50}
              value={values.name}
              error={errors.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="请输入数据源名称"
            />

            <Input
              label={
                <span>
                  地址
                  <Tip text="所在服务器地址（IP 地址或域名）" />
                </span>
              }
              required
              value={values.host}
              error={errors.host}
              onChange={(e) => set("host", e.target.value)}
              placeholder="请输入服务器地址，如 192.168.12.111"
            />

            <Input
              label={
                <span>
                  数据库名称
                  <Tip text="仅支持输入字母、数字、_、-。" />
                </span>
              }
              required
              maxLength={64}
              value={values.database}
              error={errors.database}
              onChange={(e) => set("database", e.target.value)}
              placeholder="请输入数据库名称"
            />

            <Input
              label="端口号"
              required
              type="number"
              min={1}
              max={65535}
              value={values.port}
              error={errors.port}
              onChange={(e) => set("port", e.target.value)}
              placeholder={portPlaceholder}
            />

            <Input
              label="用户名"
              required
              value={values.username}
              error={errors.username}
              onChange={(e) => set("username", e.target.value)}
              placeholder="请输入用户名"
            />

            <Input
              label="密码"
              required
              type="password"
              value={values.password}
              error={errors.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="请输入密码"
            />

            <div className="col-span-2">
              <Input
                label="备注"
                maxLength={200}
                value={values.remark}
                error={errors.remark}
                onChange={(e) => set("remark", e.target.value)}
                placeholder="请输入内容（非必填）"
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-5xl mb-3">🚧</span>
            <p className="text-sm font-medium">即将上新</p>
            <p className="text-xs mt-1 text-gray-300">该数据源类型暂未开放</p>
          </div>
        )}
      </div>

      {/* ===== 底部操作按钮（居中）===== */}
      <div className="flex justify-center items-center gap-3 pt-4 mt-4 border-t border-gray-100 flex-shrink-0">
        <Button variant="secondary" onClick={handleTest} disabled={!showForm || testing}>
          {testing ? (
            <span className="inline-flex items-center gap-1.5">
              <Spinner size="sm" /> 测试中...
            </span>
          ) : (
            "测试连接"
          )}
        </Button>
        <Button variant="secondary" onClick={back}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={!showForm}>
          确定
        </Button>
      </div>
    </div>
  );
}
