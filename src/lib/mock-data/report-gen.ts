// 报告生成 mock 数据层（卷烟厂口径）：
// 模板库（分析报告/Excel 报表）→ 关键词匹配 → 大纲生成（方式二）→ 报告正文生成 →
// 思考过程节点 → 生成方式分类 → 对话式报告编辑。
// 数值锚点复用平台现有 mock：能耗 29.8 kgce/箱、可控费用 408 元/箱、优质品率 98.6 等；
// 不改动 reports.ts（报告中心在用的钢铁口径旧数据）。
import type {
  ExecutionNode,
  OutlineSection,
  ReportOutline,
  ReportTemplateItem,
} from "@/types";

// ========== 大纲骨架工具 ==========

let seq = 0;
function secId(): string {
  seq += 1;
  return `os-${Date.now().toString(36)}-${seq}`;
}

// 深拷贝骨架并分配新章节 id（模板骨架是共享常量，不能直接改）
function cloneOutline(o: Omit<ReportOutline, "requirement">): ReportOutline["sections"] {
  return o.sections.map((s) => ({
    ...s,
    id: secId(),
    children: s.children.map((c) => ({ ...c, id: secId(), children: [] })),
  }));
}

// ========== 模板库 ==========

// 分析报告模板（6 个）：大纲骨架供方式一直接生成、也供方式二按领域套用
export const REPORT_TEMPLATES_ANALYSIS: ReportTemplateItem[] = [
  {
    id: "rg-energy",
    kind: "analysis",
    name: "能耗分析报告",
    category: "能源",
    keywords: ["能耗分析报告", "能源分析报告", "能耗报告", "节能分析"],
    description: "综合能耗、分项电耗与节能建议的周期性分析",
    refFile: "样例：2026年9月能耗分析报告.docx",
    outline: {
      title: "能耗分析报告",
      refFile: "样例：2026年9月能耗分析报告.docx",
      sections: [
        {
          id: "", title: "能源消耗总体情况", approach: "汇总统计周期内的综合能耗、电耗、蒸汽消耗等核心指标",
          children: [
            { id: "", title: "单箱综合能耗分析", approach: "对比实际值、目标值、同比和环比，判断目标完成情况", children: [] },
            { id: "", title: "各车间电耗对比", approach: "按车间比较电耗及单位产量电耗，识别高耗能车间", children: [] },
          ],
        },
        {
          id: "", title: "能源结构分析", approach: "拆解电力、蒸汽、水等分项占比及变化趋势",
          children: [
            { id: "", title: "分项能耗占比", approach: "计算各能源品种折标煤占比，定位主要消耗项", children: [] },
          ],
        },
        {
          id: "", title: "碳排放与水资源", approach: "汇总单位产量碳排放、水耗与污水COD情况",
          children: [
            { id: "", title: "碳排放强度", approach: "对比目标值评估碳减排进度", children: [] },
            { id: "", title: "水耗与污水COD", approach: "检查单位产量水耗与污水COD达标情况", children: [] },
          ],
        },
        {
          id: "", title: "节能建议", approach: "基于高耗能环节提出可落地的节能优化措施",
          children: [],
        },
      ],
    },
    preview: `# 能耗分析报告\n\n## 一、能源消耗总体情况\n- 单箱综合能耗：29.8 kgce/箱（目标 31，↓1.2）\n- 单箱电耗：24.6 kWh/箱 ｜ 蒸汽耗总量：3,860 t\n\n## 二、能源结构分析\n- 制丝 35.2% ｜ 卷接 28.1% ｜ 包装 18.0% ｜ 动力 11.7%\n\n## 三、碳排放与水资源\n- 单位产量碳排放量 0.032 kg CO₂/万支（目标 0.03）\n\n## 四、节能建议\n1. 制丝工序余热回收\n2. 错峰用电优化排产`,
  },
  {
    id: "rg-production",
    kind: "analysis",
    name: "生产月报",
    category: "生产",
    keywords: ["生产月报", "生产报告", "产量分析报告", "月度生产"],
    description: "月度产量、计划达成与机组效率综合汇总",
    refFile: "样例：2026年9月生产月报.docx",
    outline: {
      title: "生产月报",
      refFile: "样例：2026年9月生产月报.docx",
      sections: [
        {
          id: "", title: "生产完成情况", approach: "汇总实际产量、计划产量与达成率，判断整体完成水平",
          children: [
            { id: "", title: "产量与达成率", approach: "对比月度实际/计划产量，计算达成率与差距", children: [] },
            { id: "", title: "机台月度计划完成率", approach: "按16台机组比较完成率，识别未完成计划的机台与日期", children: [] },
          ],
        },
        {
          id: "", title: "设备运行效率", approach: "分析台时产量与设备运行净效率同目标、历史的差距",
          children: [],
        },
        {
          id: "", title: "问题与改进措施", approach: "定位低效机台与停机损失，提出排产与维护建议",
          children: [],
        },
      ],
    },
    preview: `# 生产月报\n\n## 一、生产完成情况\n- 实际产量 18,432 箱 ｜ 计划 19,050 箱 ｜ 达成率 96.8%\n\n## 二、设备运行效率\n- 台时产量 1,000 箱/台（目标 1,100）\n- 设备运行净效率 95.0%（历史 95.6%）\n\n## 三、问题与改进措施\n- 12#机组完成率 92.0%，10月存在3天未完成计划\n- 建议核查排产与故障停机`,
  },
  {
    id: "rg-quality",
    kind: "analysis",
    name: "质量月报",
    category: "质量",
    keywords: ["质量月报", "质量分析报告", "优质品率报告", "质量报告"],
    description: "优质品率、过程管控与缺陷统计的月度分析",
    refFile: "样例：2026年9月质量月报.docx",
    outline: {
      title: "质量月报",
      refFile: "样例：2026年9月质量月报.docx",
      sections: [
        {
          id: "", title: "质量指标总体情况", approach: "汇总成品/制丝优质品率与包装卷制检验得分",
          children: [
            { id: "", title: "优质品率分析", approach: "对比各工序优质品率与目标，识别薄弱工序", children: [] },
          ],
        },
        {
          id: "", title: "过程管控分析", approach: "评估9项过程管控指标达标情况，定位超限参数",
          children: [],
        },
        {
          id: "", title: "缺陷分析", approach: "统计缺陷总数与Top类型，分析集中工序与改进方向",
          children: [],
        },
      ],
    },
    preview: `# 质量月报\n\n## 一、质量指标总体情况\n- 成品优质品率 98.6% ｜ 制丝优质品率 98.4%\n- 包装与卷制质量检验加权平均 96.8 分\n\n## 二、过程管控分析\n- 9项指标中4项未达标（松散回潮非稳态指数 4.8% 等）\n\n## 三、缺陷分析\n- 全部缺陷 58 条，空头居首（占比 27.6%）`,
  },
  {
    id: "rg-device",
    kind: "analysis",
    name: "设备效率报告",
    category: "设备",
    keywords: ["设备效率报告", "设备分析报告", "OEE报告", "机台效率报告"],
    description: "机台运行效率对比与低效机台归因",
    refFile: "样例：2026年9月设备效率报告.docx",
    outline: {
      title: "设备效率报告",
      refFile: "样例：2026年9月设备效率报告.docx",
      sections: [
        {
          id: "", title: "机台运行效率对比", approach: "按工序比较各机台运行效率，识别高/低效机台",
          children: [],
        },
        {
          id: "", title: "低效机台归因", approach: "结合停机记录分析效率偏低机台的原因",
          children: [],
        },
        {
          id: "", title: "维护建议", approach: "针对低效机台提出点检与维护重点",
          children: [],
        },
      ],
    },
    preview: `# 设备效率报告\n\n## 一、机台运行效率对比\n- 卷接机1号 90.1%（最高）｜ 包装机2号 86.8%（最低）\n\n## 二、低效机台归因\n- 包装机2号短暂停机影响当班产量\n\n## 三、维护建议\n- 包装机2号重点检查商标纸输送通道`,
  },
  {
    id: "rg-cost",
    kind: "analysis",
    name: "成本费用月报",
    category: "费用",
    keywords: ["成本月报", "费用月报", "成本分析报告", "费用分析报告", "可控费用报告"],
    description: "单箱可控费用、预算执行与辅料消耗分析",
    refFile: "样例：2026年9月成本费用月报.docx",
    outline: {
      title: "成本费用月报",
      refFile: "样例：2026年9月成本费用月报.docx",
      sections: [
        {
          id: "", title: "费用总体情况", approach: "汇总单箱可控费用与预算执行率，评估费用风险",
          children: [
            { id: "", title: "单箱可控费用分析", approach: "对比目标值定位超支科目与金额", children: [] },
            { id: "", title: "预算执行进度", approach: "对比执行率与计划进度，识别偏差方向", children: [] },
          ],
        },
        {
          id: "", title: "辅料消耗分析", approach: "对比四类主要辅料单箱消耗与目标/均值",
          children: [],
        },
        {
          id: "", title: "降本建议", approach: "基于超支科目与超标辅料提出降本措施",
          children: [],
        },
      ],
    },
    preview: `# 成本费用月报\n\n## 一、费用总体情况\n- 单箱可控费用 408 元/箱（目标 300，超支 108）\n- 预算执行率 97.0%，高于计划进度 13.7 pct\n\n## 二、辅料消耗分析\n- 商标纸 2,500张/箱（超目标 20）｜ 嘴棒 50,000支/箱（超目标 2,000）\n\n## 三、降本建议\n1. 核查可控费用超支科目\n2. 复盘商标纸与嘴棒损耗`,
  },
  {
    id: "rg-safety",
    kind: "analysis",
    name: "安全环保月报",
    category: "安全",
    keywords: ["安全月报", "安全环保报告", "安全报告", "环保报告"],
    description: "安全隐患排查整改与环保指标汇总",
    refFile: "样例：2026年9月安全环保月报.docx",
    outline: {
      title: "安全环保月报",
      refFile: "样例：2026年9月安全环保月报.docx",
      sections: [
        {
          id: "", title: "安全生产情况", approach: "汇总安全工时、巡检与隐患整改情况",
          children: [],
        },
        {
          id: "", title: "环保指标情况", approach: "汇总污水COD、碳排放强度等环保指标达标情况",
          children: [],
        },
      ],
    },
    preview: `# 安全环保月报\n\n## 一、安全生产情况\n- 累计安全工时 12,580 小时 ｜ 连续无事故 247 天\n- 本月巡检 186 次，隐患整改 11/12\n\n## 二、环保指标情况\n- 污水COD 42 mg/L ｜ 中水回用率 82.6%`,
  },
];

