// 预测记录 — 模拟数据（预测完成后的独立快照，不随模型/数据/配置更新而变化）
// 数据处理规则：
//  · 周期结束后按相同指标/对象/周期/口径匹配实际结果并计算预测误差
//  · 未来值预测、能否达标预测可验证；条件测算、达标反推不计算误差（"—"）
//  · 预测失败记录状态与原因，不展示无效预测结果
import type { ForecastType } from "./forecast";

export interface RecordCondition {
  name: string;
  value: string;
  source: string; // 默认取值来源
  adjusted?: boolean; // 人工调整过（按实际提交值保存）
}

export interface ForecastRecord {
  id: string;
  source: "系统自动" | "用户手动";
  type: ForecastType;
  metricName: string; // 快照：指标名
  object: string;
  periodLabel: string; // 明日 / 未来7日 / 本月末 / 本年度…
  question: string; // 预测问题
  executedAt: string; // 预测时间
  dataEnd: string; // 数据截止时间
  modelName: string; // 模型信息：模型名称
  modelVersion: string; // 模型信息：模型版本
  modelSource: string; // 模型信息：来源（模型注册任务编号）
  status: "已验证" | "待验证" | "预测失败";
  resultValue?: string; // 预测值或反推结果（失败时无）
  headline: string; // 核心预测结果（失败时为失败原因摘要）
  interval?: string; // 预测区间
  targetCompare?: string; // 目标或基准对比
  actualResult?: string; // 实际结果（未产生 = 待验证）
  error?: string; // 预测误差（不适用 = 无）
  failReason?: string;
  conditions: RecordCondition[]; // 工况条件快照（无工况类为摘要行）
  conclusions: string[]; // 结构化分析结论
}

