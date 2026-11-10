// 工艺参数推荐 —— 模拟数据层（烘丝出口水分推荐）
// 业务链路：以加香出口水分达标为目标，结合同产线同牌号近 10 个有效历史批次与已接入工况，
// 推算叶丝柜入口水分（模型推算），再生成下一批次烘丝出口水分推荐值；
// 推荐须落在烘丝工艺允许范围内（12.5%~13.5%），超出不截断、不生成。
// 确定性手锚种子：产线A 演示完整推荐链（13.20% 示例、标准换版分段、待回传/待核对/未达标），
// 产线B 演示不足 10 批仍基于现有历史计算与超范围拒绝，产线C 演示暂无待生产批次、标准缺失与上线前空缺。
// 推算关系（模型口径）：烘丝出口推荐 = 加香目标 + 预计柜内损耗 − 预计加香增量（12.5 + 0.75 − 0.05 = 13.20）。

// ============ 产线 ============

export interface LineDef {
  key: "A" | "B" | "C";
  name: string; // 产线A
  dryer: string; // 烘丝机台
  flavorer: string; // 加香机台
  brands: string[]; // 该产线生产的牌号
}

export const LINES: LineDef[] = [
  { key: "A", name: "产线A", dryer: "1#烘丝机", flavorer: "1#加香机", brands: ["娇子", "长城"] },
  { key: "B", name: "产线B", dryer: "3#烘丝机", flavorer: "2#加香机", brands: ["长城", "宽窄"] },
  { key: "C", name: "产线C", dryer: "5#烘丝机", flavorer: "3#加香机", brands: ["娇子", "宽窄"] },
];

export function lineOf(name: string): LineDef {
  return LINES.find((l) => l.name === name) ?? LINES[0];
}

// ============ 加香出口水分标准（按牌号 + 生效版本） ============

export interface StdDef {
  brand: string;
  ver: string; // 标准版本
  effectiveFrom: string; // 生效日 yyyy-MM-dd
  goal: number; // 目标 %
  low: number; // 合格下限 %
  high: number; // 合格上限 %
}

const STDS: StdDef[] = [
  // 娇子：10-18 允差换版（目标不变 → 推荐值不受影响，右图分段绘制合格区间）
  { brand: "娇子", ver: "V2026.1", effectiveFrom: "2026-09-01", goal: 12.5, low: 12.0, high: 13.0 },
  { brand: "娇子", ver: "V2026.2", effectiveFrom: "2026-10-18", goal: 12.5, low: 12.1, high: 13.1 },
  { brand: "长城", ver: "V2026.1", effectiveFrom: "2026-09-01", goal: 12.6, low: 12.1, high: 13.1 },
  // 宽窄标准 10-08 才生效：更早批次 → 标准缺失（产线C 首批演示）
  { brand: "宽窄", ver: "V2026.1", effectiveFrom: "2026-10-08", goal: 12.4, low: 11.9, high: 12.9 },
];

/** 按牌号与生产日期取当时有效的标准；早于首个生效日 → undefined（标准缺失） */
export function stdOf(brand: string, date: string): StdDef | undefined {
  return STDS.filter((s) => s.brand === brand && s.effectiveFrom <= date).sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom)
  ).pop();
}

// ============ 批次记录 ============

export interface BatchRecord {
  batch: string; // P20261023-01
  workOrder: string; // 工单号
  line: string; // 产线A
  brand: string;
  planStart: string; // 计划开工 yyyy-MM-dd HH:mm
  started: boolean; // 是否已开工（未开工 = 待生产）
  startAt?: string; // 实际开工时间
  cancelled?: boolean; // 取消工单：不计入历史 / 记录 / 有效样本
  dryingActual: number | null; // 烘丝出口水分实际 %（null = 待回传）
  dryingAdvice: number | null; // 开工时锁定的推荐版本建议值（null = 无有效推荐）
  adviceReason?: string; // 无建议值原因（功能上线前 / 超出工艺范围）
  adviceVersion?: string; // 锁定的推荐版本号
  adviceGeneratedAt?: string; // 推荐生成时间（开工前一日自动生成并锁定）
  flavorActual: number | null; // 加香出口水分实际 %
  flavorLink: "已确认" | "待核对"; // 物料追溯关联状态
}