// Excel 报表模板（4 个）：只参与模板选择弹窗，选中后按表格结构生成报告（含结果表）
export const REPORT_TEMPLATES_EXCEL: ReportTemplateItem[] = [
  {
    id: "rg-x-production",
    kind: "excel",
    name: "生产日报表",
    category: "生产",
    keywords: ["生产日报表", "产量报表", "生产统计表"],
    description: "按机台汇总当日产量、计划与达成率",
    refFile: "样例：生产日报表模板.xlsx",
    outline: {
      title: "生产日报表",
      refFile: "样例：生产日报表模板.xlsx",
      sections: [
        { id: "", title: "当日产量汇总", approach: "按机台汇总实际产量、计划产量与达成率", children: [] },
        { id: "", title: "未完成计划明细", approach: "列出未完成计划的机台与日期", children: [] },
      ],
    },
    preview: `| 机台 | 工序 | 计划产量(箱) | 实际产量(箱) | 达成率 |\n|------|------|------------|------------|--------|\n| 卷接机1号 | 卷接 | 1,050 | 1,060 | 101.0% |\n| 卷接机2号 | 卷接 | 1,050 | 1,032 | 98.3% |\n| 包装机1号 | 包装 | 1,020 | 1,015 | 99.5% |`,
  },
  {
    id: "rg-x-energy",
    kind: "excel",
    name: "能耗统计表",
    category: "能源",
    keywords: ["能耗统计表", "能耗报表", "能源统计表"],
    description: "按工序统计综合能耗、电耗与蒸汽消耗",
    refFile: "样例：能耗统计表模板.xlsx",
    outline: {
      title: "能耗统计表",
      refFile: "样例：能耗统计表模板.xlsx",
      sections: [
        { id: "", title: "分工序能耗统计", approach: "按工序统计综合能耗与占比", children: [] },
        { id: "", title: "单箱电耗明细", approach: "按工序统计单箱电耗与环比", children: [] },
      ],
    },
    preview: `| 工序 | 单箱能耗(公斤标煤/箱) | 占比(%) |\n|------|---------------------|--------|\n| 制丝 | 4.5 | 35.2 |\n| 卷接 | 3.6 | 28.1 |\n| 包装 | 2.3 | 18.0 |`,
  },
  {
    id: "rg-x-quality",
    kind: "excel",
    name: "质量检验汇总表",
    category: "质量",
    keywords: ["质量检验汇总表", "检验报表", "质量统计表"],
    description: "按批次汇总检验得分与优质品率",
    refFile: "样例：质量检验汇总表模板.xlsx",
    outline: {
      title: "质量检验汇总表",
      refFile: "样例：质量检验汇总表模板.xlsx",
      sections: [
        { id: "", title: "批次检验汇总", approach: "按批次汇总检验项目与得分", children: [] },
        { id: "", title: "缺陷明细", approach: "按缺陷类型统计数量与占比", children: [] },
      ],
    },
    preview: `| 批次 | 工序 | 检验得分 | 优质品率(%) |\n|------|------|---------|------------|\n| 20261022-01 | 制丝 | 96.5 | 94.8 |\n| 20261022-02 | 制丝 | 97.1 | 94.8 |\n| 20261022-03 | 卷接 | 96.8 | 92.5 |`,
  },
  {
    id: "rg-x-material",
    kind: "excel",
    name: "辅料消耗明细表",
    category: "生产",
    keywords: ["辅料消耗明细表", "物耗报表", "辅料统计表"],
    description: "按物料类型统计单箱消耗与目标对比",
    refFile: "样例：辅料消耗明细表模板.xlsx",
    outline: {
      title: "辅料消耗明细表",
      refFile: "样例：辅料消耗明细表模板.xlsx",
      sections: [
        { id: "", title: "辅料消耗统计", approach: "按物料类型统计单箱消耗、目标与差距", children: [] },
      ],
    },
    preview: `| 物料类型 | 单箱消耗 | 单位 | 目标 | 差距 |\n|---------|---------|------|------|------|\n| 烟叶 | 38.6 | 公斤/箱 | 40.0 | -1.4 |\n| 嘴棒 | 50,000 | 支/箱 | 48,000 | +2,000 |\n| 盘纸 | 29.8 | 米/箱 | 30.0 | -0.2 |\n| 商标纸 | 2,500 | 张/箱 | 2,480 | +20 |`,
  },
];

