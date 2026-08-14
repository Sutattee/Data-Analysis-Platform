import {
  DataSourceTypeOption,
  DataSourceTypeKey,
  DataSourceRecord,
  TestConnectionResult,
  SpartaType,
  SpartaSource,
  SpartaDatabase,
  SpartaTable,
  TableMetadata,
  FieldDef,
} from "@/types";
import { delay } from "@/lib/utils";

// ========== 数据源类型枚举 ==========
export const dataSourceTypes: DataSourceTypeOption[] = [
  { key: "mysql", label: "MySQL" },
  { key: "oracle", label: "Oracle" },
  { key: "postgresql", label: "PostgreSQL" },
  { key: "sqlserver", label: "SQL Server" },
  { key: "clickhouse", label: "ClickHouse" },
  { key: "api", label: "RestAPI" },
];

// 当前可选数据源类型（仅 PostgreSQL、MySQL；其余类型保留代码、UI 暂隐藏）
export const selectableDataSourceTypes: DataSourceTypeOption[] = dataSourceTypes.filter((t) =>
  t.key === "postgresql" || t.key === "mysql"
);

// 类型 → 展示名
export const typeLabelMap: Record<DataSourceTypeKey, string> = dataSourceTypes.reduce(
  (acc, t) => ({ ...acc, [t.key]: t.label }),
  {} as Record<DataSourceTypeKey, string>
);

export function getTypeLabel(key: DataSourceTypeKey): string {
  return typeLabelMap[key] ?? key;
}

// ========== 种子数据源（确定性生成，约 28 条）==========
const TYPE_POOL: DataSourceTypeKey[] = ["mysql", "oracle", "postgresql", "sqlserver", "clickhouse", "api"];
const OWNER_POOL = ["Frank", "admin", "李四", "王五", "赵六", "张三", "Michael", "Linda"];
const DB_PREFIX: Record<DataSourceTypeKey, string> = {
  mysql: "mysql",
  oracle: "orcl",
  postgresql: "pg",
  sqlserver: "mssql",
  clickhouse: "ck",
  api: "api",
};
const PORT_DEFAULT: Record<DataSourceTypeKey, string> = {
  mysql: "3306",
  oracle: "1521",
  postgresql: "5432",
  sqlserver: "1433",
  clickhouse: "8123",
  api: "443",
};

// 由索引确定性派生时间字符串（不使用 Date 对象，保证 SSR/CSR 一致）
function tsFor(i: number, month: number): string {
  const day = String(2 + (i % 27)).padStart(2, "0"); // 02..28
  const hour = String((i * 3) % 24).padStart(2, "0");
  const min = String((i * 7 + 11) % 60).padStart(2, "0");
  const sec = String((i * 13) % 60).padStart(2, "0");
  return `2025-${String(month).padStart(2, "0")}-${day} ${hour}:${min}:${sec}`;
}

// 部分工业场景数据源名称池
const NAME_POOL = [
  "MES生产数据库", "ERP核心库", "能源管理库", "质量检验系统", "设备监控API",
  "高炉工艺库", "热轧实绩库", "冷轧质检库", "镀锌产线库", "连铸计量库",
  "供应链WMS", "销售订单库", "设备台账库", "安全监测库", "环保排放库",
  "成本核算库", "人力资源库", "仓储物流库", "客户关系CRM", "排程优化库",
  "UI_TEST", "实时计量库", "能耗分析库", "缺陷图谱库", "工序追溯库",
  "原料采购库", "成品发货库", "实验室LIMS",
];

function buildSeed(): DataSourceRecord[] {
  const list: DataSourceRecord[] = [];
  for (let i = 0; i < NAME_POOL.length; i++) {
    const typeKey = TYPE_POOL[i % TYPE_POOL.length];
    const owner = OWNER_POOL[i % OWNER_POOL.length];
    const isUnavailable = i % 7 === 5; // 约每 7 条 1 条不可用
    list.push({
      id: `seed-ds-${i + 1}`,
      name: NAME_POOL[i],
      type: typeKey,
      uniqueKey: `${typeKey}_${(107 + i * 13).toString(36)}`,
      host: `172.${10 + (i % 40)}.${18 + (i % 30)}.${(i * 7) % 250}`,
      database: `${DB_PREFIX[typeKey]}_${(i + 1).toString(36)}`,
      port: PORT_DEFAULT[typeKey],
      username: i % 3 === 0 ? "root" : i % 3 === 1 ? "admin" : "dba",
      owner,
      creator: i % 2 === 0 ? "Frank" : "admin",
      createdAt: tsFor(i, 7),
      updater: i % 2 === 0 ? "admin" : "Frank",
      updatedAt: tsFor(i + 3, 9),
      status: isUnavailable ? "unavailable" : "available",
      remark: i % 4 === 0 ? `${getTypeLabel(typeKey)} 数据源，${owner} 维护` : "",
    });
  }
  return list;
}