// 状态一致的确定性数据（数据截止日 2026-08-09，记录按时间倒序）
export const FORECAST_RECORDS: ForecastRecord[] = [
  {
    id: "FR-20260809-012",
    source: "用户手动",
    type: "条件测算",
    metricName: "空调系统每日蒸汽耗",
    object: "空调系统",
    periodLabel: "明日",
    question: "室外温度 35℃、湿度 80% 工况下，明日空调系统蒸汽耗是多少？",
    executedAt: "2026-08-09 16:42",
    dataEnd: "2026-08-09",
    modelName: "LSTM 多变量能耗模型",
    modelVersion: "V2",
    modelSource: "Task-2271",
    status: "待验证",
    resultValue: "45.9 t",
    headline: "预计 45.9 t，预测区间 44.5 ～ 47.3 t",
    interval: "44.5 ～ 47.3 t",
    conditions: [
      { name: "室外温度", value: "35 ℃", source: "天气数据", adjusted: true },
      { name: "室外湿度", value: "80 %", source: "天气数据", adjusted: true },
      { name: "室内温湿度设定值", value: "24 ℃", source: "最近有效运行数据" },
      { name: "生产时长", value: "16 小时", source: "生产计划数据" },
    ],
    conclusions: [
      "高温高湿工况显著抬升制冷除湿负荷，蒸汽耗明显上升。",
      "预测模型：LSTM 多变量能耗模型；历史预测误差 ±2.8%（近 90 天回测）。",
      "建议结合排班将除湿机组错峰运行，并对比其他温度设定组合寻找更优方案。",
    ],
  },
  {
    id: "FR-20260808-011",
    source: "系统自动",
    type: "未来值预测",
    metricName: "卷包车间单箱电耗",
    object: "卷包车间",
    periodLabel: "明日",
    question: "明日卷包车间单箱电耗预计多少？",
    executedAt: "2026-08-08 02:10",
    dataEnd: "2026-08-07",
    modelName: "能耗时序预测模型",
    modelVersion: "V2.1",
    modelSource: "Task-1834",
    status: "预测失败",
    headline: "预测失败：生产计划数据接口超时",
    failReason: "生产计划数据接口超时，未获取到明日排产计划，任务中止。失败详情已记录，可重新发起预测。",
    conditions: [
      { name: "最新实际数据", value: "截至 2026-08-07", source: "系统自动获取" },
      { name: "生产计划", value: "获取失败", source: "生产计划数据（接口超时）" },
    ],
    conclusions: ["本次任务执行失败，未生成预测结果与分析结论。"],
  },
  {
    id: "FR-20260805-010",
    source: "系统自动",
    type: "未来值预测",
    metricName: "制丝车间每公斤电耗",
    object: "制丝车间",
    periodLabel: "未来15日",
    question: "未来15日制丝车间每公斤电耗预计多少？",
    executedAt: "2026-08-05 02:10",
    dataEnd: "2026-08-04",
    modelName: "能耗时序预测模型",
    modelVersion: "V2.1",
    modelSource: "Task-1834",
    status: "待验证",
    resultValue: "0.46 kWh/kg（均值）",
    headline: "未来15日均值预计 0.46 kWh/kg，较历史均值增加 1.2%",
    interval: "0.45 ～ 0.47 kWh/kg",
    targetCompare: "历史均值 0.45 kWh/kg",
    conditions: [
      { name: "最新实际数据", value: "截至 2026-08-04", source: "系统自动获取" },
      { name: "生产计划", value: "8/5 ～ 8/19 排产计划", source: "生产计划数据" },
    ],
    conclusions: [
      "细支牌号排产占比上升，预计单位电耗小幅高于历史均值。",
      "预测模型：能耗时序预测模型 v2.1；历史预测误差 ±3.2%（近 90 天回测）。",
      "建议关注细支批次集中时段的筒壁预热能耗，避免非必要启停。",
    ],
  },
  {
    id: "FR-20260802-009",
    source: "系统自动",
    type: "能否达标预测",
    metricName: "单位产量碳排放量",
    object: "全厂",
    periodLabel: "本季度",
    question: "季度末单位产量碳排放量能否达成 ≤0.035 kg CO₂/万支 的目标？",
    executedAt: "2026-08-02 08:00",
    dataEnd: "2026-08-01",
    modelName: "目标达成分析模型",
    modelVersion: "V1",
    modelSource: "Task-2058",
    status: "待验证",
    resultValue: "0.0335 kg CO₂/万支（季末预测）",
    headline: "季末预计 0.0335 kg CO₂/万支，目标≤0.035，预计达标",
    interval: "0.0328 ～ 0.0342 kg CO₂/万支",
    targetCompare: "目标 不高于 0.035 kg CO₂/万支",
    conditions: [
      { name: "考核周期", value: "本季度（至 2026-09-30）", source: "系统自动确定" },
      { name: "当前实际值", value: "0.0341 kg CO₂/万支", source: "系统自动加载" },
      { name: "剩余生产计划", value: "72,000 箱", source: "生产计划数据" },
    ],
    conclusions: [
      "当前累计值 0.0341 低于目标上限，按剩余计划测算季末预计达标。",
      "预测模型：目标达成分析模型；历史预测误差 ±2.1%（近 90 天回测）。",
      "维持既有运行策略，按周跟踪累计值与预测差距即可。",
    ],
  },
  {
    id: "FR-20260808-008",
    source: "系统自动",
    type: "未来值预测",
    metricName: "食堂总电耗",
    object: "食堂",
    periodLabel: "明日",
    question: "明日食堂总电耗预计多少？",
    executedAt: "2026-08-08 02:12",
    dataEnd: "2026-08-07",
    modelName: "能耗时序预测模型",
    modelVersion: "V2.1",
    modelSource: "Task-1834",
    status: "已验证",
    resultValue: "3,240 kWh",
    headline: "明日预计 3,240 kWh，较历史均值增加 1.3%",
    interval: "3,143 ～ 3,337 kWh",
    targetCompare: "历史均值 3,198 kWh",
    actualResult: "3,214 kWh（2026-08-08 实际）",
    error: "-0.8%",
    conditions: [
      { name: "最新实际数据", value: "截至 2026-08-07", source: "系统自动获取" },
      { name: "就餐人数", value: "1,220 人", source: "生产计划数据（在岗人数估算）" },
      { name: "工作日类型", value: "工作日", source: "根据预测日期自动判断" },
    ],
    conclusions: [
      "工作日就餐负荷平稳，预测值与实际偏差在正常区间。",
      "预测模型：能耗时序预测模型 v2.1；历史预测误差 ±3.2%（近 90 天回测）。",
      "持续跟踪即可，暂无需调整。",
    ],
  },
  {
    id: "FR-20260730-007",
    source: "用户手动",
    type: "达标反推",
    metricName: "单位产量碳排放量",
    object: "全厂",
    periodLabel: "本年度",
    question: "年度目标 ≤0.035 kg CO₂/万支 下，剩余周期平均单位产量碳排放量需控制在多少？",
    executedAt: "2026-07-30 15:20",
    dataEnd: "2026-07-29",
    modelName: "目标达成分析模型",
    modelVersion: "V1",
    modelSource: "Task-2058",
    status: "待验证",
    resultValue: "≤ 0.0336 kg CO₂/万支",
    headline: "剩余周期平均需控制在 0.0336 kg CO₂/万支 以内，需较当前值降低 0.0005",
    targetCompare: "目标 不高于 0.035 kg CO₂/万支；当前值 0.0341",
    actualResult: "当前累计 0.0341 kg CO₂/万支（进行中）",
    conditions: [
      { name: "目标周期", value: "本年度（至 2026-12-31）", source: "用户选择" },
      { name: "目标值", value: "不高于 0.035 kg CO₂/万支", source: "指标配置自动带入" },
      { name: "剩余生产计划", value: "214,000 箱", source: "系统自动加载" },
    ],
    conclusions: [
      "反推基于剩余计划产量与能耗线性假设，若排产调整需重新测算。",
      "反推结果为控制值参考，不回写生产计划或业务系统。",
      "建议将控制值分解到月度并按月复盘偏差。",
    ],
  },
  {
    id: "FR-20260728-006",
    source: "系统自动",
    type: "未来值预测",
    metricName: "空调系统每日蒸汽耗",
    object: "空调系统",
    periodLabel: "未来7日",
    question: "未来7日空调系统蒸汽耗预计多少？",
    executedAt: "2026-07-28 02:10",
    dataEnd: "2026-07-27",
    modelName: "LSTM 多变量能耗模型",
    modelVersion: "V2",
    modelSource: "Task-2271",
    status: "已验证",
    resultValue: "192.4 t（累计）",
    headline: "未来7日预计累计 192.4 t，较历史均值增加 1.7%",
    interval: "186.6 ～ 198.2 t",
    targetCompare: "同工况历史累计 189.2 t",
    actualResult: "189.8 t（7/28 ～ 8/3 实际累计）",
    error: "-1.4%",
    conditions: [
      { name: "最新实际数据", value: "截至 2026-07-27", source: "系统自动获取" },
      { name: "天气预报", value: "7/28 ～ 8/3 逐日预报", source: "天气数据" },
      { name: "生产计划", value: "7/28 ～ 8/3 排产计划", source: "生产计划数据" },
    ],
    conclusions: [
      "预测期内气温低于预期，实际蒸汽耗略低于预测值。",
      "预测模型：LSTM 多变量能耗模型；历史预测误差 ±2.8%（近 90 天回测）。",
      "误差在模型正常范围内，无需调整。",
    ],
  },
  {
    id: "FR-20260725-005",
    source: "用户手动",
    type: "条件测算",
    metricName: "卷包车间单箱电耗",
    object: "卷包车间",
    periodLabel: "明日",
    question: "两班制、计划产量 2,600 箱工况下，明日卷包车间单箱电耗是多少？",
    executedAt: "2026-07-25 11:05",
    dataEnd: "2026-07-24",
    modelName: "LSTM 多变量能耗模型",
    modelVersion: "V2",
    modelSource: "Task-2271",
    status: "已验证",
    resultValue: "21.1 kWh/箱",
    headline: "预计 21.1 kWh/箱，预测区间 20.5 ～ 21.7 kWh/箱",
    interval: "20.5 ～ 21.7 kWh/箱",
    actualResult: "20.9 kWh/箱（2026-07-26 实际，实际按三班执行）",
    conditions: [
      { name: "计划产量", value: "2,600 箱", source: "生产计划数据", adjusted: true },
      { name: "设备运行时长", value: "22 小时", source: "设备运行计划数据" },
    ],
    conclusions: [
      "两班制下固定能耗摊薄变差，测算单箱电耗偏高。",
      "实际执行恢复三班，实际值低于测算工况，符合模型逻辑。",
      "建议排产尽量维持三班饱和运行。",
    ],
  },
  {
    id: "FR-20260721-004",
    source: "系统自动",
    type: "未来值预测",
    metricName: "锅炉天然气总能耗",
    object: "锅炉房",
    periodLabel: "未来7日",
    question: "未来7日锅炉天然气总能耗预计多少？",
    executedAt: "2026-07-21 02:10",
    dataEnd: "2026-07-20",
    modelName: "能耗时序预测模型",
    modelVersion: "V2.1",
    modelSource: "Task-1834",
    status: "已验证",
    resultValue: "18,340 Nm³（累计）",
    headline: "未来7日预计累计 18,340 Nm³，较历史均值增加 1.9%",
    interval: "17,975 ～ 18,705 Nm³",
    targetCompare: "同工况历史累计 17,998 Nm³",
    actualResult: "18,725 Nm³（7/21 ～ 7/27 实际累计）",
    error: "+2.1%",
    conditions: [
      { name: "最新实际数据", value: "截至 2026-07-20", source: "系统自动获取" },
      { name: "蒸汽需求计划", value: "7/21 ～ 7/27 折算", source: "生产计划数据" },
    ],
    conclusions: [
      "预测期蒸汽需求略超计划，实际耗气高于预测。",
      "预测模型：能耗时序预测模型 v2.1；历史预测误差 ±3.2%（近 90 天回测）。",
      "误差在正常范围，建议持续跟踪负荷偏差。",
    ],
  },
  {
    id: "FR-20260715-003",
    source: "用户手动",
    type: "达标反推",
    metricName: "单箱综合能耗",
    object: "全厂",
    periodLabel: "本年度",
    question: "年度目标 ≤31.0 kgce/箱 下，剩余周期平均单箱综合能耗需控制在多少？",
    executedAt: "2026-07-15 14:30",
    dataEnd: "2026-07-14",
    modelName: "目标达成分析模型",
    modelVersion: "V1",
    modelSource: "Task-2058",
    status: "待验证",
    resultValue: "≤ 29.8 kgce/箱",
    headline: "剩余周期平均需控制在 29.8 kgce/箱 以内，需较当前值降低 1.0",
    targetCompare: "目标 不高于 31.0 kgce/箱；当前值 30.8",
    actualResult: "当前累计 30.9 kgce/箱（进行中）",
    conditions: [
      { name: "目标周期", value: "本年度（至 2026-12-31）", source: "用户选择" },
      { name: "目标值", value: "不高于 31.0 kgce/箱", source: "指标配置自动带入" },
      { name: "剩余生产计划", value: "228,000 箱", source: "系统自动加载" },
    ],
    conclusions: [
      "按当时剩余计划反推，控制值 29.8 kgce/箱。",
      "反推结果随排产计划变化，本记录为当时快照，不代表最新测算。",
      "建议每次排产调整后重新反推。",
    ],
  },
  {
    id: "FR-20260630-002",
    source: "系统自动",
    type: "能否达标预测",
    metricName: "单箱综合能耗",
    object: "全厂",
    periodLabel: "本年度",
    question: "年末单箱综合能耗能否达成 ≤31.0 kgce/箱 的目标？",
    executedAt: "2026-06-30 08:00",
    dataEnd: "2026-06-29",
    modelName: "目标达成分析模型",
    modelVersion: "V1",
    modelSource: "Task-2058",
    status: "待验证",
    resultValue: "31.6 kgce/箱（年末预测）",
    headline: "年末预计 31.6 kgce/箱，目标≤31.0，预计高出 0.6，预计超标",
    interval: "31.0 ～ 32.2 kgce/箱",
    targetCompare: "目标 不高于 31.0 kgce/箱；当时累计 30.8",
    conditions: [
      { name: "考核周期", value: "本年度（至 2026-12-31）", source: "系统自动确定" },
      { name: "当前实际值", value: "30.8 kgce/箱（截至 2026-06-29）", source: "系统自动加载" },
      { name: "剩余生产计划", value: "251,000 箱", source: "生产计划数据" },
    ],
    conclusions: [
      "上半年累计已接近目标上限，按剩余计划测算年末存在超标风险。",
      "预测模型：目标达成分析模型；历史预测误差 ±2.1%（近 90 天回测）。",
      "建议结合达标反推制定剩余周期管控措施。",
    ],
  },
  {
    id: "FR-20260714-001",
    source: "系统自动",
    type: "未来值预测",
    metricName: "动力车间电耗",
    object: "动力车间",
    periodLabel: "未来7日",
    question: "未来7日动力车间电耗预计多少？",
    executedAt: "2026-07-14 02:10",
    dataEnd: "2026-07-13",
    modelName: "LSTM 多变量能耗模型",
    modelVersion: "V2",
    modelSource: "Task-2271",
    status: "已验证",
    resultValue: "271,500 kWh（累计）",
    headline: "未来7日预计累计 271,500 kWh，较历史均值增加 0.6%",
    interval: "263,900 ～ 279,100 kWh",
    targetCompare: "同工况历史累计 269,870 kWh",
    actualResult: "281,280 kWh（7/14 ～ 7/20 实际累计）",
    error: "+3.6%",
    conditions: [
      { name: "最新实际数据", value: "截至 2026-07-13", source: "系统自动获取" },
      { name: "生产计划", value: "7/14 ～ 7/20 排产计划", source: "生产计划数据" },
      { name: "设备运行计划", value: "空压 / 制冷投运计划", source: "设备运行计划数据" },
    ],
    conclusions: [
      "预测期内高温导致空压机加载率上升，实际电耗超出预测区间上界。",
      "预测模型：LSTM 多变量能耗模型；历史预测误差 ±2.8%（近 90 天回测）。",
      "误差超出模型正常范围，建议复核夏季高温工况的模型适配性。",
    ],
  },
];

// 筛选选项（从记录中聚合）
export function recordFilterOptions() {
  const types: string[] = [];
  const metrics: string[] = [];
  const objects: string[] = [];
  for (const r of FORECAST_RECORDS) {
    if (!types.includes(r.type)) types.push(r.type);
    if (!metrics.includes(r.metricName)) metrics.push(r.metricName);
    if (!objects.includes(r.object)) objects.push(r.object);
  }
  return { types, metrics, objects };
}
