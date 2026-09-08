// 重大事件（生产管理） — 模拟数据与工具（确定性生成，无 Date.now / Math.random）
// 独立于能耗板块「重大事件年鉴」：生产口径事件（卷接包机组 / 车间 / 辅料单耗 / 生产效率）
// 已确认事件用于生成年度 / 月度重大事件报告
import type { MajorEvent, YearbookReport } from "@/types";
import { computeDuration, timeLabelOf } from "./major-events";
import { ALERT_RECORDS } from "./alerts";

// ===== 常量 =====
export const PROD_DATA_CUTOFF = "2026-08-09"; // 数据截止日（与全站锚点一致）
export const PROD_CURRENT_YEAR = 2026;

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function pad3(n: number) {
  return n < 10 ? `00${n}` : n < 100 ? `0${n}` : `${n}`;
}

// 按指标动态关联生产告警记录（SC 前缀辅料记录，运行时解析，不硬编码编号）
function alertIdsOfMetric(metric: string, n: number): string[] {
  return ALERT_RECORDS.filter((r) => r.metricName === metric && r.type === "当前异常")
    .slice(0, n)
    .map((r) => r.id);
}

// ===== 预置事件（2024-2026 生产口径，确定性手写） =====
export const PRODUCTION_EVENTS: MajorEvent[] = [
  {
    id: "SC20260802001",
    title: "3#卷接包机组包装机故障停机",
    type: "设备故障",
    startTime: "2026-08-02 06:40",
    endTime: "2026-08-02 15:20",
    objects: ["卷包车间", "3#卷接包机组", "ZB45包装机"],
    metrics: ["台时产量", "百小时停机断料率"],
    impactSummary: "机组停机 8.7 小时，当日台时产量降至 872 箱/台（目标 1100），百小时停机断料率上升 0.21%。",
    process:
      "8 月 2 日 6:40，3#机组 ZB45 包装机小盒输送带伺服电机过载报警停机，当班班长切换 4#机组顶班生产。维修班组 7:30 到场排查，确认为输送带张紧机构磨损导致电机负载异常，更换张紧辊并重新标定后 15:20 恢复运行，当班损失的产量由加班班次补足。",
    causeAnalysis:
      "AI 综合分析：本次产量异常为设备运行异常所致——包装机输送带张紧机构磨损导致伺服电机持续过载，触发保护停机（影响程度：高；可信度：95%）。建议将张紧机构纳入包装机月度点检项目。",
    timeline: [
      { time: "2026-08-02 06:40", label: "发生", desc: "包装机伺服电机过载报警停机" },
      { time: "2026-08-02 07:30", label: "处置", desc: "维修班组到场，4#机组顶班生产" },
      { time: "2026-08-02 15:20", label: "恢复", desc: "更换张紧辊并标定后恢复运行" },
    ],
    alertIds: [],
    aiBasis: "基于机组分时产量曲线识别：停机时段产量阶跃下降，与包装机报警时刻吻合。",
    formation: "AI识别",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-08-02 16:00",
    updatedBy: "王芳",
    updatedAt: "2026-08-03 09:10",
    revisions: [],
  },
  {
    id: "SC20260805002",
    title: "单箱耗商标纸（小盒）量连续超目标",
    type: "运行或工艺调整",
    startTime: "2026-08-05 00:00",
    endTime: "2026-08-07 23:59",
    objects: ["卷包车间", "ZB45包装机"],
    metrics: ["单箱耗商标纸（小盒）量"],
    impactSummary: "单箱耗商标纸（小盒）量连续 3 日高于目标 2480 张/箱，8 月 6 日达 2560 张/箱（超目标 3.2%）。",
    process:
      "8 月 5 日起卷包车间单箱耗商标纸（小盒）量连续高于目标值。排查发现当期「娇子(宽窄)」牌号小批量排产占比上升，换牌号频次增加导致商标纸换卷拼接与套准剔除损耗上升。工艺组 8 月 7 日调整套准参数并合并小批量订单后，8 月 8 日单耗回落至目标以内。",
    causeAnalysis:
      "AI 综合分析：本次单耗超标为运行调整所致——小批量牌号切换频繁，商标纸换卷拼接与套准剔除损耗增加（影响程度：中；可信度：93%）。关联同期辅料告警记录 2 条。",
    timeline: [
      { time: "2026-08-05 09:00", label: "发生", desc: "单箱耗商标纸（小盒）量首次越过目标值" },
      { time: "2026-08-06 10:00", label: "影响扩大", desc: "单耗达 2560 张/箱，超目标 3.2%" },
      { time: "2026-08-07 14:00", label: "处置", desc: "调整套准参数，合并小批量订单" },
      { time: "2026-08-08 08:00", label: "恢复", desc: "单耗回落至目标以内" },
    ],
    alertIds: alertIdsOfMetric("单箱耗商标纸（小盒）量", 2),
    aiBasis: "基于辅料日单耗数据识别：连续 3 日高于目标 1.2%~3.2%，关联 2 条辅料告警记录。",
    formation: "AI识别",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-08-08 09:00",
    updatedBy: "张伟",
    updatedAt: "2026-08-08 15:30",
    revisions: [],
  },
  {
    id: "SC20260808003",
    title: "多机组台时产量持续低于目标（疑似）",
    type: "其他事件",
    startTime: "2026-08-08 00:00",
    endTime: null,
    objects: ["卷包车间", "7#卷接包机组", "9#卷接包机组"],
    metrics: ["台时产量"],
    impactSummary: "7#、9#机组台时产量连续 2 日低于目标 1100 箱/台，最低 1024 箱/台（欠产 6.9%）。",
    process:
      "8 月 8 日起 7#、9#机组台时产量持续低于目标值，当前仅有产量数据异常，尚未发现设备故障、检修或计划调整等业务证据，暂无法判断具体业务原因，待生产管理人员核实确认。",
    causeAnalysis:
      "AI 综合分析：暂无法归因至明确业务原因。候选因素按可信度排序：① 机组长周期运行后性能衰减，有效作业率下降（可信度：58%）；② 同期排产品种结构变化，单牌号理论台时产量偏低（可信度：42%）。建议结合设备点检记录与排产品种结构进一步核实。",
    timeline: [{ time: "2026-08-08 00:00", label: "发生", desc: "两机组台时产量首次低于目标" }],
    alertIds: [],
    aiBasis: "基于机组日台时产量数据识别：连续 2 日低于目标 4.1%~6.9%。",
    isSuspected: true,
    formation: "AI识别",
    status: "待确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-08-09 08:30",
    revisions: [],
  },
  {
    id: "SC20260703004",
    title: "夏季高温错峰生产计划调整",
    type: "生产计划调整",
    startTime: "2026-07-03 00:00",
    endTime: "2026-07-10 23:59",
    objects: ["卷包车间", "制丝车间"],
    metrics: ["生产效率", "台时产量"],
    impactSummary: "早班开班时间后移 2 小时错峰用电，期间日平均产量较原计划下降 2.8%，累计欠产约 1,900 箱。",
    process:
      "应对 7 月上旬持续高温与电网错峰用电要求，7 月 3 日至 10 日生产计划调整：卷包车间早班开班时间由 6:00 后移至 8:00，制丝车间相应顺延供料节奏。调整期间机组有效作业时间减少，日平均产量下降 2.8%，7 月 11 日起恢复原排产并利用周末加班补足欠产。",
    causeAnalysis:
      "AI 综合分析：本次产量下降为生产计划调整所致——错峰用电要求压缩有效作业时段，属计划内波动（影响程度：中；可信度：96%）。欠产已于 7 月中旬补足。",
    timeline: [
      { time: "2026-07-03 06:00", label: "开始", desc: "早班开班时间后移，错峰用电" },
      { time: "2026-07-10 23:59", label: "结束", desc: "恢复原排产节奏" },
      { time: "2026-07-12 17:00", label: "补产", desc: "周末加班补足累计欠产" },
    ],
    alertIds: [],
    aiBasis: "基于生产计划变更台账与机组产量同步波动识别。",
    formation: "人工补录",
    status: "已确认",
    createdBy: "赵磊",
    createdAt: "2026-07-13 09:00",
    revisions: [],
  },
  {
    id: "SC20260712005",
    title: "单箱耗盘纸量偏高（疑似）",
    type: "其他事件",
    startTime: "2026-07-12 00:00",
    endTime: "2026-07-15 23:59",
    objects: ["卷包车间", "PROTOS70卷接机"],
    metrics: ["单箱耗盘纸量"],
    impactSummary: "单箱耗盘纸量连续 4 日高于历史均值，7 月 14 日达 31.2 米/箱（超均值 4.0%）。",
    process:
      "7 月 12 日起卷包车间单箱耗盘纸量持续高于历史均值，当前仅有指标异常数据，尚未定位至具体设备或批次原因，待卷包车间结合盘纸批次与机组张力参数核实确认。",
    causeAnalysis:
      "AI 综合分析：暂无法归因至明确业务原因。候选因素按可信度排序：① 盘纸批次定量偏上限，同等长度下实际消耗上升（可信度：52%）；② 高速机组张力波动导致退纸损耗增加（可信度：45%）。建议结合盘纸批次检验记录与机组张力设定进一步核实。",
    timeline: [{ time: "2026-07-12 00:00", label: "发生", desc: "单箱耗盘纸量首次越过历史均值" }],
    alertIds: alertIdsOfMetric("单箱耗盘纸量", 1),
    aiBasis: "基于辅料日单耗数据识别：连续 4 日高于历史均值 1.6%~4.0%。",
    isSuspected: true,
    formation: "AI识别",
    status: "待确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-07-16 08:20",
    revisions: [],
  },
  {
    id: "SC20260720006",
    title: "5#卷接包机组月度检修维护",
    type: "检修维护",
    startTime: "2026-07-20 08:00",
    endTime: "2026-07-20 18:30",
    objects: ["卷包车间", "5#卷接包机组"],
    metrics: ["台时产量", "百小时停机断料率"],
    impactSummary: "计划性停机 10.5 小时，当日该机组产量由 3#、6#机组分担，百小时停机断料率当月口径上升 0.08%。",
    process:
      "按月度检修计划对 5#机组进行例行维护，包括卷接机胶缸清洗、刀头更换与包装机油路保养。检修期间该机组产量由相邻机组分担，未影响车间整体排产。当日 18:30 完成检修恢复运行，次日开机一次成功。",
    causeAnalysis:
      "AI 综合分析：本次停机为计划性检修维护影响——月度例行保养占用运行时段，属计划内波动（影响程度：低；可信度：96%）。检修后机组运行参数正常。",
    timeline: [
      { time: "2026-07-20 08:00", label: "开始", desc: "5#机组停机开始检修" },
      { time: "2026-07-20 14:00", label: "过程", desc: "胶缸清洗、刀头更换与油路保养" },
      { time: "2026-07-20 18:30", label: "恢复", desc: "检修完成恢复运行" },
    ],
    alertIds: [],
    formation: "人工补录",
    status: "已确认",
    createdBy: "李强",
    createdAt: "2026-07-21 08:40",
    revisions: [],
  },
  {
    id: "SC20260725007",
    title: "商标纸剔除率异常上升（误识别）",
    type: "其他事件",
    startTime: "2026-07-25 09:00",
    endTime: "2026-07-25 16:00",
    objects: ["卷包车间", "ZB45包装机"],
    metrics: ["单箱耗商标纸（小盒）量"],
    impactSummary: "商标纸剔除率短时上升 1.9%（后经核实为视觉检测系统误判放大剔除量）。",
    process:
      "AI 于 7 月 25 日识别到商标纸剔除率异常上升并生成事件。经卷包车间现场核查，包装机实际运行与剔除量正常，异常为视觉检测系统标定偏移导致误判放大，剔除量统计数据失真，无实际质量事件发生。",
    causeAnalysis:
      "AI 综合分析：本次识别的剔除率异常为计量与数据采集异常——视觉检测系统标定偏移导致剔除量统计虚高，实际剔除量正常（可信度：91%）。",
    timeline: [
      { time: "2026-07-25 09:00", label: "识别", desc: "AI 识别到剔除率异常上升" },
      { time: "2026-07-25 16:00", label: "核实", desc: "确认为检测系统误判，无实际事件" },
    ],
    alertIds: [],
    aiBasis: "基于包装机剔除量分时数据识别（后核实为检测系统误判）。",
    formation: "AI识别",
    status: "已排除",
    excludeReason: "经核查为视觉检测系统标定偏移导致统计失真，无实际事件，不纳入重大事件报告。",
    createdBy: "AI识别引擎",
    createdAt: "2026-07-25 14:00",
    updatedBy: "高亚东",
    updatedAt: "2026-07-26 09:00",
    revisions: [],
  },
  {
    id: "SC20260615008",
    title: "牌号集中切换期换牌损耗上升",
    type: "运行或工艺调整",
    startTime: "2026-06-15 00:00",
    endTime: "2026-06-30 23:59",
    objects: ["卷包车间"],
    metrics: ["单箱耗盘纸量", "单箱耗嘴棒量", "生产效率"],
    impactSummary: "换牌号频次日均 11 次（常态 6 次），单箱耗盘纸量上升 2.4%、单箱耗嘴棒量上升 1.8%，生产效率下降 1.6%。",
    process:
      "6 月中下旬市场订单结构变化，车间进入牌号集中切换期，换牌号频次由日均 6 次升至 11 次。频繁切换导致盘纸引带、嘴棒排空与商标纸换卷损耗上升，机组有效作业时间同步减少。6 月底订单结构趋稳后换牌频次回落，各项消耗恢复正常水平。",
    causeAnalysis:
      "AI 综合分析：本次消耗上升为运行调整所致——牌号切换频次大幅增加，换牌过程固有损耗同步放大（影响程度：中；可信度：94%）。建议排产时合并同牌号订单以降低切换频次。",
    timeline: [
      { time: "2026-06-15 00:00", label: "开始", desc: "进入牌号集中切换期" },
      { time: "2026-06-22 10:00", label: "影响扩大", desc: "换牌频次日均 11 次，各项消耗上升" },
      { time: "2026-06-30 23:59", label: "结束", desc: "订单结构趋稳，消耗回落" },
    ],
    alertIds: [],
    aiBasis: "基于排产台账与辅料单耗、机组效率同步波动识别。",
    formation: "AI识别·人工修订",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-07-01 09:00",
    updatedBy: "王芳",
    updatedAt: "2026-07-02 10:30",
    revisions: [{ time: "2026-07-02 10:30", user: "王芳", summary: "补充换牌频次统计口径与损耗分项数据" }],
  },
  {
    id: "SC20260410009",
    title: "ZB45包装机视觉检测升级改造投运",
    type: "技改投运",
    startTime: "2026-04-10 08:00",
    endTime: "2026-04-25 17:00",
    objects: ["卷包车间", "ZB45包装机"],
    metrics: ["生产效率", "单箱耗商标纸（小盒）量"],
    impactSummary: "改造投运后包装机有效作业率提升 3.1%，商标纸剔除率下降 0.6 个百分点，单箱耗商标纸（小盒）量下降 35 张/箱。",
    process:
      "ZB45 包装机视觉检测系统升级改造于 4 月 10 日开始分批投运，新增小盒外观缺陷在线检测与自动剔除功能。4 月 25 日完成全部机组改造与参数固化。投运后缺陷检出率提升，无效剔除减少，包装环节消耗与效率同步改善。",
    causeAnalysis:
      "AI 综合分析：本次消耗下降为技改投运的预期效果——视觉检测精度提升减少误剔除，有效作业时间同步增加（影响程度：高；可信度：95%）。建议持续跟踪检测系统标定稳定性。",
    timeline: [
      { time: "2026-04-10 08:00", label: "投运开始", desc: "首批 2 台包装机升级视觉检测" },
      { time: "2026-04-18 08:00", label: "扩面", desc: "其余包装机完成改造投运" },
      { time: "2026-04-25 17:00", label: "完成", desc: "参数固化，通过验收" },
    ],
    alertIds: [],
    aiBasis: "基于技改项目台账与投运前后消耗、效率基准对比识别。",
    formation: "AI识别·人工修订",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2026-04-27 09:00",
    updatedBy: "李强",
    updatedAt: "2026-04-28 14:20",
    revisions: [{ time: "2026-04-28 14:20", user: "李强", summary: "补充验收结论与消耗基准对比口径" }],
  },
  {
    id: "SC20250912010",
    title: "2#卷接包机组卷接机故障停机",
    type: "设备故障",
    startTime: "2025-09-12 13:20",
    endTime: "2025-09-13 20:40",
    objects: ["卷包车间", "2#卷接包机组", "PROTOS70卷接机"],
    metrics: ["台时产量", "百小时停机断料率"],
    impactSummary: "卷接机Passau供丝系统故障停机 31 小时，机组台时产量当月口径下降 4.2%，断料率上升 0.19%。",
    process:
      "9 月 12 日 13:20，2#机组 PROTOS70 卷接机供丝系统钢丝帘线断裂，机组停机待修。因备件需从厂家调货，期间由相邻机组分担产量并外协加工部分牌号。9 月 13 日备件到场完成更换调试，20:40 恢复正常运行。",
    causeAnalysis:
      "AI 综合分析：本次停机为设备运行异常所致——供丝系统钢丝帘线疲劳断裂，备件调货周期长导致停机时间延长（影响程度：高；可信度：94%）。建议将钢丝帘线纳入易损件安全库存。",
    timeline: [
      { time: "2025-09-12 13:20", label: "发生", desc: "供丝系统钢丝帘线断裂停机" },
      { time: "2025-09-12 15:00", label: "处置", desc: "相邻机组分担产量，紧急调货备件" },
      { time: "2025-09-13 20:40", label: "恢复", desc: "备件更换调试完成，恢复运行" },
    ],
    alertIds: [],
    aiBasis: "基于机组停机记录与维修工单交叉识别。",
    formation: "AI识别",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2025-09-14 09:00",
    updatedBy: "张伟",
    updatedAt: "2025-09-15 10:00",
    revisions: [],
  },
  {
    id: "SC20250518011",
    title: "制丝线换批过渡损耗优化工艺调整",
    type: "运行或工艺调整",
    startTime: "2025-05-18 08:00",
    endTime: "2025-05-30 17:00",
    objects: ["制丝车间"],
    metrics: ["单箱耗烟叶量"],
    impactSummary: "调整换批掺配顺序后，过渡批次烟丝混合不均率下降 1.7 个百分点，单箱耗烟叶量下降 0.4 公斤/箱。",
    process:
      "针对换批过渡期烟丝混合不均导致的造碎与回掺损耗，工艺组自 5 月 18 日起优化换批掺配顺序与掺配流量曲线，5 月 30 日完成参数固化并纳入工艺标准。调整后过渡批次混合不均率明显下降，烟叶消耗同步降低。",
    causeAnalysis:
      "AI 综合分析：本次消耗下降为运行调整的预期效果——优化掺配顺序缩短过渡稳定时间，减少过渡批次造碎与回掺（影响程度：中；可信度：92%）。",
    timeline: [
      { time: "2025-05-18 08:00", label: "开始", desc: "换批掺配顺序调整试验" },
      { time: "2025-05-26 10:00", label: "验证", desc: "过渡批次混合不均率下降 1.7 个百分点" },
      { time: "2025-05-30 17:00", label: "完成", desc: "参数固化纳入工艺标准" },
    ],
    alertIds: [],
    aiBasis: "基于工艺变更记录与烟叶消耗基准对比识别。",
    formation: "人工补录",
    status: "已确认",
    createdBy: "陈静",
    createdAt: "2025-06-02 08:30",
    revisions: [],
  },
  {
    id: "SC20250305012",
    title: "卷接设备提速技改分批投运",
    type: "技改投运",
    startTime: "2025-03-05 08:00",
    endTime: "2025-03-28 17:00",
    objects: ["卷包车间", "PROTOS70卷接机"],
    metrics: ["台时产量", "生产效率"],
    impactSummary: "提速改造投运后卷接机额定车速提升 8%，机组平均台时产量提升 62 箱/台，生产效率上升 2.9%。",
    process:
      "卷接设备提速技改项目于 3 月 5 日开始分批投运，涉及 8 台 PROTOS70 卷接机的车速提升与配套张力控制改造。3 月 28 日全部完成并按新车速重新标定消耗基准。投运后机组平均台时产量提升 62 箱/台，产品质量指标保持稳定。",
    causeAnalysis:
      "AI 综合分析：本次产量提升为技改投运的预期效果——车速提升与张力控制改造同步实施，机组运行稳定性未受影响（影响程度：高；可信度：96%）。",
    timeline: [
      { time: "2025-03-05 08:00", label: "投运开始", desc: "首批 3 台卷接机提速改造" },
      { time: "2025-03-18 08:00", label: "扩面", desc: "其余 5 台完成改造投运" },
      { time: "2025-03-28 17:00", label: "完成", desc: "消耗基准重新标定" },
    ],
    alertIds: [],
    aiBasis: "基于技改项目台账与投运前后台时产量对比识别。",
    formation: "AI识别·人工修订",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2025-03-31 09:00",
    updatedBy: "李强",
    updatedAt: "2025-04-01 11:00",
    revisions: [{ time: "2025-04-01 11:00", user: "李强", summary: "补充技改范围与消耗基准标定说明" }],
  },
  {
    id: "SC20251120013",
    title: "冬季嘴棒供应波动导致单耗上升",
    type: "其他事件",
    startTime: "2025-11-20 00:00",
    endTime: "2025-11-27 23:59",
    objects: ["卷包车间", "嘴棒成型机"],
    metrics: ["单箱耗嘴棒量"],
    impactSummary: "嘴棒来料批次固化质量波动，单箱耗嘴棒量周均上升 2.6%（最高 51,300 支/箱）。",
    process:
      "11 月 20 日起嘴棒成型车间来料批次固化质量波动，滤棒圆周与硬度离散度增大，卷接环节废支剔除率上升，带动单箱耗嘴棒量连续一周高于历史均值。供应部门同步切换备用批次并加严来料检验，11 月 27 日起单耗恢复正常。",
    causeAnalysis:
      "AI 综合分析：本次消耗上升为来料质量波动所致——滤棒固化质量离散度增大导致卷接废支剔除增加（影响程度：中；可信度：90%）。",
    timeline: [
      { time: "2025-11-20 00:00", label: "发生", desc: "嘴棒单耗越过历史均值" },
      { time: "2025-11-23 09:00", label: "处置", desc: "切换备用批次并加严来料检验" },
      { time: "2025-11-27 23:59", label: "恢复", desc: "单耗恢复正常水平" },
    ],
    alertIds: [],
    aiBasis: "基于辅料日单耗与来料检验记录交叉识别。",
    formation: "AI识别",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2025-11-28 09:00",
    updatedBy: "王芳",
    updatedAt: "2025-11-29 10:20",
    revisions: [],
  },
  {
    id: "SC20240715014",
    title: "1#卷接包机组年度大修",
    type: "检修维护",
    startTime: "2024-07-15 08:00",
    endTime: "2024-07-19 18:00",
    objects: ["卷包车间", "1#卷接包机组"],
    metrics: ["台时产量"],
    impactSummary: "计划性停机大修 5 天，期间车间日产量下降 6.3%，由其余机组加班分担。",
    process:
      "按年度大修计划对 1#机组实施全面检修，包括卷接机刀头系统大修、包装机凸轮机构更换与电控系统预防性试验。大修期间车间排产调整，其余机组三班满负荷分担产量。7 月 19 日完成大修，机组一次开机成功并恢复排产。",
    causeAnalysis:
      "AI 综合分析：本次停机为计划性检修维护影响——年度大修占用连续运行时段，属计划内波动（影响程度：中；可信度：96%）。",
    timeline: [
      { time: "2024-07-15 08:00", label: "开始", desc: "1#机组停机大修" },
      { time: "2024-07-17 14:00", label: "过程", desc: "刀头大修与凸轮机构更换" },
      { time: "2024-07-19 18:00", label: "恢复", desc: "大修完成，一次开机成功" },
    ],
    alertIds: [],
    formation: "人工补录",
    status: "已确认",
    createdBy: "高亚东",
    createdAt: "2024-07-22 09:00",
    revisions: [],
  },
  {
    id: "SC20241008015",
    title: "台风外围影响短时停产",
    type: "外部环境影响",
    startTime: "2024-10-08 00:00",
    endTime: "2024-10-09 12:00",
    objects: ["卷包车间", "制丝车间"],
    metrics: ["生产效率", "台时产量"],
    impactSummary: "电压暂降触发部分机组保护停机，短时停产约 2 小时，当日产量下降 7.4%。",
    process:
      "受台风外围影响，10 月 8 日市政线路出现 2 次电压暂降，卷包与制丝工序部分设备保护重启短时停产。动力车间启用稳压与负荷错峰措施后逐步恢复，10 月 9 日 12:00 各工序恢复正常生产，当周利用周末补足欠产。",
    causeAnalysis:
      "AI 综合分析：本次停产为外部环境影响所致——电压暂降触发设备保护动作（影响程度：高；可信度：94%）。电能质量监测与气象记录时间轴吻合。",
    timeline: [
      { time: "2024-10-08 00:00", label: "发生", desc: "电压暂降 2 次，部分机组停机" },
      { time: "2024-10-08 03:00", label: "处置", desc: "启用稳压与负荷错峰措施" },
      { time: "2024-10-09 12:00", label: "恢复", desc: "各工序恢复正常生产" },
    ],
    alertIds: [],
    aiBasis: "基于电能质量监测与停机记录交叉识别。",
    formation: "AI识别",
    status: "已确认",
    createdBy: "AI识别引擎",
    createdAt: "2024-10-10 09:00",
    updatedBy: "孙明",
    updatedAt: "2024-10-11 10:00",
    revisions: [],
  },
  {
    id: "SC20241225016",
    title: "年末赶产计划调整",
    type: "生产计划调整",
    startTime: "2024-12-25 08:00",
    endTime: "2024-12-31 22:00",
    objects: ["卷包车间"],
    metrics: ["生产效率", "单箱耗盘纸量"],
    impactSummary: "周产量较月均上升 14.2%，机组连续满班运行，单箱耗盘纸量上升 0.8 米/箱。",
    process:
      "为完成年度产量目标，12 月 25 日至 31 日卷包车间加密班次赶产，主要机组连续满班运行。赶产期间机组开动率与辅料消耗同步上升，属计划内波动。12 月 31 日完成年度产量目标后恢复正常排产。",
    causeAnalysis:
      "AI 综合分析：本次产量与消耗上升为生产计划调整所致——年末赶产机组连续满班，换牌与高速运行损耗相应增加（影响程度：中；可信度：93%）。",
    timeline: [
      { time: "2024-12-25 08:00", label: "开始", desc: "班次加密，机组满班运行" },
      { time: "2024-12-31 22:00", label: "结束", desc: "完成年度产量目标，恢复排产" },
    ],
    alertIds: [],
    formation: "人工补录",
    status: "已确认",
    createdBy: "李强",
    createdAt: "2025-01-02 08:50",
    revisions: [],
  },
];

