// 智能填表 mock 数据层（智能问数「智能填表」技能）：
// 报表模板匹配（内置 Excel 模板 + 管理后台启用中的上传模板）→ 引导补充 →
// 按模板结构生成填好的表（预览与 XLSX 导出共用）→ Agent 执行流程思考节点 → 对话式修改。
// 纯前端边界：不解析真实 XLSX，按模板定义的列结构填入平台口径 mock 数据。
import type { ExecutionNode, FillTable, ReportTemplateItem } from "@/types";
import { REPORT_TEMPLATES_EXCEL } from "@/lib/mock-data/report-gen";
import { listUploadedTemplates, uploadedToTemplateItem } from "@/lib/mock-data/report-templates-admin";

// ========== 模板匹配与引导 ==========

// 候选模板：内置 Excel 报表模板 + 启用中的上传 Excel 模板（管理后台「报告模板」页统一上传管理）
function fillTemplateCandidates(): ReportTemplateItem[] {
  return [
    ...REPORT_TEMPLATES_EXCEL,
    ...listUploadedTemplates("excel").filter((t) => t.enabled).map(uploadedToTemplateItem),
  ];
}

// 按模板名包含 → keywords 包含匹配报表模板
export function matchFillTemplate(text: string): ReportTemplateItem | null {
  const candidates = fillTemplateCandidates();
  const exact = candidates.find((t) => text.includes(t.name));
  if (exact) return exact;
  return candidates.find((t) => t.keywords.some((k) => text.includes(k))) ?? null;
}

// 当前可用的报表模板清单（引导补充消息用）
export function listFillTemplateNames(): { name: string; category: string }[] {
  return fillTemplateCandidates().map((t) => ({ name: t.name, category: t.category }));
}

// ========== 填报需求解析 ==========

export const FILL_STAGES = ["正在检索报表模板", "正在查询数据", "正在回填数据", "正在校验填报结果"];

// 统计周期：文本含「X月」取之，否则默认当月口径（mock 固定 2026年10月）
export function defaultPeriodOf(text: string): string {
  const m = text.match(/([1-9]|1[0-2])月/);
  return m ? `2026年${m[0]}` : "2026年10月";
}

// ========== 填表数据（内置模板按 preview 列结构扩展；上传模板给通用对标表） ==========

const TABLES_BUILTIN: Record<string, FillTable> = {
  "rg-x-production": {
    title: "当日产量汇总",
    headers: ["机台", "工序", "计划产量(箱)", "实际产量(箱)", "达成率"],
    rows: [
      ["卷接机1号", "卷接", "1,050", "1,060", "101.0%"],
      ["卷接机2号", "卷接", "1,050", "1,032", "98.3%"],
      ["卷接机3号", "卷接", "1,050", "1,058", "100.8%"],
      ["卷接机4号", "卷接", "1,040", "1,021", "98.2%"],
      ["包装机1号", "包装", "1,020", "1,015", "99.5%"],
      ["包装机2号", "包装", "1,020", "1,032", "101.2%"],
      ["包装机3号", "包装", "1,000", "986", "98.6%"],
      ["包装机4号", "包装", "1,000", "1,008", "100.8%"],
    ],
  },
  "rg-x-energy": {
    title: "分工序能耗统计",
    headers: ["工序", "单箱能耗(公斤标煤/箱)", "占比(%)"],
    rows: [
      ["制丝", "4.5", "35.2"],
      ["卷接", "3.6", "28.1"],
      ["包装", "2.3", "18.0"],
      ["动力", "1.5", "11.7"],
      ["其他", "0.9", "7.0"],
    ],
  },
  "rg-x-quality": {
    title: "批次检验汇总",
    headers: ["批次", "工序", "检验得分", "优质品率(%)"],
    rows: [
      ["20261022-01", "制丝", "96.5", "94.8"],
      ["20261022-02", "制丝", "97.1", "94.8"],
      ["20261022-03", "卷接", "96.8", "92.5"],
      ["20261022-04", "卷接", "95.9", "91.7"],
      ["20261022-05", "包装", "97.4", "96.2"],
    ],
  },
  "rg-x-material": {
    title: "辅料消耗统计",
    headers: ["物料类型", "单箱消耗", "单位", "目标", "差距"],
    rows: [
      ["烟叶", "38.6", "公斤/箱", "40.0", "-1.4"],
      ["嘴棒", "50,000", "支/箱", "48,000", "+2,000"],
      ["盘纸", "29.8", "米/箱", "30.0", "-0.2"],
      ["商标纸", "2,500", "张/箱", "2,480", "+20"],
    ],
  },
};

