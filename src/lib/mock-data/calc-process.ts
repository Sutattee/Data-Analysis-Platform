// 计算过程 - 指标回溯链路（OEE 示例）
// 层级：指标(metric) → 子指标(submetric) → 基础值(value) → 来源记录(record) → 来源系统(system)

export type CalcNodeType = "metric" | "submetric" | "value" | "record" | "system";

export interface CalcDetail {
  definition?: string;       // 业务定义
  value?: string;            // 当前值
  updateTime?: string;       // 更新时间
  subject?: string;          // 所属主题
  owner?: string;            // 指标负责人
  formula?: string;          // 计算公式
  currentParts?: string;     // 当前参与计算
  dataSources?: string;      // 数据来源
  sourceTable?: string;      // 来源表
  relatedData?: string[];    // 涉及业务数据
  recordContent?: string;    // 记录内容（记录节点）
  systemName?: string;       // 系统名称（系统节点）
  providedMetrics?: string[];// 提供指标（系统节点）
  syncMode?: string;         // 同步方式
  refreshRate?: string;      // 刷新频率
}

export interface CalcNode {
  id: string;
  label: string;
  type: CalcNodeType;
  detail: CalcDetail;
  children?: CalcNode[];
}

const T = "2026-07-17 10:35";

export const oeeCalcTree: CalcNode = {
  id: "oee",
  label: "OEE（设备综合效率）",
  type: "metric",
  detail: {
    definition: "设备综合效率（Overall Equipment Effectiveness），用于衡量设备综合利用效率，综合反映可用率、性能效率、质量率。",
    value: "85.37%",
    updateTime: T,
    subject: "设备管理",
    owner: "设备管理部",
    formula: "OEE = Availability × Performance × Quality",
    currentParts: "Availability 92.6%　Performance 96.3%　Quality 95.8%",
    dataSources: "MES 系统、QMS 系统",
    relatedData: ["停机记录", "工单记录", "检验记录"],
  },
  children: [
    {
      id: "availability",
      label: "Availability（可用率）",
      type: "submetric",
      detail: {
        definition: "设备实际运行时间占计划生产时间的比例，反映设备可投入生产的时间占比。",
        value: "92.6%",
        updateTime: T,
        subject: "设备管理",
        owner: "设备管理部",
        formula: "运行时间 ÷ 计划生产时间",
        dataSources: "MES 系统",
        relatedData: ["停机记录", "运行记录", "保养记录"],
      },
      children: [
        {
          id: "run_time",
          label: "运行时间",
          type: "value",
          detail: {
            definition: "设备实际运行的累计时长。",
            value: "22.4 小时",
            updateTime: T,
            subject: "设备管理",
            owner: "设备管理部",
            formula: "运行结束时间 − 运行开始时间 − 停机时间",
          },
          children: [
            {
              id: "run_log",
              label: "运行记录",
              type: "record",
              detail: {
                definition: "设备启停与运行过程生成的记录。",
                recordContent: "设备ID、运行开始时间、运行结束时间、运行状态、累计时长",
                dataSources: "MES 系统",
                sourceTable: "run_time",
              },
              children: [
                { id: "mes1", label: "MES 系统", type: "system", detail: { systemName: "制造执行系统（MES）", providedMetrics: ["运行时间", "停机记录", "工单记录", "设备状态", "生产记录"], syncMode: "实时同步", refreshRate: "5 分钟" } },
              ],
            },
          ],
        },
        {
          id: "plan_time",
          label: "计划时间",
          type: "value",
          detail: {
            definition: "计划生产的时长。",
            value: "24.2 小时",
            updateTime: T,
            subject: "设备管理",
            owner: "设备管理部",
            formula: "班次时长 − 计划停机时长",
          },
          children: [
            {
              id: "stop_log",
              label: "停机记录",
              type: "record",
              detail: {
                definition: "设备发生停机事件时生成的记录。",
                recordContent: "停机开始时间、停机结束时间、停机原因、停机时长、责任班组、责任设备",
                dataSources: "MES 系统",
                sourceTable: "device_stop_log",
              },
              children: [
                { id: "mes2", label: "MES 系统", type: "system", detail: { systemName: "制造执行系统（MES）", providedMetrics: ["运行时间", "停机记录", "工单记录", "设备状态", "生产记录"], syncMode: "实时同步", refreshRate: "5 分钟" } },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "performance",
      label: "Performance（性能效率）",
      type: "submetric",
      detail: {
        definition: "设备实际运行速度与理论运行速度的比值，用于衡量设备运行效率。",
        value: "96.4%",
        updateTime: T,
        subject: "设备管理",
        owner: "设备管理部",
        formula: "Performance = 实际产量 ÷ 理论产量",
        currentParts: "实际产量 2,410 件，理论产量 2,500 件",
        dataSources: "MES 系统",
        relatedData: ["工单记录", "生产记录", "设备节拍记录"],
      },
      children: [
        {
          id: "actual_output",
          label: "实际产量",
          type: "value",
          detail: {
            definition: "设备实际产出的数量。",
            value: "2,410 件",
            updateTime: T,
            subject: "设备管理",
            owner: "设备管理部",
            formula: "SUM(工单实际产出)",
          },
          children: [
            {
              id: "work_order",
              label: "工单记录",
              type: "record",
              detail: {
                definition: "生产工单执行过程的记录。",
                recordContent: "工单号、产品、计划量、实际产出、状态、班次",
                dataSources: "MES 系统",
                sourceTable: "work_order",
              },
              children: [
                { id: "mes3", label: "MES 系统", type: "system", detail: { systemName: "制造执行系统（MES）", providedMetrics: ["运行时间", "停机记录", "工单记录", "设备状态", "生产记录"], syncMode: "实时同步", refreshRate: "5 分钟" } },
              ],
            },
          ],
        },
        {
          id: "theory_output",
          label: "理论产量",
          type: "value",
          detail: {
            definition: "按理论节拍计算的应产数量。",
            value: "2,500 件",
            updateTime: T,
            subject: "设备管理",
            owner: "设备管理部",
            formula: "运行时长 × 设备节拍",
          },
          children: [
            {
              id: "beat_log",
              label: "设备节拍记录",
              type: "record",
              detail: {
                definition: "设备理论生产节拍的配置记录。",
                recordContent: "设备ID、产品、理论节拍（件/分钟）、生效区间",
                dataSources: "MES 系统",
                sourceTable: "device_beat",
              },
              children: [
                { id: "mes4", label: "MES 系统", type: "system", detail: { systemName: "制造执行系统（MES）", providedMetrics: ["运行时间", "停机记录", "工单记录", "设备状态", "生产记录"], syncMode: "实时同步", refreshRate: "5 分钟" } },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "quality",
      label: "Quality（质量合格率）",
      type: "submetric",
      detail: {
        definition: "合格品数量占总产量的比例，衡量产品质量合格率。",
        value: "95.8%",
        updateTime: T,
        subject: "质量管理",
        owner: "质量管理部",
        formula: "合格品数 ÷ 总产量",
        dataSources: "QMS 系统",
        relatedData: ["检验记录"],
      },
      children: [
        {
          id: "qualified",
          label: "合格品数",
          type: "value",
          detail: {
            definition: "检验合格的成品数量。",
            value: "2,310 件",
            updateTime: T,
            subject: "质量管理",
            owner: "质量管理部",
            formula: "COUNT(检验结果 = 合格)",
          },
          children: [
            {
              id: "inspection",
              label: "检验记录",
              type: "record",
              detail: {
                definition: "质量检验结果记录。",
                recordContent: "检验项、检验值、判定结果、检验时间、批次",
                dataSources: "QMS 系统",
                sourceTable: "inspection",
              },
              children: [
                { id: "qms1", label: "QMS 系统", type: "system", detail: { systemName: "质量管理系统（QMS）", providedMetrics: ["检验记录", "缺陷记录", "合格率"], syncMode: "定时同步", refreshRate: "10 分钟" } },
              ],
            },
          ],
        },
        {
          id: "total_output",
          label: "总产量",
          type: "value",
          detail: {
            definition: "产出总量。",
            value: "2,410 件",
            updateTime: T,
            subject: "设备管理",
            owner: "设备管理部",
            formula: "SUM(产出)",
          },
          children: [
            {
              id: "work_order2",
              label: "工单记录",
              type: "record",
              detail: {
                definition: "生产工单执行过程的记录。",
                recordContent: "工单号、产品、计划量、实际产出、状态、班次",
                dataSources: "MES 系统",
                sourceTable: "work_order",
              },
              children: [
                { id: "mes5", label: "MES 系统", type: "system", detail: { systemName: "制造执行系统（MES）", providedMetrics: ["运行时间", "停机记录", "工单记录", "设备状态", "生产记录"], syncMode: "实时同步", refreshRate: "5 分钟" } },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// 节点类型 → 样式
export const NODE_STYLE: Record<CalcNodeType, { card: string; tag: string; tagLabel: string }> = {
  metric: { card: "border-primary-300 bg-primary-50", tag: "bg-primary-600 text-white", tagLabel: "指标" },
  submetric: { card: "border-blue-300 bg-blue-50", tag: "bg-blue-600 text-white", tagLabel: "子指标" },
  value: { card: "border-gray-300 bg-white", tag: "bg-gray-500 text-white", tagLabel: "基础值" },
  record: { card: "border-amber-300 bg-amber-50", tag: "bg-amber-600 text-white", tagLabel: "来源记录" },
  system: { card: "border-emerald-300 bg-emerald-50", tag: "bg-emerald-600 text-white", tagLabel: "来源系统" },
};