// 推荐版本号 / 生成时间（开工前一日 20:15 自动生成并锁定）
function adviceVersionOf(batch: string): string {
  return `REC-${batch.slice(1)}`;
}
function adviceGenOf(startAt: string): string {
  const prev = new Date(Date.parse(`${startAt.slice(0, 10)}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  return `${prev} 20:15`;
}

function mk(s: BatchRecord): BatchRecord {
  const adviceGeneratedAt = s.started && s.dryingAdvice !== null ? adviceGenOf(s.startAt!) : undefined;
  return {
    ...s,
    adviceVersion: s.dryingAdvice !== null ? adviceVersionOf(s.batch) : undefined,
    adviceGeneratedAt,
  };
}

// 种子：按产线分组、时间正序；历史批建议值手锚在各牌号合格区间内（绿线不越界），
// 下一批推荐按推算链生成（目标 + 0.75 − 0.05：娇子 13.20 / 长城 13.30 / 宽窄 13.10）。
export const BATCHES: BatchRecord[] = [
  // —— 产线A（1#烘丝机 → 1#加香机）——
  // 娇子 / 长城各 20 批已开工历史（09-13 ~ 10-21）→ 双图展示近 20 批；建议值均落在牌号合格区间内
  mk({ batch: "P20260913-01", workOrder: "WO-2609-151", line: "产线A", brand: "长城", planStart: "2026-09-13 08:00", started: true, startAt: "2026-09-13 08:03", dryingActual: 13.05, dryingAdvice: 12.79, flavorActual: 12.44, flavorLink: "已确认" }),
  mk({ batch: "P20260914-01", workOrder: "WO-2609-156", line: "产线A", brand: "长城", planStart: "2026-09-14 08:00", started: true, startAt: "2026-09-14 08:05", dryingActual: 12.97, dryingAdvice: 13.02, flavorActual: 12.72, flavorLink: "已确认" }),
  mk({ batch: "P20260915-01", workOrder: "WO-2609-162", line: "产线A", brand: "长城", planStart: "2026-09-15 20:00", started: true, startAt: "2026-09-15 20:06", dryingActual: 13.01, dryingAdvice: 12.88, flavorActual: 12.57, flavorLink: "已确认" }),
  mk({ batch: "P20260917-01", workOrder: "WO-2609-173", line: "产线A", brand: "长城", planStart: "2026-09-17 08:00", started: true, startAt: "2026-09-17 08:01", dryingActual: 13.09, dryingAdvice: 12.75, flavorActual: 12.41, flavorLink: "已确认" }),
  mk({ batch: "P20260918-01", workOrder: "WO-2609-178", line: "产线A", brand: "长城", planStart: "2026-09-18 14:00", started: true, startAt: "2026-09-18 14:02", dryingActual: 13.02, dryingAdvice: 12.71, flavorActual: 12.33, flavorLink: "已确认" }),
  mk({ batch: "P20260919-01", workOrder: "WO-2609-180", line: "产线A", brand: "娇子", planStart: "2026-09-19 08:00", started: true, startAt: "2026-09-19 08:04", dryingActual: 12.91, dryingAdvice: 12.74, flavorActual: 12.46, flavorLink: "已确认" }),
  mk({ batch: "P20260919-02", workOrder: "WO-2609-183", line: "产线A", brand: "长城", planStart: "2026-09-19 14:00", started: true, startAt: "2026-09-19 14:05", dryingActual: 12.98, dryingAdvice: 12.96, flavorActual: 12.68, flavorLink: "已确认" }),
  mk({ batch: "P20260920-01", workOrder: "WO-2609-188", line: "产线A", brand: "娇子", planStart: "2026-09-20 20:00", started: true, startAt: "2026-09-20 20:05", dryingActual: 12.88, dryingAdvice: 12.81, flavorActual: 12.52, flavorLink: "已确认" }),
  mk({ batch: "P20260921-01", workOrder: "WO-2609-191", line: "产线A", brand: "长城", planStart: "2026-09-21 08:00", started: true, startAt: "2026-09-21 08:04", dryingActual: 13.03, dryingAdvice: 12.82, flavorActual: 12.49, flavorLink: "已确认" }),
  mk({ batch: "P20260922-01", workOrder: "WO-2609-195", line: "产线A", brand: "娇子", planStart: "2026-09-22 08:00", started: true, startAt: "2026-09-22 08:02", dryingActual: 12.93, dryingAdvice: 12.68, flavorActual: 12.38, flavorLink: "已确认" }),
  mk({ batch: "P20260923-01", workOrder: "WO-2609-199", line: "产线A", brand: "长城", planStart: "2026-09-23 14:00", started: true, startAt: "2026-09-23 14:07", dryingActual: 13.06, dryingAdvice: 12.73, flavorActual: 12.39, flavorLink: "已确认" }),
  mk({ batch: "P20260924-01", workOrder: "WO-2609-203", line: "产线A", brand: "娇子", planStart: "2026-09-24 08:00", started: true, startAt: "2026-09-24 08:06", dryingActual: 12.86, dryingAdvice: 12.9, flavorActual: 12.55, flavorLink: "已确认" }),
  mk({ batch: "P20260925-01", workOrder: "WO-2609-213", line: "产线A", brand: "长城", planStart: "2026-09-25 08:00", started: true, startAt: "2026-09-25 08:02", dryingActual: 12.96, dryingAdvice: 13.0, flavorActual: 12.71, flavorLink: "已确认" }),
  mk({ batch: "P20260925-02", workOrder: "WO-2609-210", line: "产线A", brand: "娇子", planStart: "2026-09-25 14:00", started: true, startAt: "2026-09-25 14:03", dryingActual: 12.90, dryingAdvice: 12.77, flavorActual: 12.43, flavorLink: "已确认" }),
  mk({ batch: "P20260926-01", workOrder: "WO-2609-216", line: "产线A", brand: "娇子", planStart: "2026-09-26 08:00", started: true, startAt: "2026-09-26 08:01", dryingActual: 12.85, dryingAdvice: 12.85, flavorActual: 12.61, flavorLink: "已确认" }),
  mk({ batch: "P20260927-01", workOrder: "WO-2609-219", line: "产线A", brand: "长城", planStart: "2026-09-27 08:00", started: true, startAt: "2026-09-27 08:06", dryingActual: 13.01, dryingAdvice: 12.86, flavorActual: 12.54, flavorLink: "已确认" }),
  mk({ batch: "P20260927-02", workOrder: "WO-2609-221", line: "产线A", brand: "娇子", planStart: "2026-09-27 20:00", started: true, startAt: "2026-09-27 20:04", dryingActual: 12.92, dryingAdvice: 12.72, flavorActual: 12.4, flavorLink: "已确认" }),
  mk({ batch: "P20260928-01", workOrder: "WO-2609-226", line: "产线A", brand: "娇子", planStart: "2026-09-28 08:00", started: true, startAt: "2026-09-28 08:05", dryingActual: 12.83, dryingAdvice: 12.93, flavorActual: 12.66, flavorLink: "已确认" }),
  mk({ batch: "P20260929-01", workOrder: "WO-2609-201", line: "产线A", brand: "娇子", planStart: "2026-09-29 08:00", started: true, startAt: "2026-09-29 08:05", dryingActual: 12.89, dryingAdvice: 12.84, flavorActual: 12.5, flavorLink: "已确认" }),
  mk({ batch: "P20260929-02", workOrder: "WO-2609-204", line: "产线A", brand: "长城", planStart: "2026-09-29 14:00", started: true, startAt: "2026-09-29 14:04", dryingActual: 12.99, dryingAdvice: 12.95, flavorActual: 12.63, flavorLink: "已确认" }),
  mk({ batch: "P20260930-01", workOrder: "WO-2609-209", line: "产线A", brand: "长城", planStart: "2026-09-30 08:00", started: true, startAt: "2026-09-30 08:03", dryingActual: 12.99, dryingAdvice: 12.97, flavorActual: 12.65, flavorLink: "已确认" }),
  mk({ batch: "P20261001-01", workOrder: "WO-2610-002", line: "产线A", brand: "长城", planStart: "2026-10-01 08:00", started: true, startAt: "2026-10-01 08:05", dryingActual: 13.06, dryingAdvice: 12.78, flavorActual: 12.42, flavorLink: "已确认" }),
  mk({ batch: "P20261001-02", workOrder: "WO-2610-001", line: "产线A", brand: "娇子", planStart: "2026-10-01 20:00", started: true, startAt: "2026-10-01 20:03", dryingActual: 12.86, dryingAdvice: 12.87, flavorActual: 12.53, flavorLink: "已确认" }),
  mk({ batch: "P20261002-01", workOrder: "WO-2610-004", line: "产线A", brand: "娇子", planStart: "2026-10-02 08:00", started: true, startAt: "2026-10-02 08:02", dryingActual: 12.87, dryingAdvice: 12.81, flavorActual: 12.51, flavorLink: "已确认" }),
  mk({ batch: "P20261002-02", workOrder: "WO-2610-007", line: "产线A", brand: "长城", planStart: "2026-10-02 14:00", started: true, startAt: "2026-10-02 14:01", dryingActual: 13.00, dryingAdvice: 12.9, flavorActual: 12.59, flavorLink: "已确认" }),
  mk({ batch: "P20261003-01", workOrder: "WO-2610-009", line: "产线A", brand: "长城", planStart: "2026-10-03 08:00", started: true, startAt: "2026-10-03 08:02", dryingActual: 12.96, dryingAdvice: 13.03, flavorActual: 12.74, flavorLink: "已确认" }),
  mk({ batch: "P20261004-01", workOrder: "WO-2610-011", line: "产线A", brand: "娇子", planStart: "2026-10-04 08:00", started: true, startAt: "2026-10-04 08:06", dryingActual: 12.85, dryingAdvice: 12.82, flavorActual: 12.56, flavorLink: "已确认" }),
  mk({ batch: "P20261004-02", workOrder: "WO-2610-013", line: "产线A", brand: "长城", planStart: "2026-10-04 14:00", started: true, startAt: "2026-10-04 14:06", dryingActual: 13.08, dryingAdvice: 12.76, flavorActual: 12.4, flavorLink: "已确认" }),
  mk({ batch: "P20261005-02", workOrder: "WO-2610-017", line: "产线A", brand: "长城", planStart: "2026-10-05 08:00", started: true, startAt: "2026-10-05 08:04", dryingActual: 13.01, dryingAdvice: 12.92, flavorActual: 12.58, flavorLink: "已确认" }),
  mk({ batch: "P20261006-01", workOrder: "WO-2610-018", line: "产线A", brand: "长城", planStart: "2026-10-06 14:00", started: true, startAt: "2026-10-06 14:04", dryingActual: 12.99, dryingAdvice: 12.88, flavorActual: 12.58, flavorLink: "已确认" }),
  mk({ batch: "P20261008-01", workOrder: "WO-2610-025", line: "产线A", brand: "娇子", planStart: "2026-10-08 08:00", started: true, startAt: "2026-10-08 08:01", dryingActual: 12.90, dryingAdvice: 12.9, flavorActual: 12.47, flavorLink: "已确认" }),
  mk({ batch: "P20261010-01", workOrder: "WO-2610-033", line: "产线A", brand: "长城", planStart: "2026-10-10 08:00", started: true, startAt: "2026-10-10 08:05", dryingActual: 12.95, dryingAdvice: 12.96, flavorActual: 13.14, flavorLink: "已确认" }), // 加香超上限 → 未达标
  mk({ batch: "P20261011-01", workOrder: "WO-2610-037", line: "产线A", brand: "娇子", planStart: "2026-10-11 08:00", started: true, startAt: "2026-10-11 07:58", dryingActual: 12.95, dryingAdvice: 12.88, flavorActual: 12.52, flavorLink: "已确认" }), // 绝对差 0.15 pct（需求示例）
  mk({ batch: "P20261013-01", workOrder: "WO-2610-045", line: "产线A", brand: "娇子", planStart: "2026-10-13 20:00", started: true, startAt: "2026-10-13 20:10", dryingActual: 12.93, dryingAdvice: 12.94, flavorActual: 12.41, flavorLink: "已确认" }),
  mk({ batch: "P20261015-01", workOrder: "WO-2610-052", line: "产线A", brand: "娇子", planStart: "2026-10-15 08:00", started: true, startAt: "2026-10-15 08:03", dryingActual: 11.94, dryingAdvice: 12.86, flavorActual: 12.55, flavorLink: "已确认" }), // 水分低于下限（异常演示点）
  mk({ batch: "P20261016-01", workOrder: "WO-2610-058", line: "产线A", brand: "长城", planStart: "2026-10-16 08:00", started: true, startAt: "2026-10-16 08:02", dryingActual: 13.00, dryingAdvice: 13.02, flavorActual: 12.72, flavorLink: "已确认" }),
  mk({ batch: "P20261017-01", workOrder: "WO-2610-063", line: "产线A", brand: "娇子", planStart: "2026-10-17 08:00", started: true, startAt: "2026-10-17 08:00", dryingActual: 12.94, dryingAdvice: 12.91, flavorActual: 12.38, flavorLink: "已确认" }), // 换版前最后一批（V2026.1）
  mk({ batch: "P20261019-01", workOrder: "WO-2610-071", line: "产线A", brand: "娇子", planStart: "2026-10-19 08:00", started: true, startAt: "2026-10-19 08:04", dryingActual: 12.99, dryingAdvice: 12.95, flavorActual: 12.48, flavorLink: "已确认" }), // V2026.2 允差下达标
  mk({ batch: "P20261020-01", workOrder: "WO-2610-077", line: "产线A", brand: "娇子", planStart: "2026-10-20 20:00", started: true, startAt: "2026-10-20 20:07", dryingActual: 13.24, dryingAdvice: 12.98, flavorActual: 12.5, flavorLink: "待核对" }), // 水分超上限（异常演示点）；物料关联待核对
  mk({ batch: "P20261021-01", workOrder: "WO-2610-082", line: "产线A", brand: "娇子", planStart: "2026-10-21 08:00", started: true, startAt: "2026-10-21 08:02", dryingActual: null, dryingAdvice: 12.92, flavorActual: null, flavorLink: "已确认" }), // 实际数据待回传
  mk({ batch: "P20261023-01", workOrder: "WO-2610-090", line: "产线A", brand: "娇子", planStart: "2026-10-23 08:00", started: false, dryingActual: null, dryingAdvice: null, flavorActual: null, flavorLink: "已确认" }), // 下一批次（待生产）

  // —— 产线B（3#烘丝机 → 2#加香机）—— 宽窄有效 7 批 → 不足 10 批仍基于现有批次计算（13.10%）
  mk({ batch: "P20261008-02", workOrder: "WO-2610-027", line: "产线B", brand: "宽窄", planStart: "2026-10-08 08:00", started: true, startAt: "2026-10-08 08:07", dryingActual: 12.78, dryingAdvice: 12.62, flavorActual: 12.32, flavorLink: "已确认" }),
  mk({ batch: "P20261009-01", workOrder: "WO-2610-030", line: "产线B", brand: "长城", planStart: "2026-10-09 20:00", started: true, startAt: "2026-10-09 20:02", dryingActual: 12.99, dryingAdvice: 12.94, flavorActual: 12.62, flavorLink: "已确认" }),
  mk({ batch: "P20261011-02", workOrder: "WO-2610-038", line: "产线B", brand: "宽窄", planStart: "2026-10-11 14:00", started: true, startAt: "2026-10-11 14:05", dryingActual: 12.76, dryingAdvice: 12.68, flavorActual: 12.45, flavorLink: "已确认" }),
  mk({ batch: "P20261013-02", workOrder: "WO-2610-046", line: "产线B", brand: "宽窄", planStart: "2026-10-13 08:00", started: true, startAt: "2026-10-13 08:03", dryingActual: 12.81, dryingAdvice: 12.58, flavorActual: 12.24, flavorLink: "已确认" }),
  mk({ batch: "P20261014-01", workOrder: "WO-2610-050", line: "产线B", brand: "长城", planStart: "2026-10-14 08:00", started: true, startAt: "2026-10-14 08:01", dryingActual: 12.94, dryingAdvice: 12.98, flavorActual: 12.75, flavorLink: "已确认" }),
  mk({ batch: "P20261015-02", workOrder: "WO-2610-054", line: "产线B", brand: "宽窄", planStart: "2026-10-15 20:00", started: true, startAt: "2026-10-15 20:06", dryingActual: 12.64, dryingAdvice: 12.71, flavorActual: 12.28, flavorLink: "已确认" }),
  mk({ batch: "P20261016-02", workOrder: "WO-2610-060", line: "产线B", brand: "宽窄", planStart: "2026-10-16 08:00", started: true, startAt: "2026-10-16 08:04", dryingActual: 12.79, dryingAdvice: 12.64, flavorActual: 12.4, flavorLink: "已确认" }),
  mk({ batch: "P20261017-02", workOrder: "WO-2610-064", line: "产线B", brand: "长城", planStart: "2026-10-17 08:00", started: true, startAt: "2026-10-17 08:02", dryingActual: 13.02, dryingAdvice: null, adviceReason: "未生成有效推荐：超出工艺范围", flavorActual: 12.55, flavorLink: "已确认" }), // 推算 13.8 超出 12.5~13.5 → 拒绝生成
  mk({ batch: "P20261018-02", workOrder: "WO-2610-067", line: "产线B", brand: "宽窄", planStart: "2026-10-18 08:00", started: false, cancelled: true, dryingActual: null, dryingAdvice: null, flavorActual: null, flavorLink: "已确认" }), // 取消工单：不计入任何统计
  mk({ batch: "P20261019-02", workOrder: "WO-2610-072", line: "产线B", brand: "宽窄", planStart: "2026-10-19 08:00", started: true, startAt: "2026-10-19 08:05", dryingActual: 12.80, dryingAdvice: 12.66, flavorActual: 12.44, flavorLink: "已确认" }),
  mk({ batch: "P20261020-02", workOrder: "WO-2610-078", line: "产线B", brand: "宽窄", planStart: "2026-10-20 08:00", started: true, startAt: "2026-10-20 08:00", dryingActual: 12.75, dryingAdvice: 12.6, flavorActual: 12.36, flavorLink: "已确认" }),
  mk({ batch: "P20261021-02", workOrder: "WO-2610-083", line: "产线B", brand: "长城", planStart: "2026-10-21 14:00", started: true, startAt: "2026-10-21 14:03", dryingActual: null, dryingAdvice: 13.01, flavorActual: null, flavorLink: "已确认" }), // 待回传
  mk({ batch: "P20261022-16", workOrder: "WO-2610-088", line: "产线B", brand: "宽窄", planStart: "2026-10-22 20:00", started: false, dryingActual: null, dryingAdvice: null, flavorActual: null, flavorLink: "已确认" }), // 下一批次（待生产）

  // —— 产线C（5#烘丝机 → 3#加香机）—— 无待生产工单
  mk({ batch: "P20261005-01", workOrder: "WO-2610-015", line: "产线C", brand: "宽窄", planStart: "2026-10-05 08:00", started: true, startAt: "2026-10-05 08:04", dryingActual: 12.74, dryingAdvice: null, adviceReason: "功能上线前批次", flavorActual: 12.3, flavorLink: "已确认" }), // 早于宽窄标准生效日 → 标准缺失
  mk({ batch: "P20261008-03", workOrder: "WO-2610-028", line: "产线C", brand: "娇子", planStart: "2026-10-08 08:00", started: true, startAt: "2026-10-08 08:06", dryingActual: 12.89, dryingAdvice: 12.9, flavorActual: 12.5, flavorLink: "已确认" }),
  mk({ batch: "P20261010-02", workOrder: "WO-2610-034", line: "产线C", brand: "宽窄", planStart: "2026-10-10 14:00", started: true, startAt: "2026-10-10 14:02", dryingActual: 12.78, dryingAdvice: 12.61, flavorActual: 12.42, flavorLink: "已确认" }),
  mk({ batch: "P20261012-01", workOrder: "WO-2610-042", line: "产线C", brand: "娇子", planStart: "2026-10-12 08:00", started: true, startAt: "2026-10-12 08:03", dryingActual: 12.86, dryingAdvice: 12.93, flavorActual: 12.57, flavorLink: "已确认" }),
  mk({ batch: "P20261014-02", workOrder: "WO-2610-051", line: "产线C", brand: "宽窄", planStart: "2026-10-14 20:00", started: true, startAt: "2026-10-14 20:05", dryingActual: 12.70, dryingAdvice: 12.7, flavorActual: 11.86, flavorLink: "已确认" }), // 低于下限 → 未达标
  mk({ batch: "P20261016-03", workOrder: "WO-2610-059", line: "产线C", brand: "娇子", planStart: "2026-10-16 08:00", started: true, startAt: "2026-10-16 08:01", dryingActual: 12.91, dryingAdvice: 12.97, flavorActual: 12.44, flavorLink: "已确认" }),
  mk({ batch: "P20261018-01", workOrder: "WO-2610-068", line: "产线C", brand: "宽窄", planStart: "2026-10-18 08:00", started: true, startAt: "2026-10-18 08:07", dryingActual: 12.79, dryingAdvice: 12.63, flavorActual: 12.33, flavorLink: "已确认" }),
  mk({ batch: "P20261019-03", workOrder: "WO-2610-074", line: "产线C", brand: "娇子", planStart: "2026-10-19 20:00", started: true, startAt: "2026-10-19 20:04", dryingActual: 13.00, dryingAdvice: 13.05, flavorActual: 12.61, flavorLink: "已确认" }),
  mk({ batch: "P20261021-03", workOrder: "WO-2610-084", line: "产线C", brand: "宽窄", planStart: "2026-10-21 08:00", started: true, startAt: "2026-10-21 08:02", dryingActual: 12.76, dryingAdvice: 12.67, flavorActual: 12.47, flavorLink: "已确认" }),
  mk({ batch: "P20261021-04", workOrder: "WO-2610-086", line: "产线C", brand: "娇子", planStart: "2026-10-21 20:00", started: true, startAt: "2026-10-21 20:08", dryingActual: null, dryingAdvice: 12.99, flavorActual: null, flavorLink: "已确认" }), // 待回传
];

// ============ 查询 ============

/** 最近 n 个已开工未取消批次（时间正序；brand="全部" 不过滤；含实际数据未回传批次） */
export function historyOf(line: string, brand: string, n: number): BatchRecord[] {
  return BATCHES.filter((b) => b.line === line && b.started && !b.cancelled && (brand === "全部" || b.brand === brand)).slice(-n);
}

/** 全部可展示记录（含待生产，不含取消），时间正序 */
export function recordsOf(line: string, brand: string): BatchRecord[] {
  return BATCHES.filter((b) => b.line === line && !b.cancelled && (brand === "全部" || b.brand === brand));
}

/** 模型有效历史口径：已开工未取消、烘丝与加香检测值完整、物料关联已确认（待核对不计入） */
export function validHistoryOf(line: string, brand: string): BatchRecord[] {
  return BATCHES.filter(
    (b) =>
      b.line === line &&
      !b.cancelled &&
      b.started &&
      b.brand === brand &&
      b.dryingActual !== null &&
      b.flavorActual !== null &&
      b.flavorLink === "已确认"
  );
}

export type BatchResult = "待生产" | "待回传" | "待核对" | "达标" | "未达标" | "标准缺失";

/** 结果状态判定（优先级：待生产 → 标准缺失 → 待核对 → 待回传 → 按当时有效标准判达标） */
export function resultOf(b: BatchRecord): BatchResult {
  if (!b.started) return "待生产";
  const std = stdOf(b.brand, (b.startAt ?? b.planStart).slice(0, 10));
  if (!std) return "标准缺失";
  if (b.flavorLink === "待核对" && b.flavorActual !== null) return "待核对";
  if (b.flavorActual === null || b.dryingActual === null) return "待回传";
  return b.flavorActual >= std.low && b.flavorActual <= std.high ? "达标" : "未达标";
}

/** 绝对差 pct：实际与建议均有效才算，未舍入原值计算 */
export function absDiffOf(b: BatchRecord): number | null {
  if (b.dryingActual === null || b.dryingAdvice === null) return null;
  return Math.abs(b.dryingActual - b.dryingAdvice);
}

// ============ 下一批次推荐 ============

export const DRYING_RANGE = { low: 12.5, high: 13.5 }; // 烘丝出口水分工艺允许范围 %
export const MODEL_VER = "水分预测模型 v2.3";
export const DATA_AS_OF = "2026-10-22 09:30"; // 数据截至
export const REC_CHAIN = { cabinetLoss: 0.75, flavorGain: 0.05 }; // 推算链：目标 + 柜内损耗 − 加香增量

export type RecStatus = "已生成" | "数据不足" | "超出工艺范围" | "生成失败" | "暂无待生产";

export interface NextRecommendation {
  status: RecStatus;
  batch?: BatchRecord; // 下一批次（排产顺序首条未开工未取消工单）
  value?: number; // 烘丝出口水分推荐值 %
  inletMoisture?: number; // 叶丝柜入口水分（模型推算）%
  validCount: number; // 同产线同牌号有效历史批次数
  dataAsOf: string;
  generatedAt?: string;
  version?: string; // 推荐版本（重算保留版本）
  modelVer: string;
  confidence?: number; // 仅算法提供有效数值时展示
  std?: StdDef; // 下一批次适用的加香标准
}

/** 下一批次推荐（按产线实际排产；brand 仅用于页面匹配提示，不改变推荐对象） */
export function nextRecommendationOf(line: string): NextRecommendation {
  const base: NextRecommendation = { status: "暂无待生产", validCount: 0, dataAsOf: DATA_AS_OF, modelVer: MODEL_VER };
  const next = BATCHES.find((b) => b.line === line && !b.started && !b.cancelled);
  if (!next) return base;

  const valid = validHistoryOf(line, next.brand);
  const std = stdOf(next.brand, DATA_AS_OF.slice(0, 10));
  const rec: NextRecommendation = {
    ...base,
    status: "已生成",
    batch: next,
    validCount: valid.length,
    std,
    generatedAt: "2026-10-22 09:31",
    version: "REC-2610-090-v2",
  };
  if (!std || valid.length === 0) {
    // 无有效历史批次（或标准缺失）→ 不输出数值；不足 10 批时基于现有有效批次计算
    return { ...rec, status: "数据不足" };
  }
  const value = std.goal + REC_CHAIN.cabinetLoss - REC_CHAIN.flavorGain;
  if (value < DRYING_RANGE.low || value > DRYING_RANGE.high) {
    return { ...rec, status: "超出工艺范围" };
  }
  // 产线A 演示：算法提供有效置信度与验证依据；其余产线不提供 → 隐藏
  if (line === "产线A") rec.confidence = 0.992;
  return { ...rec, value, inletMoisture: value };
}

// ============ 展示工具 ============

/** 水分 / 差值两位小数展示 */
export function fmt2(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : v.toFixed(2);
}

/** 图表横轴短标签：批次号 → "MM-DD·序号"（同日多批不冲突） */
export function batchLabelOf(batch: string): string {
  const [mmdd, seq] = batch.slice(5).split("-");
  return `${mmdd.slice(0, 2)}-${mmdd.slice(2)}·${seq}`;
}
