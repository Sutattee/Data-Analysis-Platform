import type { AnomalyDetail } from "./grid-forecast";

/**
 * 异常原因 AI 辅助 —— 规则匹配引擎 + 会话存储。
 * 能力边界：仅用于当前异常记录的原因分析；不纳入智能问数历史记录。
 * 会话按「用户 + 异常记录」隔离存储（localStorage），同一用户再次进入自动恢复。
 */

// 面板对话消息
export interface AnomalyAiMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string; // HH:mm
  // 结构化分析结论（可采纳回填）
  adoptable?: boolean;
  causeText?: string; // 回填至异常原因输入框的纯文本
}

// ===== 异常记录唯一标识 =====
export function anomalyKeyOf(detail: AnomalyDetail): string {
  return detail.recordId ?? `${detail.title}|${detail.triggerTime ?? detail.forecastTime ?? ""}`;
}

// 当前异常上下文摘要（打开面板时自动关联，无需用户重复描述）
export function contextSummaryOf(detail: AnomalyDetail): string {
  const lines = [
    detail.dept ? `异常对象：${detail.dept}` : null,
    detail.metricName ? `指标名称：${detail.metricName}` : null,
    detail.current ? `异常值：${detail.current}` : detail.forecastValue ? `预测值：${detail.forecastValue}` : null,
    detail.baseline ? `基准值/阈值：${detail.baseline}` : null,
    detail.deviation ? `偏离程度：${detail.deviation}` : null,
    detail.triggerTime ? `发生时间：${detail.triggerTime}` : null,
    detail.forecastTime ? `预计越界时间：${detail.forecastTime}` : null,
    detail.level ? `告警等级：${detail.level}` : null,
  ].filter((x): x is string => !!x);
  lines.push("触发规则：指标值超出评价阈值（基于历史趋势与目标值判定）");
  return lines.join("；");
}

// ===== 无关问题兜底 =====
const FALLBACK =
  "抱歉，我仅支持当前异常记录的原因分析，请补充与本次异常相关的现象、设备状态、操作变化或关联事件。";

// 话题检测：是否与异常分析相关（命中任一主题即视为相关）
const TOPIC_KEYWORDS = [
  "设备", "故障", "停机", "异响", "振动", "温度", "高温", "天气", "环境", "湿度",
  "产量", "排产", "计划", "生产", "工艺", "参数", "设定", "配方", "调整", "切换",
  "检修", "维护", "保养", "表计", "计量", "数据", "采集", "通讯", "离线", "操作",
  "异常", "原因", "分析", "能耗", "电耗", "趋势", "波动", "上升", "下降", "偏高", "偏低",
];
// 纯闲聊模式（优先级高于主题关键词，避免"今天天气不错"误判为环境因素描述）
const CHAT_PATTERNS = [
  "你好", "您好", "再见", "谢谢", "你是谁", "你能做什么", "讲个笑话", "笑话",
  "今天天气不错", "天气怎么样", "在吗", "吃了吗",
];
function isRelated(text: string): boolean {
  if (CHAT_PATTERNS.some((p) => text.includes(p))) return false;
  return TOPIC_KEYWORDS.some((k) => text.includes(k));
}

// ===== 原因模板（按影响程度由高到低） =====
interface CauseTemplate {
  keyword: string[]; // 命中关键词
  category: string; // 原因分类
  desc: string; // 描述模板
  evidence: string; // 分析证据
  confidence: number; // 可信度
  impact: "高" | "中"; // 影响程度
}

const CAUSE_TEMPLATES: CauseTemplate[] = [
  {
    keyword: ["故障", "异响", "振动", "老化", "磨损", "停机", "损坏"],
    category: "设备运行异常",
    desc: "设备存在故障隐患或部件磨损老化，导致运行功率/能耗偏离正常水平",
    evidence: "用户反馈的设备现象与异常发生时间吻合",
    confidence: 88,
    impact: "高",
  },
  {
    keyword: ["检修", "维护", "保养", "大修", "调试"],
    category: "检修维护影响",
    desc: "近期检修维护作业改变了设备运行状态，恢复初期参数未完全稳定",
    evidence: "检修时间窗口与异常发生时间吻合",
    confidence: 82,
    impact: "高",
  },
  {
    keyword: ["产量", "排产", "计划", "加产", "任务", "生产"],
    category: "生产计划调整",
    desc: "生产计划调整（加产/减产/换牌）导致设备负荷变化，能耗随之波动",
    evidence: "产量变化与能耗波动的相关性分析",
    confidence: 80,
    impact: "中",
  },
  {
    keyword: ["工艺", "参数", "设定", "配方", "调整", "切换", "温度"],
    category: "运行或工艺调整",
    desc: "工艺参数或运行模式调整，使设备运行点偏离原基准区间",
    evidence: "参数调整记录与偏离起始时间吻合",
    confidence: 78,
    impact: "中",
  },
  {
    keyword: ["天气", "环境", "高温", "湿度", "暴雨"],
    category: "外部环境影响",
    desc: "外部环境条件变化（气温/湿度等）导致设备负荷或效率改变",
    evidence: "同期环境条件与历史基线存在明显差异",
    confidence: 75,
    impact: "中",
  },
  {
    keyword: ["表计", "计量", "数据", "采集", "通讯", "离线", "误报"],
    category: "计量与数据采集异常",
    desc: "仪表计量或数据采集环节异常，读数未能反映真实运行状态",
    evidence: "数据曲线存在阶跃/缺失等非物理特征",
    confidence: 70,
    impact: "中",
  },
  {
    keyword: ["操作", "人员", "误操作"],
    category: "人为操作影响",
    desc: "现场操作（启停、切换等）导致短时负荷波动",
    evidence: "操作记录与异常起始时间吻合",
    confidence: 68,
    impact: "中",
  },
];

