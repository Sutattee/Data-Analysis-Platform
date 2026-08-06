// 解析 markdown 表格为 { headers, rows }
// 供 ChartRenderer（绘制图表）与 ResultTable（渲染表格）复用
export function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const headerLine = lines[i]?.trim();
    const sepLine = lines[i + 1]?.trim();
    if (
      headerLine?.startsWith("|") &&
      headerLine.endsWith("|") &&
      sepLine?.startsWith("|") &&
      sepLine.includes("-")
    ) {
      const headers = headerLine
        .split("|")
        .slice(1, -1)
        .map((h) => h.trim());
      const rows: string[][] = [];
      for (let j = i + 2; j < lines.length; j++) {
        const rowLine = lines[j]?.trim();
        if (!rowLine?.startsWith("|") || !rowLine.endsWith("|")) break;
        rows.push(
          rowLine
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
        );
      }
      if (headers.length >= 2 && rows.length >= 1) {
        return { headers, rows };
      }
    }
  }
  return null;
}