export const REPORT_TEMPLATES_ALL: ReportTemplateItem[] = [...REPORT_TEMPLATES_ANALYSIS, ...REPORT_TEMPLATES_EXCEL];

// 关键词触发：模板名精确/包含优先，再按 keywords 匹配（区分度高的词）
export function matchTemplateByKeyword(text: string): ReportTemplateItem | null {
  const exact = REPORT_TEMPLATES_ALL.find((t) => text.includes(t.name));
  if (exact) return exact;
  return REPORT_TEMPLATES_ALL.find((t) => t.keywords.some((k) => text.includes(k))) ?? null;
}

// ========== 生成方式分类 ==========

const CONVERSATION_REF_WORDS = ["以上分析", "本次对话", "根据以上", "基于以上", "刚才的分析", "当前对话", "上述分析"];

export type ReportGenMode = "template" | "outline" | "conversation";

/**
 * 判定一条输入是否走报告生成、走哪种方式：
 * 1. 已手动选择模板 → template（方式一：按固定规则生成）
 * 2. 文本含会话引用词 +「报告」→ conversation（方式三：整理当前对话分析结果）
 * 3. 命中模板关键词（含「报告」或已选报告生成技能）→ template（方式一：关键词触发）
 * 4. 报告生成技能选中 → outline（方式二：按要求生成，先出大纲）
 */
