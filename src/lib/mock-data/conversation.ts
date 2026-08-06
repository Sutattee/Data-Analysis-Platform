// 对话管理 - 类型与模拟数据

export type ConvStatus = "正常" | "异常" | "中断" | "运行中";
export type ConvFeedback = "点赞" | "点踩" | "未反馈";
export type QuestionType = "智能问数" | "知识问答" | "报告生成" | "智能建议" | "归因分析";

export interface ConversationLog {
  input: string;
  output: string;
  reasoning: string[]; // 推理步骤
  error?: string; // 异常/中断信息
}

export interface ConversationItem {
  id: string;
  user: string; // 用户账号
  title: string; // 对话名称
  durationSec: number; // 耗时（秒，可含小数）
  status: ConvStatus;
  feedback: ConvFeedback;
  inSampleSet: boolean; // 是否已加入样本问题集
  startTime: string; // YYYY-MM-DD HH:mm:ss
  dataModel: string;
  questionType: QuestionType;
  log: ConversationLog;
}

// 数据模型枚举（下拉选项）
export const convDataModels: string[] = [
  "证券经纪业务主题",
  "经营分析模型-精简版",
  "生产运营主题",
  "质量管理主题",
  "设备运维主题",
];

// 仅这些问题类型支持加入样本问题集
export const SAMPLE_ELIGIBLE_TYPES: QuestionType[] = ["智能问数", "知识问答"];

