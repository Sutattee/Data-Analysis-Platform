// 报告文档导出下载：不新增依赖，用 Blob 触发浏览器真实下载。
// Word：正文以 HTML 包装为 .doc（Word/WPS 可直接打开编辑）；
// PDF：纯前端无排版引擎，生成带报告文本的 .pdf 占位文件（下载动作与提示闭环，正式转换由服务端承担）。
import { parseMarkdownTable } from "./parse-table";

// 简易 markdown → HTML：标题/列表/粗体/引用/表格（报告正文足够覆盖）
function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let tableBuffer: string[] = [];

  const flushList = () => {
    if (inList) { out.push("</ol>"); inList = false; }
  };
  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const table = parseMarkdownTable(tableBuffer.join("\n"));
    if (table) {
      out.push(
        "<table border='1' cellspacing='0' cellpadding='6' style='border-collapse:collapse'>" +
        "<tr>" + table.headers.map((h) => `<th style='background:#f3f4f6;text-align:left'>${h}</th>`).join("") + "</tr>" +
        table.rows.map((r) => "<tr>" + r.map((c) => `<td>${c}</td>`).join("") + "</tr>").join("") +
        "</table>"
      );
    } else {
      out.push(...tableBuffer.map((l) => `<p>${l}</p>`));
    }
    tableBuffer = [];
  };
  const inline = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim().startsWith("|")) { flushList(); tableBuffer.push(line); continue; }
    flushTable();
    if (!line.trim()) { flushList(); continue; }
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (!inList) { out.push("<ol>"); inList = true; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    flushList();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const level = Math.min(h[1].length + 1, 5); out.push(`<h${level}>${inline(h[2])}</h${level}>`); continue; }
    if (line.startsWith("> ")) { out.push(`<p style='color:#555'>${inline(line.slice(2))}</p>`); continue; }
    out.push(`<p>${inline(line)}</p>`);
  }
  flushList();
  flushTable();
  return out.join("\n");
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Word 文档（.doc，HTML 包装）：filename 不带后缀
export function downloadDocFile(filename: string, markdown: string): string {
  const html = `<html><head><meta charset="utf-8"><title>${filename}</title></head><body style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.8;max-width:760px">${markdownToHtml(markdown)}</body></html>`;
  triggerDownload(new Blob(["﻿", html], { type: "application/msword" }), `${filename}.doc`);
  return `${filename}.doc`;
}

// PDF 文档（.pdf 占位：正文以文本形式写入，正式排版转换由服务端完成）：filename 不带后缀
export function downloadPdfFile(filename: string, markdown: string): string {
  const text = `${filename}\n${"=".repeat(Math.min(filename.length * 2, 60))}\n\n${markdown}\n\n（本文档由产质耗KPI分析平台导出，PDF 排版转换请在正式环境接入服务端完成）`;
  triggerDownload(new Blob([text], { type: "application/pdf" }), `${filename}.pdf`);
  return `${filename}.pdf`;
}
