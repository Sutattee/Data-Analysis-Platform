// 年鉴报告导出 — 零依赖模拟实现
// Word：内联样式 HTML → application/msword Blob 下载 .doc（Word/WPS 可直接打开）
// PDF：隐藏 iframe 写入打印样式 HTML → 调起浏览器打印（另存为 PDF）
import type { YearbookReport } from "@/types";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 文件名时间戳（导出时刻）
function fileStamp(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

// 文件名周期前缀：报告年度＋报告名称＋导出日期（月度报告带「2026年8月」，生产报告带「2026年度」；能耗年鉴报告无周期字段则不带前缀）
function periodPrefix(report: YearbookReport): string {
  if (report.periodType === "月度" && report.month) return `${report.year}年${report.month}月`;
  if (report.periodType === "年度") return `${report.year}年度`;
  return "";
}

// 第一章标题（月度报告为「月度事件概览」）
function overviewTitle(report: YearbookReport): string {
  return report.periodType === "月度" ? "一、月度事件概览" : "一、年度事件概览";
}

// 报告 → 可独立打开的 HTML 文档（标题 / 元信息 / 三章正文 / 附录事件清单）
export function reportToHtml(report: YearbookReport): string {
  const paras = (text: string) =>
    text
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => `<p style="margin:8px 0;">${escapeHtml(l)}</p>`)
      .join("");
  const h2 = (title: string) =>
    `<h2 style="font-size:17px;margin:28px 0 10px;border-bottom:1px solid #d1d5db;padding-bottom:6px;">${title}</h2>`;
  const eventRows = report.includedEvents
    .map(
      (e) =>
        `<tr><td>${escapeHtml(e.id)}</td><td>${escapeHtml(e.title)}</td><td>${escapeHtml(
          e.type
        )}</td><td>${escapeHtml(e.timeLabel)}</td><td>${escapeHtml(e.duration)}</td><td>${escapeHtml(e.impact)}</td></tr>`
    )
    .join("");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(report.name)}</title>
</head>
<body style="font-family:'Microsoft YaHei','PingFang SC',SimSun,sans-serif;max-width:794px;margin:0 auto;padding:40px 32px;color:#111827;line-height:1.9;font-size:14px;">
<h1 style="text-align:center;font-size:22px;margin:0 0 12px;">${escapeHtml(report.name)}</h1>
<p style="text-align:center;color:#6b7280;font-size:13px;margin:4px 0;">报告周期：${report.periodStart} 至 ${report.periodEnd}｜纳入事件 ${report.includedEvents.length} 件｜数据截止：${report.dataCutoff}</p>
<p style="text-align:center;color:#6b7280;font-size:13px;margin:4px 0;">生成：${report.generatedAt}（${report.generatedBy}）${report.updatedAt ? `｜最近更新：${report.updatedAt}（${report.updatedBy ?? "—"}）` : ""}</p>
${h2(overviewTitle(report))}
${paras(report.sections.overview)}
${h2("二、重大事件纪要")}
${paras(report.sections.chronicle)}
${h2("三、综合分析与管理建议")}
${paras(report.sections.analysis)}
${h2("附录：纳入事件清单")}
<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:12px;">
<thead><tr style="background:#f3f4f6;"><th>事件编号</th><th>事件标题</th><th>事件类型</th><th>发生时间</th><th>持续时长</th><th>影响摘要</th></tr></thead>
<tbody>${eventRows}</tbody>
</table>
</body>
</html>`;
}

// 导出 Word（.doc）
export function exportReportWord(report: YearbookReport): void {
  // ﻿ BOM：避免中文乱码
  const blob = new Blob(["\ufeff", reportToHtml(report)], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${periodPrefix(report)}${report.name.replace(/[\\/:*?"<>|]/g, "")}_${fileStamp()}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 导出 PDF（调起打印，用户选择“另存为 PDF”）
export function exportReportPdf(report: YearbookReport): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(reportToHtml(report));
  doc.close();
  // 等待内容渲染后触发打印；打印对话框关闭后移除 iframe
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 300);
}
