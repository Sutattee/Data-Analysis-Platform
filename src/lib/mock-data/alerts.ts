import type {
  AlertRecord,
  AlertLevel,
  AlertType,
  AlertDomain,
} from "@/types";

// ========== 筛选项枚举 ==========
export const ALERT_LEVELS: AlertLevel[] = ["提示", "关注", "预警", "告警", "危险"];
export const ALERT_TYPES: AlertType[] = ["当前异常", "预测风险"];
export const ALERT_DOMAINS: AlertDomain[] = ["生产管理", "工艺质量", "能源消耗"];

// ========== 等级优先级（数值越大越严重，用于默认排序） ==========
export const LEVEL_PRIORITY: Record<AlertLevel, number> = {
  提示: 1,
  关注: 2,
  预警: 3,
  告警: 4,
  危险: 5,
};

// 按等级优先级降序 + 触发时间倒序（同等级最新优先）
export function sortAlerts(records: AlertRecord[]): AlertRecord[] {
  return [...records].sort((a, b) => {
    const p = LEVEL_PRIORITY[b.level] - LEVEL_PRIORITY[a.level];
    if (p !== 0) return p;
    // triggerTime 为定长 "YYYY-MM-DD HH:mm"，可直接按字符串倒序
    return b.triggerTime.localeCompare(a.triggerTime);
  });
}

// ========== 告警对象模板（钢铁制造场景，供策略页"指定对象"复用） ==========
export interface AlertObject {
  code: string;
  name: string;
  domain: AlertDomain;
  metric: string;   // 指标中文名
  target: number;   // 基准目标值
  unit: string;     // 单位
  low: boolean;     // true=低于目标为异常；false=高于目标为异常
}

export const ALERT_OBJECTS: AlertObject[] = [
  { code: "PACK-002", name: "卷包车间2号包装机", domain: "生产管理", metric: "包装设备运行效率", target: 85, unit: "%", low: true },
  { code: "BF-001", name: "1号高炉", domain: "生产管理", metric: "高炉利用系数", target: 2.4, unit: "t/(m³·d)", low: true },
  { code: "BF-002", name: "2号高炉", domain: "生产管理", metric: "热风温度", target: 1180, unit: "℃", low: true },
  { code: "HR-003", name: "热轧产线3号", domain: "生产管理", metric: "轧制节奏", target: 22, unit: "块/小时", low: true },
  { code: "CR-001", name: "冷轧产线1号", domain: "工艺质量", metric: "板形合格率", target: 96, unit: "%", low: true },
  { code: "CC-001", name: "1号连铸机", domain: "工艺质量", metric: "铸坯合格率", target: 98.5, unit: "%", low: true },
  { code: "GA-001", name: "镀锌线1号", domain: "工艺质量", metric: "锌层重量合格率", target: 95, unit: "%", low: true },
  { code: "EM-01", name: "厂区电力能源网格", domain: "能源消耗", metric: "吨钢综合能耗", target: 580, unit: "kgce/t", low: false },
  { code: "EM-02", name: "高炉煤气能源网格", domain: "能源消耗", metric: "煤气放散率", target: 1.5, unit: "%", low: false },
  { code: "EQ-MILL-7", name: "7号轧机主电机", domain: "生产管理", metric: "设备振动幅值", target: 4.5, unit: "mm/s", low: false },
  { code: "EQ-BLV-1", name: "高炉鼓风机", domain: "生产管理", metric: "轴承温度", target: 78, unit: "℃", low: false },
  { code: "WQ-01", name: "循环水能源网格", domain: "能源消耗", metric: "循环水吨钢电耗", target: 32, unit: "kWh/t", low: false },
  { code: "EM-03", name: "空压能源网格", domain: "能源消耗", metric: "空压站吨钢电耗", target: 45, unit: "kWh/t", low: false },
  { code: "EM-04", name: "蒸汽能源网格", domain: "能源消耗", metric: "蒸汽管网损耗率", target: 8, unit: "%", low: false },
];

// ========== 接收人候选池（供策略页"接收人"多选搜索复用） ==========
export const ALERT_USERS = [
  { username: "zhangwei", name: "张伟" },
  { username: "liqiang", name: "李强" },
  { username: "wangfang", name: "王芳" },
  { username: "liuyang", name: "刘洋" },
  { username: "chenjing", name: "陈静" },
  { username: "zhaolei", name: "赵磊" },
  { username: "sunming", name: "孙明" },
  { username: "zhouting", name: "周婷" },
  { username: "gaoyadong", name: "高亚东" },
  { username: "wumin", name: "吴敏" },
];