export const seedDataSources: DataSourceRecord[] = buildSeed();

// ========== 测试连接（模拟异步）==========
const FAIL_REASONS = [
  "连接超时：目标地址在 5000ms 内未响应",
  "认证失败：用户名或密码错误",
  "网络不可达：无法访问目标主机",
  "数据库不存在：请检查数据库名称",
  "端口被拒绝：目标端口未开放",
];

export async function mockTestConnection(rec: DataSourceRecord): Promise<TestConnectionResult> {
  await delay(900 + (rec.name.length % 5) * 200);
  // 不可用数据源大概率失败
  if (rec.status === "unavailable") {
    const reason = FAIL_REASONS[rec.name.length % FAIL_REASONS.length];
    return { success: false, message: reason };
  }
  // 可用数据源偶尔失败（模拟真实波动）
  if (rec.name.length % 11 === 0) {
    return { success: false, message: FAIL_REASONS[rec.name.length % FAIL_REASONS.length] };
  }
  return { success: true, latencyMs: 30 + (rec.name.length % 120), message: "连接成功" };
}

// 测试连接配置（新增页面用：尚未落库时按填写内容探测）
export interface TestConnectionConfig {
  type: DataSourceTypeKey;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

const CREATE_FAIL_REASONS = [
  "连接失败：拒绝连接（目标端口未开放或被防火墙拦截）",
  "连接失败：认证失败（用户名或密码错误）",
  "连接失败：连接超时（目标地址在限定时间内未响应）",
];

// 简单字符串哈希 → 0~99
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 100;
}

export async function mockTestConnectionCreate(config: TestConnectionConfig): Promise<TestConnectionResult> {
  await delay(900 + (config.host.length % 4) * 200);
  // 按配置内容确定性判定：约 18% 概率失败（用于演示失败提示）
  const seed = hashCode(`${config.host}:${config.port}:${config.database}:${config.username}`);
  if (seed < 18) {
    return { success: false, message: CREATE_FAIL_REASONS[seed % CREATE_FAIL_REASONS.length] };
  }
  return { success: true, latencyMs: 40 + (seed % 180), message: "连接成功" };
}

// ========== Sparta 平台数据 ==========
export const spartaTypes: SpartaType[] = [
  { key: "mysql", label: "MySQL" },
  { key: "oracle", label: "Oracle" },
  { key: "postgresql", label: "PostgreSQL" },
  { key: "sqlserver", label: "SQL Server" },
  { key: "clickhouse", label: "ClickHouse" },
];

// 按数据源类型取该类型下的数据源列表（确定性）
export function getSpartaSources(typeKey: DataSourceTypeKey): SpartaSource[] {
  const count = 3 + (typeKey.length % 3); // 3~5 个
  const arr: SpartaSource[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `sp-src-${typeKey}-${i}`,
      name: `${getTypeLabel(typeKey)}_Sparta_${String.fromCharCode(65 + i)}`,
      typeKey,
    });
  }
  return arr;
}

// 按数据源取其下的数据库列表（确定性）
export function getSpartaDatabases(sourceId: string): SpartaDatabase[] {
  const count = 2 + (sourceId.length % 3); // 2~4 个
  const arr: SpartaDatabase[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `sp-db-${sourceId}-${i}`,
      name: `db_${String.fromCharCode(97 + i)}_${(sourceId.length + i) % 99}`,
      sourceId,
    });
  }
  return arr;
}

// 工业场景表名池
const TABLE_NAME_POOL = [
  "furnace_temp_record", "hot_rolling_output", "cold_rolling_quality",
  "galvanizing_line_log", "continuous_casting_meter", "energy_consumption_hourly",
  "equipment_status_realtime", "defect_image_record", "production_order_detail",
  "inspection_result", "material_batch_trace", "work_order_maintenance",
  "shift_handover_log", "cost_accounting_daily", "warehouse_stock_snapshot",
  "sales_order_item", "supplier_delivery", "customer_complaint", "safety_inspection",
  "emission_monitor_hourly", "process_trace_step", "quality_lab_result",
];

