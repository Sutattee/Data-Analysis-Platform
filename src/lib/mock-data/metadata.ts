import { MetadataDatabase, MetadataTable, DataSourceTypeKey } from "@/types";

// 日期时间样本（统一 YYYY-MM-DD HH:mm:ss）
const TS = [
  "2024-01-13 00:00:00", "2024-01-14 08:30:00", "2024-01-15 12:10:00",
  "2024-01-16 16:45:00", "2024-01-17 09:20:00", "2024-01-18 21:05:00",
];

// ============ 设备管理库 (mysql) ============
const deviceInfo: MetadataTable = {
  id: "t-device-info",
  name: "dwd_device_info",
  chineseName: "设备台账表",
  databaseId: "db-device",
  databaseName: "设备管理库",
  typeKey: "mysql",
  tableType: "维度表",
  synonyms: ["设备主数据", "设备档案"],
  description: "记录全厂设备的基础台账信息，是设备维度分析的主数据表。",
  rowCount: 1280,
  fields: [
    { name: "id", dataType: "bigint", businessMeaning: "设备唯一标识，主键", synonyms: ["设备ID"], fk: null },
    { name: "device_code", dataType: "varchar(32)", businessMeaning: "设备编码", synonyms: ["设备编号"], fk: null },
    { name: "device_name", dataType: "varchar(64)", businessMeaning: "设备名称", synonyms: [], fk: null },
    { name: "workshop_id", dataType: "bigint", businessMeaning: "所属车间ID", synonyms: ["车间"], fk: { table: "dim_workshop", field: "id" } },
    { name: "install_date", dataType: "datetime", businessMeaning: "投用日期", synonyms: [], fk: null },
    { name: "status", dataType: "varchar(8)", businessMeaning: "设备状态（运行/停机/维护）", synonyms: ["运行状态"], fk: null },
  ],
  relations: [{ targetTable: "dim_workshop", cardinality: "N:1", joinField: "workshop_id" }],
  preview: [
    { id: 1001, device_code: "BF-001", device_name: "1号高炉", workshop_id: 1, install_date: TS[0], status: "运行" },
    { id: 1002, device_code: "HR-002", device_name: "2号热轧机", workshop_id: 2, install_date: TS[1], status: "运行" },
    { id: 1003, device_code: "CR-003", device_name: "3号冷轧机", workshop_id: 3, install_date: TS[2], status: "维护" },
  ],
};

const deviceRuntimeLog: MetadataTable = {
  id: "t-device-runtime-log",
  name: "dwd_device_runtime_log",
  chineseName: "设备运行记录表",
  databaseId: "db-device",
  databaseName: "设备管理库",
  typeKey: "mysql",
  tableType: "事实表",
  synonyms: ["设备日志", "运行记录"],
  description: "记录设备运行的实时状态日志，用于设备 OEE 计算与故障分析。",
  rowCount: 99784,
  fields: [
    { name: "id", dataType: "bigint", businessMeaning: "日志记录ID，主键", synonyms: ["日志ID"], fk: null },
    { name: "device_id", dataType: "bigint", businessMeaning: "设备ID", synonyms: ["设备"], fk: { table: "dwd_device_info", field: "id" } },
    { name: "run_status", dataType: "varchar(8)", businessMeaning: "运行状态", synonyms: ["状态"], fk: null },
    { name: "start_time", dataType: "datetime", businessMeaning: "运行开始时间", synonyms: [], fk: null },
    { name: "end_time", dataType: "datetime", businessMeaning: "运行结束时间", synonyms: [], fk: null },
    { name: "duration_min", dataType: "int", businessMeaning: "运行时长（分钟）", synonyms: ["时长"], fk: null },
    { name: "downtime_reason", dataType: "varchar(64)", businessMeaning: "停机原因", synonyms: [], fk: null },
  ],
  relations: [{ targetTable: "dwd_device_info", cardinality: "N:1", joinField: "device_id" }],
  preview: [
    { id: 900001, device_id: 1001, run_status: "运行", start_time: TS[0], end_time: TS[1], duration_min: 510, downtime_reason: "" },
    { id: 900002, device_id: 1002, run_status: "停机", start_time: TS[2], end_time: TS[3], duration_min: 0, downtime_reason: "换辊" },
    { id: 900003, device_id: 1003, run_status: "维护", start_time: TS[4], end_time: TS[5], duration_min: 0, downtime_reason: "定期检修" },
  ],
};

