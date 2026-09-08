import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const inputPath = join(process.cwd(), "docs", "产品帮助文档.txt");
const outputPath = join(process.cwd(), "docs", "什邡卷烟厂产质耗KPI分析平台产品帮助文档.docx");
const tempHtmlPath = join(process.cwd(), "docs", ".产品帮助文档-word-export.html");

const dividerPattern = /^\s*[=-]{3,}\s*$/;
const raw = readFileSync(inputPath, "utf8").replace(/\r\n/g, "\n");
const cleanedLines = raw.split("\n").filter((line) => !dividerPattern.test(line));

// 同步清理TXT源文件中的单分割线和双分割线。
writeFileSync(inputPath, cleanedLines.join("\n"), "utf8");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function compact(value) {
  return value.replace(/[ \t]+/g, " ").trim();
}

function classifyBodyLine(line) {
  const trimmed = line.trim();
  if (/^\d+\.\d+\.\d+\s+/.test(trimmed)) return "h3";
  if (/^\d+\.\d+\s+/.test(trimmed) || /^附录[A-E]\s+/.test(trimmed)) return "h2";
  if (/^\d+\s+[^.]/.test(trimmed) || trimmed === "附录") return "h1";
  if (/^·\s*/.test(trimmed)) return "bullet";
  if (/^\d+\.\s+/.test(trimmed)) return "number";
  if (/^(问|答)：/.test(trimmed)) return "faq";
  if (/^(作用|入口|操作步骤|注意事项|说明|示例|页面组成|页面结构|触发方式|回答结构|提问技巧|查询与筛选|列表字段|常用操作|操作要点|新建数据告警|事件形成方式|可维护信息与规则)：?$/.test(trimmed)) return "label";
  return "text";
}

const htmlParts = [];
let inToc = false;
let bodyStarted = false;
let chapterOneCount = 0;
let buffer = null;

function flushBuffer() {
  if (!buffer) return;
  // TXT源文件采用固定列宽换行；续行直接拼接，避免中文词语之间产生空格。
  const text = compact(buffer.lines.join(""));
  if (!text) {
    buffer = null;
    return;
  }
  const escaped = escapeHtml(text);
  if (buffer.type === "bullet") {
    htmlParts.push(`<p class="list bullet">${escaped}</p>`);
  } else if (buffer.type === "number") {
    htmlParts.push(`<p class="list number">${escaped}</p>`);
  } else if (buffer.type === "faq") {
    htmlParts.push(`<p class="faq">${escaped}</p>`);
  } else if (buffer.type === "label") {
    htmlParts.push(`<p class="label">${escaped}</p>`);
  } else {
    htmlParts.push(`<p>${escaped}</p>`);
  }
  buffer = null;
}

