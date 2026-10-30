import type {
  ControlChangeLog,
  ControlDir,
  ControlMetricDef,
  MetricControlConfig,
} from "@/types";

/**
 * 管控值管理 —— 模拟数据 + 会话级 store（刷新还原）。
 * 指标值管理「管控值」页签：统一维护各指标管控值。
 * 业务规则：
 * 1. 每个指标仅保留一条配置，已停用配置仍占用指标、不可重复新增；
 * 2. 判断方向统一表示在控条件（between 含上下边界：下限 ≤ 实际值 ≤ 上限）；
 * 3. 启停独立开关，切换立即生效；停用后相关页面展示「管控值未启用」，未配置展示「管控值未配置」；
 * 4. 新增 / 修改 / 启用 / 停用自动记录变更（时间、操作人、类型、前后内容），按时间倒序追溯；
 * 5. 已停用配置修改后仍保持停用（编辑不自动恢复启用）。
 */

// 判断方向展示（全角符号）
export const DIR_LABEL: Record<ControlDir, string> = {
  "<": "＜",
  "≤": "≤",
  ">": "＞",
  "≥": "≥",
  "=": "＝",
  between: "处于允许区间",
};

// 表单判断方向选项（顺序与 PRD 一致）
export const DIR_OPTIONS: ControlDir[] = ["<", "≤", ">", "≥", "=", "between"];

// 管控指标目录（预置 16 项；默认方向：水分允许范围 between / 优质品率 ≥ / 偏差·次数·时长 ≤）
const CATALOG: ControlMetricDef[] = [
  { id: "cm-001", name: "松散回潮非稳态指数", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "≤" },
  { id: "cm-002", name: "成品水分标准偏差", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "≤" },
  { id: "cm-003", name: "烘丝工序非稳态指数", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "≤" },
  { id: "cm-004", name: "烘丝机出口水分偏差", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "between" },
  { id: "cm-005", name: "加香出口水分不达标次数", unit: "次", decimals: 0, valueKind: "count", defaultDir: "≤" },
  { id: "cm-006", name: "烟支单支克重偏差(毫克)", unit: "mg", decimals: 1, valueKind: "duration", defaultDir: "≤" },
  { id: "cm-007", name: "非细支单支重量偏差", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "≤" },
  { id: "cm-008", name: "常规烟支硬度变异系数", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "≤" },
  { id: "cm-009", name: "中支烟硬度变异系数", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "≤" },
  { id: "cm-010", name: "包装与卷制质量检验加权平均值", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "≥" },
  { id: "cm-011", name: "优质品率（成品）", unit: "%", decimals: 1, valueKind: "percent", defaultDir: "≥" },
  { id: "cm-012", name: "优质品率（制丝）", unit: "%", decimals: 1, valueKind: "percent", defaultDir: "≥" },
  { id: "cm-013", name: "烘丝机出口水分", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "between" },
  { id: "cm-014", name: "加香出口水分", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "between" },
  { id: "cm-015", name: "成品水分", unit: "%", decimals: 2, valueKind: "percent", defaultDir: "between" },
  { id: "cm-016", name: "箱储总存储时长", unit: "h", decimals: 1, valueKind: "duration", defaultDir: "≤" },
];

// 目录查询
export function controlMetricCatalog(): ControlMetricDef[] {
  return CATALOG;
}

export function controlMetricOf(id: string): ControlMetricDef | undefined {
  return CATALOG.find((m) => m.id === id);
}

// 管控条件合并展示："≤2.00%" / "12.50%～13.50%" / "≥98.00%"（按指标精度格式化）
export function controlText(c: {
  dir: ControlDir;
  value?: number;
  low?: number;
  high?: number;
  decimals: number;
  unit: string;
}): string {
  const fmt = (n: number) => n.toFixed(c.decimals);
  if (c.dir === "between") {
    return `${fmt(c.low ?? 0)}～${fmt(c.high ?? 0)}${c.unit}`;
  }
  return `${DIR_LABEL[c.dir]}${fmt(c.value ?? 0)}${c.unit}`;
}

// 配置完整摘要（变更记录前后内容用）：条件 + 启停状态
export function controlSummary(c: MetricControlConfig): string {
  const def = controlMetricOf(c.metricId);
  const text = controlText({ ...c, decimals: def?.decimals ?? 2, unit: c.unit });
  return `${text}（${c.enabled ? "启用" : "停用"}）`;
}