const NOTIFY_COMBOS: string[][] = [
  ["邮件"],
];
const HANDLE_NOTES = [
  "检查发现封签供给装置卡料，清理后设备恢复运行。",
  "校准传感器并复测，指标已回到目标区间。",
  "调整工艺参数，加强巡检频次，趋势已稳定。",
  "联系维保更换易损件，设备运行恢复正常。",
  "确认系采样误差，已重新取样复核无误。",
];
const CAUSES = [
  (o: AlertObject) => `${o.name}停机时间增加，导致${o.metric}下降。`,
  (o: AlertObject) => `近期原料成分波动，影响${o.metric}。`,
  (o: AlertObject) => `${o.name}传感器读数漂移，数据待复核。`,
];
const SUGGESTIONS = [
  (o: AlertObject) => `检查供给机构及传感器，故障排除后复核${o.metric}。`,
  (o: AlertObject) => `校准传感器并加强巡检，关注趋势变化。`,
  (o: AlertObject) => `调整工艺参数，必要时安排检修。`,
];
const DURATIONS = ["8分钟", "25分钟", "42分钟", "1小时10分钟", "2小时5分钟"];

// 等级偏离幅度（用于推导指标值）
const LEVEL_GAP: Record<AlertLevel, number> = { 提示: 1, 关注: 3, 预警: 5, 告警: 8, 危险: 12 };