const dimWorkshop: MetadataTable = {
  id: "t-dim-workshop",
  name: "dim_workshop",
  chineseName: "车间维表",
  databaseId: "db-device",
  databaseName: "设备管理库",
  typeKey: "mysql",
  tableType: "维度表",
  synonyms: ["车间", "工段"],
  description: "车间维度表，用于按车间聚合生产与设备指标。",
  rowCount: 12,
  fields: [
    { name: "id", dataType: "bigint", businessMeaning: "车间ID，主键", synonyms: ["车间ID"], fk: null },
    { name: "workshop_name", dataType: "varchar(32)", businessMeaning: "车间名称", synonyms: ["车间名"], fk: null },
    { name: "manager", dataType: "varchar(16)", businessMeaning: "车间负责人", synonyms: [], fk: null },
  ],
  relations: [],
  preview: [
    { id: 1, workshop_name: "高炉车间", manager: "张三" },
    { id: 2, workshop_name: "热轧车间", manager: "李四" },
    { id: 3, workshop_name: "冷轧车间", manager: "王五" },
  ],
};

// ============ 生产运营库 (mysql) ============
const productionOrder: MetadataTable = {
  id: "t-production-order",
  name: "dwd_production_order",
  chineseName: "生产订单表",
  databaseId: "db-prod",
  databaseName: "生产运营库",
  typeKey: "mysql",
  tableType: "事实表",
  synonyms: ["订单", "工单"],
  description: "记录生产订单的主信息，是产量与交付分析的核心事实表。",
  rowCount: 1560,
  fields: [
    { name: "order_id", dataType: "varchar(32)", businessMeaning: "订单ID，主键", synonyms: ["订单号"], fk: null },
    { name: "product_code", dataType: "varchar(16)", businessMeaning: "产品编码", synonyms: ["产品"], fk: null },
    { name: "quantity", dataType: "decimal(18,2)", businessMeaning: "订单数量", synonyms: ["数量"], fk: null },
    { name: "status", dataType: "varchar(8)", businessMeaning: "订单状态", synonyms: [], fk: null },
    { name: "plan_date", dataType: "datetime", businessMeaning: "计划完工日期", synonyms: [], fk: null },
  ],
  relations: [{ targetTable: "dwd_output_fact", cardinality: "1:N", joinField: "order_id" }],
  preview: [
    { order_id: "PO20240113001", product_code: "Q235B", quantity: 1200, status: "已完成", plan_date: TS[0] },
    { order_id: "PO20240114002", product_code: "SPHC", quantity: 800, status: "进行中", plan_date: TS[1] },
  ],
};

const outputFact: MetadataTable = {
  id: "t-output-fact",
  name: "dwd_output_fact",
  chineseName: "产量事实表",
  databaseId: "db-prod",
  databaseName: "生产运营库",
  typeKey: "mysql",
  tableType: "事实表",
  synonyms: ["产量", "产出"],
  description: "产线实际产出记录，用于日产量与达成率计算。",
  rowCount: 86420,
  fields: [
    { name: "id", dataType: "bigint", businessMeaning: "记录ID，主键", synonyms: [], fk: null },
    { name: "order_id", dataType: "varchar(32)", businessMeaning: "关联订单ID", synonyms: ["订单"], fk: { table: "dwd_production_order", field: "order_id" } },
    { name: "line_id", dataType: "varchar(8)", businessMeaning: "产线ID", synonyms: ["产线"], fk: null },
    { name: "output_qty", dataType: "decimal(18,2)", businessMeaning: "实际产量（吨）", synonyms: ["产量"], fk: null },
    { name: "record_time", dataType: "datetime", businessMeaning: "记录时间", synonyms: [], fk: null },
  ],
  relations: [{ targetTable: "dwd_production_order", cardinality: "N:1", joinField: "order_id" }],
  preview: [
    { id: 500001, order_id: "PO20240113001", line_id: "L01", output_qty: 5230, record_time: TS[0] },
    { id: 500002, order_id: "PO20240114002", line_id: "L02", output_qty: 4180, record_time: TS[1] },
  ],
};