export function classifyReportRequest(
  text: string,
  opts: { skillOn: boolean; template: ReportTemplateItem | null },
): ReportGenMode | null {
  if (opts.template) return "template";
  const mentionsReport = text.includes("报告");
  const refsConversation = CONVERSATION_REF_WORDS.some((w) => text.includes(w));
  if (mentionsReport && refsConversation) return "conversation";
  const hit = matchTemplateByKeyword(text);
  if (hit && (mentionsReport || opts.skillOn)) return "template";
  if (opts.skillOn) return "outline";
  return null;
}

// ========== 大纲生成（方式二） ==========

// 领域骨架选择：按文本关键词套用最接近的模板大纲，未命中用综合骨架
function pickSkeleton(text: string): Omit<ReportOutline, "requirement"> {
  const t = matchTemplateByKeyword(text);
  if (t) return { title: t.name, refFile: t.refFile, sections: t.outline.sections };
  return {
    title: "综合经营分析报告",
    sections: [
      {
        id: "", title: "生产运行情况", approach: "汇总产量、计划达成与机台效率",
        children: [{ id: "", title: "产量与达成率分析", approach: "对比实际与计划产量，定位差距来源", children: [] }],
      },
      {
        id: "", title: "工艺质量情况", approach: "汇总优质品率、过程管控与缺陷情况",
        children: [{ id: "", title: "优质品率分析", approach: "对比各工序优质品率与目标", children: [] }],
      },
      {
        id: "", title: "能源与费用情况", approach: "汇总综合能耗、可控费用与预算执行",
        children: [],
      },
      { id: "", title: "结论与建议", approach: "综合各域表现给出总体判断与行动建议", children: [] },
    ],
  };
}

// 从输入提取报告标题：含「X月」优先保留时间限定；含模板名用模板名；否则按领域默认
function outlineTitleOf(text: string, skeletonTitle: string): string {
  const monthMatch = text.match(/([1-9]|1[0-2])月/);
  const month = monthMatch ? monthMatch[0] : "10月";
  const hit = matchTemplateByKeyword(text);
  const base = hit ? hit.name : skeletonTitle;
  return `${month}${base}`;
}

export interface SessionCtx {
  turnCount: number; // 会话已有对话轮数（用于上下文补全说明）
}

// 方式一：已选模板 → 直接以模板骨架构造大纲（标题保留文本中的「X月」限定）
export function outlineFromTemplate(t: ReportTemplateItem, text: string): ReportOutline {
  const month = text.match(/([1-9]|1[0-2])月/)?.[0];
  return {
    title: month ? `${month}${t.name}` : t.name,
    requirement: text,
    refFile: t.refFile,
    sections: cloneOutline(t.outline),
  };
}