// 上传模板（无解析结构）：通用指标对标表
const TABLE_GENERIC: FillTable = {
  title: "指标对标",
  headers: ["指标", "本期值", "目标", "差距"],
  rows: [
    ["计划产量达成率", "96.8%", "100%", "-3.2pct"],
    ["单箱综合能耗(公斤标煤/箱)", "29.8", "31.0", "-1.2"],
    ["优质品率(%)", "98.6", "98.5", "+0.1"],
    ["单箱耗烟叶(公斤/箱)", "38.6", "40.0", "-1.4"],
    ["可控费用(元/箱)", "408", "415", "-7"],
    ["设备运行净效率(%)", "95.0", "95.5", "-0.5"],
  ],
};

// 按模板生成填好的表（模板原有结构 + 平台口径数据）
export function generateFillTables(t: ReportTemplateItem): FillTable[] {
  const builtin = TABLES_BUILTIN[t.id];
  return [builtin ? { ...builtin } : { ...TABLE_GENERIC, title: `${t.name}·对标` }];
}

// ========== 对话式修改（技能未切换时的补充要求与修改指令） ==========

const FILL_EDIT_VERBS = ["改", "调整", "换成", "更换", "补充", "增加", "删除", "去掉", "重新", "更新", "刷新", "替换"];
const FILL_EDIT_OBJECTS = ["报表", "表格", "列", "数据", "周期", "口径", "范围", "月份", "表"];

// 修改意图判定：修改动词 + 填表对象词（仅当技能为智能填表且会话已有完成报表时由 ChatPanel 调用）
export function isFillEditIntent(text: string): boolean {
  return FILL_EDIT_VERBS.some((v) => text.includes(v)) && FILL_EDIT_OBJECTS.some((o) => text.includes(o));
}

// 应用修改：识别「X月」调整统计周期，其余按补充要求重新填报
export function applyFillEdit(period: string, text: string): { period: string; note: string } {
  const m = text.match(/([1-9]|1[0-2])月/);
  if (m) {
    const next = `2026年${m[0]}`;
    if (next !== period) return { period: next, note: `统计周期已调整为${next}，已按新周期重新填报` };
    return { period, note: "统计周期未变化，已重新核对填报数据" };
  }
  return { period, note: "已按您的补充要求重新填报" };
}

// ========== Agent 执行流程思考节点（PRD 流程：Excel报表·智能填表） ==========

export function fillThinkingNodes(
  t: ReportTemplateItem,
  period: string,
  text: string,
  tables: FillTable[]
): ExecutionNode[] {
  const rows = tables.reduce((n, tb) => n + tb.rows.length, 0);
  const cols = tables[0]?.headers.length ?? 0;
  const steps: { label: string; detail: string }[] = [
    { label: "用户提问", detail: `「${text.slice(0, 60)}」` },
    { label: "加载会话上下文", detail: "已加载当前会话上下文，用于识别统计对象、指标口径与此前填报结果。" },
    { label: "意图识别（智能填表：基于报表模板生成）", detail: "判定用户意图为智能填表：按已启用报表模板生成 XLSX 报表。" },
    { label: "解析填报需求", detail: `报表「${t.name}」，统计周期 ${period}；未明确的统计范围按全厂口径处理。` },
    { label: "检索并确定报表模板", detail: `在启用中的报表模板中命中「${t.name}」（分类：${t.category}）。` },
    { label: "读取工作表结构、待填位置及取数规则，必要时澄清统计周期和指标口径", detail: `解析模板工作表：${tables.length} 个待填区域、${cols} 列字段；统计周期按 ${period} 执行，指标口径沿用平台数据字典。` },
    { label: "权限校验", detail: "当前用户具备生产、能源、质量、费用域数据的查询与导出权限。" },
    { label: "任务规划", detail: `拆分 ${tables.length} 个取数任务与 ${rows} 项指标计算任务，独立任务并行执行。` },
    { label: "查询数据并调用计算工具（独立任务可并行）", detail: "并行连接数据资产：产量与机组效率（生产域）、综合能耗（能源域）、检验与优质品率（质量域）、可控费用与辅料消耗（费用域），取数与计算完成。" },
    { label: "校验计算结果", detail: "逐项交叉核对：汇总值与明细加总一致，同比/环比与目标对比口径无误。" },
    { label: "调用报表工具回填数据并更新相关公式", detail: `按模板原有结构回填 ${rows} 行 × ${cols} 列数据，合计与达成率等公式已同步更新。` },
    { label: "校验填报完整性、公式及格式", detail: "待填单元格全部填充，公式计算与数字格式校验通过，无遗漏行列。" },
    { label: "展示预览并支持下载", detail: "XLSX 报表已生成，支持在抽屉中预览并下载。" },
  ];
  return steps.map((s, i) => ({
    id: `ff-${i + 1}`,
    label: s.label,
    status: "completed" as const,
    duration: 80 + i * 130,
    detail: s.detail,
  }));
}
