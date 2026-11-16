// 报告导出为真实 Word(.docx)：零依赖手写 OOXML 包（STORE 方式 zip + 最小文档结构），
// 不引入 docx/packer 类库。覆盖报告正文的 markdown 子集：
//   标题（# ~ #### → Title/Heading1-3）、段落、有序列表、**粗体**、引用行（统计范围头）、markdown 表格。
// 排版要素（按产品规则）：正文标题/段落/列表排版、表格转 Word 原生表格（核心指标格式化表格同源）、
// 标题后插入 Word 自动目录域（TOC，dirty 打开时自动更新）、页眉（平台名 · 报告名）与页脚（第 X 页/共 Y 页）。
// 自包含无导入，便于独立验证（node 直接运行生成文件后 unzip/textutil 校验）。

// ---------- zip（仅 STORE，不压缩）----------

// CRC32 标准查表
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// DOS 时间戳（秒/分/时 与 日/月/年 各占位打包）
function dosDateTime(d: Date): { time: number; date: number } {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

// 多文件 → zip 字节（每项 STORE 存储：本地头 + 数据，末尾中央目录 + EOCD）
function buildZip(entries: { name: string; data: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const { time, date } = dosDateTime(new Date());
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const crc = crc32(e.data);

    // 本地文件头（30 字节定长 + 文件名）
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // 签名
    lv.setUint16(4, 20, true); // 解压所需版本
    lv.setUint16(6, 0, true); // 通用标志位
    lv.setUint16(8, 0, true); // 压缩方式：STORE
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, e.data.length, true); // 压缩后大小
    lv.setUint32(22, e.data.length, true); // 压缩前大小
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // 扩展字段长度
    local.set(nameBytes, 30);
    locals.push(local, e.data);

    // 中央目录项（46 字节定长 + 文件名）
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // 签名
    cv.setUint16(4, 20, true); // 制作版本
    cv.setUint16(6, 20, true); // 解压所需版本
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, e.data.length, true);
    cv.setUint32(24, e.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    // 30/32/34：扩展字段、注释、盘号均为 0
    cv.setUint32(42, offset, true); // 本地头偏移
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length + e.data.length;
  }

  const centralDir = centrals.reduce((acc, c) => {
    acc.push(c);
    return acc;
  }, [] as Uint8Array[]);
  const centralSize = centralDir.reduce((n, c) => n + c.length, 0);

  // EOCD（22 字节定长）
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true); // 本盘条目数
  ev.setUint16(10, entries.length, true); // 总条目数
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true); // 中央目录偏移

  const total = offset + centralSize + 22;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const part of [...locals, ...centralDir, eocd]) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

// ---------- OOXML 部件 ----------

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// 段落文本 run：**粗体** 拆分为普通/加粗 run 序列
function runsOf(text: string, extra = ""): string {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts
    .map((p) => {
      const m = p.match(/^\*\*([^*]+)\*\*$/);
      const rPr = m ? `<w:rPr><w:b/>${extra}</w:rPr>` : extra ? `<w:rPr>${extra}</w:rPr>` : "";
      return `<w:r>${rPr}<w:t xml:space="preserve">${esc(m ? m[1] : p)}</w:t></w:r>`;
    })
    .join("");
}

function paragraph(text: string, style?: string, rPr = ""): string {
  const pPr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${pPr}${runsOf(text, rPr)}</w:p>`;
}

// Word 原生表格：表级边框 + 表头行灰底加粗（首行）+ 单元格自动宽度自适应由 Word 承担
function table(headers: string[], rows: string[][]): string {
  const borders =
    '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="999999"/><w:left w:val="single" w:sz="4" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:color="999999"/><w:right w:val="single" w:sz="4" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/></w:tblBorders>';
  const cell = (text: string, header: boolean) =>
    `<w:tc><w:tcPr>${header ? '<w:shd w:val="clear" w:fill="F2F2F2"/>' : ""}</w:tcPr><w:p>${runsOf(text, header ? '<w:b/>' : "")}</w:p></w:tc>`;
  const headRow = `<w:tr>${headers.map((h) => cell(h, true)).join("")}</w:tr>`;
  const bodyRows = rows.map((r) => `<w:tr>${headers.map((_, i) => cell(r[i] ?? "", false)).join("")}</w:tr>`).join("");
  return `<w:tbl><w:tblPr>${borders}</w:tblPr>${headRow}${bodyRows}</w:tbl>`;
}

// 目录：标题段（不入大纲层级）+ TOC 域（dirty=true，Word 打开时自动更新生成）
function tocBlock(): string {
  const heading = `<w:p><w:pPr><w:spacing w:before="240" w:after="120"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>目 录</w:t></w:r></w:p>`;
  const field = `<w:p><w:fldSimple w:instr=" TOC \\o &quot;1-2&quot; \\h \\z \\u " w:dirty="true"><w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">打开文档后目录将自动更新；如未显示，请全选（Ctrl/Cmd+A）后按 F9 刷新域。</w:t></w:r></w:fldSimple></w:p>`;
  return heading + field;
}

