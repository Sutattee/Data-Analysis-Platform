import { QaMessage, ExecutionNode, KnowledgeSource } from "@/types";
import { qaPresets, welcomeMessage } from "@/lib/mock-data/qa";
import { matchStandardQa } from "@/lib/mock-data/standard-qa";
import { matchSmartQuery, SmartQueryCase } from "@/lib/mock-data/smart-query";
import { generateId, delay } from "@/lib/utils";

// 统一命中答案的包装格式：已结构化内容保持原样，表格内容包装为结构化回答
function finalizeMatchedAnswer(answer: string): string {
  if (answer.includes("## 📊") || answer.includes("## 🔍")) return answer;
  if (answer.includes("|")) {
    return `## 📊 分析概述\n\n根据您的查询，系统已完成对相关业务数据的分析与汇总。\n\n## 🔍 主要发现\n\n${answer}\n\n## 💡 总结与建议\n\n建议持续关注关键指标变化趋势，如有异常请及时排查。`;
  }
  return answer;
}

// ========== 工具函数 ==========

function shuffleAndPick(arr: string[], n: number): string[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// 判断是否为知识问答类问题
function isKnowledgeQuestion(input: string): boolean {
  const lower = input.toLowerCase();
  const knowledgeKw = [
    "什么是", "如何", "怎样", "怎么", "原因", "为什么",
    "定义", "解释", "说明", "介绍", "规程", "标准",
    "工艺", "温度", "参数", "流程", "步骤", "方法",
    "卷接", "包装工艺", "制丝", "操作规程",
  ];
  return knowledgeKw.some((kw) => lower.includes(kw));
}

// 判断是否为图表修改指令
function isChartModification(input: string): boolean {
  const lower = input.toLowerCase();
  const chartKw = [
    "柱状图", "折线图", "饼图", "面积图", "散点图", "表格",
    "改为", "切换", "换成", "图表类型",
    "bar", "line", "pie",
  ];
  return chartKw.some((kw) => lower.includes(kw));
}

// ========== 思考过程生成 ==========

function generateThinkingProcess(questionType: "analysis" | "knowledge"): {
  nodes: ExecutionNode[];
  totalMs: number;
} {
  const baseMs = 150 + Math.random() * 600;

  if (questionType === "analysis") {
    let t = 0;
    const nodes: ExecutionNode[] = [
      {
        id: "think", label: "分析思路", status: "completed",
        duration: t += 80 + Math.random() * 120,
        detail: `理解用户意图：用户希望从数据维度获取量化洞察。将问题拆解为数据定位 → 指标提取 → 趋势分析 → 结论输出四个子任务。`,
      },
      {
        id: "intent", label: "意图识别", status: "completed",
        duration: t += 60 + Math.random() * 100,
        detail: `识别为「数据查询与分析」类问题，置信度 0.96。匹配到相关数据域：生产管理、工艺质量。目标指标：设备运行效率、优质品率、单箱物耗。`,
      },
      {
        id: "dsl", label: "生成 DSL", status: "completed",
        duration: t += 90 + Math.random() * 150,
        detail: `将自然语言转为领域查询语言：\n- 查询对象：设备运行日志(device_runtime)、物料消耗表(material_consumption)\n- 维度：机台(machine_no)、工序(process)、时间(day)\n- 指标：AVG(run_time/plan_time)、SUM(consumption)/SUM(output_qty)\n- 过滤：record_date = TODAY\n- 聚合粒度：按机台/工序汇总`,
      },
      {
        id: "sql", label: "生成 SQL", status: "completed",
        duration: t += 70 + Math.random() * 130,
        detail: `-- 自动生成查询SQL\nSELECT\n  m.machine_name AS 机台,\n  m.process AS 工序,\n  ROUND(SUM(r.run_time)/NULLIF(SUM(r.plan_time),0)*100, 1) AS 运行效率_pct\nFROM device_runtime r\nJOIN device_master m ON r.machine_no = m.machine_no\nWHERE r.record_date = CURRENT_DATE\nGROUP BY m.machine_name, m.process\nORDER BY 运行效率_pct DESC;`,
      },
      {
        id: "result", label: "查询结果", status: "completed",
        duration: t += 50 + Math.random() * 100,
        detail: `查询返回 6 行数据，耗时 ${(40 + Math.random() * 80).toFixed(0)}ms：\n- 卷接机1号：90.1%\n- 卷接机3号：89.0%\n- 卷接机2号：88.4%\n- 包装机1号：88.2%\n- 包装机3号：87.6%\n- 包装机2号：86.8%`,
      },
    ];
    return { nodes, totalMs: t };
  } else {
    let t = 0;
    const nodes: ExecutionNode[] = [
      {
        id: "think", label: "分析思路", status: "completed",
        duration: t += 60 + Math.random() * 100,
        detail: `识别为知识检索类问题。将在企业知识库中搜索相关工艺标准、操作规程及历史案例。`,
      },
      {
        id: "intent", label: "意图识别", status: "completed",
        duration: t += 50 + Math.random() * 80,
        detail: `确认为「知识问答」类问题，置信度 0.94。匹配知识域：生产工艺、技术标准。`,
      },
      {
        id: "dsl", label: "知识检索", status: "completed",
        duration: t += 80 + Math.random() * 140,
        detail: `检索策略：\n- 关键词提取 → 卷接工艺、车速控制、烟支重量\n- 检索范围：企业知识库 > 生产工艺 > 卷接\n- 匹配文档数：3 篇\n- 相关章节：车速控制(§3.2)、烟支重量(§4.1)`,
      },
      {
        id: "sql", label: "内容提取", status: "completed",
        duration: t += 50 + Math.random() * 100,
        detail: `从匹配文档中提取关键段落，按相关度排序。Top-3 段落得分：0.92 / 0.87 / 0.81。提取内容涵盖工艺参数表、操作要点、常见问题。`,
      },
      {
        id: "result", label: "生成回答", status: "completed",
        duration: t += 60 + Math.random() * 120,
        detail: `基于检索结果，组织回答结构：核心概念定义 → 关键参数说明 → 操作要点 → 注意事项。引用 3 份知识库文档。`,
      },
    ];
    return { nodes, totalMs: t };
  }
}

// ========== 知识来源 ==========

function generateKnowledgeSources(): KnowledgeSource[] {
  return [
    { kbName: "生产工艺知识库", docName: "卷接工艺技术规程", chapter: "§3.2 卷烟机车速控制", version: "Q/YY-JJ-2024-012 v2.1" },
    { kbName: "技术标准库", docName: "卷烟质量检验标准", chapter: "§4.1 烟支重量控制", version: "GB/T 5606-2024" },
    { kbName: "最佳实践库", docName: "卷接工艺优化案例集", chapter: "案例7: A牌号车速优化", version: "2026年6月版" },
  ];
}

// ========== 图表元数据 ==========

function getChartMeta(answer: string): QaMessage["chartMeta"] | undefined {
  if (answer.includes("|") && (answer.includes("吨") || answer.includes("%"))) {
    return { currentType: "bar", availableTypes: ["line", "pie", "area", "table"], title: "产量对比" };
  }
  if (answer.includes("📊") || answer.includes("📈")) {
    return { currentType: "bar", availableTypes: ["line", "pie", "area", "scatter", "table"], title: "数据视图" };
  }
  return undefined;
}

// ========== 追问生成 ==========

function generateFollowUps(userInput: string, answerType: "analysis" | "knowledge"): string[] {
  const lower = userInput.toLowerCase();

  if (answerType === "analysis") {
    if (lower.includes("效率") || lower.includes("机台") || lower.includes("箱")) {
      return shuffleAndPick(["能否查看各机台的详细运行效率对比？", "最近一周的运行效率趋势如何？", "影响运行效率的主要因素有哪些？", "卷接与包装工序效率对比如何？"], 3);
    }
    if (lower.includes("能耗") || lower.includes("能源") || lower.includes("物耗")) {
      return shuffleAndPick(["各工序能耗占比如何？", "有哪些节能降耗措施？", "单箱物耗偏高的原因？", "近 30 天单箱能耗趋势？"], 3);
    }
    if (lower.includes("质量") || lower.includes("优质品") || lower.includes("良品")) {
      return shuffleAndPick(["主要缺陷类型有哪些？", "哪个工序优质品率最低？", "最近的改进措施效果如何？", "能否下钻到具体机台？"], 3);
    }
    return shuffleAndPick(["能否查看各机台的详细对比数据？", "最近一周的趋势有什么变化？", "影响当前指标的主要因素有哪些？"], 3);
  }

  // knowledge follow-ups
  return shuffleAndPick([
    "相关的工艺参数有哪些参考标准？",
    "是否有类似的历史案例可以参考？",
    "该工艺规程最近有更新吗？",
    "如何在实际操作中应用这些参数？",
  ], 3);
}

// ========== 关键词匹配（原有逻辑） ==========

function matchAnswer(input: string): { answer: string; isKnowledge: boolean } {
  const lower = input.toLowerCase();

  // 特定查询
  if (lower.includes("运行效率") || (lower.includes("机台") && (lower.includes("效率") || lower.includes("运行")))) {
    return { answer: qaPresets[0].answer, isKnowledge: false };
  }
  if (lower.includes("耗烟叶") || lower.includes("物耗") && lower.includes("上升") || lower.includes("归因")) {
    return {
      answer: `## 📊 分析概述

针对"单箱耗烟叶量上升"问题进行多维归因分析，定位到卷接机2号切丝宽度偏宽为根因，导致单箱耗烟叶量从 38.0 升至 39.9 公斤/箱。

## 🔍 主要发现

1. **时间维度**：近7天单箱耗烟叶量 38.0 → 39.9 公斤/箱（↑5.0%），波动集中在近3天
2. **机台维度**：卷接机2号 38.2 → 41.5 公斤/箱（↑8.6%）⚠️ 影响最大，其他机台正常
3. **牌号维度**：A牌号单箱耗烟叶量上升明显，烟支重量偏高
4. **根因定位**：卷接机2号切丝宽度偏宽，导致烟丝填充量增加、单箱耗烟叶量上升

## 📈 单箱耗烟叶量趋势

| 日期 | 全厂 | 卷接机2号 | 卷接机1号 |
|------|------|----------|----------|
| 7/25 | 38.0 | 38.2 | 37.8 |
| 7/26 | 38.3 | 38.9 | 38.0 |
| 7/27 | 38.8 | 39.7 | 38.1 |
| 7/28 | 39.2 | 40.5 | 38.2 |
| 7/29 | 39.5 | 41.0 | 38.3 |
| 7/30 | 39.8 | 41.4 | 38.4 |
| 7/31 | 39.9 | 41.5 | 38.5 |

## 💡 总结与建议

1. **立即行动**：校准卷接机2号切丝宽度，预计恢复后单箱耗烟叶量回落至 38 公斤/箱左右
2. **预防措施**：建立切丝宽度定期抽检机制，每班次检测一次
3. **监控加强**：对A牌号烟支重量增设在线检测，提前告警异常`,
      isKnowledge: false,
    };
  }
  if (lower.includes("预测") || (lower.includes("趋势") && (lower.includes("产量") || lower.includes("包装")))) {
    return {
      answer: `## 📊 分析概述

基于ARIMA时间序列模型，对下月包装产线产量进行趋势预测。模型R²=0.91，预测区间置信度95%。

## 🔍 主要发现

1. **预测总量**：下月预计包装产量 **27,550箱**（较本月↑2.4%）
2. **周度分布**：第2周为高峰（6,950箱），第3周因包装机2号保养略降（6,700箱）
3. **趋势方向**：整体呈稳步上升趋势，月环比增长约650箱
4. **风险提示**：第3周保养窗口需严格控制在24小时内，否则将影响第4周产量

## 📈 预测数据

| 周次 | 预测产量(箱) | 环比变化 | 置信区间(95%) |
|------|------------|---------|---------------|
| 第1周 | 6,820 | +1.5% | 6,450~7,190 |
| 第2周 | 6,950 | +1.9% | 6,560~7,340 |
| 第3周 | 6,700 | -3.6% | 6,300~7,100 |
| 第4周 | 7,080 | +5.7% | 6,680~7,480 |

## 💡 总结与建议

1. 建议第2周适当提前备料（盘纸、商标纸），应对高产期需求
2. 第3周保养期间协调其他包装机分担产能
3. 关注第4周销售端需求变化，预留调产空间`,
      isKnowledge: false,
    };
  }

  // 通用关键词匹配
  let bestMatch: { score: number; answer: string } = { score: 0, answer: "" };
  for (const preset of qaPresets) {
    let score = 0;
    for (const kw of preset.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestMatch.score) bestMatch = { score, answer: preset.answer };
  }

  if (bestMatch.score >= 1) {
    // 把旧格式的 preset answer 包装成新结构
    const oldAnswer = bestMatch.answer;
    const isAnalysisAnswer = oldAnswer.includes("📊") || oldAnswer.includes("|");
    if (isAnalysisAnswer) {
      // 尝试提取表格部分作为"主要发现"和"图表"
      const lines = oldAnswer.split("\n");
      const overview = lines.slice(0, 3).join("\n");
      return { answer: oldAnswer, isKnowledge: false };
    }
    return { answer: oldAnswer, isKnowledge: false };
  }

  // 判断是否为知识类问题
  if (isKnowledgeQuestion(input)) {
    return { answer: "", isKnowledge: true };
  }

  // 兜底
  return {
    answer: `🤔 抱歉，我暂时无法完全理解您的问题。\n\n您可以尝试：\n- 输入更具体的关键词，如"运行效率"、"物耗"、"优质品率"等\n- 在"数据资产"页面浏览可用的数据指标\n\n请问您需要哪方面的帮助？`,
    isKnowledge: false,
  };
}

// ========== 知识类回答生成 ==========

function generateKnowledgeAnswer(userMessage: string): string {
  if (userMessage.includes("车速") || userMessage.includes("卷接工艺") || userMessage.includes("卷烟机")) {
    return `## 📝 核心回答

**卷烟机车速**是卷接工序中的关键工艺参数，直接影响烟支成型质量与生产效率。

### 车速控制标准

| 牌号 | 烟支规格 | 额定车速(支/分) | 常用车速(支/分) |
|------|---------|----------------|----------------|
| A牌号 | 84mm | 7,000~10,000 | 8,500~9,000 |
| B牌号 | 84mm | 7,000~10,000 | 8,000~8,800 |
| C牌号 | 100mm | 7,000~10,000 | 7,500~8,200 |

### 操作要点

1. **车速设定**：根据牌号规格与烟丝特性，在额定范围内选择合适车速
2. **重量控制**：车速变化时需同步调整烟丝供给，保证烟支克重稳定
3. **质量控制**：车速偏高时需关注空头、漏气等缺陷率变化

### 常见问题

- ⚠️ 车速超过额定值 → 烟支空头、漏气缺陷增加
- ⚠️ 车速过低 → 生产效率下降，单箱可控费用上升`;
  }

  // 通用知识回答
  return `## 📝 核心回答

针对您的问题，我已在企业知识库中检索到相关内容：

### 关键要点

1. **工艺标准**：根据《生产工艺规程》，相关参数需在标准区间内控制，偏差超过±5%时应及时调整
2. **操作流程**：
   - 步骤一：确认原料规格与工艺卡要求一致
   - 步骤二：按标准作业指导书进行参数设定
   - 步骤三：生产过程中每30分钟巡检一次关键控制点
3. **质量管控**：关键质量特性需100%在线检测，异常情况立即启动不合格品处置流程

### 注意事项

- 定期校准检测仪表，确保数据准确性
- 班组交接时需书面确认工艺参数状态
- 发现异常波动应第一时间上报工序主管`;
}

// ========== 主接口 ==========

export async function mockAiResponse(userMessage: string): Promise<QaMessage> {
  const totalDelay = 800 + Math.random() * 1200;
  await delay(totalDelay);

  // 图表修改指令
  if (isChartModification(userMessage)) {
    return handleChartModification(userMessage);
  }

  // FAQ 标准问答匹配：优先于智能问数/知识问答流程；
  // 达到匹配阈值直接返回标准答案，未达到则继续进入原有处理流程
  const faqHit = matchStandardQa(userMessage);
  if (faqHit) {
    const faqAnswer = finalizeMatchedAnswer(faqHit.answer);
    const { nodes, totalMs } = generateThinkingProcess("analysis");
    return {
      id: generateId(),
      role: "assistant",
      content: faqAnswer,
      timestamp: Date.now(),
      followUpQuestions: generateFollowUps(userMessage, "analysis"),
      executionNodes: nodes,
      thinkingTime: Math.round(totalMs / 100) / 10,
      answerType: "analysis",
      chartMeta: getChartMeta(faqAnswer),
    };
  }

  // 智能问数（4 段结构化回答）优先匹配
  const smartCase = matchSmartQuery(userMessage);
  if (smartCase) {
    return buildSmartQueryAnswer(userMessage, smartCase);
  }

  const { answer: matchedAnswer, isKnowledge } = matchAnswer(userMessage);

  let finalContent: string;
  let answerType: "analysis" | "knowledge";
  let knowledgeSources: KnowledgeSource[] | undefined;

  if (isKnowledge && !matchedAnswer) {
    // 纯知识问答
    finalContent = generateKnowledgeAnswer(userMessage);
    answerType = "knowledge";
    knowledgeSources = generateKnowledgeSources();
  } else if (isKnowledge && matchedAnswer) {
    // 匹配到的知识类回答（如精轧温度）
    finalContent = matchedAnswer;
    answerType = "knowledge";
    knowledgeSources = generateKnowledgeSources();
  } else {
    // 数据分析类——统一包装格式（已结构化内容保持原样）
    finalContent = matchedAnswer ? finalizeMatchedAnswer(matchedAnswer) : "抱歉，服务暂时不可用。";
    answerType = "analysis";
  }

  const { nodes, totalMs } = generateThinkingProcess(answerType);
  const thinkingTime = Math.round(totalMs / 100) / 10; // 转换为秒，保留1位小数
  const followUps = generateFollowUps(userMessage, answerType);
  const chartMeta = answerType === "analysis" ? getChartMeta(finalContent) : undefined;

  return {
    id: generateId(),
    role: "assistant",
    content: finalContent,
    timestamp: Date.now(),
    followUpQuestions: followUps,
    executionNodes: nodes,
    thinkingTime,
    knowledgeSources,
    answerType,
    chartMeta,
  };
}

// ========== 智能问数结构化回答 ==========

function buildSmartQueryAnswer(userMessage: string, c: SmartQueryCase): QaMessage {
  const { nodes, totalMs } = generateThinkingProcess("analysis");
  return {
    id: generateId(),
    role: "assistant",
    content: c.summary, // 简短摘要，用于历史/收藏展示
    timestamp: Date.now(),
    smartAnswer: {
      queryResult: c.queryResult,
      interpretation: c.interpretation,
      chartReason: c.chartReason,
      dataNotes: c.dataNotes,
    },
    chartMeta: {
      currentType: c.recommendedChart,
      availableTypes: c.availableCharts,
      title: c.title,
    },
    executionNodes: nodes,
    thinkingTime: Math.round(totalMs / 100) / 10,
    answerType: "analysis",
    followUpQuestions: c.followUps,
  };
}

// ========== 图表修改指令处理 ==========

function handleChartModification(userMessage: string): QaMessage {
  const lower = userMessage.toLowerCase();
  let newType = "bar";
  if (lower.includes("折线图") || lower.includes("line")) newType = "line";
  else if (lower.includes("饼图") || lower.includes("pie")) newType = "pie";
  else if (lower.includes("面积图") || lower.includes("area")) newType = "area";
  else if (lower.includes("散点图") || lower.includes("scatter")) newType = "scatter";
  else if (lower.includes("表格") || lower.includes("table")) newType = "table";

  const typeNames: Record<string, string> = {
    bar: "柱状图", line: "折线图", pie: "饼图", area: "面积图", scatter: "散点图", table: "数据表格",
  };

  return {
    id: generateId(),
    role: "assistant",
    content: `✅ 已按指令将图表切换为 **${typeNames[newType]}**，数据与分析结论已同步刷新。\n\n## 📈 更新后的数据\n\n| 机台 | 工序 | 运行效率 |\n|------|------|--------|\n| 卷接机1号 | 卷接 | 90.1% |\n| 卷接机3号 | 卷接 | 89.0% |\n| 卷接机2号 | 卷接 | 88.4% |\n| 包装机1号 | 包装 | 88.2% |\n| 包装机3号 | 包装 | 87.6% |\n| 包装机2号 | 包装 | 86.8% |`,
    timestamp: Date.now(),
    chartMeta: {
      currentType: newType as "bar",
      availableTypes: ["line", "pie", "area", "table"].filter((t) => t !== newType) as ("line" | "pie" | "area" | "table")[],
      title: "机台运行效率",
    },
    executionNodes: generateThinkingProcess("analysis").nodes,
    thinkingTime: Math.round((80 + Math.random() * 200)) / 10,
    answerType: "analysis",
    followUpQuestions: shuffleAndPick(["可以将数据按月份分组吗？", "能否添加产品类别维度？", "改回原来的图表类型可以吗？"], 3),
  };
}

// ========== 流式响应（保留原有接口） ==========

export async function* mockStreamResponse(userMessage: string): AsyncGenerator<string, void, unknown> {
  const { answer } = matchAnswer(userMessage);
  const text = answer || "抱歉，服务暂时不可用。";
  for (let i = 0; i < text.length; i++) {
    await delay(20 + Math.random() * 30);
    yield text[i];
  }
}

export function getWelcomeMessage(): QaMessage {
  return { id: "welcome", role: "assistant", content: welcomeMessage, timestamp: Date.now() };
}