// 生成大纲：骨架套用 + 标题定制；引用对话时在要求中注明上下文复用
export function generateOutline(text: string, ctx: SessionCtx): ReportOutline {
  const skeleton = pickSkeleton(text);
  const sections = cloneOutline(skeleton);
  const refsConversation = CONVERSATION_REF_WORDS.some((w) => text.includes(w));
  const requirement = refsConversation && ctx.turnCount > 0
    ? `${text}\n（系统说明：已复用当前会话 ${ctx.turnCount} 轮分析中的统计对象、指标与查询结果）`
    : text;
  return { title: outlineTitleOf(text, skeleton.title), requirement, refFile: skeleton.refFile, sections };
}

// 留空的分析思路按章节标题与报告要求自动补写（PRD：分析思路允许留空，生成时自动补充）
export function fillApproaches(outline: ReportOutline): ReportOutline {
  const autoOf = (title: string): string => {
    if (/能耗|电|蒸汽|能源/.test(title)) return `围绕「${title}」，取统计周期内能耗明细数据，采用目标对比与环比分析方法评估`;
    if (/质量|优质|缺陷|管控|检验/.test(title)) return `围绕「${title}」，取质量检验与缺陷统计数据，采用达标判定与Top占比分析方法`;
    if (/产量|生产|机台|效率|设备/.test(title)) return `围绕「${title}」，取生产与设备运行数据，采用计划对比与机台排名分析方法`;
    if (/费用|成本|预算|辅料|物耗/.test(title)) return `围绕「${title}」，取费用与辅料消耗数据，采用目标偏差分析方法`;
    if (/碳|水|环保|安全/.test(title)) return `围绕「${title}」，取环保与安全监测数据，采用达标对比分析方法`;
    return `围绕「${title}」，结合报告要求与本会话数据，梳理现状、对比基准并给出结论`;
  };
  return {
    ...outline,
    sections: outline.sections.map((s) => ({
      ...s,
      approach: s.approach?.trim() ? s.approach : autoOf(s.title),
      children: s.children.map((c) => ({
        ...c,
        approach: c.approach?.trim() ? c.approach : autoOf(c.title),
      })),
    })),
  };
}

// ========== 报告正文生成 ==========