// 数据不足提示（上下文缺少关键信息时引导补充，不虚构原因）
function insufficientReply(detail: AnomalyDetail): string {
  const missing: string[] = [];
  if (!detail.current && !detail.forecastValue) missing.push("异常值/预测值");
  if (!detail.baseline) missing.push("基准值或阈值");
  if (!detail.deviation) missing.push("偏离程度");
  if (!detail.triggerTime && !detail.forecastTime) missing.push("发生时间");
  return (
    "当前数据不足，暂无法确定异常原因。\n" +
    "缺少的关键信息：" + (missing.length ? missing.join("、") : "异常现象描述") + "。\n" +
    "请补充您掌握的异常现象、设备状态、操作变化或相关事件，我将继续分析。"
  );
}

// 结构化分析结论文本（markdown）
function buildAnalysis(detail: AnomalyDetail, userText: string, history: AnomalyAiMessage[]): string {
  const hitTemplates = CAUSE_TEMPLATES.filter((t) =>
    t.keyword.some((k) => userText.includes(k))
  );

  // 首轮无补充信息：按上下文给出概览性分析
  if (!userText.trim()) {
    const metric = detail.metricName ?? "该指标";
    const obj = detail.dept ?? "相关对象";
    const dev = detail.deviation ?? "超出基准";
    return (
      `根据当前异常上下文（${contextSummaryOf(detail)}），初步分析如下：\n\n` +
      `1. 【运行或工艺调整】${metric}偏离可能源于${obj}运行模式或工艺参数变化（影响程度：中；证据：偏离程度 ${dev}；可信度：70%）。\n` +
      `2. 【设备运行异常】设备部件状态变化可能导致负荷异常，建议现场核实设备运行声音、温度与振动（影响程度：中；可信度：65%）。\n\n` +
      `请补充异常现象、设备状态、操作变化或相关事件，以便进一步收敛原因。`
    );
  }

  if (hitTemplates.length === 0) {
    // 相关但未命中模板：结合上下文提示
    return (
      `已记录您的补充信息。结合当前异常上下文分析：\n\n` +
      `暂未匹配到明确的单一原因。建议补充以下信息以便定位：\n` +
      `1. 异常发生前后是否有设备启停、参数调整或检修作业？\n` +
      `2. 仪表读数是否存在跳变、缺失或与现场实际情况不符？\n` +
      `3. 同类设备或其他指标是否出现同步波动？`
    );
  }

  const sorted = [...hitTemplates].sort((a, b) => b.confidence - a.confidence);
  const lines = sorted.map((t, i) => {
    const base = `【${t.category}】${t.desc}（关联对象：${detail.dept ?? "—"}；影响程度：${t.impact}；证据：${t.evidence}；可信度：${t.confidence}%）`;
    return `${i + 1}. ${base}`;
  });
  return (
    `结合您补充的信息与当前异常上下文，按影响程度由高到低分析如下：\n\n` +
    lines.join("\n") +
    `\n\n建议优先核实排序第 1 项，若现场检查未发现对应现象，再依次排查后续因素。`
  );
}

// 生成 AI 回复（无历史依赖时 history 传 []）
export function generateAnomalyReply(
  detail: AnomalyDetail,
  userText: string,
  history: AnomalyAiMessage[]
): { content: string; adoptable: boolean; causeText?: string } {
  // 能力边界：无关问题兜底
  if (userText.trim() && !isRelated(userText)) {
    return { content: FALLBACK, adoptable: false };
  }
  // 上下文严重缺失且无补充信息 → 数据不足提示
  const contextInsufficient =
    !userText.trim() &&
    !detail.current &&
    !detail.forecastValue &&
    !detail.baseline &&
    !detail.deviation;
  if (contextInsufficient) {
    return { content: insufficientReply(detail), adoptable: false };
  }

  const content = buildAnalysis(detail, userText, history);
  // 分析结论可采纳回填（首轮概览与命中模板均可回填）
  const adoptable = true;
  const causeText =
    "经AI辅助分析：" +
    content
      .replace(/【/g, "")
      .replace(/】/g, "：")
      .split("\n")
      .filter((l) => /^\d+\./.test(l))
      .map((l) => l.replace(/^\d+\.\s*/, ""))
      .join("；");
  return { content, adoptable, causeText };
}

// ===== 会话存储（用户 + 异常记录 隔离；不纳入智能问数历史） =====
const STORAGE_KEY = "anomaly_ai_chats";

interface StoredChat {
  messages: AnomalyAiMessage[];
}

function loadAll(): Record<string, StoredChat> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredChat>) : {};
  } catch {
    return {};
  }
}

function persist(all: Record<string, StoredChat>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* 存储满等异常忽略 */
  }
}

export function chatKeyOf(userKey: string, anomalyKey: string): string {
  return `${userKey}|${anomalyKey}`;
}

export function loadChat(userKey: string, anomalyKey: string): AnomalyAiMessage[] {
  return loadAll()[chatKeyOf(userKey, anomalyKey)]?.messages ?? [];
}

export function saveChat(userKey: string, anomalyKey: string, messages: AnomalyAiMessage[]): void {
  const all = loadAll();
  all[chatKeyOf(userKey, anomalyKey)] = { messages };
  persist(all);
}