// markdown 表格行拆分（与 export-excel 同规则：| 分隔，去首尾空列）
function splitRow(line: string): string[] {
  return line.trim().split("|").slice(1, -1).map((c) => c.trim());
}

/**
 * markdown → Word(.docx) 字节：标题/段落/列表/粗体/引用/表格 → OOXML 排版，
 * 自动插入目录域与页眉页脚。filename 仅用于页眉展示（不含扩展名）。
 */
export function buildDocxBytes(title: string, markdown: string): Uint8Array<ArrayBuffer> {
  const lines = markdown.split("\n");
  const body: string[] = [];
  let sawTitle = false;
  let tableBuffer: string[] = [];

  // 连续表格行 → 原生表格；不构成合法表格（无表头/分隔行）时降级为普通段落
  const flushTable = () => {
    if (!tableBuffer.length) return;
    const headers = splitRow(tableBuffer[0]);
    const rows = tableBuffer.slice(2).map(splitRow);
    if (headers.length >= 2 && rows.length) body.push(table(headers, rows));
    else body.push(...tableBuffer.map((l) => paragraph(l.replace(/\|/g, " "))));
    tableBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    // 连续表格行先入缓冲，遇非表格行时统一落盘
    if (line.trim().startsWith("|")) {
      tableBuffer.push(line);
      continue;
    }
    flushTable();

    if (!line.trim()) continue;
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      if (level === 1 && !sawTitle) {
        // 首个一级标题 = 报告题名（居中大字号），其后插入自动目录
        sawTitle = true;
        body.push(paragraph(text, "Title"));
        body.push(tocBlock());
      } else {
        // ## → Heading1、### → Heading2、#### → Heading3（Word 大纲层级，供自动目录收录）
        body.push(paragraph(text, `Heading${Math.min(level, 4) - 1}`));
      }
      continue;
    }
    if (line.startsWith("> ")) {
      // 引用行（统计范围头）：灰色小字 + 左缩进
      body.push(`<w:p><w:pPr><w:ind w:left="240"/></w:pPr>${runsOf(line.slice(2), '<w:color w:val="808080"/><w:sz w:val="18"/>')}</w:p>`);
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      // 有序列表：保留编号文本 + 悬挂缩进（Word 中呈列表排版）
      body.push(`<w:p><w:pPr><w:ind w:left="480" w:hanging="360"/></w:pPr>${runsOf(line)}</w:p>`);
      continue;
    }
    body.push(paragraph(line));
  }
  // 文末表格收尾
  flushTable();

  const sect =
    `<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/>` +
    `<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;

  const document =
    XML_DECL +
    `<w:document ${W_NS}><w:body>${body.join("")}${sect}</w:body></w:document>`;

  const styles =
    XML_DECL +
    `<w:styles ${W_NS}>` +
    `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="DengXian"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:spacing w:after="360"/></w:pPr><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/><w:spacing w:before="320" w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="2"/><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>` +
    `</w:styles>`;

  const header =
    XML_DECL +
    `<w:hdr ${W_NS}><w:p><w:pPr><w:jc w:val="center"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="CCCCCC"/></w:pBdr></w:pPr><w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${esc(`智能分析平台 · ${title}`)}</w:t></w:r></w:p></w:hdr>`;

  const footer =
    XML_DECL +
    `<w:ftr ${W_NS}><w:p><w:pPr><w:jc w:val="center"/></w:pPr>` +
    `<w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">第 </w:t></w:r>` +
    `<w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple>` +
    `<w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve"> 页 / 共 </w:t></w:r>` +
    `<w:fldSimple w:instr=" NUMPAGES "><w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple>` +
    `<w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve"> 页</w:t></w:r>` +
    `</w:p></w:ftr>`;

  const contentTypes =
    XML_DECL +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
    `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>` +
    `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>` +
    `</Types>`;

  const rootRels =
    XML_DECL +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`;

  const docRels =
    XML_DECL +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>` +
    `</Relationships>`;

  const enc = new TextEncoder();
  return buildZip([
    { name: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { name: "_rels/.rels", data: enc.encode(rootRels) },
    { name: "word/document.xml", data: enc.encode(document) },
    { name: "word/styles.xml", data: enc.encode(styles) },
    { name: "word/header1.xml", data: enc.encode(header) },
    { name: "word/footer1.xml", data: enc.encode(footer) },
    { name: "word/_rels/document.xml.rels", data: enc.encode(docRels) },
  ]);
}

// ---------- 浏览器下载 ----------

function triggerDownload(bytes: Uint8Array<ArrayBuffer>, filename: string): void {
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 文件名清理：去掉路径分隔与 Windows 保留字符
function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, " ").trim().slice(0, 80) || "报告";
}

/**
 * 报告下载为 .docx：filename 不带扩展名，返回实际下载文件名（含 .docx）。
 * 系统默认 Word 格式（.docx）；PDF 仍走 export-doc 的占位导出。
 */
export function downloadDocxFile(filename: string, markdown: string): string {
  const base = safeName(filename);
  const bytes = buildDocxBytes(base, markdown);
  triggerDownload(bytes, `${base}.docx`);
  return `${base}.docx`;
}
