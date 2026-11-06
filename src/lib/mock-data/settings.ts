import { DataSource, BizTerm, BizLogic, KnowledgeDoc, AiSkill, ConversationRecord } from "@/types";

// 数据源
export const mockDataSources: DataSource[] = [
  { id: "ds1", name: "MES生产数据库", type: "mysql", host: "192.168.1.100:3306", status: "connected", updatedAt: "2026-07-08 08:00" },
  { id: "ds2", name: "ERP系统数据库", type: "oracle", host: "192.168.1.101:1521", status: "connected", updatedAt: "2026-07-08 08:00" },
  { id: "ds3", name: "能源管理系统", type: "postgresql", host: "192.168.1.102:5432", status: "connected", updatedAt: "2026-07-08 07:00" },
  { id: "ds4", name: "质量检验系统", type: "mysql", host: "192.168.1.103:3306", status: "disconnected", updatedAt: "2026-07-07 18:00" },
  { id: "ds5", name: "设备监控API", type: "api", host: "https://iot.company.com/api/v1", status: "connected", updatedAt: "2026-07-08 08:00" },
];

// 业务术语
export const mockBizTerms: BizTerm[] = [
  { id: "bt1", name: "包装设备运行效率", synonyms: "包装机效率", definition: "包装工序实际运行时间占计划时间的比例", domain: "生产管理", creator: "张三", updatedAt: "2026-06-15" },
  { id: "bt2", name: "卷接设备运行效率", synonyms: "卷接机效率", definition: "卷接工序实际运行时间占计划时间的比例", domain: "生产管理", creator: "李四", updatedAt: "2026-05-20" },
  { id: "bt3", name: "单箱耗烟叶量", synonyms: "单箱烟叶消耗", definition: "单位产量烟叶消耗量(公斤/箱)", domain: "物耗管理", creator: "张三", updatedAt: "2026-06-01" },
  { id: "bt4", name: "优质品率", synonyms: "优质品占比", definition: "优质品数量占总产品数的比例", domain: "质量管理", creator: "王五", updatedAt: "2026-06-10" },
  { id: "bt5", name: "百小时停机断料率", synonyms: "断料频次", definition: "每运行百小时的停机断料次数", domain: "设备管理", creator: "李四", updatedAt: "2026-06-22" },
  { id: "bt6", name: "单箱综合能耗", synonyms: "单位产量能耗", definition: "单位产量综合能耗(公斤标煤/箱)", domain: "能源管理", creator: "赵六", updatedAt: "2026-07-01" },
  { id: "bt7", name: "烘丝出口水分偏差", synonyms: "水分偏差", definition: "烘丝工序出口水分实测值与目标值之差", domain: "工艺质量", creator: "赵六", updatedAt: "2026-07-01" },
];

// 业务逻辑
export const mockBizLogics: BizLogic[] = [
  { id: "bl1", name: "单箱耗烟叶量计算", expression: "SUM(物料消耗表.烟叶消耗量) / SUM(产量)", description: "单位产量烟叶消耗(公斤/箱)", creator: "张三", updatedAt: "2026-06-15" },
  { id: "bl2", name: "设备运行效率计算", expression: "实际运行时间 / 计划时间 × 100%", description: "卷接/包装工序设备运行效率", creator: "李四", updatedAt: "2026-06-10" },
  { id: "bl3", name: "优质品率计算", expression: "优质品数 / 总产品数 × 100%", description: "优质品占比", creator: "张三", updatedAt: "2026-06-20" },
  { id: "bl4", name: "单箱综合能耗计算", expression: "SUM(综合能耗) / SUM(产量)", description: "单位产量综合能耗(公斤标煤/箱)", creator: "王五", updatedAt: "2026-07-01" },
];

// 知识库文档
export const mockKnowledgeDocs: KnowledgeDoc[] = [
  { id: "kd1", title: "卷接工艺技术规程 Q/YY-JJ-2024-012", category: "工艺规范", uploadDate: "2026-06-15", status: "indexed" },
  { id: "kd2", title: "包装工艺技术规程", category: "工艺规范", uploadDate: "2026-06-10", status: "indexed" },
  { id: "kd3", title: "制丝工艺技术规程", category: "工艺规范", uploadDate: "2026-06-20", status: "indexed" },
  { id: "kd4", title: "卷烟质量检验标准 GB/T 5606-2024", category: "质量标准", uploadDate: "2026-06-18", status: "indexed" },
  { id: "kd5", title: "设备维护手册 - 卷接机篇", category: "设备手册", uploadDate: "2026-07-01", status: "processing" },
  { id: "kd6", title: "节能降耗与碳排放管理方案", category: "工作方案", uploadDate: "2026-07-05", status: "indexed" },
];

// AI技能
export const mockAiSkills: AiSkill[] = [
  { id: "as1", name: "智能问数", description: "自然语言查询生产、质量、能耗等数据", enabled: true },
  { id: "as2", name: "归因分析", description: "多维下钻定位KPI波动根因", enabled: true },
  { id: "as3", name: "预测分析", description: "基于时序模型预测生产趋势", enabled: true },
  { id: "as4", name: "异常检测", description: "实时监控数据异常并告警", enabled: true },
  { id: "as5", name: "报告生成", description: "自动撰写数据分析报告", enabled: true },
  { id: "as6", name: "知识问答", description: "基于企业知识库的问答", enabled: true },
  { id: "as9", name: "智能填表", description: "基于报表模板自动查询数据并生成XLSX报表", enabled: true },
  { id: "as7", name: "智能调度", description: "AI辅助生产排程优化", enabled: false },
  { id: "as8", name: "图像质检", description: "基于CV的产品表面缺陷检测", enabled: false },
];

// 对话记录
export const mockConversations: ConversationRecord[] = [
  { id: "c1", userId: "u1", title: "产量查询", lastMessage: "今日产量18,432吨", timestamp: Date.now() - 3600000, messageCount: 2 },
  { id: "c2", userId: "u2", title: "能耗分析", lastMessage: "综合能耗呈下降趋势", timestamp: Date.now() - 7200000, messageCount: 4 },
  { id: "c3", userId: "u1", title: "设备故障排查", lastMessage: "建议检查3号轧辊", timestamp: Date.now() - 86400000, messageCount: 6 },
  { id: "c4", userId: "u3", title: "质量报告", lastMessage: "良品率98.3%", timestamp: Date.now() - 90000000, messageCount: 3 },
  { id: "c5", userId: "u2", title: "安全巡检", lastMessage: "1处隐患待整改", timestamp: Date.now() - 172800000, messageCount: 2 },
];
