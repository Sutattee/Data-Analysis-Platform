// 智能问数 - 会话历史与收藏 模拟数据
// daysAgo: 距今天数（0=今天, 1=昨天...）；clock: 最后提问时刻 HH:mm
// favorited + favDaysAgo/favClock: 收藏状态与收藏时间

export interface HistorySession {
  id: string;
  topic: string;       // 会话主题（可重命名）
  turnCount: number;   // 对话轮数
  daysAgo: number;     // 最后提问距今天数
  clock: string;       // 最后提问时刻 HH:mm
  tables: string[];    // 关联数据表标签
  lastQuery: string;   // 最后一轮提问（用于"继续讨论"跳转）
  favorited: boolean;  // 是否已收藏
  favDaysAgo?: number; // 收藏时间距今天数
  favClock?: string;   // 收藏时刻
}

export const historySessions: HistorySession[] = [
  { id: "h1", topic: "本月各产线产量分析", turnCount: 8, daysAgo: 0, clock: "09:32", tables: ["dwd_output_fact", "dwd_production_order"], lastQuery: "本月各产线产量是多少？", favorited: true, favDaysAgo: 0, favClock: "09:35" },
  { id: "h2", topic: "高炉车间能耗异常排查", turnCount: 6, daysAgo: 0, clock: "10:15", tables: ["dwd_energy_meter", "dwd_device_info"], lastQuery: "高炉车间近期能耗为何偏高？", favorited: false },
  { id: "h3", topic: "热轧良品率下降归因", turnCount: 5, daysAgo: 1, clock: "16:40", tables: ["dwd_inspection_record", "dwd_defect_detail"], lastQuery: "热轧良品率下降原因分析", favorited: true, favDaysAgo: 1, favClock: "09:00" },
  { id: "h4", topic: "设备 OEE 趋势预测", turnCount: 4, daysAgo: 1, clock: "11:20", tables: ["dwd_device_runtime_log", "dwd_device_info"], lastQuery: "设备 OEE 趋势预测", favorited: false },
  { id: "h5", topic: "销售订单交付情况", turnCount: 7, daysAgo: 2, clock: "14:05", tables: ["dwd_sales_order", "dim_customer"], lastQuery: "本月订单完成率如何？", favorited: true, favDaysAgo: 3, favClock: "11:00" },
  { id: "h6", topic: "冷轧质检数据查询", turnCount: 3, daysAgo: 3, clock: "09:48", tables: ["dwd_inspection_record"], lastQuery: "冷轧车间最近质检结果", favorited: false },
  { id: "h7", topic: "连铸坯缺陷类型统计", turnCount: 4, daysAgo: 5, clock: "13:30", tables: ["dwd_defect_detail", "dwd_inspection_record"], lastQuery: "连铸坯主要缺陷类型有哪些？", favorited: false },
  { id: "h8", topic: "全厂综合能耗对比", turnCount: 6, daysAgo: 6, clock: "15:12", tables: ["dwd_energy_meter"], lastQuery: "各车间综合能耗对比", favorited: false },
  { id: "h9", topic: "设备故障停机分析", turnCount: 5, daysAgo: 8, clock: "10:00", tables: ["dwd_device_runtime_log"], lastQuery: "设备故障停机时长分析", favorited: false },
  { id: "h10", topic: "产能利用率计算", turnCount: 3, daysAgo: 10, clock: "14:22", tables: ["dwd_output_fact"], lastQuery: "各产线产能利用率", favorited: false },
  { id: "h11", topic: "质量合格率趋势", turnCount: 4, daysAgo: 14, clock: "09:10", tables: ["dwd_inspection_record"], lastQuery: "近一个月质量合格率趋势", favorited: true, favDaysAgo: 12, favClock: "14:00" },
  { id: "h12", topic: "客户交付满意度", turnCount: 6, daysAgo: 18, clock: "16:50", tables: ["dwd_sales_order", "dim_customer"], lastQuery: "客户交付满意度分析", favorited: false },
  { id: "h13", topic: "吨钢成本结构", turnCount: 5, daysAgo: 22, clock: "11:40", tables: ["dwd_output_fact"], lastQuery: "吨钢成本构成", favorited: false },
  { id: "h14", topic: "安全巡检隐患统计", turnCount: 3, daysAgo: 25, clock: "10:30", tables: ["dwd_device_info"], lastQuery: "本月安全巡检隐患", favorited: false },
  { id: "h15", topic: "原料采购到货情况", turnCount: 4, daysAgo: 28, clock: "14:15", tables: ["dwd_production_order"], lastQuery: "原料采购到货进度", favorited: false },
  { id: "h16", topic: "年度产量复盘", turnCount: 9, daysAgo: 35, clock: "17:00", tables: ["dwd_output_fact", "dwd_production_order"], lastQuery: "年度产量复盘", favorited: false },
  { id: "h17", topic: "季度能耗对比", turnCount: 5, daysAgo: 65, clock: "10:20", tables: ["dwd_energy_meter"], lastQuery: "季度能耗对比", favorited: true, favDaysAgo: 40, favClock: "10:00" },
  { id: "h18", topic: "年度设备盘点", turnCount: 7, daysAgo: 95, clock: "15:30", tables: ["dwd_device_info"], lastQuery: "年度设备盘点", favorited: false },
];