// 按数据库取其下的所有数据表（确定性）
export function getSpartaTables(databaseId: string, typeKey: DataSourceTypeKey): SpartaTable[] {
  const seed = databaseId.length;
  const count = 8 + (seed % 8); // 8~15 张
  const arr: SpartaTable[] = [];
  for (let i = 0; i < count; i++) {
    const baseName = TABLE_NAME_POOL[(seed + i) % TABLE_NAME_POOL.length];
    arr.push({
      id: `sp-tbl-${databaseId}-${i}`,
      name: i < TABLE_NAME_POOL.length ? baseName : `${baseName}_${i}`,
      databaseId,
      typeKey,
    });
  }
  return arr;
}

// ========== 元数据确定性生成 ==========
// 简单字符串哈希 → 种子
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 伪随机（确定性）
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIELD_TYPE_POOL = ["VARCHAR(32)", "VARCHAR(64)", "BIGINT", "DECIMAL(18,2)", "DATETIME", "INT", "TEXT"];
const FIELD_DESC_POOL = ["主键ID", "业务编码", "数量", "金额", "记录时间", "状态标识", "备注说明", "关联外键", "产线编号", "批次号"];
const TABLE_REMARKS = [
  "该表记录生产过程核心业务数据，按日分区。",
  "来源于设备物联网采集，数据量较大。",
  "质量检验明细表，关联多张主数据表。",
  "能耗计量明细，支持按工序聚合统计。",
  "工序追溯关键表，用于全链路溯源分析。",
];

export function generateTableMetadata(tableName: string, typeKey: DataSourceTypeKey): TableMetadata {
  const seed = hashStr(tableName);
  const rand = mulberry32(seed);
  const fieldCount = 6 + Math.floor(rand() * 6); // 6~11 字段

  const fields: FieldDef[] = [];
  for (let i = 0; i < fieldCount; i++) {
    const isPk = i === 0;
    const fieldName = isPk
      ? `${tableName}_id`
      : `col_${["code", "qty", "amt", "time", "status", "line", "batch", "remark", "ref_id", "value"][i % 10]}`;
    fields.push({
      name: fieldName,
      type: isPk ? "BIGINT" : FIELD_TYPE_POOL[Math.floor(rand() * FIELD_TYPE_POOL.length)],
      isPrimaryKey: isPk,
      description: FIELD_DESC_POOL[i % FIELD_DESC_POOL.length],
    });
  }

  // 关系图：2~3 个关联表
  const relCount = 2 + Math.floor(rand() * 2);
  const relations = Array.from({ length: relCount }, (_, i) => {
    const target = TABLE_NAME_POOL[(seed + i * 3 + 1) % TABLE_NAME_POOL.length];
    return {
      targetTable: target,
      cardinality: rand() > 0.5 ? "1:N" : "N:1",
      joinField: fields[1 + (i % (fields.length - 1))].name,
    };
  });

  // 数据预览：5~7 行
  const rowCount = 5 + Math.floor(rand() * 3);
  const preview: Record<string, string | number>[] = [];
  for (let r = 0; r < rowCount; r++) {
    const row: Record<string, string | number> = {};
    fields.slice(0, Math.min(5, fields.length)).forEach((f) => {
      if (f.type.includes("VARCHAR")) row[f.name] = `${f.name.slice(0, 3).toUpperCase()}_${r + 1001}`;
      else if (f.type.includes("DECIMAL") || f.type.includes("INT") || f.type.includes("BIGINT"))
        row[f.name] = Math.floor(rand() * 10000) / (f.type.includes("DECIMAL") ? 100 : 1);
      else if (f.type.includes("DATETIME")) row[f.name] = `2025-07-${String(10 + r).padStart(2, "0")} 0${r % 10}:00:00`;
      else row[f.name] = String(Math.floor(rand() * 1000));
    });
    preview.push(row);
  }

  return {
    rowCount: 1000 + Math.floor(rand() * 9000000),
    fieldCount,
    sizeMb: Math.floor(rand() * 5000) / 10 + 1,
    remark: TABLE_REMARKS[seed % TABLE_REMARKS.length] + `（数据源类型：${getTypeLabel(typeKey)}）`,
    fields,
    relations,
    preview,
  };
}
