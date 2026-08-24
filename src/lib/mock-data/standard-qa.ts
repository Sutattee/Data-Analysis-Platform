// 标准问答库 —— 管理智能问数引擎使用的标准问答对（FAQ）

export interface StandardQaItem {
  id: string;
  question: string;            // 标准问题（用户最常见、最规范的问题表述）
  answer: string;              // 标准答案（FAQ 命中后直接返回）
  similarQuestions: string[];  // 相似问法（与标准问题语义相同的其他表达）
  domain: string;              // 所属业务域
  hitCount: number;            // 累计命中次数
  createdBy: string;           // 创建人
  createdAt: string;           // 创建时间 YYYY-MM-DD HH:mm
  updatedBy: string;           // 更新人（最近一次新增或修改人员）
  updatedAt: string;           // 更新时间
}

// 所属业务域（新增 / 编辑表单及筛选可选项）
export const QA_DOMAINS = [
  "平台通用",
  "生产管理",
  "工艺质量",
  "能源管理",
  "设备管理",
  "物料管理",
  "安全生产",
];

// 标准问答列表
export const standardQaList: StandardQaItem[] = [
  {
    id: "qa-01",
    question: "卷烟生产的主要工艺流程包括哪些环节？",
    answer:
      "卷烟生产通常包括原料准备、制丝、卷接、包装、成品检验和入库等主要环节。具体流程及工艺参数应以企业现行工艺规程为准。",
    similarQuestions: ["卷烟是如何生产的？", "卷烟生产流程有哪些？"],
    domain: "生产管理",
    hitCount: 156,
    createdBy: "管理员",
    createdAt: "2026-05-18 09:30",
    updatedBy: "生产调度员",
    updatedAt: "2026-08-12 10:05",
  },
  {
    id: "qa-02",
    question: "什么是设备综合效率（OEE）？",
    answer:
      "设备综合效率（OEE）是评价设备运行效率的综合指标，通常由时间开动率、性能开动率和合格品率相乘得出，用于识别停机、降速和质量损失。",
    similarQuestions: ["OEE是什么意思？", "设备综合效率如何计算？"],
    domain: "生产管理",
    hitCount: 203,
    createdBy: "管理员",
    createdAt: "2026-05-18 10:12",
    updatedBy: "设备管理员",
    updatedAt: "2026-08-15 14:22",
  },
  {
    id: "qa-03",
    question: "卷烟生产过程中为什么需要控制温度和湿度？",
    answer:
      "温度和湿度会影响烟丝含水率、物料加工性能、卷制稳定性及成品质量。生产过程中应按照工艺标准监测并控制环境温湿度，超出范围时及时检查空调系统、工艺参数及物料状态。",
    similarQuestions: ["温湿度对卷烟质量有什么影响？", "为什么车间要控制湿度？"],
    domain: "工艺质量",
    hitCount: 87,
    createdBy: "质量管理员",
    createdAt: "2026-05-22 11:08",
    updatedBy: "质量管理员",
    updatedAt: "2026-08-03 09:15",
  },
  {
    id: "qa-04",
    question: "什么是批次质量追溯？",
    answer:
      "批次质量追溯是根据生产批次关联原辅材料、生产时间、设备、班组、工艺参数、检验结果和异常事件，实现产品质量问题的来源查询和影响范围定位。",
    similarQuestions: ["如何追溯卷烟质量问题？", "批次追溯包含哪些信息？"],
    domain: "工艺质量",
    hitCount: 64,
    createdBy: "质量管理员",
    createdAt: "2026-05-26 15:40",
    updatedBy: "管理员",
    updatedAt: "2026-07-28 16:40",
  },
  {
    id: "qa-05",
    question: "发现产品质量指标异常时应如何处理？",
    answer:
      "应先确认检测数据和样品是否有效，再核查原辅材料、设备状态、工艺参数、环境条件及人员操作等因素；确定原因后采取处置措施，并记录异常原因、处理过程和复核结果。",
    similarQuestions: ["质量指标超标怎么办？", "产品检验异常如何处置？"],
    domain: "工艺质量",
    hitCount: 92,
    createdBy: "质量管理员",
    createdAt: "2026-06-02 10:00",
    updatedBy: "质量管理员",
    updatedAt: "2026-08-06 14:22",
  },
  {
    id: "qa-06",
    question: "设备预防性维护的主要目的是什么？",
    answer:
      "预防性维护通过定期检查、保养、润滑和更换易损件，提前发现设备隐患，减少突发故障和非计划停机，保障设备稳定运行和产品质量。",
    similarQuestions: ["为什么要进行设备保养？", "预防性维修有什么作用？"],
    domain: "设备管理",
    hitCount: 75,
    createdBy: "设备管理员",
    createdAt: "2026-06-05 14:26",
    updatedBy: "设备管理员",
    updatedAt: "2026-07-30 11:18",
  },
  {
    id: "qa-07",
    question: "什么是单箱卷烟综合能耗？",
    answer:
      "单箱卷烟综合能耗是一定统计周期内卷烟综合能源消耗量与卷烟产量的比值，用于评价单位产品的综合能源利用水平。计算时应确保能源消耗量与卷烟产量采用相同的统计周期和统计范围。",
    similarQuestions: ["单箱综合能耗是什么意思？", "单箱卷烟综合能耗如何计算？"],
    domain: "能源管理",
    hitCount: 188,
    createdBy: "能源管理员",
    createdAt: "2026-06-10 09:20",
    updatedBy: "能源管理员",
    updatedAt: "2026-08-18 11:32",
  },
  {
    id: "qa-08",
    question: "发现重点能源网格用电异常时应如何排查？",
    answer:
      "应先核查仪表数据是否完整准确，再对比历史均值、生产计划和设备运行情况，重点检查设备启停、运行时长、负荷变化、空转待机、故障维修及环境条件等因素，并记录排查结果。",
    similarQuestions: ["网格用电异常怎么处理？", "设备耗电突然升高如何排查？"],
    domain: "能源管理",
    hitCount: 59,
    createdBy: "能源管理员",
    createdAt: "2026-06-16 16:35",
    updatedBy: "管理员",
    updatedAt: "2026-08-01 09:45",
  },
  {
    id: "qa-09",
    question: "原辅材料出现账实不符时应如何处理？",
    answer:
      "应核对入库、领用、退库、盘点和生产消耗记录，检查计量单位、批次及单据状态，定位差异产生环节；确认原因后按企业管理制度完成调整、审批和留痕。",
    similarQuestions: ["原辅料库存对不上怎么办？", "库存差异如何排查？"],
    domain: "物料管理",
    hitCount: 41,
    createdBy: "管理员",
    createdAt: "2026-06-25 16:00",
    updatedBy: "物料管理员",
    updatedAt: "2026-08-10 09:45",
  },
  {
    id: "qa-10",
    question: "生产设备启动前应进行哪些基本检查？",
    answer:
      "启动前应确认安全防护装置有效、设备状态正常、现场无遗留工具或异物、人员处于安全位置，并检查能源供应、润滑及相关工艺条件。具体检查项目应以设备操作规程和安全制度为准。",
    similarQuestions: ["开机前需要检查什么？", "设备启动前有哪些安全要求？"],
    domain: "安全生产",
    hitCount: 83,
    createdBy: "安全管理员",
    createdAt: "2026-07-08 10:50",
    updatedBy: "安全管理员",
    updatedAt: "2026-08-20 15:10",
  },
];

