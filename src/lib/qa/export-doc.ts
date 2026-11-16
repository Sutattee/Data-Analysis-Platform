// 报告文档导出下载：不新增依赖，用 Blob 触发浏览器真实下载。
// Word(.docx)：见 export-docx.ts（真实 OOXML 包，原生表格/自动目录/页眉页脚）；
// PDF：纯前端无排版引擎，生成带报告文本的 .pdf 占位文件（下载动作与提示闭环，正式转换由服务端承担）。

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

// PDF 文档（.pdf 占位：正文以文本形式写入，正式排版转换由服务端完成）：filename 不带后缀
export function downloadPdfFile(filename: string, markdown: string): string {
  const text = `${filename}\n${"=".repeat(Math.min(filename.length * 2, 60))}\n\n${markdown}\n\n（本文档由产质耗KPI分析平台导出，PDF 排版转换请在正式环境接入服务端完成）`;
  triggerDownload(new Blob([text], { type: "application/pdf" }), `${filename}.pdf`);
  return `${filename}.pdf`;
}
