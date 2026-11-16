// 数据预览 mock 数据（智能问数「选择数据范围」→ 数据表预览面板）
// - 与 data-assets.ts 的 9 张子表一一对应（键为表 id，如 dm1-1）；
//   字段为 data-assets 业务字段的扩展集（演示更完整的字段清单）
// - questions：推荐问题，模拟由后台「元数据管理」页配置后同步（问数侧只读快照，不可增删改）
// - rows：预览数据，按确定性规则生成（最多前 100 行；台账类小表生成自然行数）

export interface PreviewField {
  name: string;       // 字段英文名
  type: string;       // 数据类型
  description: string; // 字段说明
}

export interface TablePreviewData {
  fields: PreviewField[];
  questions: string[];
  rows: Record<string, string | number>[];
}

// ---------- 生成工具（确定性，无随机） ----------
const BRANDS = ["云烟(软珍品)", "云烟(紫)", "红塔山(硬经典)", "玉溪(软)"];
const OPERATORS = ["王强", "李敏", "赵磊", "陈静"];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
// 日期序列：2026-11-01 起循环（i 从 1 开始）
function dateOf(i: number) {
  return `2026-11-${pad(((i - 1) % 13) + 1)}`;
}
function clockOf(i: number) {
  return `${pad((i * 3) % 24)}:${pad((i * 17) % 60)}:00`;
}
function rowList(n: number, gen: (i: number) => Record<string, string | number>) {
  return Array.from({ length: n }, (_, k) => gen(k + 1));
}
const round2 = (n: number) => +(n.toFixed(2));