// 章节正文块：按标题关键词取卷烟厂口径预设段，未命中（用户新增章节）给通用段
function sectionBody(title: string): string {
  if (/综合能耗|单箱.*能耗/.test(title)) {
    return "统计周期内单箱综合能耗 **29.8 kgce/箱**，低于目标 31 kgce/箱（↓1.2），环比下降 0.4；单箱电耗 24.6 kWh/箱，蒸汽耗总量 3,860 t。能耗总体受控且优于目标。";
  }
  if (/电耗/.test(title)) {
    return "| 工序 | 单箱电耗(kWh/箱) | 占比(%) |\n|------|----------------|--------|\n| 制丝 | 8.7 | 35.4 |\n| 卷接 | 6.9 | 28.0 |\n| 包装 | 4.4 | 17.9 |\n| 动力 | 2.9 | 11.8 |\n| 其他 | 1.7 | 6.9 |\n\n制丝工序电耗占比最高，为重点关注对象。";
  }
  if (/车间.*对比|各车间/.test(title)) {
    return "| 车间 | 综合能耗(kgce/箱) | 单位产量电耗(kWh/箱) |\n|------|------------------|--------------------|\n| 制丝车间 | 4.5 | 8.7 |\n| 卷接车间 | 3.6 | 6.9 |\n| 包装车间 | 2.3 | 4.4 |\n\n制丝车间单位产量能耗最高，卷接车间次之，建议优先针对制丝工序开展节能改造。";
  }
  if (/能源结构|分项能耗|占比/.test(title)) {
    return "能源结构（折标煤）：制丝 35.2%、卷接 28.1%、包装 18.0%、动力 11.7%、其他 7.0%。主要消耗集中在制丝与卷接两大工序，合计占比 63.3%。";
  }
  if (/碳排放/.test(title)) {
    return "单位产量碳排放量 **0.032 kg CO₂/万支**，高于目标 0.03（↑0.002）；其中第一类碳排放 385.6 kg CO₂、第二类碳排放 1,248.3 kg CO₂。建议关注燃料效率与外购电力结构。";
  }
  if (/水|COD/.test(title)) {
    return "单位产量水耗 0.12 m³/万支（环比 ↑1.6%）；污水 COD 42 mg/L，优于 0 mg/L 目标限值要求的方向性基准；中水回用率 82.6%，同比 +3.1 pct，水资源利用持续改善。";
  }
  if (/节能|降本|建议|措施/.test(title)) {
    return "1. 推进制丝工序余热回收，预计降低综合能耗 1.5%；\n2. 优化卷接排产避开用电高峰，降低峰段电费；\n3. 对包装车间开展压缩空气系统泄漏排查。";
  }
  if (/产量|达成/.test(title)) {
    return "统计周期内实际产量 **18,432 箱**，计划产量 19,050 箱，达成率 **96.8%**，差距 618 箱主要来自个别机台未完成计划的日期。";
  }
  if (/机台.*完成率|计划完成/.test(title)) {
    return "16 台机组月度计划完成率区间 92.0%～100.0%：12#机组 92.0%（3 天未完成）、8#机组 93.1%（2 天未完成）偏低，1#机组 100.0% 达成。建议核查低完成率机台的排产与故障停机记录。";
  }
  if (/台时产量|净效率|运行效率|设备/.test(title)) {
    return "台时产量 **1,000 箱/台**，低于目标 1,100 箱/台（↓100）；设备运行净效率 95.0%，低于历史均值 95.6%（↓0.6 pct）。卷接机1号运行效率 90.1% 最高，包装机2号 86.8% 最低。";
  }
  if (/优质品率/.test(title)) {
    return "成品优质品率 **98.6%**、制丝优质品率 98.4%，均保持高位；分工序看制丝 94.8%、卷接 92.5%、包装 91.2%，包装工序相对偏低，主要受空头、漏气等缺陷影响。";
  }
  if (/过程管控/.test(title)) {
    return "9 项过程管控指标中 4 项未达标：松散回潮非稳态指数 4.8%（≤4.0%）、成品水分标准偏差 1.65%（≤1.55%）、烟支单支克重偏差 46mg（≤40mg）超上限，烘丝机出口水分偏差 12.4% 低于下限 12.5%。建议复盘相关批次趋势定位工艺偏差根因。";
  }
  if (/缺陷/.test(title)) {
    return "全部缺陷 **58 条**，Top 类型：空头（16 条 / 27.6%）、漏气（11 条 / 19.0%）、皱褶（8 条 / 13.8%）。空头集中于包装工序，建议检查负压吸风与烟支密度控制。";
  }
  if (/可控费用|费用总体/.test(title)) {
    return "单箱可控费用 **408 元/箱**，高于目标 300 元/箱（超支 108 元/箱），为当前最大费用风险项；预算执行率 97.0%，高于计划执行进度 83.3%（+13.7 pct），累计执行 15,180 万元 / 年度预算 15,652 万元。";
  }
  if (/预算/.test(title)) {
    return "预算执行率 97.0%，计划执行进度 83.3%，执行快于进度 13.7 pct；费用预算健康度 72 分（一般）。建议核查执行偏快的费用科目，防止年末预算失控。";
  }
  if (/辅料|物耗/.test(title)) {
    return "| 物料类型 | 单箱消耗 | 基准 | 差距 |\n|---------|---------|------|------|\n| 烟叶 | 38.6公斤/箱 | 目标40.0 | -1.4 ✅ |\n| 嘴棒 | 50,000支/箱 | 目标48,000 | +2,000 ⚠️ |\n| 盘纸 | 29.8米/箱 | 均值30.0 | -0.2 ✅ |\n| 商标纸 | 2,500张/箱 | 目标2,480 | +20 ⚠️ |\n\n嘴棒与商标纸超目标，建议排查损耗环节。";
  }
  if (/安全/.test(title)) {
    return "累计安全工时 12,580 小时，连续无事故 247 天；本月巡检 186 次，发现隐患 12 处、已整改 11 处，待整改 1 处（高配室防护栏松动，预计 3 日内完成）。";
  }
  if (/结论|总体|概况|汇总/.test(title)) {
    return "统计周期内产质耗运行总体平稳：能耗与质量优于目标，产量效率略低于目标，费用执行存在单箱可控费用超支与预算进度偏差两项重点风险。建议优先处置费用风险，跟踪低效机台恢复。";
  }
  if (/问题|改进|归因/.test(title)) {
    return "主要问题：① 12#/8# 机组月度完成率偏低；② 4 项过程管控参数未达标；③ 嘴棒、商标纸单箱消耗超目标。改进方向：核查排产与停机损失、复盘工艺偏差、排查辅料损耗环节。";
  }
  if (/明细|明细表|日报表|统计表|汇总表/.test(title)) {
    return "| 项目 | 数值 | 单位 |\n|------|------|------|\n| 实际产量 | 18,432 | 箱 |\n| 计划产量 | 19,050 | 箱 |\n| 达成率 | 96.8 | % |\n| 综合能耗 | 29.8 | kgce/箱 |\n| 可控费用 | 408 | 元/箱 |";
  }
  return `本节围绕「${title}」展开：结合报告要求与统计周期内数据，对比基准值评估现状，梳理关键发现与需关注事项。`;
}

const CN_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五"];

