// 上传报告模板 mock 数据层（管理后台「报告模板」页）：
// 模块内存态（参照 metric-controls 模式）+ 预置数据 + 上传校验 + 转问数侧模板。
// 纯前端边界：格式 / 大小 / 0 字节可真实校验；加密、25 万字、万行不可解析，
// 以 0 字节判定「文件损坏或无法提取有效文本」，其余不做主动拦截。
import type { ReportTemplateItem, UploadedTemplate } from "@/types";

// ========== 预置数据（卷烟厂口径，含 PRD 示例） ==========

let templates: UploadedTemplate[] = [
  { id: "ut-a1", kind: "analysis", name: "2026年三季度经济运行分析报告", format: "DOCX", sizeBytes: 2.4 * 1024 * 1024, enabled: true,  uploader: "苏恒", uploadedAt: "2026-11-08 10:19:20", domain: "生产管理" },
  { id: "ut-a2", kind: "analysis", name: "卷烟厂月度能耗分析报告模板", format: "DOCX", sizeBytes: 1.1 * 1024 * 1024, enabled: true,  uploader: "admin", uploadedAt: "2026-10-15 14:32:08", domain: "能源消耗" },
  { id: "ut-a3", kind: "analysis", name: "年度质量工作总结报告模板", format: "PDF",  sizeBytes: 3.6 * 1024 * 1024, enabled: false, uploader: "李文", uploadedAt: "2026-09-28 16:05:41", domain: "工艺质量" },
  { id: "ut-x1", kind: "excel",    name: "卷烟厂2026年消耗对标指标数据看板", format: "XLSX", sizeBytes: 2 * 1024 * 1024, enabled: true, uploader: "苏恒", uploadedAt: "2026-11-08 10:19:20", domain: "能源消耗" },
  { id: "ut-x2", kind: "excel",    name: "生产日报表填报模板", format: "XLSX", sizeBytes: 860 * 1024, enabled: false, uploader: "王敏", uploadedAt: "2026-10-22 09:12:33", domain: "生产管理" },
];

// ========== 查询与变更 ==========

// 按页签取列表（上传时间倒序，最新在前）
export function listUploadedTemplates(kind: "analysis" | "excel"): UploadedTemplate[] {
  return templates.filter((t) => t.kind === kind);
}

// 新上传（默认启用，头插置顶）
export function addUploadedTemplate(t: UploadedTemplate): void {
  templates = [t, ...templates];
}

// 删除模板文件（启用中的模板随之从问数「选择模板」下架）
export function removeUploadedTemplate(id: string): void {
  templates = templates.filter((t) => t.id !== id);
}

// 启停切换：启用后可供问数选择生成报告，停用后不再提供选择
export function toggleUploadedTemplateEnabled(id: string): void {
  templates = templates.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t));
}

// ========== 工具与校验 ==========

// 文件大小展示：2MB / 860KB / 1.2GB
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, "")}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

// 取扩展名大写（无扩展名返回空串）
export function extOf(filename: string): string {
  return filename.includes(".") ? filename.split(".").pop()!.toUpperCase() : "";
}