// ============ 质量检验库 (postgresql) ============
const inspectionRecord: MetadataTable = {
  id: "t-inspection-record",
  name: "dwd_inspection_record",
  chineseName: "检验记录表",
  databaseId: "db-quality",
  databaseName: "质量检验库",
  typeKey: "postgresql",
  tableType: "事实表",
  synonyms: ["质检", "检验"],
  description: "质量检验结果记录，用于良品率与缺陷分析。",
  rowCount: 43210,
  fields: [
    { name: "inspection_id", dataType: "varchar(32)", businessMeaning: "检验记录ID，主键", synonyms: ["质检ID"], fk: null },
    { name: "device_id", dataType: "bigint", businessMeaning: "送检设备ID", synonyms: ["设备"], fk: { table: "dwd_device_info", field: "id" } },
    { name: "test_item", dataType: "varchar(32)", businessMeaning: "检验项目", synonyms: [], fk: null },
    { name: "test_value", dataType: "decimal(10,4)", businessMeaning: "检验值", synonyms: [], fk: null },
    { name: "result", dataType: "varchar(4)", businessMeaning: "判定结果（合格/不合格）", synonyms: ["结论"], fk: null },
    { name: "inspect_time", dataType: "datetime", businessMeaning: "检验时间", synonyms: [], fk: null },
  ],
  relations: [
    { targetTable: "dwd_device_info", cardinality: "N:1", joinField: "device_id" },
    { targetTable: "dwd_defect_detail", cardinality: "1:N", joinField: "inspection_id" },
  ],
  preview: [
    { inspection_id: "QC20240113001", device_id: 1001, test_item: "厚度", test_value: 2.5, result: "合格", inspect_time: TS[0] },
    { inspection_id: "QC20240114002", device_id: 1002, test_item: "表面", test_value: 0, result: "不合格", inspect_time: TS[1] },
  ],
};

const defectDetail: MetadataTable = {
  id: "t-defect-detail",
  name: "dwd_defect_detail",
  chineseName: "缺陷明细表",
  databaseId: "db-quality",
  databaseName: "质量检验库",
  typeKey: "postgresql",
  tableType: "事实表",
  synonyms: ["缺陷", "不良"],
  description: "产品缺陷明细，记录缺陷类型与位置。",
  rowCount: 9870,
  fields: [
    { name: "defect_id", dataType: "varchar(32)", businessMeaning: "缺陷ID，主键", synonyms: [], fk: null },
    { name: "inspection_id", dataType: "varchar(32)", businessMeaning: "关联检验记录", synonyms: ["质检"], fk: { table: "dwd_inspection_record", field: "inspection_id" } },
    { name: "defect_type", dataType: "varchar(16)", businessMeaning: "缺陷类型", synonyms: [], fk: null },
    { name: "severity", dataType: "varchar(8)", businessMeaning: "严重程度", synonyms: [], fk: null },
    { name: "location", dataType: "varchar(32)", businessMeaning: "缺陷位置", synonyms: [], fk: null },
  ],
  relations: [{ targetTable: "dwd_inspection_record", cardinality: "N:1", joinField: "inspection_id" }],
  preview: [
    { defect_id: "DF0001", inspection_id: "QC20240114002", defect_type: "表面划伤", severity: "轻微", location: "边部" },
    { defect_id: "DF0002", inspection_id: "QC20240114002", defect_type: "氧化铁皮", severity: "一般", location: "中部" },
  ],
};

