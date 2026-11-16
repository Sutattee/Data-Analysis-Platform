import { DataModel, DataMetric } from "@/types";

// 数据模型（树形结构）—— 卷烟厂
export const dataModels: DataModel[] = [
  {
    id: "dm1",
    name: "生产域",
    type: "table",
    description: "卷烟生产制造相关数据模型",
    fields: [],
    children: [
      {
        id: "dm1-1",
        name: "卷接工单表",
        enName: "ods_rolling_order",
        type: "table",
        description: "卷接工序生产工单执行记录",
        fields: [
          { name: "order_id", type: "VARCHAR(32)", description: "工单ID，主键" },
          { name: "machine_no", type: "VARCHAR(16)", description: "卷接机台编号" },
          { name: "brand", type: "VARCHAR(32)", description: "卷烟牌号" },
          { name: "output_qty", type: "DECIMAL(18,2)", description: "产量(箱)" },
          { name: "qualified_qty", type: "DECIMAL(18,2)", description: "合格数" },
          { name: "run_time", type: "DECIMAL(8,2)", description: "运行时间(小时)" },
        ],
      },
      {
        id: "dm1-2",
        name: "包装工单表",
        enName: "ods_packing_order",
        type: "table",
        description: "包装工序生产工单执行记录",
        fields: [
          { name: "order_id", type: "VARCHAR(32)", description: "工单ID，主键" },
          { name: "machine_no", type: "VARCHAR(16)", description: "包装机台编号" },
          { name: "brand", type: "VARCHAR(32)", description: "卷烟牌号" },
          { name: "output_qty", type: "DECIMAL(18,2)", description: "产量(箱)" },
          { name: "qualified_qty", type: "DECIMAL(18,2)", description: "合格数" },
          { name: "run_time", type: "DECIMAL(8,2)", description: "运行时间(小时)" },
        ],
      },
      {
        id: "dm1-3",
        name: "制丝批次表",
        enName: "ods_silk_batch",
        type: "table",
        description: "制丝工序生产批次记录",
        fields: [
          { name: "batch_id", type: "VARCHAR(32)", description: "批次ID，主键" },
          { name: "brand", type: "VARCHAR(32)", description: "卷烟牌号" },
          { name: "input_qty", type: "DECIMAL(18,2)", description: "投料量(公斤)" },
          { name: "moisture", type: "DECIMAL(5,2)", description: "出口水分(%)" },
        ],
      },
    ],
  },
  {
    id: "dm2",
    name: "质量域",
    type: "table",
    description: "卷烟质量管理相关数据模型",
    fields: [],
    children: [
      {
        id: "dm2-1",
        name: "质量检验记录表",
        enName: "ods_quality_inspection",
        type: "table",
        description: "卷烟质量检验结果记录",
        fields: [
          { name: "inspect_id", type: "VARCHAR(32)", description: "检验记录ID" },
          { name: "batch_id", type: "VARCHAR(32)", description: "批次号" },
          { name: "inspect_item", type: "VARCHAR(32)", description: "检验项" },
          { name: "measured_value", type: "DECIMAL(10,4)", description: "实测值" },
          { name: "result", type: "VARCHAR(4)", description: "判定结果" },
        ],
      },
      {
        id: "dm2-2",
        name: "缺陷记录表",
        enName: "ods_defect_record",
        type: "table",
        description: "卷烟缺陷明细",
        fields: [
          { name: "defect_id", type: "VARCHAR(32)", description: "缺陷ID" },
          { name: "defect_type", type: "VARCHAR(16)", description: "缺陷类型" },
          { name: "defect_count", type: "DECIMAL(18,2)", description: "缺陷数量" },
        ],
      },
    ],
  },
  {
    id: "dm3",
    name: "能源域",
    type: "table",
    description: "能源消耗与物料消耗相关数据模型",
    fields: [],
    children: [
      {
        id: "dm3-1",
        name: "物料消耗表",
        enName: "ods_material_consumption",
        type: "table",
        description: "各工序物料消耗计量",
        fields: [
          { name: "meter_id", type: "VARCHAR(32)", description: "计量记录ID" },
          { name: "material_type", type: "VARCHAR(16)", description: "物料类型(烟叶/嘴棒/盘纸/商标纸)" },
          { name: "consumption", type: "DECIMAL(18,4)", description: "消耗量" },
          { name: "output_qty", type: "DECIMAL(18,2)", description: "产量(箱)" },
        ],
      },
      {
        id: "dm3-2",
        name: "能耗计量表",
        enName: "ods_energy_meter",
        type: "table",
        description: "各工序能源消耗计量",
        fields: [
          { name: "meter_id", type: "VARCHAR(32)", description: "计量记录ID" },
          { name: "energy_type", type: "VARCHAR(8)", description: "能源类型" },
          { name: "consumption", type: "DECIMAL(18,4)", description: "消耗量" },
          { name: "process", type: "VARCHAR(16)", description: "工序" },
        ],
      },
    ],
  },
  {
    id: "dm4",
    name: "设备域",
    type: "table",
    description: "卷烟设备管理相关数据模型",
    fields: [],
    children: [
      {
        id: "dm4-1",
        name: "设备运行日志",
        enName: "ods_device_runtime_log",
        type: "table",
        description: "设备运行状态记录",
        fields: [
          { name: "log_id", type: "VARCHAR(32)", description: "日志ID" },
          { name: "machine_no", type: "VARCHAR(16)", description: "机台编号" },
          { name: "status", type: "VARCHAR(8)", description: "运行状态" },
          { name: "run_time", type: "DECIMAL(8,2)", description: "运行时间" },
          { name: "plan_time", type: "DECIMAL(8,2)", description: "计划时间" },
        ],
      },
      {
        id: "dm4-2",
        name: "设备台账",
        enName: "dim_device_info",
        type: "table",
        description: "设备基础信息",
        fields: [
          { name: "machine_no", type: "VARCHAR(16)", description: "机台编号" },
          { name: "machine_name", type: "VARCHAR(64)", description: "设备名称" },
          { name: "process", type: "VARCHAR(16)", description: "所属工序" },
        ],
      },
    ],
  },
];