// 预置配置（含启停混合；烘丝工序非稳态指数 / 常规烟支硬度变异系数 / 包装与卷制质量检验加权平均值 / 成品水分未配置，留作新增演示）
let configs: MetricControlConfig[] = [
  { id: "mc-001", metricId: "cm-002", metricName: "成品水分标准偏差", unit: "%", dir: "≤", value: 1.55, enabled: true, updatedBy: "苏恒", updatedAt: "2026-10-18 09:30" },
  { id: "mc-002", metricId: "cm-001", metricName: "松散回潮非稳态指数", unit: "%", dir: "≤", value: 4.0, enabled: true, updatedBy: "李工", updatedAt: "2026-10-12 14:20" },
  { id: "mc-003", metricId: "cm-004", metricName: "烘丝机出口水分偏差", unit: "%", dir: "between", low: 12.5, high: 13.5, enabled: true, updatedBy: "苏恒", updatedAt: "2026-10-20 10:10" },
  { id: "mc-004", metricId: "cm-005", metricName: "加香出口水分不达标次数", unit: "次", dir: "≤", value: 3, enabled: true, updatedBy: "王五", updatedAt: "2026-10-15 09:50" },
  { id: "mc-005", metricId: "cm-006", metricName: "烟支单支克重偏差(毫克)", unit: "mg", dir: "≤", value: 40, enabled: true, updatedBy: "苏恒", updatedAt: "2026-10-21 10:40" },
  { id: "mc-006", metricId: "cm-007", metricName: "非细支单支重量偏差", unit: "%", dir: "≤", value: 3.2, enabled: true, updatedBy: "李工", updatedAt: "2026-09-28 16:40" },
  { id: "mc-007", metricId: "cm-009", metricName: "中支烟硬度变异系数", unit: "%", dir: "≤", value: 1.5, enabled: false, updatedBy: "苏恒", updatedAt: "2026-10-25 14:35" },
  { id: "mc-008", metricId: "cm-011", metricName: "优质品率（成品）", unit: "%", dir: "≥", value: 96, enabled: true, updatedBy: "苏恒", updatedAt: "2026-10-10 15:30" },
  { id: "mc-009", metricId: "cm-012", metricName: "优质品率（制丝）", unit: "%", dir: "≥", value: 98, enabled: false, updatedBy: "李工", updatedAt: "2026-10-24 09:15" },
  { id: "mc-010", metricId: "cm-013", metricName: "烘丝机出口水分", unit: "%", dir: "between", low: 12.5, high: 13.5, enabled: true, updatedBy: "李工", updatedAt: "2026-09-15 10:00" },
  { id: "mc-011", metricId: "cm-014", metricName: "加香出口水分", unit: "%", dir: "between", low: 12.0, high: 13.0, enabled: true, updatedBy: "李工", updatedAt: "2026-09-15 10:05" },
  { id: "mc-012", metricId: "cm-016", metricName: "箱储总存储时长", unit: "h", dir: "≤", value: 72, enabled: true, updatedBy: "苏恒", updatedAt: "2026-10-22 11:05" },
];

// 新建 id 序列（确定性递增）
let nextCfgSeq = 12;
function nextConfigId(): string {
  nextCfgSeq += 1;
  return `mc-${String(nextCfgSeq).padStart(3, "0")}`;
}
let nextLogSeq = 0;
function nextLogId(): string {
  nextLogSeq += 1;
  return `cl-${String(nextLogSeq).padStart(3, "0")}`;
}

// 变更记录（种子：代表性历史，时间倒序由查询函数保证）
let changeLogs: ControlChangeLog[] = [
  { id: "cl-001", controlId: "mc-010", type: "新增", before: "—", after: "12.50%～13.50%（启用）", by: "李工", at: "2026-09-15 10:00" },
  { id: "cl-002", controlId: "mc-011", type: "新增", before: "—", after: "12.00%～13.00%（启用）", by: "李工", at: "2026-09-15 10:05" },
  { id: "cl-003", controlId: "mc-001", type: "新增", before: "—", after: "≤1.45%（启用）", by: "王五", at: "2026-09-18 14:30" },
  { id: "cl-004", controlId: "mc-001", type: "修改", before: "≤1.45%（启用）", after: "≤1.55%（启用）", by: "苏恒", at: "2026-10-18 09:30" },
  { id: "cl-005", controlId: "mc-009", type: "新增", before: "—", after: "≥98.0%（启用）", by: "李工", at: "2026-09-22 09:40" },
  { id: "cl-006", controlId: "mc-009", type: "停用", before: "≥98.0%（启用）", after: "≥98.0%（停用）", by: "李工", at: "2026-10-24 09:15" },
  { id: "cl-007", controlId: "mc-012", type: "新增", before: "—", after: "≤72.0h（启用）", by: "苏恒", at: "2026-10-22 11:05" },
  { id: "cl-008", controlId: "mc-007", type: "新增", before: "—", after: "≤1.40%（启用）", by: "王五", at: "2026-09-26 15:20" },
  { id: "cl-009", controlId: "mc-007", type: "修改", before: "≤1.40%（启用）", after: "≤1.50%（启用）", by: "苏恒", at: "2026-10-25 14:30" },
  { id: "cl-010", controlId: "mc-007", type: "停用", before: "≤1.50%（启用）", after: "≤1.50%（停用）", by: "苏恒", at: "2026-10-25 14:35" },
];

