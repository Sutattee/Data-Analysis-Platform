// 重大事件年鉴 — 模拟数据与工具（确定性生成，无 Date.now / Math.random）
// 事件：AI识别 / AI识别·人工修订 / 人工补录；已确认事件用于生成年度重大事件年鉴报告
import type { MajorEvent, MajorEventType, YearbookReport } from "@/types";

// ===== 常量 =====
export const DATA_CUTOFF = "2026-08-09"; // 数据截止日（与网格监控/预测总览锚点一致）
export const CURRENT_YEAR = 2026;
export const EVENT_TYPES: MajorEventType[] = [
  "设备故障",
  "检修维护",
  "技改投运",
  "生产计划调整",
  "运行或工艺调整",
  "能源供应异常",
  "外部环境影响",
  "其他事件",
];

function pad3(n: number) {
  return n < 10 ? `00${n}` : n < 100 ? `0${n}` : `${n}`;
}

// ===== 持续时长（系统按起止时间自动计算） =====
export function computeDuration(start: string, end: string | null): string {
  if (!end) return "进行中";
  const s = Date.parse(start.replace(" ", "T"));
  const e = Date.parse(end.replace(" ", "T"));
  if (isNaN(s) || isNaN(e) || e < s) return "-";
  const mins = Math.round((e - s) / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}天`);
  if (h) parts.push(`${h}小时`);
  if (m) parts.push(`${m}分钟`);
  return parts.join("") || "0分钟";
}

// 发生时间展示：起止时间；无结束时间显示“进行中”
export function timeLabelOf(e: { startTime: string; endTime: string | null }): string {
  return e.endTime ? `${e.startTime} — ${e.endTime}` : `${e.startTime} — 进行中`;
}

// ===== 预置事件（2024-2026，确定性手写） =====
export const MAJOR_EVENTS: MajorEvent[] = [
  {
    id: "SJ20260801008",
    title: "持续高温天气导致制冷负荷攀升",
    type: "外部环境影响",
    startTime: "2026-08-01 00:00",
    endTime: null,
    objects: ["动力车间", "厂区电力能源网格"],
    metrics: ["单箱综合能耗"],
    impactSummary: "制冷站电耗较历史均值上升 18.4%，带动动力车间电耗较历史均值上升 9.2%。",
    process:
      "8月1日起厂区遭遇持续高温天气，制冷机组满负荷运行。制冷站日电耗自 8 月 1 日起持续高于历史均值，8 月 3 日达到峰值。已临时调整冷冻水出水温度设定并错峰启停机组，能耗增幅有所收窄，高温过程仍在持续，事件尚未结束。",
    timeline: [
      { time: "2026-08-01 09:00", label: "发生", desc: "气温超过 35℃，制冷机组全部投入运行" },
      { time: "2026-08-03 14:00", label: "影响扩大", desc: "制冷站日电耗较历史均值上升 18.4%" },
      { time: "2026-08-05 10:00", label: "处置中", desc: "调整冷冻水出水温度设定，错峰启停机组" },
    ],
    alertIds: [],
    aiBasis: "基于制冷站电耗日数据与气象数据联合识别：电耗偏离历史均值超过 15% 且与气温变化高度相关。",
    formation: "AI识别",
    status: "待确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-08-05 10:30",
    revisions: [],
  },
  {
    id: "SJ20260716009",
    title: "煤气放散率持续异常偏高（疑似）",
    type: "其他事件",
    startTime: "2026-07-16 05:45",
    endTime: null,
    objects: ["制丝车间", "高炉煤气能源网格"],
    metrics: ["单位产值碳排放量"],
    impactSummary: "煤气放散率连续 4 日高于基准值，单位产值碳排放量较月度基准上升 4.1%。",
    process:
      "7 月 16 日起高炉煤气能源网格煤气放散率持续高于基准值。当前仅有指标异常数据，尚未发现设备故障、检修或计划调整等业务证据，暂无法判断具体业务原因，待业务人员核实确认。",
    timeline: [{ time: "2026-07-16 05:45", label: "发生", desc: "煤气放散率首次越过基准值" }],
    alertIds: ["YJ20260716033"],
    aiBasis: "基于煤气放散率日数据识别：连续 4 日高于基准值 2.9%～4.3%，关联告警记录 YJ20260716033。",
    isSuspected: true,
    formation: "AI识别",
    status: "待确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-07-19 08:15",
    revisions: [],
  },
  {
    id: "SJ20260712001",
    title: "2号空压机故障导致空压系统能耗波动",
    type: "设备故障",
    startTime: "2026-07-12 08:30",
    endTime: "2026-07-12 11:20",
    objects: ["卷包车间", "空压能源网格", "2号空压机"],
    metrics: ["单箱综合能耗", "百小时停机断料率"],
    impactSummary: "空压能源网格电耗较历史均值上升 12.6%，1号空压机单机顶班导致卷接机组供气压力波动。",
    process:
      "7 月 12 日 8:30，2号空压机主电机过流保护跳停，1号空压机自动加载顶班。因单机运行工况偏移，空压能源网格小时电耗较历史均值上升 12.6%，卷接机组供气压力出现短时波动。维保班组 9:10 到场检查，确认主电机接线端子过热导致保护动作，处理后 11:20 恢复双机运行，系统能耗与供气压力恢复正常。",
    timeline: [
      { time: "2026-07-12 08:30", label: "发生", desc: "2号空压机主电机过流保护跳停" },
      { time: "2026-07-12 08:40", label: "影响扩大", desc: "1号空压机单机顶班，网格电耗上升 12.6%" },
      { time: "2026-07-12 09:10", label: "处置", desc: "维保班组到场检查，确认为接线端子过热" },
      { time: "2026-07-12 11:20", label: "恢复", desc: "处理完成，恢复双机运行，能耗回落" },
    ],
    alertIds: [],
    aiBasis: "基于空压能源网格分时电耗曲线识别：故障时段电耗阶跃上升，与 2号空压机停机时刻吻合。",
    formation: "AI识别",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-07-12 12:00",
    updatedBy: "王芳",
    updatedAt: "2026-07-13 09:20",
    revisions: [],
  },
  {
    id: "SJ20260711005",
    title: "燃气锅炉燃烧器故障导致煤气网格能耗异常",
    type: "设备故障",
    startTime: "2026-07-11 01:10",
    endTime: "2026-07-13 16:00",
    objects: ["制丝车间", "高炉煤气能源网格", "燃气锅炉"],
    metrics: ["单箱综合能耗", "单位产值碳排放量"],
    impactSummary: "高炉煤气能源网格电耗较历史均值上升 8.7%，蒸汽产出温度偏差导致单箱综合能耗上升 1.2%。",
    process:
      "7 月 11 日凌晨 1:10，燃气锅炉 2 号燃烧器点火失败连续报警，锅炉自动切换 1 号燃烧器单烧运行。单燃烧器工况下蒸汽产出温度偏低，制丝线烘丝工序调整了蒸汽阀开度补偿，高炉煤气能源网格电耗较历史均值上升 8.7%。厂家工程师 7 月 12 日到场更换点火电极，7 月 13 日 16:00 完成调试恢复双燃烧器运行，各项指标逐步回落至正常区间。",
    timeline: [
      { time: "2026-07-11 01:10", label: "发生", desc: "2号燃烧器点火失败报警，切单烧运行" },
      { time: "2026-07-11 06:00", label: "影响扩大", desc: "蒸汽温度偏低，烘丝工序手动补偿" },
      { time: "2026-07-12 10:30", label: "处置", desc: "厂家工程师到场更换点火电极" },
      { time: "2026-07-13 16:00", label: "恢复", desc: "调试完成恢复双燃烧器运行" },
    ],
    alertIds: ["YJ20260711009", "YJ20260713021"],
    aiBasis: "基于告警记录 YJ20260711009 / YJ20260713021 与锅炉运行日志交叉识别：燃烧器报警时段与网格能耗异常时段重合。",
    formation: "AI识别",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-07-13 17:00",
    updatedBy: "张伟",
    updatedAt: "2026-07-14 08:40",
    revisions: [],
  },
  {
    id: "SJ20260705010",
    title: "中央空调机组冷媒泄漏（误识别）",
    type: "设备故障",
    startTime: "2026-07-05 13:20",
    endTime: "2026-07-05 15:00",
    objects: ["动力车间", "厂区电力能源网格", "中央空调机组"],
    metrics: ["单箱综合能耗"],
    impactSummary: "中央空调机组电耗短时上升 6.8%（后经核实为传感器数据漂移）。",
    process:
      "AI 于 7 月 5 日识别到中央空调机组电耗异常上升并生成事件。经动力车间现场核查，机组运行正常，电耗异常为电表传感器数据漂移所致，无实际事件发生。",
    timeline: [
      { time: "2026-07-05 13:20", label: "识别", desc: "AI 识别到机组电耗异常上升" },
      { time: "2026-07-05 15:00", label: "核实", desc: "现场确认传感器数据漂移，无实际事件" },
    ],
    alertIds: [],
    aiBasis: "基于机组分时电耗曲线识别（后核实为数据漂移）。",
    formation: "AI识别",
    status: "已排除",
    excludeReason: "经核查为传感器数据漂移，无实际事件，不纳入年鉴报告。",
    createdBy: "AI识别引擎",
    createdAt: "2026-07-05 14:00",
    updatedBy: "高亚东",
    updatedAt: "2026-07-06 09:10",
    revisions: [],
  },
  {
    id: "SJ20260718002",
    title: "循环水系统冷却塔风机季度检修",
    type: "检修维护",
    startTime: "2026-07-18 09:00",
    endTime: "2026-07-18 17:30",
    objects: ["动力车间", "循环水能源网格", "冷却塔风机"],
    metrics: ["单箱综合能耗"],
    impactSummary: "检修期间循环水能源网格电耗较历史均值下降 15.3%（计划性停机），供水温度短时上升 1.8℃。",
    process:
      "按季度检修计划对冷却塔风机进行例行维护，包括减速箱换油、叶片探伤与防腐处理。检修期间单风机运行，循环水供水温度短时上升 1.8℃，在工艺允许范围内。当日 17:30 完成检修恢复双风机运行。",
    timeline: [
      { time: "2026-07-18 09:00", label: "开始", desc: "冷却塔风机停机开始检修" },
      { time: "2026-07-18 11:00", label: "过程", desc: "减速箱换油、叶片探伤与防腐处理" },
      { time: "2026-07-18 17:30", label: "恢复", desc: "检修完成，恢复双风机运行" },
    ],
    alertIds: [],
    formation: "人工补录",
    status: "已确认",
    createdBy: "李强",
    createdAt: "2026-07-19 10:05",
    revisions: [],
  },
  {
    id: "SJ20260405003",
    title: "制丝线变频节能改造投运",
    type: "技改投运",
    startTime: "2026-04-05 00:00",
    endTime: "2026-04-20 23:59",
    objects: ["制丝车间", "蒸汽能源网格", "蒸汽发生器"],
    metrics: ["单箱综合能耗", "单位产值碳排放量"],
    impactSummary: "改造投运后制丝线电耗较改造前基准下降 6.4%，单箱综合能耗下降 0.4 kgce/箱。",
    process:
      "制丝线变频节能改造项目于 4 月 5 日开始分批投运，涉及松散回潮机、切丝机等 6 台主设备的变频控制改造。投运期间按新工况重新标定能耗基准，4 月 20 日完成全部设备投运与参数固化。改造后制丝线电耗较改造前基准下降 6.4%。",
    timeline: [
      { time: "2026-04-05 08:00", label: "投运开始", desc: "首批 3 台设备切换变频控制" },
      { time: "2026-04-12 08:00", label: "扩面", desc: "其余 3 台设备完成改造投运" },
      { time: "2026-04-20 17:00", label: "完成", desc: "全部投运完成，能耗基准重新标定" },
    ],
    alertIds: [],
    aiBasis: "基于技改项目台账与投运前后能耗基准对比识别。",
    formation: "AI识别·人工修订",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-04-21 09:00",
    updatedBy: "王芳",
    updatedAt: "2026-04-22 15:30",
    revisions: [
      { time: "2026-04-22 15:30", user: "王芳", summary: "补充改造涉及设备清单与能耗基准标定说明" },
    ],
  },
  {
    id: "SJ20260615004",
    title: "卷包车间月度生产计划调整",
    type: "生产计划调整",
    startTime: "2026-06-15 00:00",
    endTime: "2026-06-21 23:59",
    objects: ["卷包车间"],
    metrics: ["生产效率"],
    impactSummary: "周产量较原计划上调 9.5%，卷接包装机组开动率上升 7.2%，车间电耗相应上升 5.1%。",
    process:
      "因市场订单变化，6 月 15 日至 21 日卷包车间执行调整后的生产计划，周产量上调 9.5%，4 台卷接包机组由三班两运转调整为三班三运转。计划执行期间各机组开动率与车间电耗同步上升，属计划内波动，6 月 22 日起恢复原排产节奏。",
    timeline: [
      { time: "2026-06-15 00:00", label: "开始", desc: "执行调整后生产计划，机组满班运行" },
      { time: "2026-06-21 23:59", label: "结束", desc: "调整周期结束，恢复原排产节奏" },
    ],
    alertIds: [],
    aiBasis: "基于生产计划变更台账与车间能耗同步波动识别。",
    formation: "AI识别",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-06-22 10:00",
    updatedBy: "赵磊",
    updatedAt: "2026-06-23 09:00",
    revisions: [],
  },
  {
    id: "SJ20260522006",
    title: "烘丝工序工艺参数调整",
    type: "运行或工艺调整",
    startTime: "2026-05-22 08:00",
    endTime: "2026-05-23 20:00",
    objects: ["制丝车间", "蒸汽能源网格"],
    metrics: ["烘丝机出口水分偏差", "单箱综合能耗"],
    impactSummary: "烘丝机出口水分偏差标准差由 0.42% 降至 0.28%，蒸汽耗量较基准上升 2.6%。",
    process:
      "为改善烘丝机出口水分稳定性，工艺组于 5 月 22 日起调整烘丝筒热风温度与排潮开度参数组合。调整后出口水分偏差标准差由 0.42% 降至 0.28%，蒸汽耗量较基准上升 2.6%。5 月 23 日完成参数固化并纳入工艺标准。",
    timeline: [
      { time: "2026-05-22 08:00", label: "开始", desc: "热风温度与排潮开度参数调整试验" },
      { time: "2026-05-23 14:00", label: "验证", desc: "出口水分偏差标准差降至 0.28%" },
      { time: "2026-05-23 20:00", label: "完成", desc: "参数固化并纳入工艺标准" },
    ],
    alertIds: [],
    aiBasis: "基于工艺变更记录与烘丝工序指标同步变化识别。",
    formation: "AI识别·人工修订",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-05-24 09:30",
    updatedBy: "陈静",
    updatedAt: "2026-05-25 11:20",
    revisions: [
      { time: "2026-05-25 11:20", user: "陈静", summary: "修正蒸汽耗量基准口径，补充水分偏差统计区间" },
    ],
  },
  {
    id: "SJ20260608007",
    title: "市政电网计划停电切换",
    type: "能源供应异常",
    startTime: "2026-06-08 06:00",
    endTime: "2026-06-08 14:00",
    objects: ["动力车间", "厂区电力能源网格", "1号主变压器"],
    metrics: ["单箱综合能耗", "生产效率"],
    impactSummary: "停电切换期间厂区由 2 号进线单电源供电，配电站负荷率上升至 82%，无生产中断。",
    process:
      "接市政供电公司通知，6 月 8 日 6:00—14:00 对 1 号进线计划停电检修。厂区提前执行单电源运行预案，负荷转移至 2 号进线，配电站负荷率最高升至 82%。期间各车间生产正常，未发生非计划停机，14:00 恢复双电源供电。",
    timeline: [
      { time: "2026-06-08 06:00", label: "开始", desc: "1 号进线停电，负荷转移至 2 号进线" },
      { time: "2026-06-08 14:00", label: "恢复", desc: "市政检修完成，恢复双电源供电" },
    ],
    alertIds: [],
    formation: "人工补录",
    status: "已确认",
    createdBy: "孙明",
    createdAt: "2026-06-09 08:45",
    revisions: [],
  },
  {
    id: "SJ20250912011",
    title: "1号空压机电机烧毁停机",
    type: "设备故障",
    startTime: "2025-09-12 02:10",
    endTime: "2025-09-13 18:40",
    objects: ["卷包车间", "空压能源网格", "1号空压机"],
    metrics: ["百小时停机断料率", "生产效率"],
    impactSummary: "1号空压机电机烧毁停机 40 小时，空压系统能耗上升 14.2%，卷接工序减产约 1.8%。",
    process:
      "9 月 12 日凌晨 2:10，1号空压机主电机绕组烧毁跳停，2号空压机与备用机顶班运行。因备用机效率偏低，空压系统能耗上升 14.2%，卷接工序供气量受限减产约 1.8%。紧急采购电机并于 9 月 13 日完成更换调试，18:40 恢复正常运行。",
    timeline: [
      { time: "2025-09-12 02:10", label: "发生", desc: "主电机绕组烧毁跳停" },
      { time: "2025-09-12 08:00", label: "处置", desc: "备用机顶班，紧急采购电机" },
      { time: "2025-09-13 18:40", label: "恢复", desc: "电机更换调试完成，恢复正常运行" },
    ],
    alertIds: [],
    aiBasis: "基于空压系统能耗曲线与设备维修工单交叉识别。",
    formation: "AI识别",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2025-09-14 09:00",
    updatedBy: "张伟",
    updatedAt: "2025-09-15 10:30",
    revisions: [],
  },
  {
    id: "SJ20250318012",
    title: "锅炉烟气余热回收装置投运",
    type: "技改投运",
    startTime: "2025-03-18 08:00",
    endTime: "2025-03-31 20:00",
    objects: ["制丝车间", "高炉煤气能源网格", "燃气锅炉"],
    metrics: ["单箱综合能耗", "单位产值碳排放量"],
    impactSummary: "投运后锅炉天然气耗量较基准下降 5.8%，单位产值碳排放量下降 3.1%。",
    process:
      "锅炉烟气余热回收装置于 3 月 18 日开始试运行，利用烟气余热预热锅炉给水。试运行期间逐步提高回收负荷，3 月 31 日完成满负荷投运与考核验收。投运后锅炉天然气耗量较基准下降 5.8%。",
    timeline: [
      { time: "2025-03-18 08:00", label: "投运开始", desc: "余热回收装置试运行" },
      { time: "2025-03-25 10:00", label: "扩面", desc: "回收负荷逐步提升至 80%" },
      { time: "2025-03-31 20:00", label: "完成", desc: "满负荷投运，通过考核验收" },
    ],
    alertIds: [],
    aiBasis: "基于技改项目台账与天然气耗量基准对比识别。",
    formation: "AI识别·人工修订",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2025-04-01 09:00",
    updatedBy: "李强",
    updatedAt: "2025-04-02 14:10",
    revisions: [
      { time: "2025-04-02 14:10", user: "李强", summary: "补充考核验收结论与降碳量核算口径" },
    ],
  },
  {
    id: "SJ20251103013",
    title: "冬季供暖期蒸汽管网平衡调整",
    type: "运行或工艺调整",
    startTime: "2025-11-03 09:00",
    endTime: "2025-11-10 17:00",
    objects: ["制丝车间", "蒸汽能源网格", "余热回收装置"],
    metrics: ["单箱综合能耗"],
    impactSummary: "管网热损率由 8.6% 降至 7.1%，供暖期蒸汽耗总量较上年度同期下降 4.3%。",
    process:
      "入冬后蒸汽管网负荷结构变化，部分管段出现水力失调。11 月 3 日起对蒸汽管网各分支阀开度进行平衡调整，并投运余热回收装置预热补水。调整后管网热损率由 8.6% 降至 7.1%，11 月 10 日完成全部支路平衡并固化运行参数。",
    timeline: [
      { time: "2025-11-03 09:00", label: "开始", desc: "蒸汽管网分支阀平衡调整" },
      { time: "2025-11-06 10:00", label: "过程", desc: "余热回收装置投运预热补水" },
      { time: "2025-11-10 17:00", label: "完成", desc: "全部支路平衡完成，参数固化" },
    ],
    alertIds: [],
    formation: "人工补录",
    status: "已确认",
    createdBy: "王芳",
    createdAt: "2025-11-11 08:30",
    revisions: [],
  },
  {
    id: "SJ20240720014",
    title: "配电站2号主变压器年度检修",
    type: "检修维护",
    startTime: "2024-07-20 07:00",
    endTime: "2024-07-20 19:00",
    objects: ["动力车间", "厂区电力能源网格", "2号配电柜"],
    metrics: ["生产效率"],
    impactSummary: "单主变运行 12 小时，厂区供电负荷率最高 78%，各车间生产未受影响。",
    process:
      "按年度检修计划对 2 号主变压器进行预防性试验与清扫检修。检修期间厂区由 1 号主变单变供电，供电负荷率最高 78%。当日 19:00 完成检修恢复双变运行，期间各车间生产正常。",
    timeline: [
      { time: "2024-07-20 07:00", label: "开始", desc: "2 号主变压器停电检修" },
      { time: "2024-07-20 19:00", label: "恢复", desc: "检修完成，恢复双变运行" },
    ],
    alertIds: [],
    formation: "人工补录",
    status: "已确认",
    createdBy: "高亚东",
    createdAt: "2024-07-21 09:00",
    revisions: [],
  },
  {
    id: "SJ20241008015",
    title: "台风外围影响厂区供电波动",
    type: "外部环境影响",
    startTime: "2024-10-08 00:00",
    endTime: "2024-10-09 12:00",
    objects: ["动力车间", "厂区电力能源网格", "1号主变压器"],
    metrics: ["单箱综合能耗", "生产效率"],
    impactSummary: "电压暂降 3 次触发部分设备重启，车间短时停产约 1.5 小时，当日产量下降 6.2%。",
    process:
      "受台风外围影响，10 月 8 日至 9 日市政线路出现 3 次电压暂降，厂区部分设备保护重启，卷包与制丝工序短时停产约 1.5 小时。动力车间启用稳压与负荷错峰措施后逐步恢复，10 月 9 日 12:00 各工序恢复正常生产。",
    timeline: [
      { time: "2024-10-08 00:00", label: "发生", desc: "台风外围影响，电压暂降 3 次" },
      { time: "2024-10-08 03:00", label: "处置", desc: "启用稳压与负荷错峰措施" },
      { time: "2024-10-09 12:00", label: "恢复", desc: "各工序恢复正常生产" },
    ],
    alertIds: [],
    aiBasis: "基于电能质量监测数据与气象记录交叉识别。",
    formation: "AI识别",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2024-10-10 09:20",
    updatedBy: "孙明",
    updatedAt: "2024-10-11 10:00",
    revisions: [],
  },
  {
    id: "SJ20241225016",
    title: "年末赶产班次加密",
    type: "生产计划调整",
    startTime: "2024-12-25 08:00",
    endTime: "2024-12-31 22:00",
    objects: ["卷包车间"],
    metrics: ["生产效率", "单箱耗烟叶量"],
    impactSummary: "周产量较月均上升 15.6%，卷包车间电耗同步上升 11.2%，单箱耗烟叶量上升 0.3 公斤/箱。",
    process:
      "为完成年度产量目标，12 月 25 日至 31 日卷包车间加密班次赶产，主要机组连续满班运行。赶产期间车间电耗与单箱耗烟叶量均有上升，属计划内波动。12 月 31 日完成年度产量目标后恢复正常排产。",
    timeline: [
      { time: "2024-12-25 08:00", label: "开始", desc: "班次加密，机组连续满班运行" },
      { time: "2024-12-31 22:00", label: "结束", desc: "完成年度产量目标，恢复正常排产" },
    ],
    alertIds: [],
    formation: "人工补录",
    status: "已确认",
    createdBy: "李强",
    createdAt: "2025-01-02 08:50",
    revisions: [],
  },
];

// ===== 模块级 store（客户端会话内保持，刷新还原 —— 与告警“标记已处理”行为一致） =====
let eventStore: MajorEvent[] = MAJOR_EVENTS.map((e) => ({ ...e }));
let reportStore: YearbookReport[] = [];
let reportSeq = 1;

export function listEvents(): MajorEvent[] {
  return eventStore.map((e) => ({ ...e }));
}

export function getEvent(id: string): MajorEvent | undefined {
  const e = eventStore.find((x) => x.id === id);
  return e ? { ...e } : undefined;
}

// 新增或整体替换事件（页面组装好完整对象后调用）
export function upsertEvent(evt: MajorEvent): void {
  const idx = eventStore.findIndex((e) => e.id === evt.id);
  if (idx >= 0) eventStore[idx] = { ...evt };
  else eventStore = [{ ...evt }, ...eventStore];
}

// 确认 / 取消排除等状态流转
export function setEventStatus(
  id: string,
  status: MajorEvent["status"],
  opts?: { user?: string; excludeReason?: string }
): void {
  const idx = eventStore.findIndex((e) => e.id === id);
  if (idx < 0) return;
  const prev = eventStore[idx];
  eventStore[idx] = {
    ...prev,
    status,
    excludeReason: status === "已排除" ? opts?.excludeReason : undefined,
    updatedBy: opts?.user || prev.updatedBy,
    updatedAt: "2026-08-17 10:00",
  };
}

// 生成新事件编号：SJ + 开始日期 YYYYMMDD + 3 位序号（同日递增）
export function nextEventId(startTime: string): string {
  const prefix = "SJ" + startTime.slice(0, 10).replace(/-/g, "");
  let seq = eventStore.filter((e) => e.id.startsWith(prefix)).length + 1;
  const ids = new Set(eventStore.map((e) => e.id));
  while (ids.has(prefix + pad3(seq))) seq++;
  return prefix + pad3(seq);
}

export function listReports(): YearbookReport[] {
  return reportStore.map((r) => ({ ...r }));
}

export function getReport(id: string): YearbookReport | undefined {
  const r = reportStore.find((x) => x.id === id);
  return r ? { ...r } : undefined;
}

export function addReport(r: YearbookReport): void {
  reportStore = [{ ...r }, ...reportStore];
}

export function updateReport(id: string, patch: Partial<YearbookReport>): void {
  reportStore = reportStore.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

export function removeReport(id: string): void {
  reportStore = reportStore.filter((r) => r.id !== id);
}

// 同年度报告名称是否重复
export function isReportNameDuplicated(year: number, name: string, excludeId?: string): boolean {
  return reportStore.some((r) => r.year === year && r.name === name && r.id !== excludeId);
}

// 存在已确认事件的年度（降序）
export function availableYears(): number[] {
  const years = new Set(
    eventStore.filter((e) => e.status === "已确认").map((e) => Number(e.startTime.slice(0, 4)))
  );
  return Array.from(years).sort((a, b) => b - a);
}

// 某年度已确认事件（按发生时间正序）
export function confirmedEventsOf(year: number): MajorEvent[] {
  return eventStore
    .filter((e) => e.status === "已确认" && e.startTime.slice(0, 4) === String(year))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// ===== 年鉴报告生成（确定性模板：已确认事件 + 关联证据 + 统计结果） =====
function periodOf(year: number): { periodStart: string; periodEnd: string } {
  return year < CURRENT_YEAR
    ? { periodStart: `${year}-01-01`, periodEnd: `${year}-12-31` }
    : { periodStart: `${year}-01-01`, periodEnd: DATA_CUTOFF };
}

function fmtPct(n: number, total: number): string {
  return total ? `${Math.round((n / total) * 100)}%` : "-";
}

export function buildReport(input: {
  year: number;
  events: MajorEvent[]; // 已选中的已确认事件（按发生时间正序）
  name: string;
  user: string;
  generatedAt?: string;
}): YearbookReport {
  const { year, events, name, user } = input;
  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const { periodStart, periodEnd } = periodOf(year);

  // —— 统计汇总 ——
  const byType = new Map<string, number>();
  const byFormation = new Map<string, number>();
  const objCount = new Set<string>();
  const metricCount = new Set<string>();
  let totalMins = 0;
  let ongoing = 0;
  sorted.forEach((e) => {
    byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
    byFormation.set(e.formation, (byFormation.get(e.formation) ?? 0) + 1);
    e.objects.forEach((o) => objCount.add(o));
    e.metrics.forEach((m) => metricCount.add(m));
    if (!e.endTime) ongoing++;
    else {
      const s = Date.parse(e.startTime.replace(" ", "T"));
      const t = Date.parse(e.endTime.replace(" ", "T"));
      if (!isNaN(s) && !isNaN(t) && t >= s) totalMins += Math.round((t - s) / 60000);
    }
  });
  const totalDays = Math.round((totalMins / 1440) * 10) / 10;
  const topType = Array.from(byType.entries()).sort((a, b) => b[1] - a[1])[0];

  // —— 第一章 年度事件概览 ——
  const typeLines = Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t} ${n} 件（${fmtPct(n, sorted.length)}）`)
    .join("、");
  const formationLines = Array.from(byFormation.entries()).map(([t, n]) => `${t} ${n} 件`).join("、");
  const overview = [
    `本年度共纳入重大事件 ${sorted.length} 件，全部经过人工确认，统计范围 ${periodStart} 至 ${periodEnd}，数据截止 ${DATA_CUTOFF}。`,
    `按事件类型分布：${typeLines}。`,
    `按形成方式分布：${formationLines}。`,
    `事件共涉及 ${objCount.size} 个影响对象（车间/网格/设备）、${metricCount.size} 项业务指标；已结束事件累计影响时长约 ${totalDays} 天${ongoing ? `，另有 ${ongoing} 件事件仍在进行中` : ""}。`,
  ].join("\n");

  // —— 第二章 重大事件纪要 ——
  const chronicle = sorted
    .map((e) => {
      const lines = [
        `【${e.id}】${timeLabelOf(e)}（持续 ${computeDuration(e.startTime, e.endTime)}）`,
        `${e.title}（${e.type}｜${e.formation}）`,
        `影响对象：${e.objects.join("／")}；影响指标：${e.metrics.join("、")}。`,
        `影响结果：${e.impactSummary}`,
      ];
      if (e.alertIds.length) lines.push(`关联预警：${e.alertIds.join("、")}。`);
      return lines.join("\n");
    })
    .join("\n\n");

  // —— 第三章 综合分析与管理建议 ——
  const hotObjects = Array.from(objCount).slice(0, 3).join("、");
  const analysis = [
    `1. 事件结构分析：本年度重大事件以${topType[0]}为主（${topType[1]} 件，占 ${fmtPct(topType[1], sorted.length)}），建议针对该类事件开展专项复盘，完善预防性措施。`,
    `2. 对象集中度分析：${hotObjects} 等对象多次受到影响，建议结合设备健康度与运行工况安排针对性检查，降低重复发生概率。`,
    `3. 数据口径说明：本报告基于生成时点（${input.generatedAt ?? DATA_CUTOFF}）的已确认事件快照编制，事件后续修改不改变本报告内容；如需更新请重新生成。`,
    `4. 管理建议：对已结束事件核销处置闭环情况，对进行中事件持续跟踪恢复进度，并将本年度经验纳入下一年度能源管理策略。`,
  ].join("\n");

  return {
    id: `YB${year}${pad3(reportSeq++)}`,
    year,
    name,
    periodStart,
    periodEnd,
    includedEvents: sorted.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      timeLabel: timeLabelOf(e),
      impact: e.impactSummary,
      duration: computeDuration(e.startTime, e.endTime),
      version: e.updatedAt ?? e.createdAt,
    })),
    dataCutoff: DATA_CUTOFF,
    sections: { overview, chronicle, analysis },
    generatedAt: input.generatedAt ?? `${DATA_CUTOFF} 10:00`,
    generatedBy: user,
    editLog: [],
  };
}

// ===== 预置历年报告（2024 / 2025 年度，同规则生成） =====
(function initPresetReports() {
  const presets: { year: number; user: string; generatedAt: string; edited?: { time: string; user: string; note: string } }[] = [
    { year: 2025, user: "苏恒", generatedAt: "2026-01-05 10:30", edited: { time: "2026-01-08 14:00", user: "苏恒", note: "完善第二章纪要格式" } },
    { year: 2024, user: "周婷", generatedAt: "2025-01-06 10:30" },
  ];
  presets.forEach((p) => {
    const r = buildReport({
      year: p.year,
      events: confirmedEventsOf(p.year),
      name: `${p.year}年度重大事件年鉴报告`,
      user: p.user,
      generatedAt: p.generatedAt,
    });
    if (p.edited) {
      r.updatedAt = p.edited.time;
      r.updatedBy = p.edited.user;
      r.editLog = [{ time: p.edited.time, user: p.edited.user, note: p.edited.note }];
    }
    reportStore.push(r);
  });
  reportStore.sort((a, b) => b.year - a.year || b.generatedAt.localeCompare(a.generatedAt));
})();