// ============ 销售订单库 (oracle) ============
const salesOrder: MetadataTable = {
  id: "t-sales-order",
  name: "dwd_sales_order",
  chineseName: "销售订单表",
  databaseId: "db-sales",
  databaseName: "销售订单库",
  typeKey: "oracle",
  tableType: "事实表",
  synonyms: ["销售", "出货"],
  description: "销售订单主表，用于订单完成率与交付分析。",
  rowCount: 6780,
  fields: [
    { name: "order_no", dataType: "varchar(32)", businessMeaning: "销售订单号，主键", synonyms: ["单号"], fk: null },
    { name: "customer_id", dataType: "bigint", businessMeaning: "客户ID", synonyms: ["客户"], fk: { table: "dim_customer", field: "id" } },
    { name: "amount", dataType: "decimal(18,2)", businessMeaning: "订单金额（元）", synonyms: ["金额"], fk: null },
    { name: "delivery_date", dataType: "datetime", businessMeaning: "交货日期", synonyms: [], fk: null },
    { name: "status", dataType: "varchar(8)", businessMeaning: "订单状态", synonyms: [], fk: null },
  ],
  relations: [{ targetTable: "dim_customer", cardinality: "N:1", joinField: "customer_id" }],
  preview: [
    { order_no: "SO20240113001", customer_id: 201, amount: 128000, delivery_date: TS[0], status: "已完成" },
    { order_no: "SO20240114002", customer_id: 202, amount: 86500, delivery_date: TS[1], status: "逾期" },
  ],
};

const dimCustomer: MetadataTable = {
  id: "t-dim-customer",
  name: "dim_customer",
  chineseName: "客户维表",
  databaseId: "db-sales",
  databaseName: "销售订单库",
  typeKey: "oracle",
  tableType: "维度表",
  synonyms: ["客户", "买方"],
  description: "客户维度表，用于按客户聚合销售与交付指标。",
  rowCount: 320,
  fields: [
    { name: "id", dataType: "bigint", businessMeaning: "客户ID，主键", synonyms: ["客户ID"], fk: null },
    { name: "customer_name", dataType: "varchar(64)", businessMeaning: "客户名称", synonyms: [], fk: null },
    { name: "region", dataType: "varchar(32)", businessMeaning: "所在地区", synonyms: [], fk: null },
    { name: "level", dataType: "varchar(8)", businessMeaning: "客户等级", synonyms: [], fk: null },
  ],
  relations: [{ targetTable: "dwd_sales_order", cardinality: "1:N", joinField: "id" }],
  preview: [
    { id: 201, customer_name: "华东机械厂", region: "上海", level: "A" },
    { id: 202, customer_name: "南方钢构", region: "广东", level: "B" },
  ],
};

export const metadataDatabases: MetadataDatabase[] = [
  { id: "db-device", name: "设备管理库", typeKey: "mysql", tables: [deviceInfo, deviceRuntimeLog, dimWorkshop] },
  { id: "db-prod", name: "生产运营库", typeKey: "mysql", tables: [productionOrder, outputFact] },
  { id: "db-quality", name: "质量检验库", typeKey: "postgresql", tables: [inspectionRecord, defectDetail] },
  { id: "db-sales", name: "销售订单库", typeKey: "oracle", tables: [salesOrder, dimCustomer] },
];

// 所有表扁平（供外键目标表选择）
export const allMetadataTables: MetadataTable[] = metadataDatabases.flatMap((d) => d.tables);

// 按数据源类型筛选数据库
export function getDatabasesByType(typeKey: DataSourceTypeKey | "all"): MetadataDatabase[] {
  if (typeKey === "all") return metadataDatabases;
  return metadataDatabases.filter((d) => d.typeKey === typeKey);
}

// 表名是否命中关键字（表名/中文名/字段名/业务含义/同义词）
export function matchTableKeyword(t: MetadataTable, kw: string): boolean {
  const k = kw.trim().toLowerCase();
  if (!k) return true;
  if (t.name.toLowerCase().includes(k)) return true;
  if (t.chineseName.includes(kw.trim())) return true;
  if (t.synonyms.some((s) => s.toLowerCase().includes(k))) return true;
  if (t.fields.some((f) => f.name.toLowerCase().includes(k) || f.businessMeaning.toLowerCase().includes(k))) return true;
  return false;
}