// 数据指标 —— 卷烟厂
export const dataMetrics: DataMetric[] = [
  { id: "m1", name: "包装设备运行效率", definition: "包装工序实际运行时间/计划时间", dimension: "机台/工序/时间", updateFrequency: "班次/日/周", category: "生产" },
  { id: "m2", name: "卷接设备运行效率", definition: "卷接工序实际运行时间/计划时间", dimension: "机台/工序/时间", updateFrequency: "班次/日/周", category: "生产" },
  { id: "m3", name: "生产效率", definition: "实际产量/计划产量", dimension: "工序/时间", updateFrequency: "日/周", category: "生产" },
  { id: "m4", name: "优质品率", definition: "优质品数/总产品数", dimension: "工序/牌号/时间", updateFrequency: "批次/日", category: "质量" },
  { id: "m5", name: "单箱耗烟叶量", definition: "烟叶消耗量/产量(公斤/箱)", dimension: "牌号/时间", updateFrequency: "日/周/月", category: "物耗" },
  { id: "m6", name: "单箱耗嘴棒量", definition: "嘴棒消耗量/产量(支/箱)", dimension: "牌号/时间", updateFrequency: "日/周/月", category: "物耗" },
  { id: "m7", name: "单箱综合能耗", definition: "综合能耗/产量(公斤标煤/箱)", dimension: "工序/时间", updateFrequency: "日/周/月", category: "能源" },
  { id: "m8", name: "单位产值碳排放量", definition: "CO₂排放当量/产值(吨/万元)", dimension: "时间", updateFrequency: "月度/季度", category: "能源" },
];