// 一级章节编号（一、二、…）；超出中文数字表回退阿拉伯数字
export function levelNumber(index: number): string {
  return CN_NUM[index] ?? String(index + 1);
}

/**
 * 按大纲生成报告正文（markdown）：
 * 一级章节 → ## 一、标题；二级章节 → ### 1.1 标题；每节正文按标题关键词取预设段。
 * 统计说明头 + 章节小结自动拼装。
 */
export function generateReportContent(outline: ReportOutline, ctx: SessionCtx): string {
  const filled = fillApproaches(outline);
  const head = `# ${filled.title}\n\n> 统计范围：全厂（卷接、包装、制丝） ｜ 统计周期：本月 ｜ 生成方式：AI 报告生成${ctx.turnCount > 0 ? `（结合会话 ${ctx.turnCount} 轮分析）` : ""}\n`;
  const body = filled.sections
    .map((s, i) => {
      const parts = [`## ${levelNumber(i)}、${s.title}\n\n${sectionBody(s.title)}`];
      s.children.forEach((c, j) => {
        parts.push(`### ${i + 1}.${j + 1} ${c.title}\n\n${sectionBody(c.title)}`);
      });
      return parts.join("\n\n");
    })
    .join("\n\n");
  const hasConclusion = filled.sections.some((s) => /结论|建议/.test(s.title));
  const tail = hasConclusion ? "" : `\n\n## ${levelNumber(filled.sections.length)}、结论与建议\n\n综合以上分析：能耗与质量优于目标，产量效率略低于目标，费用执行存在超支风险。建议优先核查可控费用超支科目，跟踪低效机台排产与停机损失，并复盘未达标过程参数。`;
  return `${head}\n${body}${tail}`;
}

// 报告创作思考过程（抽屉内查看）：按 PRD Agent 执行流程逐步骤展示，
// 三种生成方式对应三条流程文案；不展示模型内部推理，关键步骤引用大纲与数据来源。
const REPORT_AGENT_FLOWS: Record<ReportGenMode, string[]> = {
  // ① 分析报告：根据报告要求生成（方式二，先出大纲确认）
  outline: [
    "用户提问",
    "加载会话上下文",
    "意图识别（报告生成：根据要求生成）",
    "解析报告需求，必要时澄清信息",
    "权限校验",
    "任务规划与数据可用性检查",
    "生成拟定大纲",
    "用户确认大纲（支持修改）",
    "查询、计算与分析数据（独立任务可并行）",
    "生成正文和图表",
    "校验数据及结论",
    "调用文档工具生成完整报告",
    "展示预览并支持下载",
  ],
  // ② 分析报告：基于报告模板生成（方式一）
  template: [
    "用户提问",
    "加载会话上下文",
    "意图识别（报告生成：基于模板生成）",
    "解析报告需求",
    "检索并确定报告模板",
    "读取模板结构与分析要求，必要时澄清统计周期及范围",
    "权限校验",
    "任务规划",
    "查询、计算与分析数据（独立任务可并行）",
    "按模板生成正文和图表",
    "校验数据及结论",
    "调用文档工具生成完整报告",
    "展示预览并支持下载",
  ],
  // ③ 分析报告：基于对话分析结果生成（方式三）
  conversation: [
    "用户提问",
    "加载会话上下文",
    "意图识别（报告生成：基于对话分析结果生成）",
    "解析报告需求",
    "提取当前会话中相关分析结果及数据依据",
    "权限校验",
    "组织报告结构并识别信息缺口，必要时澄清",
    "任务规划",
    "按需补查、计算与分析数据（独立任务可并行）",
    "整合正文和图表",
    "校验数据及结论",
    "调用文档工具生成完整报告",
    "展示预览并支持下载",
  ],
};

