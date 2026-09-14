// 业务构成 — 预算指标的业务项填报数据（纯前端模拟）
// 数据处理规则：
//  · 每个预算指标由若干「业务项」构成，每个业务项填写 12 个月的预算计划（万）
//  · 未填报过的指标按确定性规则生成默认业务项（打开填报弹窗即有合规内容）
//  · 默认内容保证：全部业务项 12 个月计划合计 精确 == 业务预算批复数（尾差修正到最后一个月）
//  · 填报内容持久化 localStorage，按指标编码独立保存
import { BASE_MONTH_SHAPE } from "./expense-overview";
import type { ExpenseIndicator } from "./expense-indicators";

// 一个业务项填报行：名称 + 12 个月预算计划（万）
export interface BizRow {
  id: string;        // 行标识（新增行用自增序号）
  name: string;      // 业务项名称（≤20 字）
  months: number[];  // 1-12 月预算计划
}

// localStorage key（按指标 id 独立）
const keyOf = (indicatorId: string) => `expense_biz_comp_${indicatorId}`;

// 数值四舍五入（d 位小数）
function round(v: number, d = 0): number {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

// 字符串哈希（确定性扰动源，与 expense-indicators 保持同构）
function hash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// 业务项名称池（按指标哈希取不重名的 1-2 项）
const BIZ_NAMES = ["日常支出", "专项支出", "维护支出", "耗材采购", "外协服务", "其他业务支出"];

// 默认业务项：1-2 行（哈希决定），月度计划按全年形状拆分自批复数，尾差修正保证合计精确相等
export function defaultBizRows(ind: ExpenseIndicator): BizRow[] {
  const h = hash(ind.id);
  const rowCount = h % 10 < 6 ? 2 : 1;
  const first = h % BIZ_NAMES.length;
  const names = Array.from({ length: rowCount }, (_, i) => BIZ_NAMES[(first + i * 2) % BIZ_NAMES.length]);

  // 行占比：1 行时 100%；2 行时 55/45 附近哈希扰动 ±8pct
  const ratios =
    rowCount === 1
      ? [1]
      : (() => {
          const a = 0.55 + ((h % 17) - 8) / 100;
          return [a, round(1 - a, 2)];
        })();

  const rows = names.map((name, r) => ({
    id: `b${r}`,
    name,
    months: BASE_MONTH_SHAPE.map((w) => round(ind.budget * ratios[r] * w, 1)),
  }));

  // 尾差修正：全部行全部月合计 == 批复数（差额计入最后一行 12 月）
  const total = rows.reduce((s, row) => s + row.months.reduce((a, b) => a + b, 0), 0);
  rows[rows.length - 1].months[11] = round(rows[rows.length - 1].months[11] + ind.budget - total, 4);
  return rows;
}

// 读取已保存的填报内容（未保存过返回 null，由调用方回退到默认内容）
export function loadBizRows(indicatorId: string): BizRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyOf(indicatorId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BizRow[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// 保存填报内容
export function saveBizRows(indicatorId: string, rows: BizRow[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyOf(indicatorId), JSON.stringify(rows));
}

// 指标的当前业务项（已保存优先，否则默认生成）— 填报弹窗与导出共用
export function bizRowsOf(ind: ExpenseIndicator): BizRow[] {
  return loadBizRows(ind.id) ?? defaultBizRows(ind);
}

// 全部业务项 12 个月计划合计
export function sumBizRows(rows: BizRow[]): number {
  return rows.reduce((s, row) => s + row.months.reduce((a, b) => a + b, 0), 0);
}

/* ---------------- 填报功能开关（超级管理员控制，全局持久化） ---------------- */

// 该板块每年仅一定期限内开放填报；超级管理员在业务构成页右上角切换，关闭后部门管理员操作列仅「查看」
const BIZ_FILING_KEY = "expense_biz_filing_enabled";

export function isBizFilingEnabled(): boolean {
  if (typeof window === "undefined") return true; // SSR 缺省开启
  return window.localStorage.getItem(BIZ_FILING_KEY) !== "0";
}

export function setBizFilingEnabled(v: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BIZ_FILING_KEY, v ? "1" : "0");
}
