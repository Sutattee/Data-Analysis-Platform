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
  { id: "c14", user: "ops_wang", title: "能耗异常告警记录查询", durationSec: 5.432, status: "正常", feedback: "点踩", inSampleSet: false, startTime: "2025-07-15 10:33:45", dataModel: "生产运营主题", questionType: "智能问数" },
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

// ========== 技术日志（详细日志 · 只读代码视图） ==========
// 按执行时间顺序展示单次问数的技术日志：意图识别 → 元数据检索 → DSL生成 →
// SQL生成与执行 → 结果处理 → 图表生成 → 回答生成。
// 每条日志含时间戳、级别、环节、内容；异常记录错误码、失败原因与错误堆栈。
// 敏感信息脱敏：密钥、密码等凭证不写入日志（连接串中的账号/密码以 ****** 占位）。
export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface TechLogLine {
  ts: string; // 时间戳 YYYY-MM-DD HH:mm:ss.SSS
  level: LogLevel;
  stage: string; // 执行环节
  message: string; // 日志内容（可多行：DSL / SQL / 错误堆栈等）
}

export interface TechLog {
  requestId: string;
  sessionId: string;
  requestTime: string;
  status: ConvStatus; // 执行状态
  totalMs: number; // 总耗时
  lines: TechLogLine[];
}

// 数据模型 → 事实表（SQL 中的目标表名）
const MODEL_TABLE: Record<string, string> = {
  "证券经纪业务主题": "ads_trade_daily",
  "经营分析模型-精简版": "ads_fin_profit",
  "生产运营主题": "ads_prod_output",
  "质量管理主题": "ads_quality_rate",
  "设备运维主题": "ads_equip_runtime",
};

// 简单字符串哈希（djb2）→ 生成确定性的伪随机值（同一记录每次渲染结果一致）
function hashStr(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}
function hashHex(str: string, len = 12): string {
  return hashStr(str).toString(16).padStart(8, "0").slice(0, len);
}