// ========== FAQ 匹配 ==========

// 达到该阈值时直接返回对应标准答案，否则继续进入智能问数等原有流程
const MATCH_THRESHOLD = 80;

// 归一化：去空白、括号与常见标点、转小写，提升匹配鲁棒性
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s?？!！。.,，、（）()]+/g, "");
}

// 计算输入与某条标准问答的匹配度（0-100）
function similarity(input: string, item: StandardQaItem): number {
  // 1. 优先匹配标准问题（完全一致满分）
  if (input === normalize(item.question)) return 100;
  // 2. 其次匹配相似问法
  for (const s of item.similarQuestions) {
    if (input === normalize(s)) return 95;
  }
  // 3. 包含关系按重合比例计分
  let score = 0;
  for (const cand of [item.question, ...item.similarQuestions]) {
    const n = normalize(cand);
    if (!n) continue;
    if (input.includes(n) || n.includes(input)) {
      const ratio = Math.min(input.length, n.length) / Math.max(input.length, n.length);
      score = Math.max(score, Math.round(60 + 35 * ratio));
    }
  }
  return score;
}

/**
 * FAQ 匹配：在标准问答库中找匹配度最高的一条。
 * 命中多个时返回匹配度最高的结果；未达阈值返回 null（走原有流程）。
 */
export function matchStandardQa(userInput: string): StandardQaItem | null {
  const input = normalize(userInput);
  if (!input) return null;
  let best: { item: StandardQaItem; score: number } | null = null;
  for (const item of standardQaList) {
    const score = similarity(input, item);
    if (score > (best?.score ?? 0)) best = { item, score };
  }
  return best && best.score >= MATCH_THRESHOLD ? best.item : null;
}