// 耗时格式化：<60s 显示 3 位小数；>=60s 显示 Xh Ym / Xm Ys
export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec.toFixed(3)}s`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}m${s}s`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${h}h${m}m`;
}

// 生成默认日志（异常/中断单独标注）
function makeLog(title: string, status: ConvStatus, qtype: QuestionType): ConversationLog {
  const reasoning = [
    `意图识别：识别为「${qtype}」类问题`,
    "生成查询：将自然语言转换为数据查询 DSL",
    "执行查询：连接数据模型并获取结果",
    "组织回答：基于结果生成分析结论",
  ];
  if (status === "异常") {
    return { input: title, output: "", reasoning, error: "连接超时：目标数据源在 30s 内未响应，请稍后重试或检查数据源连通性。" };
  }
  if (status === "中断") {
    return { input: title, output: "", reasoning, error: "用户主动中断了本次对话。" };
  }
  if (status === "运行中") {
    return { input: title, output: "（处理中…）", reasoning, error: undefined };
  }
  return {
    input: title,
    output: `针对「${title}」，已基于所选数据模型完成查询与分析，并给出结论与相关图表建议。`,
    reasoning,
  };
}

interface Seed {
  id: string;
  user: string;
  title: string;
  durationSec: number;
  status: ConvStatus;
  feedback: ConvFeedback;
  inSampleSet: boolean;
  startTime: string;
  dataModel: string;
  questionType: QuestionType;
}

const seeds: Seed[] = [
  { id: "c1", user: "trader01", title: "查询今日A股成交额TOP10", durationSec: 51.324, status: "正常", feedback: "点赞", inSampleSet: true, startTime: "2025-07-16 09:32:11", dataModel: "证券经纪业务主题", questionType: "智能问数" },
  { id: "c2", user: "analyst_li", title: "近一年净利润同比变化趋势分析", durationSec: 76, status: "正常", feedback: "未反馈", inSampleSet: false, startTime: "2025-07-16 10:15:43", dataModel: "经营分析模型-精简版", questionType: "智能问数" },
  { id: "c3", user: "ops_wang", title: "高炉车间昨日产量与达成率", durationSec: 8.234, status: "正常", feedback: "点赞", inSampleSet: false, startTime: "2025-07-16 11:02:09", dataModel: "生产运营主题", questionType: "智能问数" },
  { id: "c4", user: "qa_zhang", title: "热轧工艺精轧温度控制标准是什么", durationSec: 12.5, status: "正常", feedback: "点赞", inSampleSet: true, startTime: "2025-07-16 11:48:30", dataModel: "质量管理主题", questionType: "知识问答" },
  { id: "c5", user: "admin", title: "生成本月经营分析月报", durationSec: 125, status: "正常", feedback: "未反馈", inSampleSet: false, startTime: "2025-07-16 14:20:00", dataModel: "经营分析模型-精简版", questionType: "报告生成" },
  { id: "c6", user: "dev_chen", title: "近期良品率下降的归因分析", durationSec: 103, status: "正常", feedback: "点踩", inSampleSet: false, startTime: "2025-07-16 14:55:22", dataModel: "生产运营主题", questionType: "归因分析" },
  { id: "c7", user: "trader01", title: "两市融资融券余额查询", durationSec: 3.456, status: "异常", feedback: "未反馈", inSampleSet: false, startTime: "2025-07-16 15:10:55", dataModel: "证券经纪业务主题", questionType: "智能问数" },
  { id: "c8", user: "analyst_li", title: "针对营收增长给出智能建议", durationSec: 72, status: "正常", feedback: "未反馈", inSampleSet: false, startTime: "2025-07-16 15:30:18", dataModel: "经营分析模型-精简版", questionType: "智能建议" },
  { id: "c9", user: "ops_wang", title: "设备故障率近30天趋势", durationSec: 6.789, status: "正常", feedback: "点赞", inSampleSet: false, startTime: "2025-07-16 16:05:41", dataModel: "设备运维主题", questionType: "智能问数" },
  { id: "c10", user: "qa_zhang", title: "连铸坯表面缺陷分类标准", durationSec: 9.012, status: "正常", feedback: "未反馈", inSampleSet: true, startTime: "2025-07-16 16:22:07", dataModel: "质量管理主题", questionType: "知识问答" },
  { id: "c11", user: "trader01", title: "期权持仓希腊字母风险分析", durationSec: 45.6, status: "运行中", feedback: "未反馈", inSampleSet: false, startTime: "2025-07-16 16:40:33", dataModel: "证券经纪业务主题", questionType: "智能问数" },
  { id: "c12", user: "admin", title: "季度报告模板生成", durationSec: 118, status: "中断", feedback: "未反馈", inSampleSet: false, startTime: "2025-07-16 17:01:12", dataModel: "经营分析模型-精简版", questionType: "报告生成" },
  { id: "c13", user: "analyst_li", title: "成本结构多维下钻分析", durationSec: 32.1, status: "正常", feedback: "点赞", inSampleSet: false, startTime: "2025-07-15 09:12:00", dataModel: "经营分析模型-精简版", questionType: "智能问数" },
  { id: "c14", user: "ops_wang", title: "能耗异常预警记录查询", durationSec: 5.432, status: "正常", feedback: "点踩", inSampleSet: false, startTime: "2025-07-15 10:33:45", dataModel: "生产运营主题", questionType: "智能问数" },
  { id: "c15", user: "dev_chen", title: "产能利用率的计算口径是什么", durationSec: 7.89, status: "正常", feedback: "未反馈", inSampleSet: true, startTime: "2025-07-15 11:20:18", dataModel: "生产运营主题", questionType: "知识问答" },
  { id: "c16", user: "trader01", title: "北向资金实时净流入查询", durationSec: 2.1, status: "正常", feedback: "点赞", inSampleSet: false, startTime: "2025-07-15 14:05:50", dataModel: "证券经纪业务主题", questionType: "智能问数" },
];

export const conversationRecords: ConversationItem[] = seeds.map((s) => ({
  ...s,
  log: makeLog(s.title, s.status, s.questionType),
}));

// 状态 → 徽标样式
export const STATUS_STYLE: Record<ConvStatus, string> = {
  正常: "bg-green-100 text-green-700",
  异常: "bg-red-100 text-red-700",
  中断: "bg-gray-100 text-gray-600",
  运行中: "bg-blue-100 text-blue-700",
};