function parseTime(v: string): Date {
  return new Date(v.replace(" ", "T"));
}
function fmtTs(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

// 由对话记录生成完整技术日志（确定性生成）
export function buildTechLog(rec: ConversationItem): TechLog {
  const h = hashStr(rec.id);
  const totalMs = Math.round(rec.durationSec * 1000);
  const requestId = `req-${hashHex("rid:" + rec.id)}`;
  const sessionId = `sess-${hashHex("sid:" + rec.user + rec.startTime.slice(0, 10))}`;
  const table = MODEL_TABLE[rec.dataModel] ?? "ads_general_metric";
  const sourceId = `ds_${hashHex("src:" + rec.dataModel, 4)}`;
  const base = parseTime(rec.startTime);

  // 各环节耗时占比（意图识别/元数据检索/DSL生成/SQL执行/结果处理/图表生成/回答生成）
  const frac = [0.03, 0.03, 0.06, 0.72, 0.06, 0.05, 0.05];
  const dur = (i: number) => Math.max(12, Math.round(frac[i] * totalMs));
  const tsAt = (i: number) =>
    fmtTs(new Date(base.getTime() + Math.round(frac.slice(0, i + 1).reduce((a, b) => a + b, 0) * totalMs)));

  const p2 = (n: number) => String(n).padStart(2, "0");
  const dayStr = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const endDay = dayStr(base);
  const startDay = dayStr(new Date(base.getTime() - 30 * 86400000));

  const sql = [
    "SELECT t.stat_date, t.dim_1, SUM(t.metric_value) AS value",
    `FROM ${table} t`,
    `WHERE t.stat_date >= '${startDay}' AND t.stat_date < '${endDay}'`,
    "GROUP BY t.stat_date, t.dim_1",
    "ORDER BY value DESC",
    "LIMIT 10",
  ].join("\n");
  const params = `stat_date=[${startDay}, ${endDay}), dim_level=车间, topN=10`;
  const rows = 8 + (h % 88);
  const firstDim = ["1号机组", "2号机组", "卷包一线", "制丝二线"][h % 4];
  const firstVal = (86 + (h % 40) / 10).toFixed(1);
  const sumVal = rows * (120 + (h % 60));
  const chars = 180 + (h % 900);
  const conf = (0.86 + (h % 10) / 100).toFixed(2);

  const dsl = {
    intent: "data_query",
    question: rec.title,
    timeRange: { start: startDay, end: endDay },
    dimensions: ["stat_date", "dim_1"],
    filters: [] as string[],
    aggregation: "sum",
    orderBy: { field: "value", direction: "desc" },
    limit: 10,
    targetModel: rec.dataModel,
    targetTables: [table],
  };

  const lines: TechLogLine[] = [];
  const push = (level: LogLevel, stage: string, message: string, i = -1) =>
    lines.push({ ts: i < 0 ? fmtTs(base) : tsAt(i), level, stage, message });

  push("INFO", "请求", `接收问数请求：requestId=${requestId}, sessionId=${sessionId}, 用户=${rec.user}, 数据模型=${rec.dataModel}, 问题类型=${rec.questionType}\n安全策略：敏感信息已脱敏，密钥、密码等凭证不写入日志`);

  push("INFO", "意图识别", `输入：「${rec.title}」\n输出：intent=data_query, 问题类型=${rec.questionType}, 置信度=${conf}\n状态：成功（耗时 ${dur(0)}ms）`, 0);

  push("INFO", "元数据检索", `输入：意图=data_query, 提取关键词 ${3 + (h % 5)} 个\n输出：命中指标 ${1 + (h % 6)} 个，候选表 2 张（${table}、dim_org）\n状态：成功（耗时 ${dur(1)}ms）`, 1);

  push("DEBUG", "DSL生成", `输出：查询 DSL\n${JSON.stringify(dsl, null, 2)}\n状态：成功（耗时 ${dur(2)}ms）`, 2);

  // SQL 生成与执行：异常记录错误码、失败原因与错误堆栈
  if (rec.status === "异常") {
    push("DEBUG", "SQL生成与执行", `输出：生成 SQL\n${sql}\n查询参数：${params}`, 3);
    push("ERROR", "SQL生成与执行", `执行失败：错误码 DS-CONN-504, 失败原因：${rec.log.error ?? "数据源连接超时"}\n数据源=${sourceId}（jdbc:postgresql://10.**.**.23:5432/dw, 账号=dw_reader, 密码=******[已脱敏]）, 表=${table}, 返回 0 行\n错误堆栈：\ncom.shifang.dw.exception.DataSourceTimeoutException: connect timeout after 30000ms\n    at com.shifang.dw.sql.QueryEngine.execute(QueryEngine.java:214)\n    at com.shifang.dw.pipeline.PipelineRunner.runStage(PipelineRunner.java:88)\n    at com.shifang.dw.pipeline.PipelineRunner.run(PipelineRunner.java:52)\n    at com.shifang.dw.qa.QaOrchestrator.answer(QaOrchestrator.java:130)\n状态：失败（耗时 ${dur(3)}ms）`, 3);
    push("ERROR", "流程", `执行异常终止：跳过后续环节（结果处理、图表生成、回答生成），总耗时 ${totalMs}ms`, 3);
    return { requestId, sessionId, requestTime: rec.startTime, status: rec.status, totalMs, lines };
  }

  push("DEBUG", "SQL生成与执行", `输出：生成 SQL\n${sql}\n查询参数：${params}`, 3);
  push("INFO", "SQL生成与执行", `执行成功：数据源=${sourceId}（jdbc:postgresql://10.**.**.23:5432/dw, 账号=dw_reader, 密码=******[已脱敏]）, 表=${table}\n返回 ${rows} 行 × 3 列, 耗时 ${dur(3)}ms\n结果摘要：首行 ${firstDim}=${firstVal}, 合计=${sumVal}, 均值=${(sumVal / rows).toFixed(1)}`, 3);

  push("INFO", "结果处理", `输入：${rows} 行原始数据\n处理：类型转换、空值过滤（剔除 2 行）、按维度聚合\n输出：${rows - 2} 行标准结果集（字段：stat_date, dim_1, value）\n状态：成功（耗时 ${dur(4)}ms）`, 4);

  const chartMsg =
    rec.questionType === "知识问答"
      ? "跳过图表生成：知识问答无需图表\n状态：跳过（耗时 0ms）"
      : rec.questionType === "报告生成"
        ? `输出：生成趋势图 2 张、饼图 1 张（嵌入报告 Markdown）\n状态：成功（耗时 ${dur(5)}ms）`
        : `输入：${rows - 2} 行结果集\n输出：折线+柱状组合图（数据点 ${rows - 2} 个）\n状态：成功（耗时 ${dur(5)}ms）`;
  push("INFO", "图表生成", chartMsg, 5);

  if (rec.status === "运行中") {
    push("INFO", "回答生成", `模型=qw-72b-chat, 输入=结果集 ${rows - 2} 行 + 提示词模板 qa_answer_v3\n输出：流式生成中（已输出 ${Math.floor(chars / 2)} 字符）…\n状态：执行中（已耗时 ${dur(6)}ms）`, 6);
  } else if (rec.status === "中断") {
    push("WARN", "回答生成", `模型=qw-72b-chat, 流式生成被用户中断：已生成 ${Math.floor(chars / 3)}/${chars} 字符, 中断码 USER-ABORT-200\n状态：中断（耗时 ${dur(6)}ms）`, 6);
    push("WARN", "流程", `流程结束：用户主动中断，总耗时 ${totalMs}ms`, 6);
  } else {
    push("INFO", "回答生成", `模型=qw-72b-chat, 输入=结果集 ${rows - 2} 行 + 提示词模板 qa_answer_v3\n输出：流式生成 ${chars} 字符（约 ${Math.round(chars * 1.6)} tokens）\n状态：成功（耗时 ${dur(6)}ms）`, 6);
    push("INFO", "流程", `全流程执行成功（意图识别 → 元数据检索 → DSL生成 → SQL生成与执行 → 结果处理 → 图表生成 → 回答生成），总耗时 ${totalMs}ms`, 6);
  }

  return { requestId, sessionId, requestTime: rec.startTime, status: rec.status, totalMs, lines };
}