// 上传文件名去扩展名（无扩展名原样保留）
export function nameOf(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

// 上传校验：返回错误原因（null 表示通过）——格式 / 大小 / 0 字节损坏
export function validateUploadFile(
  filename: string,
  sizeBytes: number,
  kind: "analysis" | "excel"
): string | null {
  const ext = extOf(filename).toLowerCase();
  if (kind === "analysis") {
    if (ext !== "docx" && ext !== "pdf") return "格式不支持：仅支持上传 DOCX/PDF 格式文档";
  } else {
    if (ext !== "xlsx") return "格式不支持：仅支持上传 XLSX 格式文件";
  }
  if (sizeBytes > MAX_SIZE) return "文件大小不能超过 100MB";
  if (sizeBytes <= 0) return "文件损坏或无法提取有效文本，请重新上传";
  return null;
}

// ========== 转问数侧模板（联动「选择模板」弹窗与报告生成） ==========

// 通用大纲骨架（上传文件不含可解析大纲，按文件类型套用通用结构；思路留空由生成时自动补写）
const GENERIC_OUTLINE_ANALYSIS: ReportTemplateItem["outline"] = {
  title: "分析报告",
  sections: [
    {
      id: "", title: "总体情况", approach: "",
      children: [
        { id: "", title: "核心指标完成情况", approach: "", children: [] },
        { id: "", title: "同比与环比变化", approach: "", children: [] },
      ],
    },
    {
      id: "", title: "关键指标分析", approach: "",
      children: [
        { id: "", title: "重点指标明细", approach: "", children: [] },
        { id: "", title: "薄弱环节识别", approach: "", children: [] },
      ],
    },
    {
      id: "", title: "问题与建议", approach: "",
      children: [
        { id: "", title: "主要问题", approach: "", children: [] },
        { id: "", title: "改进建议", approach: "", children: [] },
      ],
    },
  ],
};

const GENERIC_OUTLINE_EXCEL: ReportTemplateItem["outline"] = {
  title: "统计报表",
  sections: [
    {
      id: "", title: "报表说明", approach: "",
      children: [
        { id: "", title: "填报范围与周期", approach: "", children: [] },
      ],
    },
    {
      id: "", title: "数据口径", approach: "",
      children: [
        { id: "", title: "指标口径与单位", approach: "", children: [] },
        { id: "", title: "数据来源", approach: "", children: [] },
      ],
    },
    {
      id: "", title: "填报要求", approach: "",
      children: [
        { id: "", title: "填报规范与校验规则", approach: "", children: [] },
      ],
    },
  ],
};

// 通用 Excel 工作表预览骨架（上传的 XLSX 无法解析原版式，按对标看板通用结构展示；
// 正文数据以原文件为准，此处仅为只读预览示意）
const GENERIC_EXCEL_SHEETS: ReportTemplateItem["excelSheets"] = [
  {
    name: "对标指标总览",
    cells: [
      ["对标指标总览（当期累计）", "", "", "", ""],
      ["指标名称", "单位", "本期值", "对标值", "差距"],
      ["万支卷烟综合能耗", "kgce/万支", "28.6", "30.0", "-1.4"],
      ["万支卷烟耗水", "m³/万支", "1.8", "2.0", "-0.2"],
      ["单箱耗叶", "kg/箱", "38.6", "40.0", "-1.4"],
    ],
    merges: [{ row: 0, col: 0, rowSpan: 1, colSpan: 5 }],
    headerRows: 2,
    numericCols: [2, 3, 4],
  },
  {
    name: "口径说明",
    cells: [
      ["统计口径说明", ""],
      ["项目", "说明"],
      ["统计周期", "当期累计（月初至昨日）"],
      ["对标口径", "行业平均先进值"],
      ["数据来源", "ERP系统、能源管理系统"],
    ],
    merges: [{ row: 0, col: 0, rowSpan: 1, colSpan: 2 }],
    headerRows: 2,
  },
];

// 上传模板 → 问数侧模板项（骨架为共享常量，消费侧 outlineFromTemplate 会深拷贝分配章节 id）
export function uploadedToTemplateItem(t: UploadedTemplate): ReportTemplateItem {
  const outline = t.kind === "analysis" ? GENERIC_OUTLINE_ANALYSIS : GENERIC_OUTLINE_EXCEL;
  const sectionTitles = outline.sections
    .map((s, i) => `${["一", "二", "三"][i]}、${s.title}\n${s.children.map((c, j) => `${i + 1}.${j + 1} ${c.title}`).join("\n")}`)
    .join("\n\n");
  return {
    id: t.id,
    kind: t.kind,
    name: t.name,
    category: "上传模板",
    domain: t.domain ?? "通用",
    keywords: [t.name],
    description: `上传于 ${t.uploadedAt} 的${t.format}模板文件`,
    refFile: `样例：${t.name}.${t.format.toLowerCase()}`,
    outline,
    preview: `# ${t.name}\n\n（上传文件模板：正文按通用结构生成，内容以原文件为准）\n\n${sectionTitles}`,
    excelSheets: t.kind === "excel" ? GENERIC_EXCEL_SHEETS : undefined,
  };
}