// 列表查询：指标名称关键词 / 启停状态筛选，按最近更新时间倒序
export function listControlConfigs(
  f?: { nameKw?: string; enabled?: boolean }
): MetricControlConfig[] {
  const kw = (f?.nameKw ?? "").trim().toLowerCase();
  return configs
    .filter((c) => {
      if (f?.enabled !== undefined && c.enabled !== f.enabled) return false;
      if (kw && !c.metricName.toLowerCase().includes(kw)) return false;
      return true;
    })
    .sort((a, b) => (b.updatedAt < a.updatedAt ? -1 : 1));
}

// 指标是否已配置（含停用；每个指标仅一条配置，停用后仍占用）
export function isControlConfigured(metricId: string): boolean {
  return configs.some((c) => c.metricId === metricId);
}

// 变更记录：按时间倒序
export function listChangeLogs(controlId: string): ControlChangeLog[] {
  return changeLogs
    .filter((l) => l.controlId === controlId)
    .sort((a, b) => (b.at < a.at ? -1 : 1));
}

// 数值校验（按指标口径与精度）：通过返回 null，否则返回错误提示
export function validateControlValue(
  kind: ControlMetricDef["valueKind"],
  decimals: number,
  raw: string
): string | null {
  const v = Number(raw);
  if (!raw.trim() || !Number.isFinite(v)) return "请输入有效数值";
  if (kind === "percent" && (v < 0 || v > 100)) return "取值范围 0～100";
  if (kind === "count" && (!Number.isInteger(v) || v < 0)) return "须为非负整数";
  if (kind === "duration" && v < 0) return "不能为负数";
  const dot = raw.trim().split(".")[1];
  if (dot && dot.length > decimals) return `最多保留 ${decimals} 位小数`;
  return null;
}

// 保存输入（新增 / 编辑公用）
export interface ControlSaveInput {
  id?: string; // 编辑时携带原配置 id
  metricId: string;
  dir: ControlDir;
  value?: number;
  low?: number;
  high?: number;
  enabled: boolean;
}

// 保存：新增插入 / 编辑原地更新；自动写变更记录并刷新最近更新人 / 时间
export function saveControlConfig(
  input: ControlSaveInput,
  ctx: { user: string; now: string }
): MetricControlConfig {
  if (input.id) {
    const prev = configs.find((c) => c.id === input.id)!;
    const next: MetricControlConfig = {
      ...prev,
      dir: input.dir,
      value: input.dir === "between" ? undefined : input.value,
      low: input.dir === "between" ? input.low : undefined,
      high: input.dir === "between" ? input.high : undefined,
      enabled: input.enabled,
      updatedBy: ctx.user,
      updatedAt: ctx.now,
    };
    configs = configs.map((c) => (c.id === input.id ? next : c));
    // 变更类型：仅启停变化记启用/停用，否则记修改
    const condChanged =
      prev.dir !== next.dir ||
      prev.value !== next.value ||
      prev.low !== next.low ||
      prev.high !== next.high;
    const type: ControlChangeLog["type"] = condChanged
      ? "修改"
      : prev.enabled !== next.enabled
        ? next.enabled
          ? "启用"
          : "停用"
        : "修改";
    changeLogs = [
      { id: nextLogId(), controlId: next.id, type, before: controlSummary(prev), after: controlSummary(next), by: ctx.user, at: ctx.now },
      ...changeLogs,
    ];
    return next;
  }
  const def = controlMetricOf(input.metricId)!;
  const created: MetricControlConfig = {
    id: nextConfigId(),
    metricId: def.id,
    metricName: def.name,
    unit: def.unit,
    dir: input.dir,
    value: input.dir === "between" ? undefined : input.value,
    low: input.dir === "between" ? input.low : undefined,
    high: input.dir === "between" ? input.high : undefined,
    enabled: input.enabled,
    updatedBy: ctx.user,
    updatedAt: ctx.now,
  };
  configs = [created, ...configs];
  changeLogs = [
    { id: nextLogId(), controlId: created.id, type: "新增", before: "—", after: controlSummary(created), by: ctx.user, at: ctx.now },
    ...changeLogs,
  ];
  return created;
}

// 启停切换：立即生效并留痕
export function toggleControlEnabled(
  id: string,
  enabled: boolean,
  ctx: { user: string; now: string }
): void {
  const prev = configs.find((c) => c.id === id);
  if (!prev || prev.enabled === enabled) return;
  const next = { ...prev, enabled, updatedBy: ctx.user, updatedAt: ctx.now };
  configs = configs.map((c) => (c.id === id ? next : c));
  changeLogs = [
    {
      id: nextLogId(),
      controlId: id,
      type: enabled ? "启用" : "停用",
      before: controlSummary(prev),
      after: controlSummary(next),
      by: ctx.user,
      at: ctx.now,
    },
    ...changeLogs,
  ];
}