// ===== 模块级 store（客户端会话内保持，刷新还原 —— 与能耗年鉴独立） =====
let eventStore: MajorEvent[] = PRODUCTION_EVENTS.map((e) => ({ ...e }));
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

// 确认 / 排除等状态流转
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

// 生成新事件编号：SC + 开始日期 YYYYMMDD + 3 位序号（同日递增）
export function nextEventId(startTime: string): string {
  const prefix = "SC" + startTime.slice(0, 10).replace(/-/g, "");
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

// 同一年度内报告名称不得重复（月度报告按所属年度判重）
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

// 存在已确认事件的年月（降序；月度报告周期选项）
export function availableMonths(): { year: number; month: number }[] {
  const months = new Set(
    eventStore
      .filter((e) => e.status === "已确认")
      .map((e) => e.startTime.slice(0, 7).replace("-", ""))
  );
  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .map((s) => ({ year: Number(s.slice(0, 4)), month: Number(s.slice(4)) }));
}

// 某年度（或某月）已确认事件（按发生时间正序）；「待确认」「已排除」不参与报告生成
export function confirmedEventsOf(year: number, month?: number): MajorEvent[] {
  const prefix = month !== undefined ? `${year}-${pad2(month)}` : String(year);
  return eventStore
    .filter((e) => e.status === "已确认" && e.startTime.startsWith(prefix))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// ===== 报告生成（确定性模板：已确认事件 + 关联证据 + 统计结果；支持年度 / 月度周期） =====
function periodOf(year: number, month?: number): { periodStart: string; periodEnd: string } {
  if (month !== undefined) {
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
    // 未完结月份截至数据截止日（与年度口径一致）
    return { periodStart: `${year}-${pad2(month)}-01`, periodEnd: end > PROD_DATA_CUTOFF ? PROD_DATA_CUTOFF : end };
  }
  if (year < PROD_CURRENT_YEAR) return { periodStart: `${year}-01-01`, periodEnd: `${year}-12-31` };
  return { periodStart: `${year}-01-01`, periodEnd: PROD_DATA_CUTOFF };
}

function fmtPct(n: number, total: number): string {
  return total ? `${Math.round((n / total) * 100)}%` : "-";
}

export function buildReport(input: {
  year: number;
  month?: number; // 月度报告时传入
  events: MajorEvent[]; // 已选中的已确认事件（按发生时间正序）
  name: string;
  user: string;
  generatedAt?: string;
}): YearbookReport {
  const { year, month, events, name, user } = input;
  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const { periodStart, periodEnd } = periodOf(year, month);
  const periodWord = month !== undefined ? "本月度" : "本年度"; // 统计口径文案

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

  // —— 第一章 事件概览（年度 / 月度） ——
  const formationLines = Array.from(byFormation.entries()).map(([t, n]) => `${t} ${n} 件`).join("、");
  const overview = [
    `${periodWord}共纳入重大事件 ${sorted.length} 件，全部经过人工确认，统计范围 ${periodStart} 至 ${periodEnd}，数据截止 ${PROD_DATA_CUTOFF}。`,
    `按形成方式分布：${formationLines}。`,
    `事件共涉及 ${objCount.size} 个影响对象（车间/机组/设备）、${metricCount.size} 项业务指标；已结束事件累计影响时长约 ${totalDays} 天${ongoing ? `，另有 ${ongoing} 件事件仍在进行中` : ""}。`,
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
    `1. 事件结构分析：${periodWord}重大事件以${topType[0]}为主（${topType[1]} 件，占 ${fmtPct(topType[1], sorted.length)}），建议针对该类事件开展专项复盘，完善预防性措施。`,
    `2. 对象集中度分析：${hotObjects} 等对象多次受到影响，建议结合设备健康度与运行工况安排针对性检查，降低重复发生概率。`,
    `3. 数据口径说明：本报告基于生成时点（${input.generatedAt ?? PROD_DATA_CUTOFF}）的已确认事件快照编制，事件后续修改不改变本报告内容；如需更新请重新生成。`,
    `4. 管理建议：对已结束事件核销处置闭环情况，对进行中事件持续跟踪恢复进度，并将本期经验纳入后续生产管理策略。`,
  ].join("\n");

  return {
    id: `PR${year}${month !== undefined ? pad2(month) : "Y"}${pad3(reportSeq++)}`,
    year,
    periodType: month !== undefined ? "月度" : "年度",
    month,
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
    dataCutoff: PROD_DATA_CUTOFF,
    sections: { overview, chronicle, analysis },
    generatedAt: input.generatedAt ?? `${PROD_DATA_CUTOFF} 10:00`,
    generatedBy: user,
    editLog: [],
  };
}

// ===== 预置历年报告（2025 年度 / 2026 年度 / 2026 年 7 月月度，同规则生成） =====
(function initPresetReports() {
  const presets: {
    year: number;
    month?: number;
    user: string;
    generatedAt: string;
    edited?: { time: string; user: string; note: string };
  }[] = [
    { year: 2026, month: 7, user: "苏恒", generatedAt: "2026-08-03 10:30" },
    { year: 2026, user: "苏恒", generatedAt: "2026-08-09 10:30", edited: { time: "2026-08-10 14:00", user: "苏恒", note: "完善第二章纪要格式" } },
    { year: 2025, user: "周婷", generatedAt: "2026-01-06 10:30" },
  ];
  presets.forEach((p) => {
    const r = buildReport({
      year: p.year,
      month: p.month,
      events: confirmedEventsOf(p.year, p.month),
      name: p.month !== undefined ? `${p.year}年${p.month}月重大事件报告` : `${p.year}年度重大事件报告`,
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
