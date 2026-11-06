// 问数结果导出 Excel：解析回答中的全部 markdown 结果表 → xlsx 多 Sheet 工作簿下载。
// 每张表一个 Sheet、按页面展示顺序排列、以表格标题命名；
// 导出完整查询结果（结果表无分页，始终全量行），表头保留字段名与计量单位（如「运行效率(%)」）。
import * as XLSX from "xlsx";
import type { QaMessage } from "@/types";

export interface ExportTable {
  title: string; // Sheet 名（表格标题；无标题时兜底图表标题 / 序号）
  headers: string[]; // 字段名（含计量单位）
  rows: string[][]; // 完整数据行（保持页面展示顺序）
}

// 单行是否为标题语法（### 标题 / **标题**）——仅标题语法可作 Sheet 名，避免把正文误当标题
function titleOfLine(line: string): string | null {
  const t = line.trim();
  const m = t.match(/^#{1,6}\s+(.+)$/) ?? t.match(/^\*\*(.+?)\*\*$/);
  return m ? m[1]!.trim() : null;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
}

// 解析文本中的全部 markdown 表格（表头 + 分隔行 + 连续数据行），按出现顺序返回
function parseAllTables(text: string): { title: string | null; headers: string[]; rows: string[][] }[] {
  const lines = text.split("\n");
  const tables: { title: string | null; headers: string[]; rows: string[][] }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const headerLine = lines[i]?.trim();
    const sepLine = lines[i + 1]?.trim();
    if (
      !(headerLine?.startsWith("|") && headerLine.endsWith("|") && sepLine?.startsWith("|") && sepLine.includes("-"))
    ) {
      continue;
    }
    const headers = splitRow(headerLine!);
    if (headers.length < 2) continue;
    const rows: string[][] = [];
    for (let j = i + 2; j < lines.length; j++) {
      const rowLine = lines[j]?.trim();
      if (!rowLine?.startsWith("|") || !rowLine.endsWith("|")) break;
      rows.push(splitRow(rowLine));
    }
    if (rows.length < 1) continue;
    // 向上找最近的非空行，仅当它是标题语法时作为该表的标题
    let title: string | null = null;
    for (let k = i - 1; k >= 0; k--) {
      const prev = lines[k]!.trim();
      if (!prev) continue;
      title = titleOfLine(prev);
      break;
    }
    tables.push({ title, headers, rows });
    i += rows.length + 1; // 跳过已消费的表格行
  }
  return tables;
}

/**
 * 收集一条回答中可导出的结果表（页面展示顺序）：
 * 结构化回答取「查询结果」段（queryResult），普通回答取正文（如图表修改指令的回复）。
 */
export function collectMessageTables(message: QaMessage): ExportTable[] {
  const source = message.smartAnswer?.queryResult ?? message.content;
  const parsed = parseAllTables(source);
  return parsed.map((t, i) => {
    // 标题兜底：单表时用图表标题（案例标题），多表或无标题时按序号命名
    const fallback = t.title ?? (parsed.length === 1 ? message.chartMeta?.title : undefined);
    return {
      title: fallback || `查询结果${i + 1}`,
      headers: t.headers,
      rows: t.rows,
    };
  });
}

// Excel Sheet 名限制：≤31 字符、不含 : \ / ? * [ ]，且工作簿内不可重名
function sheetNameOf(raw: string, used: Set<string>, index: number): string {
  let name = raw.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31);
  if (!name) name = `Sheet${index + 1}`;
  let final = name;
  let n = 2;
  while (used.has(final)) {
    const suffix = `-${n}`;
    final = name.slice(0, 31 - suffix.length) + suffix;
    n++;
  }
  used.add(final);
  return final;
}

// 显示宽度（中文等全角字符按 2 计），用于 Sheet 列宽自适应
function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 255 ? 2 : 1;
  return w;
}

/**
 * 导出为 .xlsx 并触发浏览器下载：每表一个 Sheet（首行为表头），列宽按内容自适应。
 * exactName 传入时直接作为文件名（导出报表弹窗自定义文件名），否则按「问数结果_时间戳」命名。
 * 返回 Promise，失败由调用方捕获提示。
 */
export async function exportTablesToExcel(tables: ExportTable[], fileTitle?: string, exactName?: string): Promise<void> {
  // 先让出主线程，确保「导出中」状态先渲染出来
  await new Promise((resolve) => setTimeout(resolve, 0));

  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  tables.forEach((t, i) => {
    const ws = XLSX.utils.aoa_to_sheet([t.headers, ...t.rows]);
    // 列宽自适应：取表头与数据行的最大显示宽度（8~50 限幅）
    ws["!cols"] = t.headers.map((h, ci) => {
      const w = [t.headers[ci] ?? "", ...t.rows.map((r) => r[ci] ?? "")].reduce(
        (max, cell) => Math.max(max, displayWidth(cell)),
        0,
      );
      return { wch: Math.min(50, Math.max(8, w + 2)) };
    });
    XLSX.utils.book_append_sheet(wb, ws, sheetNameOf(t.title, used, i));
  });

  const now = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = exactName
    ? `${exactName.trim().replace(/\.xlsx$/i, "").slice(0, 60) || "报表"}.xlsx`
    : `${fileTitle ? fileTitle.slice(0, 40) + "_" : ""}问数结果_${stamp}.xlsx`;
  // await 确保（异步实现下的）写出失败能传导到调用方 catch，供失败提示与重试
  await XLSX.writeFile(wb, filename);
}