for (let index = 0; index < cleanedLines.length; index += 1) {
  const original = cleanedLines[index];
  const trimmed = original.trim();

  if (index === 1 || trimmed === "什邡卷烟厂产质耗KPI分析平台 · 产品帮助文档") {
    flushBuffer();
    htmlParts.push(`<div class="cover-title">${escapeHtml(trimmed)}</div>`);
    continue;
  }

  if (/^目\s*录$/.test(trimmed)) {
    flushBuffer();
    inToc = true;
    htmlParts.push('<div class="page-break"></div><div class="toc-title">目录</div>');
    continue;
  }

  if (!bodyStarted && /^1\s+文档说明$/.test(trimmed)) {
    chapterOneCount += 1;
    if (chapterOneCount === 2) {
      inToc = false;
      bodyStarted = true;
    }
  }

  if (inToc) {
    if (!trimmed) continue;
    const indent = original.length - original.trimStart().length;
    let level = 1;
    if (indent >= 6 || /^\d+\.\d+\.\d+/.test(trimmed)) level = 3;
    else if (indent >= 3 || /^\d+\.\d+/.test(trimmed) || /^附录[A-E]/.test(trimmed)) level = 2;
    htmlParts.push(`<div class="toc-level-${level}">${escapeHtml(trimmed)}</div>`);
    continue;
  }

  if (!bodyStarted) {
    if (!trimmed) continue;
    if (/^(产品名称|文档版本|发布日期|适用对象)：/.test(trimmed)) {
      htmlParts.push(`<div class="cover-meta">${escapeHtml(trimmed)}</div>`);
    }
    continue;
  }

  if (!trimmed) {
    flushBuffer();
    continue;
  }

  const type = classifyBodyLine(original);
  if (type === "h1" || type === "h2" || type === "h3") {
    flushBuffer();
    const className = type === "h1" ? ' class="chapter-heading"' : "";
    htmlParts.push(`<${type}${className}>${escapeHtml(trimmed)}</${type}>`);
    continue;
  }

  // 新列表项、问答项及短标签总是另起一段；普通换行则合并为完整段落。
  if (["bullet", "number", "faq", "label"].includes(type)) {
    flushBuffer();
    buffer = { type, lines: [trimmed] };
    continue;
  }

  if (!buffer) buffer = { type: "text", lines: [trimmed] };
  else buffer.lines.push(trimmed);
}
flushBuffer();

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>什邡卷烟厂产质耗KPI分析平台产品帮助文档</title>
<style>
  @page { size: A4; margin: 2.54cm 2.6cm 2.54cm 2.6cm; }
  body {
    font-family: "Songti SC", "SimSun", "宋体", serif;
    /* textutil 会按 4/3 放大 HTML pt；以下值折算后在 Word 中为 10.5 磅。 */
    font-size: 7.875pt;
    line-height: 1.65;
    color: #222;
  }
  .cover-title {
    font-family: "Heiti SC", "SimHei", "黑体", sans-serif;
    font-size: 16.5pt;
    font-weight: 700;
    text-align: center;
    margin-top: 150pt;
    margin-bottom: 48pt;
  }
  .cover-meta {
    width: 72%;
    margin: 0 auto 10pt auto;
    font-size: 8.25pt;
    line-height: 1.6;
  }
  .page-break { page-break-before: always; }
  .toc-title {
    font-family: "Heiti SC", "SimHei", "黑体", sans-serif;
    font-size: 13.5pt;
    font-weight: 700;
    text-align: center;
    margin: 18pt 0 24pt 0;
  }
  .toc-level-1 { font-size: 8.625pt; font-weight: 700; margin: 7pt 0 2pt 0; }
  .toc-level-2 { font-size: 7.875pt; margin: 2pt 0 2pt 20pt; }
  .toc-level-3 { font-size: 7.5pt; margin: 1pt 0 1pt 40pt; color: #444; }
  h1 {
    font-family: "Heiti SC", "SimHei", "黑体", sans-serif;
    font-size: 12pt;
    font-weight: 700;
    margin: 20pt 0 12pt 0;
    line-height: 1.35;
    page-break-after: avoid;
  }
  h1.chapter-heading { page-break-before: always; }
  h2 {
    font-family: "Heiti SC", "SimHei", "黑体", sans-serif;
    font-size: 10.5pt;
    font-weight: 700;
    margin: 16pt 0 8pt 0;
    line-height: 1.4;
    page-break-after: avoid;
  }
  h3 {
    font-family: "PingFang SC", "Microsoft YaHei", "微软雅黑", sans-serif;
    font-size: 9pt;
    font-weight: 700;
    margin: 12pt 0 6pt 0;
    line-height: 1.45;
    page-break-after: avoid;
  }
  p {
    margin: 0 0 6pt 0;
    text-indent: 2em;
    text-align: justify;
    orphans: 2;
    widows: 2;
  }
  p.list { text-indent: 0; margin-left: 2em; }
  p.number { margin-left: 1.6em; }
  p.faq { text-indent: 0; margin: 4pt 0; }
  p.label {
    text-indent: 0;
    font-family: "PingFang SC", "Microsoft YaHei", "微软雅黑", sans-serif;
    font-weight: 700;
    margin: 7pt 0 4pt 0;
  }
</style>
</head>
<body>${htmlParts.join("\n")}</body>
</html>`;

writeFileSync(tempHtmlPath, html, "utf8");
try {
  execFileSync("/usr/bin/textutil", ["-convert", "docx", "-output", outputPath, tempHtmlPath], {
    stdio: "inherit",
  });
} finally {
  unlinkSync(tempHtmlPath);
}

process.stdout.write(`${outputPath}\n`);