// ========== 确定性时间生成（固定基准，保证刷新数据稳定） ==========
const BASE_TS = new Date("2026-07-09T08:00:00").getTime();
function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function pad3(n: number) {
  return n < 10 ? `00${n}` : n < 100 ? `0${n}` : `${n}`;
}
function tsAt(offsetMin: number): string {
  const d = new Date(BASE_TS + offsetMin * 60000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ========== 生成 56 条告警记录（确定性；对象 14 个 × 4 条，保证各业务域均有 5 个等级样本） ==========
export const ALERT_RECORDS: AlertRecord[] = Array.from({ length: 56 }, (_, i) => {
  const obj = ALERT_OBJECTS[i % ALERT_OBJECTS.length];
  const level = ALERT_LEVELS[i % ALERT_LEVELS.length];
  const type = ALERT_TYPES[i % 2 === 0 ? 0 : 1];
  const gap = LEVEL_GAP[level];
  const triggerMin = i * 311; // 触发时间步进
  const triggerTime = tsAt(triggerMin);
  const receiver = ALERT_USERS[i % ALERT_USERS.length].name;
  const notifyMethods = NOTIFY_COMBOS[i % NOTIFY_COMBOS.length];
  const handled = i % 3 === 0; // 约 1/3 已处理

  // 告警值：当前异常=已越界；预测风险=接近但未越界
  const deviated = obj.target + (obj.low ? -gap : gap);
  const approaching = obj.target + (obj.low ? -gap * 0.6 : gap * 0.6);
  const valueLabel =
    type === "当前异常" ? `当前值${deviated.toFixed(1)}${obj.unit}` : `预测值${approaching.toFixed(1)}${obj.unit}`;
  const baselineLabel =
    type === "当前异常"
      ? `基准值${obj.target.toFixed(1)}${obj.unit}`
      : `${obj.low ? "目标下限" : "目标上限"}${obj.target.toFixed(1)}${obj.unit}`;
  const deviation =
    type === "当前异常"
      ? `${obj.low ? "低于基准" : "超出上限"}${gap.toFixed(1)}%`
      : `预计${obj.low ? "低于" : "超出"}${(gap * 0.6).toFixed(1)}%`;

  // 标题
  const title =
    type === "当前异常"
      ? obj.low
        ? `${obj.name}${obj.metric}低于基准`
        : `${obj.name}${obj.metric}超出上限`
      : obj.low
        ? `${obj.name}${obj.metric}呈下降趋势，预计跌破目标`
        : `${obj.name}${obj.metric}持续上升，预计超出阈值`;

  // 预计越界时间（预测风险）：格式化为"预计YYYY年M月越界"
  let forecastTime: string | undefined;
  if (type === "预测风险") {
    const fd = new Date(BASE_TS + (triggerMin + 60 * 24 * 15) * 60000);
    forecastTime = `预计${fd.getFullYear()}年${fd.getMonth() + 1}月越界`;
  }

  // 编号：YJ + 触发日期(YYYYMMDD) + 3位序号
  const dateStr = triggerTime.slice(0, 10).replace(/-/g, "");
  const id = `YJ${dateStr}${pad3(i + 1)}`;

  return {
    id,
    level,
    title,
    type,
    domain: obj.domain,
    objectCode: obj.code,
    objectName: obj.name,
    metricName: obj.metric,
    triggerTime,
    // 核心告警数据
    valueLabel,
    baselineLabel,
    deviation,
    confidenceRange:
      type === "预测风险"
        ? `${(approaching - 1.2).toFixed(1)}～${(approaching + 1.4).toFixed(1)}${obj.unit}`
        : undefined,
    duration: type === "当前异常" ? DURATIONS[i % DURATIONS.length] : undefined,
    forecastTime,
    riskProb: type === "预测风险" && i % 2 === 0 ? `${75 + (i % 20)}%` : undefined,
    // 判定依据
    strategyName: type === "当前异常" ? `${obj.metric}异常告警策略` : `${obj.metric}风险告警策略`,
    triggerCondition: `${obj.metric}${obj.low ? "低于" : "高于"}基准值${gap.toFixed(1)}%`,
    // 原因与建议（约 1/3 记录无明确原因，演示"暂未识别到明确原因"；有原因时 AI生成/人工补录 交替）
    causeSummary: i % 3 === 0 ? undefined : CAUSES[i % CAUSES.length](obj),
    causeType: i % 3 === 0 ? undefined : i % 2 === 0 ? "AI生成" : "人工补录",
    suggestion: SUGGESTIONS[i % SUGGESTIONS.length](obj),
    // 责任与处理情况
    receiver,
    notifyMethods,
    notifyStatus: i % 9 === 0 ? "发送失败" : "已发送",
    handleNote: handled ? HANDLE_NOTES[i % HANDLE_NOTES.length] : undefined,
    handledAt: handled ? tsAt(triggerMin + 150) : undefined,
    handledBy: handled ? receiver : undefined,
  };
});

// ========== 能耗管理组织层级：车间 → 网格 → 设备 ==========
// 供「新建告警-指定对象」分层多选 与「告警记录/管理」级联筛选 共用
export interface OrgNode {
  name: string;
  children?: OrgNode[];
}

export const ENERGY_ORG_TREE: OrgNode[] = [
  {
    name: "动力车间",
    children: [
      {
        name: "厂区电力能源网格",
        children: [{ name: "1号主变压器" }, { name: "2号配电柜" }, { name: "中央空调机组" }],
      },
      {
        name: "循环水能源网格",
        children: [{ name: "冷却水泵A" }, { name: "冷却塔风机" }, { name: "变频补水泵" }],
      },
    ],
  },
  {
    name: "制丝车间",
    children: [
      {
        name: "高炉煤气能源网格",
        children: [{ name: "煤气加压机" }, { name: "燃气锅炉" }],
      },
      {
        name: "蒸汽能源网格",
        children: [{ name: "蒸汽发生器" }, { name: "余热回收装置" }],
      },
    ],
  },
  {
    name: "卷包车间",
    children: [
      {
        name: "空压能源网格",
        children: [{ name: "1号空压机" }, { name: "2号空压机" }, { name: "冷冻式干燥机" }],
      },
    ],
  },
];

// 组织级联筛选条件
export interface OrgFilter {
  workshop: string; // "" = 全部
  grid: string;
  equipment: string;
}
export const EMPTY_ORG_FILTER: OrgFilter = { workshop: "", grid: "", equipment: "" };

// 三个层级的扁平选项
export const ENERGY_WORKSHOPS: string[] = ENERGY_ORG_TREE.map((w) => w.name);
export const ENERGY_GRIDS: string[] = ENERGY_ORG_TREE.flatMap((w) => (w.children ?? []).map((g) => g.name));
export const ENERGY_EQUIPMENTS: string[] = ENERGY_ORG_TREE.flatMap((w) =>
  (w.children ?? []).flatMap((g) => (g.children ?? []).map((e) => e.name))
);

// 车间 → 网格 名单（未指定车间时返回全部网格）
export function gridsOfWorkshop(workshop?: string): string[] {
  if (!workshop) return ENERGY_GRIDS;
  return ENERGY_ORG_TREE.find((w) => w.name === workshop)?.children?.map((g) => g.name) ?? [];
}

// 网格 → 设备 名单（未指定网格时返回全部设备）
export function equipmentsOfGrid(grid?: string): string[] {
  if (!grid) return ENERGY_EQUIPMENTS;
  for (const w of ENERGY_ORG_TREE) {
    const g = w.children?.find((c) => c.name === grid);
    if (g) return g.children?.map((e) => e.name) ?? [];
  }
  return [];
}

// 对象名 → 所属层级路径（用于列表按层级筛选）
export function orgPathOf(
  name: string
): { workshop?: string; grid?: string; level: "workshop" | "grid" | "equipment" | "unknown" } {
  for (const w of ENERGY_ORG_TREE) {
    if (w.name === name) return { workshop: w.name, level: "workshop" };
    for (const g of w.children ?? []) {
      if (g.name === name) return { workshop: w.name, grid: g.name, level: "grid" };
      for (const e of g.children ?? []) {
        if (e.name === name) return { workshop: w.name, grid: g.name, level: "equipment" };
      }
    }
  }
  return { level: "unknown" };
}