// ---------- 表数据 ----------
const TABLE_PREVIEWS: Record<string, TablePreviewData> = {
  // 卷接工单表（21 字段 / 5 个推荐问题）
  "dm1-1": {
    fields: [
      { name: "order_id", type: "VARCHAR(32)", description: "工单ID，主键" },
      { name: "machine_no", type: "VARCHAR(16)", description: "卷接机台编号" },
      { name: "brand", type: "VARCHAR(32)", description: "卷烟牌号" },
      { name: "batch_no", type: "VARCHAR(32)", description: "关联批次号" },
      { name: "workshop", type: "VARCHAR(32)", description: "所属车间" },
      { name: "team", type: "VARCHAR(16)", description: "班组" },
      { name: "shift", type: "VARCHAR(8)", description: "班次（白班/夜班）" },
      { name: "plan_qty", type: "DECIMAL(18,2)", description: "计划产量(箱)" },
      { name: "output_qty", type: "DECIMAL(18,2)", description: "实际产量(箱)" },
      { name: "qualified_qty", type: "DECIMAL(18,2)", description: "合格数(箱)" },
      { name: "defect_qty", type: "DECIMAL(18,2)", description: "缺陷数(万支)" },
      { name: "scrap_qty", type: "DECIMAL(18,2)", description: "废丝量(公斤)" },
      { name: "run_time", type: "DECIMAL(8,2)", description: "运行时间(小时)" },
      { name: "stop_time", type: "DECIMAL(8,2)", description: "停机时间(分钟)" },
      { name: "stop_count", type: "INT", description: "停机次数" },
      { name: "speed_avg", type: "DECIMAL(10,2)", description: "平均车速(支/分)" },
      { name: "temp", type: "DECIMAL(5,2)", description: "车间温度(℃)" },
      { name: "humidity", type: "DECIMAL(5,2)", description: "车间湿度(%RH)" },
      { name: "weight_stick", type: "DECIMAL(8,2)", description: "单支重量(mg)" },
      { name: "operator", type: "VARCHAR(16)", description: "当班操作工" },
      { name: "record_time", type: "DATETIME", description: "工单记录时间" },
    ],
    questions: [
      "各卷接机台本月产量对比如何？",
      "卷接工序计划产量完成率是多少？",
      "分析各牌号卷接合格率差异",
      "卷接机台停机时间分布情况？",
      "近30天卷接平均车速变化趋势",
    ],
    rows: rowList(100, (i) => {
      const plan = 480 + (i % 9) * 10;
      const output = plan - (i % 7);
      return {
        order_id: `JO-2026-${1000 + i}`,
        machine_no: `JJ-${pad((i % 10) + 1)}#`,
        brand: BRANDS[i % BRANDS.length],
        batch_no: `P-2611-${pad((i % 20) + 1)}`,
        workshop: "卷包车间",
        team: `${(i % 4) + 1}班`,
        shift: i % 2 === 0 ? "白班" : "夜班",
        plan_qty: plan,
        output_qty: output,
        qualified_qty: output - (i % 4),
        defect_qty: i % 5,
        scrap_qty: round2(6 + (i % 8) * 0.5),
        run_time: round2(7.2 + (i % 6) * 0.15),
        stop_time: i % 35,
        stop_count: i % 4,
        speed_avg: 6800 + (i % 11) * 40,
        temp: round2(22 + (i % 5) * 0.4),
        humidity: round2(58 + (i % 7) * 0.8),
        weight_stick: round2(0.88 + (i % 6) * 0.01),
        operator: OPERATORS[i % 4],
        record_time: `${dateOf(i)} ${clockOf(i)}`,
      };
    }),
  },

  // 包装工单表（12 字段 / 4 个推荐问题）
  "dm1-2": {
    fields: [
      { name: "order_id", type: "VARCHAR(32)", description: "工单ID，主键" },
      { name: "machine_no", type: "VARCHAR(16)", description: "包装机台编号" },
      { name: "brand", type: "VARCHAR(32)", description: "卷烟牌号" },
      { name: "batch_no", type: "VARCHAR(32)", description: "关联批次号" },
      { name: "shift", type: "VARCHAR(8)", description: "班次（白班/夜班）" },
      { name: "plan_qty", type: "DECIMAL(18,2)", description: "计划产量(箱)" },
      { name: "output_qty", type: "DECIMAL(18,2)", description: "实际产量(箱)" },
      { name: "qualified_qty", type: "DECIMAL(18,2)", description: "合格数(箱)" },
      { name: "reject_qty", type: "DECIMAL(18,2)", description: "废品数(箱)" },
      { name: "run_time", type: "DECIMAL(8,2)", description: "运行时间(小时)" },
      { name: "material_used", type: "DECIMAL(18,2)", description: "包装辅料用量(公斤)" },
      { name: "record_time", type: "DATETIME", description: "工单记录时间" },
    ],
    questions: [
      "各包装机台运行效率排名？",
      "包装工序废品率趋势分析",
      "对比各牌号包装产量",
      "包装机台停机原因分布？",
    ],
    rows: rowList(100, (i) => {
      const plan = 460 + (i % 8) * 12;
      const output = plan - (i % 6);
      return {
        order_id: `BO-2026-${2000 + i}`,
        machine_no: `BZ-${pad((i % 8) + 1)}#`,
        brand: BRANDS[(i + 1) % BRANDS.length],
        batch_no: `P-2611-${pad((i % 18) + 1)}`,
        shift: i % 2 === 0 ? "白班" : "夜班",
        plan_qty: plan,
        output_qty: output,
        qualified_qty: output - (i % 3),
        reject_qty: i % 3,
        run_time: round2(7.0 + (i % 5) * 0.2),
        material_used: round2(120 + (i % 9) * 3.5),
        record_time: `${dateOf(i)} ${clockOf(i + 4)}`,
      };
    }),
  },

  // 制丝批次表（10 字段 / 3 个推荐问题）
  "dm1-3": {
    fields: [
      { name: "batch_id", type: "VARCHAR(32)", description: "批次ID，主键" },
      { name: "brand", type: "VARCHAR(32)", description: "卷烟牌号" },
      { name: "line_no", type: "VARCHAR(8)", description: "制丝生产线编号" },
      { name: "input_qty", type: "DECIMAL(18,2)", description: "投料量(公斤)" },
      { name: "output_qty", type: "DECIMAL(18,2)", description: "产出量(公斤)" },
      { name: "moisture", type: "DECIMAL(5,2)", description: "出口水分(%)" },
      { name: "temp", type: "DECIMAL(5,2)", description: "出口温度(℃)" },
      { name: "processing_time", type: "DECIMAL(8,2)", description: "加工时长(小时)" },
      { name: "shift", type: "VARCHAR(8)", description: "班次" },
      { name: "record_time", type: "DATETIME", description: "批次记录时间" },
    ],
    questions: ["制丝批次出口水分合格率？", "各制丝线投料量对比", "制丝批次加工时长分布"],
    rows: rowList(100, (i) => ({
      batch_id: `P-2611-${pad(i)}`,
      brand: BRANDS[(i + 2) % BRANDS.length],
      line_no: `SL-${(i % 3) + 1}`,
      input_qty: 5200 + (i % 11) * 60,
      output_qty: 5100 + (i % 10) * 58,
      moisture: round2(12.2 + (i % 9) * 0.15),
      temp: round2(58 + (i % 6) * 0.5),
      processing_time: round2(3.4 + (i % 7) * 0.1),
      shift: i % 2 === 0 ? "白班" : "夜班",
      record_time: `${dateOf(i)} ${clockOf(i + 8)}`,
    })),
  },

  // 质量检验记录表（12 字段 / 4 个推荐问题）
  "dm2-1": {
    fields: [
      { name: "inspect_id", type: "VARCHAR(32)", description: "检验记录ID，主键" },
      { name: "batch_id", type: "VARCHAR(32)", description: "批次号" },
      { name: "brand", type: "VARCHAR(32)", description: "卷烟牌号" },
      { name: "inspect_item", type: "VARCHAR(32)", description: "检验项" },
      { name: "standard_value", type: "DECIMAL(10,4)", description: "标准值" },
      { name: "measured_value", type: "DECIMAL(10,4)", description: "实测值" },
      { name: "deviation", type: "DECIMAL(10,4)", description: "偏差" },
      { name: "result", type: "VARCHAR(4)", description: "判定结果（合格/不合格）" },
      { name: "grade", type: "VARCHAR(8)", description: "判定等级（优等/合格/不合格）" },
      { name: "inspector", type: "VARCHAR(16)", description: "检验员" },
      { name: "inspect_time", type: "DATETIME", description: "检验时间" },
      { name: "remark", type: "VARCHAR(128)", description: "备注" },
    ],
    questions: [
      "各工序质量检验合格率？",
      "水分检测值分布情况",
      "对比各牌号实测值与标准值偏差",
      "近一周质量检验不合格记录",
    ],
    rows: rowList(100, (i) => {
      const item = ["出口水分", "单支重量", "吸阻", "圆周", "长度"][i % 5];
      const std = [12.5, 0.9, 1050, 24.5, 84][i % 5];
      const measured = round2(std + ((i % 7) - 3) * 0.05);
      return {
        inspect_id: `QC-26-${5000 + i}`,
        batch_id: `P-2611-${pad((i % 25) + 1)}`,
        brand: BRANDS[i % BRANDS.length],
        inspect_item: item,
        standard_value: std,
        measured_value: measured,
        deviation: round2(measured - std),
        result: i % 9 === 0 ? "不合格" : "合格",
        grade: i % 9 === 0 ? "不合格" : i % 3 === 0 ? "优等" : "合格",
        inspector: OPERATORS[(i + 1) % 4],
        inspect_time: `${dateOf(i)} ${clockOf(i + 12)}`,
        remark: i % 9 === 0 ? "偏差超限，已通知工艺员" : "",
      };
    }),
  },

  // 缺陷记录表（8 字段 / 3 个推荐问题）
  "dm2-2": {
    fields: [
      { name: "defect_id", type: "VARCHAR(32)", description: "缺陷ID，主键" },
      { name: "batch_id", type: "VARCHAR(32)", description: "批次号" },
      { name: "defect_type", type: "VARCHAR(16)", description: "缺陷类型（空头/漏气/皱褶/其他）" },
      { name: "defect_count", type: "DECIMAL(18,2)", description: "缺陷数量(支)" },
      { name: "discover_process", type: "VARCHAR(16)", description: "发现工序" },
      { name: "responsible_dept", type: "VARCHAR(32)", description: "责任部门" },
      { name: "handler", type: "VARCHAR(16)", description: "处理人" },
      { name: "record_time", type: "DATETIME", description: "记录时间" },
    ],
    questions: ["缺陷类型分布及占比？", "各工序缺陷数量排名", "近30天缺陷数量趋势"],
    rows: rowList(100, (i) => ({
      defect_id: `DF-26-${7000 + i}`,
      batch_id: `P-2611-${pad((i % 22) + 1)}`,
      defect_type: ["空头", "漏气", "皱褶", "其他"][i % 4],
      defect_count: (i % 6) * 2 + 1,
      discover_process: ["制丝", "卷接", "包装", "成品"][i % 4],
      responsible_dept: ["制丝车间", "卷包车间", "卷包车间", "质检科"][i % 4],
      handler: OPERATORS[(i + 2) % 4],
      record_time: `${dateOf(i)} ${clockOf(i + 16)}`,
    })),
  },

  // 物料消耗表（10 字段 / 4 个推荐问题）
  "dm3-1": {
    fields: [
      { name: "meter_id", type: "VARCHAR(32)", description: "计量记录ID，主键" },
      { name: "material_type", type: "VARCHAR(16)", description: "物料类型（烟叶/嘴棒/盘纸/商标纸）" },
      { name: "workshop", type: "VARCHAR(32)", description: "车间" },
      { name: "consumption", type: "DECIMAL(18,4)", description: "消耗量(公斤/万支)" },
      { name: "output_qty", type: "DECIMAL(18,2)", description: "对应产量(箱)" },
      { name: "unit_consumption", type: "DECIMAL(18,4)", description: "单箱消耗" },
      { name: "price", type: "DECIMAL(10,2)", description: "单价(元)" },
      { name: "amount", type: "DECIMAL(18,2)", description: "金额(元)" },
      { name: "batch_no", type: "VARCHAR(32)", description: "关联批次号" },
      { name: "record_time", type: "DATETIME", description: "计量时间" },
    ],
    questions: [
      "单箱耗烟叶量趋势分析",
      "各工序物料消耗排名",
      "物料成本构成分析",
      "对比各牌号辅料消耗差异",
    ],
    rows: rowList(100, (i) => {
      const mtype = ["烟叶", "嘴棒", "盘纸", "商标纸"][i % 4];
      const consumption = round2(38 + (i % 8) * 1.5);
      const output = 420 + (i % 7) * 9;
      const price = [58, 0.42, 0.065, 0.31][i % 4];
      return {
        meter_id: `MT-26-${8000 + i}`,
        material_type: mtype,
        workshop: ["制丝车间", "卷包车间"][i % 2],
        consumption,
        output_qty: output,
        unit_consumption: round2(consumption / output),
        price,
        amount: round2(consumption * price * 100),
        batch_no: `P-2611-${pad((i % 15) + 1)}`,
        record_time: `${dateOf(i)} ${clockOf(i + 20)}`,
      };
    }),
  },

  // 能耗计量表（10 字段 / 4 个推荐问题）
  "dm3-2": {
    fields: [
      { name: "meter_id", type: "VARCHAR(32)", description: "计量记录ID，主键" },
      { name: "energy_type", type: "VARCHAR(8)", description: "能源类型（电/水/蒸汽/天然气）" },
      { name: "process", type: "VARCHAR(16)", description: "工序" },
      { name: "consumption", type: "DECIMAL(18,4)", description: "消耗量(单位随能源类型)" },
      { name: "output_qty", type: "DECIMAL(18,2)", description: "对应产量(箱)" },
      { name: "unit_consumption", type: "DECIMAL(18,4)", description: "单箱能耗(折标)" },
      { name: "peak_consumption", type: "DECIMAL(18,4)", description: "峰时消耗" },
      { name: "valley_consumption", type: "DECIMAL(18,4)", description: "谷时消耗" },
      { name: "cost", type: "DECIMAL(18,2)", description: "费用(元)" },
      { name: "record_time", type: "DATETIME", description: "计量时间" },
    ],
    questions: [
      "单箱综合能耗趋势如何？",
      "各工序电耗对比",
      "峰谷用电分布分析",
      "水电汽分项能耗占比",
    ],
    rows: rowList(100, (i) => {
      const etype = ["电", "水", "蒸汽", "天然气"][i % 4];
      const consumption = round2(2400 + (i % 9) * 130);
      const output = 450 + (i % 6) * 8;
      return {
        meter_id: `EN-26-${9000 + i}`,
        energy_type: etype,
        process: ["制丝", "卷接", "包装", "动力"][i % 4],
        consumption,
        output_qty: output,
        unit_consumption: round2(consumption / output),
        peak_consumption: round2(consumption * 0.62),
        valley_consumption: round2(consumption * 0.38),
        cost: round2(consumption * [0.65, 3.8, 220, 3.2][i % 4] / 10),
        record_time: `${dateOf(i)} ${clockOf(i + 6)}`,
      };
    }),
  },

  // 设备运行日志（9 字段 / 3 个推荐问题）
  "dm4-1": {
    fields: [
      { name: "log_id", type: "VARCHAR(32)", description: "日志ID，主键" },
      { name: "machine_no", type: "VARCHAR(16)", description: "机台编号" },
      { name: "process", type: "VARCHAR(16)", description: "所属工序" },
      { name: "status", type: "VARCHAR(8)", description: "运行状态（运行/停机/维护）" },
      { name: "run_time", type: "DECIMAL(8,2)", description: "运行时间(小时)" },
      { name: "plan_time", type: "DECIMAL(8,2)", description: "计划时间(小时)" },
      { name: "stop_reason", type: "VARCHAR(64)", description: "停机原因" },
      { name: "operator", type: "VARCHAR(16)", description: "当班人员" },
      { name: "record_time", type: "DATETIME", description: "记录时间" },
    ],
    questions: ["各机台设备运行效率如何？", "设备停机原因分布", "近一周设备故障趋势"],
    rows: rowList(100, (i) => {
      const run = round2(6.4 + (i % 7) * 0.2);
      const stopped = i % 8 === 0;
      return {
        log_id: `LG-26-${3000 + i}`,
        machine_no: `${i % 2 === 0 ? "JJ" : "BZ"}-${pad((i % 10) + 1)}#`,
        process: i % 2 === 0 ? "卷接" : "包装",
        status: stopped ? "停机" : i % 13 === 0 ? "维护" : "运行",
        run_time: stopped ? 0 : run,
        plan_time: 8,
        stop_reason: stopped ? ["换纸", "故障检修", "待料", "计划停机"][i % 4] : "",
        operator: OPERATORS[i % 4],
        record_time: `${dateOf(i)} ${clockOf(i + 2)}`,
      };
    }),
  },

  // 设备台账（8 字段 / 3 个推荐问题；台账小表，自然行数 24）
  "dm4-2": {
    fields: [
      { name: "machine_no", type: "VARCHAR(16)", description: "机台编号，主键" },
      { name: "machine_name", type: "VARCHAR(64)", description: "设备名称" },
      { name: "process", type: "VARCHAR(16)", description: "所属工序" },
      { name: "model", type: "VARCHAR(64)", description: "设备型号" },
      { name: "workshop", type: "VARCHAR(32)", description: "所属车间" },
      { name: "install_date", type: "DATE", description: "投用日期" },
      { name: "status", type: "VARCHAR(8)", description: "设备状态（在用/停用/维修）" },
      { name: "maintenance_cycle", type: "INT", description: "保养周期(天)" },
    ],
    questions: ["各工序设备数量统计", "在用设备占比", "设备保养计划一览"],
    rows: rowList(24, (i) => ({
      machine_no: `${i % 3 === 0 ? "JJ" : i % 3 === 1 ? "BZ" : "SL"}-${pad(i)}#`,
      machine_name: [
        "PROTOS-70卷接机", "GD-X1包装机", "ZJ17卷接机", "FOCKE350包装机", "制丝生产线烘丝机",
      ][i % 5],
      process: ["卷接", "包装", "制丝"][i % 3],
      model: ["P-70", "GDX1", "ZJ17", "F350", "SH9"][i % 5],
      workshop: ["卷包车间", "卷包车间", "制丝车间"][i % 3],
      install_date: `20${18 + (i % 7)}-0${(i % 9) + 1}-15`,
      status: i % 8 === 0 ? "维修" : i % 11 === 0 ? "停用" : "在用",
      maintenance_cycle: [30, 45, 60, 90][i % 4],
    })),
  },
};

// 取某张数据表的预览数据（未配置的表返回 undefined，面板展示空态）
export function getDataPreview(tableId: string): TablePreviewData | undefined {
  return TABLE_PREVIEWS[tableId];
}