// 步骤说明：按步骤关键词映射（引用大纲章节与数据域，其余给通用说明）
function reportStepDetail(step: string, outline: ReportOutline, mode: ReportGenMode): string {
  const l1 = outline.sections.length;
  const l2 = outline.sections.reduce((n, s) => n + s.children.length, 0);
  if (step === "用户提问") return `「${outline.requirement.split("\n")[0].slice(0, 60)}」`;
  if (step.startsWith("意图识别")) {
    const kind = mode === "template" ? "基于报告模板生成" : mode === "conversation" ? "基于对话分析结果生成" : "根据报告要求生成";
    return `判定用户意图为报告生成：${kind}。`;
  }
  if (step.includes("解析报告需求")) return `报告主题「${outline.title}」，共规划 ${l1} 个一级章节、${l2} 个二级章节；已结合用户要求与会话上下文确定统计范围。`;
  if (step.includes("检索并确定报告模板")) return outline.refFile ? `命中模板：${outline.refFile}。` : "已在内置模板库中确定最匹配的报告模板。";
  if (step.includes("读取模板结构")) return `模板结构：${l1} 个一级章节、${l2} 个二级章节；统计周期及范围按用户要求执行。`;
  if (step.includes("生成拟定大纲")) return `拟定大纲：${outline.sections.map((s) => s.title).join("；")}。`;
  if (step.includes("用户确认大纲")) return "用户已确认大纲（支持修改），生成任务按确认后的大纲执行。";
  if (step.includes("提取当前会话")) return "已从当前会话中提取相关分析结果与数据依据，作为报告素材。";
  if (step.includes("组织报告结构")) return `按素材组织报告结构：${l1} 个章节；识别信息缺口并按需补查。`;
  if (step === "权限校验") return "当前用户具备生产、质量、能源、费用域数据的查询与导出权限。";
  if (step.includes("任务规划")) return `规划 ${l1 + l2} 个写作任务与配套取数任务，独立任务并行执行；已核对所需数据可用。`;
  if (step.includes("查询") || step.includes("补查")) return "并行查询数据资产：产量与机组效率（生产域）、优质品率与过程管控（质量域）、综合能耗与碳排放（能源域）、可控费用与辅料消耗（费用域），取数与计算完成。";
  if (step.includes("正文")) return `按大纲顺序撰写 ${l1} 个章节，结合分析思路（${l2 > 0 ? "目标对比/环比/排名/占比" : "目标对比与环比"}）展开，图表随文生成。`;
  if (step.includes("校验数据")) return "逐项交叉核对正文数值与取数结果，结论与数据一致，无口径冲突。";
  if (step.includes("文档工具")) return "调用文档工具生成完整报告：统一章节编号、表格口径与目录。";
  if (step.includes("预览")) return "报告已生成，支持在抽屉中预览并导出 Word/PDF。";
  return "步骤执行完成。";
}

export function reportThinkingNodes(outline: ReportOutline, mode: ReportGenMode = "outline"): ExecutionNode[] {
  return REPORT_AGENT_FLOWS[mode].map((step, i) => ({
    id: `rt-${i + 1}`,
    label: step,
    status: "completed" as const,
    duration: 80 + i * 130,
    detail: reportStepDetail(step, outline, mode),
  }));
}

// ========== 对话式报告编辑 ==========

const EDIT_VERBS = ["增加", "补充", "加入", "添加", "压缩", "精简", "缩短", "改写", "重写", "调整", "删除", "修改", "扩充"];
const EDIT_OBJECT_WORDS = ["报告", "章节", "结论", "分析", "对比", "内容", "篇幅", "标题", "趋势", "建议", "明细", "概况"];

// 编辑意图判定：修改动词 + 报告内容对象词（仅当会话中已有完成报告时由 ChatPanel 调用）
export function isReportEditIntent(text: string): boolean {
  const hasVerb = EDIT_VERBS.some((v) => text.includes(v));
  const hasObject = EDIT_OBJECT_WORDS.some((w) => text.includes(w));
  return hasVerb && hasObject;
}

/**
 * 对报告正文做局部修改（保留未涉及内容）：
 * 增加/补充/加入 → 末尾追加新章节；压缩/精简/缩短 → 追加精简版结论；其他 → 追加修订说明。
 */
export function applyReportEdit(content: string, text: string): { content: string; note: string } {
  if (/增加|补充|加入|添加/.test(text)) {
    // 提取动词后面的内容作为新章节主题（去掉「一份/一个/关于」等修饰）
    const m = text.match(/(?:增加|补充|加入|添加)\s*(?:一份|一个|关于)?(.{2,20}?)(?:的|章节|部分)?(?:分析|对比|说明|内容)?$/);
    const topic = (m?.[1] ?? text).trim() || "补充分析";
    const chapterNo = (content.match(/^## /gm) ?? []).length + 1;
    const next = `${content}\n\n## ${levelNumber(chapterNo - 1)}、${topic}\n\n${sectionBody(topic)}\n\n> 本章由对话修改指令补充（「${text}」），其余章节保持原文。`;
    return { content: next, note: `已按您的要求增加「${topic}」章节，其他内容保持不变` };
  }
  if (/压缩|精简|缩短/.test(text)) {
    const brief = `\n\n> 【精简版结论】产质耗总体平稳：能耗 29.8 kgce/箱优于目标，优质品率 98.6% 保持高位；台时产量与净效率略低于目标；可控费用 408 元/箱超支 108 元/箱为最大风险。建议：① 核查费用超支科目；② 跟踪低效机台；③ 复盘未达标过程参数。（全文约 300 字）`;
    return { content: content + brief, note: "已生成精简版结论附于文末，原内容保持不变" };
  }
  const note = `\n\n> 【修订说明】已按指令「${text}」对报告内容进行调整，未涉及部分保持原文。`;
  return { content: content + note, note: "已按您的修改要求更新报告" };
}
