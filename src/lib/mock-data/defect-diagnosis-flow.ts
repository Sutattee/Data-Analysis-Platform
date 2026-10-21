// 缺陷诊断任务流（会话级 store）：列表页（卡片/表格）与详情页（智能诊断 / 人工判定）共用。
// Agent 四节点用 setTimeout 链模拟推进（数据准备 → 归因分析 ∥ 案例检索 → 结论生成），
// 通过 listeners + useSyncExternalStore 通知视图刷新；判定结果桥接写回 quality-defect 的
// diagnoses store（诊断记录页 / 缺陷分析抽屉零改动同源同步）。

import {
  diagCatalogOf,
  saveDiagnosisCauseByCodeDate,
  type DefectRecord,
} from "./quality-defect";

// ============ 类型 ============

export type DiagTaskStatus = "未诊断" | "诊断中" | "待判定" | "已判定";

export type AgentNodeKey = "data-prep" | "attribution" | "case-search" | "advice";

export type AgentNodeStatus = "待执行" | "执行中" | "完成" | "部分完成" | "失败" | "跳过";

export interface AgentNode {
  key: AgentNodeKey;
  name: string;
  status: AgentNodeStatus;
  startedAt?: string; // 2026/09/23 09:26:35
  finishedAt?: string;
  ms?: number; // 执行耗时（毫秒，展示用）
  summary?: string;
  details?: string[];
  error?: string;
}

// 诊断依据：编号 / 名称 / 实测值+单位 / 统计范围 / 参考值 / 比较结果 / 来源系统 / 关联对象批次 / 数据截至时间
export interface DiagnosisEvidence {
  no: string; // E1、E2…
  name: string;
  value: string;
  unit?: string;
  scope: string;
  ref: string;
  compare: string; // 超上限 / 达标 / 数据缺失 / 仅数据展示（无参考标准）
  sourceSystem: string;
  object: string; // 关联对象·批次
  batch: string;
  asOf: string; // 数据截至时间
  missing?: boolean; // 数据缺失（不按 0 处理）
}

// 知识库案例（库内存储不含匹配结果；检索时生成 matchPoints / diffs）
export interface KbCase {
  id: string;
  code: string; // 关联缺陷代码
  title: string;
  grade: string; // A类 / C/D类 / B类
  formedAt: string; // 形成（判定）时间
  scope: string; // 适用范围
  cause: string; // 已确定原因
  keyEvidence: string; // 核查依据
  measures?: string; // 处置措施
  source: "专家案例" | "历史诊断案例";
  taskId?: string; // 来源任务（历史诊断案例）
  judge?: string;
  active: boolean; // 改判“暂未查明”后停用，不再参与检索
}

export interface CaseMatch extends KbCase {
  matchPoints: string[];
  diffs: string[];
}

export interface AiAdviceCandidate {
  name: string;
  basisNos: string[]; // 引用的依据编号（可点击定位）
  caseTitle?: string; // 引用的相似案例
  support: "本次数据支持" | "历史经验支持" | "依据缺失";
}

export interface AiAdvice {
  overview: string; // 异常概况
  candidates: AiAdviceCandidate[];
  checks: string[]; // 建议人工核查项
  gaps: string[]; // 不足与受限说明
}

export interface AiContribution {
  name: string;
  pct: string; // 42%
  note: string; // 口径说明（依据编号）
}

export interface AiVersion {
  version: number;
  startedAt: string;
  finishedAt?: string;
  nodes: AgentNode[];
  evidences: DiagnosisEvidence[];
  contributions?: AiContribution[];
  ruleNote?: string; // 无统计归因时的规则比对结论（箱储）
  cases: CaseMatch[];
  advice?: AiAdvice;
  limitations?: string[];
  failedOnce?: boolean; // 数据准备已失败过（重试后视为成功，用于 dataFail 剧本演示）
}

export interface JudgmentDraft {
  conclusion?: "原因已确定" | "暂未查明"; // 首次不默认选择
  finalCause?: string;
  checkNote?: string;
  addToKb: boolean;
}

export interface Judgment {
  version: number;
  conclusion: "原因已确定" | "暂未查明";
  finalCause?: string; // 暂未查明时为空
  checkNote?: string;
  judge: string;
  judgedAt: string;
  aiVersion: number; // 参考的 AI 版本（无 AI 版本为 0 = 人工独立判定）
  kbCaseId?: string; // 入库后的案例 id
}

// 箱储对象信息（以 MES 为准）
export interface StorageInfo {
  object: string; // 1#储丝柜
  objectCode: string; // CG-01
  batch: string; // 烟丝批次 YS-1026A
  stored: string; // 储存时长 96h
  limit: string; // 上限 72h
  over: string; // 超限时长 24h
  inAt: string; // 入库时间
  outAt?: string; // 最近出库时间（无出库记录为空）
}

export type DiagScenario = "normal" | "partial" | "caseMiss" | "dataFail";

export interface DiagTask {
  id: string; // dr-001（与 occurrence.id 一致）
  code: string;
  occurrence: DefectRecord; // 本条缺陷记录（关联数据口径）
  timeType: "检验时间" | "发现时间"; // 抽检类=检验时间，箱储=发现时间
  storage?: StorageInfo; // 箱储任务的对象信息
  scenario: DiagScenario;
  status: DiagTaskStatus;
  aiVersions: AiVersion[]; // 多次智能诊断产生多版本
  draft?: JudgmentDraft;
  judgments: Judgment[]; // 多次修订产生多版本
}

// ============ 时间工具 ============

// 运行时钟：诊断启动 / 节点起止 / 判定保存时间（与诊断记录页 formatNow 口径一致）
function nowStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function clockStr(base: string, plusSec: number): string {
  // 种子静态时间 + 秒偏移（不跨日即可；偏移均为分钟级）
  const m = base.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return base;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]) + plusSec);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ============ Agent 节点 ============

const NODE_DEFS: { key: AgentNodeKey; name: string; ms: number }[] = [
  { key: "data-prep", name: "数据准备", ms: 1500 },
  { key: "attribution", name: "归因分析", ms: 2200 },
  { key: "case-search", name: "案例检索", ms: 1800 },
  { key: "advice", name: "结论生成", ms: 1400 },
];

function freshNodes(): AgentNode[] {
  return NODE_DEFS.map((n) => ({ key: n.key, name: n.name, status: "待执行" as AgentNodeStatus }));
}

// ============ 订阅 ============

let diagVersion = 0;
const listeners = new Set<() => void>();

export function subscribeDiag(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getDiagVersion(): number {
  return diagVersion;
}

function emit() {
  diagVersion += 1;
  listeners.forEach((fn) => fn());
}

// ============ 诊断依据构建（确定性生成，值随任务序号偏移） ============

function objectOf(t: DiagTask): string {
  return t.storage ? `${t.storage.object}（${t.storage.objectCode}）` : t.occurrence.machine;
}

function asOfOf(t: DiagTask): string {
  // 数据截至时间：检验/发现当日的 08:00 汇总口径
  return `${t.occurrence.date.replace(/-/g, "/")} 08:00`;
}

function seqOf(t: DiagTask): number {
  return Number(t.id.slice(-2));
}

// 成品水分不合格（5 项）：质检平台材料水分 + MES 加香水分/上游工序水分/停机时长 + 车间环境温湿度合格率
function moistureEvidences(t: DiagTask): DiagnosisEvidence[] {
  const s = seqOf(t);
  const obj = `${objectOf(t)}·${t.occurrence.batch}`;
  const asOf = asOfOf(t);
  const mk = (
    no: string, name: string, value: string, unit: string, scope: string,
    ref: string, compare: string, sourceSystem: string
  ): DiagnosisEvidence => ({ no, name, value, unit, scope, ref, compare, sourceSystem, object: obj, batch: t.occurrence.batch, asOf });
  const raw1 = 12.4 + (s % 3) * 0.6; // 来料水分 12.4 / 13.0 / 13.6 循环
  const raw2 = 12.6 + (s % 3) * 0.4; // 加香水分均值
  const raw3 = 20.8 + (s % 3) * 0.6; // 上游工序水分
  const stopMin = 32 + (s % 3) * 13; // 停机时长
  const envPct = 95.1 + (s % 3) * 1.6; // 环境合格率
  return [
    mk("E1", "来料（片烟）水分", raw1.toFixed(1), "%", "本批次 3 车原料抽检均值（n=9）", "11.0%~13.0%",
      raw1 > 13.0 ? `超上限 ${(raw1 - 13.0).toFixed(1)}pct` : "达标", "质检平台"),
    mk("E2", "加香出口水分均值", raw2.toFixed(1), "%", "本批次出口在线仪表 2h 滑动均值（n=24）", "12.0%~13.0%",
      raw2 > 13.0 ? `超上限 ${(raw2 - 13.0).toFixed(1)}pct` : "达标", "MES"),
    mk("E3", "上游工序（烘丝前）水分", raw3.toFixed(1), "%", "本批次烘丝前在线仪表均值（n=18）", "19.0%~21.5%",
      raw3 > 21.5 ? `超上限 ${(raw3 - 21.5).toFixed(1)}pct` : "达标", "MES"),
    mk("E4", "卷包生产停机时长", String(stopMin), "min", "本批次生产时段汇总", "≤45min",
      stopMin > 45 ? `超上限 ${stopMin - 45}min` : "达标", "MES"),
    mk("E5", "车间温湿度合格率", envPct.toFixed(1), "%", "生产时段车间环境监测点（n=12）", "≥95%",
      envPct >= 95 ? "达标" : `低于下限 ${(95 - envPct).toFixed(1)}pct`, "车间环境"),
  ];
}

// 烟支刺破（4 项）：MES 风选剔除量 / 梗及梗中含丝量 + 卷包数采剔梗量 + MES 配方
function punctureEvidences(t: DiagTask, missingStem: boolean): DiagnosisEvidence[] {
  const s = seqOf(t);
  const obj = `${objectOf(t)}·${t.occurrence.batch}`;
  const asOf = asOfOf(t);
  const mk = (
    no: string, name: string, value: string, unit: string, scope: string,
    ref: string, compare: string, sourceSystem: string, missing?: boolean
  ): DiagnosisEvidence => ({ no, name, value, unit, scope, ref, compare, sourceSystem, object: obj, batch: t.occurrence.batch, asOf, missing });
  const wind = 0.8 + (s % 3) * 0.3; // 风选剔除量
  const stemSilk = 3.2 + (s % 3) * 0.6; // 梗中含丝量
  const recipe = 18.5 + (s % 3) * 0.7; // 梗丝掺配比
  return [
    mk("E1", "制丝柔性风选剔除量", wind.toFixed(1), "%", "本批次制丝段汇总", "0.5%~1.2%",
      wind > 1.2 ? `超上限 ${(wind - 1.2).toFixed(1)}pct` : "达标", "MES"),
    mk("E2", "梗及梗中含丝量", stemSilk.toFixed(1), "%", "本批次梗丝线抽检（n=6）", "≤4.0%",
      stemSilk > 4.0 ? `超上限 ${(stemSilk - 4.0).toFixed(1)}pct` : "达标", "MES"),
    mk("E3", "卷烟机剔梗量", missingStem ? "—" : (2.1 + (s % 3) * 0.5).toFixed(1), "kg/班", "本机台本班次累计", "≤2.5kg/班",
      missingStem ? "数据缺失（不按 0 处理）" : 2.1 + (s % 3) * 0.5 > 2.5 ? "超上限" : "达标", "卷包数采", missingStem),
    mk("E4", "原料配方（梗丝掺配比）", recipe.toFixed(1), "%", "本批次配方单", "19.0%±1.0",
      Math.abs(recipe - 19.0) <= 1.0 ? "在允差内（非数值偏差不计）" : "偏离允差", "MES"),
  ];
}

// 箱储存储时间超上限（7 项，以 MES 为准；部分待接口确认）
function storageEvidences(t: DiagTask): DiagnosisEvidence[] {
  const st = t.storage!;
  const obj = `${st.object}（${st.objectCode}）`;
  const b = st.batch;
  const asOf = asOfOf(t);
  const mk = (
    no: string, name: string, value: string, unit: string, scope: string,
    ref: string, compare: string, sourceSystem: string
  ): DiagnosisEvidence => ({ no, name, value, unit, scope, ref, compare, sourceSystem, object: obj, batch: b, asOf });
  const s = seqOf(t);
  const planIn = 9400 + (s % 3) * 200;
  const realIn = planIn - (80 + (s % 3) * 40);
  const planOut = 470 + (s % 3) * 10;
  const realOut = planOut - (24 + (s % 3) * 8);
  return [
    mk("E1", "入库时间", st.inAt, "", "本批次入柜登记", "—", "仅数据展示", "MES"),
    mk("E2", "当前库存", `${(realIn - realOut * 0.35).toFixed(0)}`, "kg", `数据截至 ${asOf} 的账面库存`, "—", "仅数据展示", "MES（接口待确认）"),
    mk("E3", "制丝计划投料量", String(planIn), "kg", "本批次制丝计划单", "—", "仅数据展示", "MES"),
    mk("E4", "制丝实际产出", String(realIn), "kg", "本批次产出汇总", "—", "仅数据展示", "MES"),
    mk("E5", "卷包计划 / 实际产量", `${planOut} / ${realOut}`, "箱", "本批次对应卷包工单", "—",
      `实际低于计划 ${planOut - realOut} 箱`, "MES"),
    mk("E6", "领用 / 出库信息", st.outAt ? `累计领用 ${(realIn * 0.62).toFixed(0)}kg，最近出库 ${st.outAt}` : `截至数据时间无出库记录`, "",
      "本批次领用出库流水", "—", st.outAt ? "仅数据展示" : "无出库记录（按 数据截至−入库 计算储存时长）", "MES（接口待确认）"),
    mk("E7", "储存时长上限", st.limit, "h", "《储丝柜管理规程》批次储存时限", st.limit,
      `当前 ${st.stored}，超限 ${st.over}`, "制度文件"),
  ];
}

// ============ 贡献度（归因服务结果；箱储无统计归因 → 规则比对结论） ============

function moistureContributions(): AiContribution[] {
  return [
    { name: "来料水分偏高", pct: "42%", note: "依据 E1/E3（来料与上游工序水分）" },
    { name: "出口水分控制参数偏差", pct: "31%", note: "依据 E2/E4（出口均值与停机时段）" },
    { name: "生产中断影响", pct: "15%", note: "依据 E4（停机时长）" },
    { name: "车间环境影响", pct: "12%", note: "依据 E5（温湿度合格率）" },
  ];
}

function punctureContributions(missingStem: boolean): AiContribution[] | undefined {
  if (missingStem) return undefined; // 剔梗量缺失 → 数值归因受限（部分完成）
  return [
    { name: "风选剔除异常", pct: "38%", note: "依据 E1（风选剔除量）" },
    { name: "梗中含丝量偏高", pct: "27%", note: "依据 E2（梗及梗中含丝量）" },
    { name: "卷包剔梗量异常", pct: "21%", note: "依据 E3（剔梗量）" },
    { name: "设备磨损（经验项）", pct: "14%", note: "依据 E4 + 历史案例经验" },
  ];
}

// ============ 知识库案例 ============

let kbCases: KbCase[] = [
  // 专家案例 6 条
  { id: "kb-001", code: "CPSFBH", title: "烘丝出口水分仪标定漂移致水分超标", grade: "A类", formedAt: "2025/11/18", scope: "烘丝工序·出口水分仪", cause: "出口水分仪标定漂移，显示值偏低导致实际水分超出上限。", keyEvidence: "标定液复核偏移 -0.4%，人工化验值高于仪表值。", measures: "重新标定仪表并按周期点检，复检 3 批合格。", source: "专家案例", active: true },
  { id: "kb-002", code: "CPSFBH", title: "排潮风门开度未随来料水分调整", grade: "A类", formedAt: "2026/03/07", scope: "烘丝工序·排潮系统", cause: "来料水分升高后排潮风门开度未同步调整，出口水分偏高。", keyEvidence: "来料水分 13.4%，出口均值 13.1%，风门开度与参数卡不符。", measures: "更新参数卡并按来料水分分档设定风门开度。", source: "专家案例", active: true },
  { id: "kb-003", code: "YZCB", title: "烟支通道导板毛刺刮破卷烟纸", grade: "C/D类", formedAt: "2025/09/12", scope: "卷制工序·烟支通道", cause: "导板边缘毛刺刮伤卷烟纸形成刺破。", keyEvidence: "触摸确认毛刺；同位置重复刺破占比高。", measures: "修磨抛光导板，首件全检确认。", source: "专家案例", active: true },
  { id: "kb-004", code: "YZCB", title: "烙铁边角磨损刮伤烟支", grade: "C/D类", formedAt: "2026/01/15", scope: "卷制工序·烙铁组件", cause: "烙铁边角磨损后刮伤烟支表面产生刺破。", keyEvidence: "烙铁边角圆角超标，更换后缺陷消除。", measures: "更换烙铁组件并纳入班组点检。", source: "专家案例", active: true },
  { id: "kb-005", code: "XCCG", title: "先进先出执行不到位致批次滞留", grade: "B类", formedAt: "2025/12/03", scope: "仓储·储丝柜", cause: "库房先进先出执行不到位，角落批次滞留超期。", keyEvidence: "货位台账与批次标识顺序不一致。", measures: "重新规划货位并按批次标识顺序出库。", source: "专家案例", active: true },
  { id: "kb-006", code: "XCCG", title: "库容集中周转调度滞后", grade: "B类", formedAt: "2026/04/21", scope: "仓储·库容调度", cause: "库容压力集中、周转调度滞后造成局部批次超期。", keyEvidence: "同期入库量高出均衡值 18%，出库计划未联动。", measures: "与生产计划联动均衡出库。", source: "专家案例", active: true },
  // 历史诊断案例 2 条（dr-001 / dr-006 判定入库）
  { id: "kb-007", code: "CPSFBH", title: "3#烘丝机出口水分仪标定漂移", grade: "A类", formedAt: "2026/08/27 10:41", scope: "烘丝工序·3#烘丝机", cause: "3#烘丝机出口水分仪标定漂移，显示值偏低导致实际水分超出上限。", keyEvidence: "标定记录复核偏移 -0.4%；人工化验 3 子样均高于仪表值。", measures: "重新标定后复检合格。", source: "历史诊断案例", taskId: "dr-001", judge: "苏恒", active: true },
  { id: "kb-008", code: "YZCB", title: "ZJ17-02 烟支通道导板毛刺", grade: "C/D类", formedAt: "2026/08/30 14:23", scope: "卷制工序·卷接机组ZJ17-02", cause: "ZJ17-02 烟支通道导板有毛刺刮破卷烟纸。", keyEvidence: "触摸导板边缘确认毛刺；抛光后首件 200 支全检无刺破。", measures: "修磨抛光后缺陷未再发生。", source: "历史诊断案例", taskId: "dr-006", judge: "苏恒", active: true },
];

// 案例检索：同缺陷代码 + 启用中 + 排除本任务自身入库的案例，最多 3 条（caseMiss 剧本 0 命中）
function matchCases(t: DiagTask): CaseMatch[] {
  if (t.scenario === "caseMiss") return [];
  const cat = diagCatalogOf(t.code);
  const hit = kbCases
    .filter((c) => c.active && c.code === t.code && c.taskId !== t.id)
    .slice(0, 3);
  return hit.map((c) => {
    const sameMachine = c.scope.includes(t.occurrence.machine);
    const sameBrand = c.scope.includes(t.occurrence.brand);
    const points = [`同缺陷（${c.grade}）`];
    const diffs: string[] = [];
    if (cat?.process) points.push(`同工序（${cat.process}）`);
    if (sameMachine) points.push("同机台");
    else diffs.push(`机台不同（案例：${c.scope.split("·")[1] ?? c.scope}）`);
    if (sameBrand) points.push(`同牌号（${t.occurrence.brand}）`);
    else diffs.push(`牌号不同（案例适用与本次 ${t.occurrence.brand} 牌号场景）`);
    diffs.push(`形成时间 ${c.formedAt.slice(0, 10).replace(/\//g, "-")}，需结合本次数据复核`);
    return { ...c, matchPoints: points, diffs };
  });
}

// ============ AI 建议构建 ============

function buildAdvice(t: DiagTask, evidences: DiagnosisEvidence[], cases: CaseMatch[]): AiAdvice {
  const byNo = (no: string) => evidences.find((e) => e.no === no);
  const firstCase = cases[0]?.title;
  if (t.code === "CPSFBH") {
    const e1 = byNo("E1"), e2 = byNo("E2");
    return {
      overview: `本批次出口加香水分均值 ${e2?.value ?? "—"}%（E2）${e2?.compare ?? ""}；来料水分 ${e1?.value ?? "—"}%（E1）${e1?.compare ?? ""}。`,
      candidates: [
        { name: "来料水分偏高传导至出口", basisNos: ["E1", "E3"], support: "本次数据支持" },
        { name: "出口水分控制参数偏差（排潮风门 / 设定值）", basisNos: ["E2", "E4"], support: "本次数据支持" },
        { name: "出口水分仪标定漂移（仪表显示偏低）", basisNos: ["E2"], caseTitle: firstCase, support: "历史经验支持" },
      ],
      checks: ["复核出口水分仪标定记录与标定液", "核对该班排潮风门开度与参数卡", "抽样复测成品水分（3 个子样）"],
      gaps: [],
    };
  }
  if (t.code === "YZCB") {
    const missing = !!byNo("E3")?.missing;
    return {
      overview: `本批次烟支刺破 ${t.occurrence.count} 支 / 抽检 ${t.occurrence.sampled} 支；风选剔除量 ${byNo("E1")?.value ?? "—"}%（E1），梗中含丝量 ${byNo("E2")?.value ?? "—"}%（E2）。`,
      candidates: [
        { name: "风选剔除不足致梗签残留进入卷制", basisNos: ["E1", "E2"], support: "本次数据支持" },
        { name: "卷包剔梗量异常（卷制过程剔除载荷异常）", basisNos: ["E3"], support: missing ? "依据缺失" : "本次数据支持" },
        { name: "烟支通道导板 / 烙铁磨损刮伤", basisNos: ["E4"], caseTitle: firstCase, support: "历史经验支持" },
      ],
      checks: ["触摸检查烟支通道导板与烙铁边角", "核对风选设备运行参数与剔除物目检", "统计本机台连续 3 班剔梗量趋势"],
      gaps: missing
        ? ["卷包数采剔梗量缺失（E3），该维度候选原因可信度受限，建议人工核查机台剔梗记录"]
        : [],
    };
  }
  // 箱储
  const st = t.storage!;
  return {
    overview: `本批次（${st.batch}）在 ${st.object} 储存 ${st.stored}，超上限 ${st.over}（E7）；${st.outAt ? `最近出库 ${st.outAt}` : "截至数据时间无出库记录（E6）"}。`,
    candidates: [
      { name: "先进先出执行不到位（出库顺序偏离入库顺序）", basisNos: ["E6", "E1"], support: "本次数据支持" },
      { name: "计划-产出错配造成库存积压", basisNos: ["E3", "E4", "E5"], support: "本次数据支持" },
    ],
    checks: ["核对货位台账与批次标识顺序", "比对制丝投料计划与卷包排产", "确认最近领用出库记录"],
    gaps: ["E2/E6 部分数据待接口确认，建议以人工台账复核"],
  };
}

// 数据准备失败（dataFail）场景的建议：依据不足，明确需人工核查
function buildFailAdvice(t: DiagTask): AiAdvice {
  return {
    overview: `数据准备失败：MES 库存 / 出库接口不可用，仅获取基础档案数据（${t.storage ? "储丝柜对象与批次" : "缺陷记录基础信息"}），归因依据不足。`,
    candidates: [],
    checks: ["点击「重试」重新获取 MES 数据", "人工核对 MES 库存与出入库台账"],
    gaps: ["数据准备失败，归因分析被跳过；当前依据不足，需人工核查后判定"],
  };
}

// ============ 任务种子 ============

let taskSeq = 0;

function occ(
  code: string, brand: string, machine: string, shift: string, spec: string,
  batch: string, count: number, sampled: number, date: string, time: string
): DefectRecord {
  const c = diagCatalogOf(code)!;
  taskSeq += 1;
  return {
    id: `dr-${String(taskSeq).padStart(3, "0")}`,
    code, name: c.name, part: c.part, grade: c.grade,
    brand, machine, shift, spec, batch, count, sampled, date, time,
  };
}

// 已完成版本的静态构造（种子任务用；运行时由引擎逐步生成）
function doneVersion(
  t: DiagTask, version: number, startedAt: string,
  partialAttribution: boolean
): AiVersion {
  const missingStem = t.code === "YZCB" && partialAttribution;
  const evidences =
    t.code === "CPSFBH" ? moistureEvidences(t)
    : t.code === "YZCB" ? punctureEvidences(t, missingStem)
    : storageEvidences(t);
  const cases = matchCases(t);
  const nodes: AgentNode[] = [
    {
      key: "data-prep", name: "数据准备", status: "完成", startedAt, finishedAt: clockStr(startedAt, 2),
      ms: NODE_DEFS[0].ms,
      summary: `获取 ${evidences.length} 项关联数据（截至 ${evidences[0]?.asOf ?? "—"}）`,
      details: evidences.map((e) => `${e.no} ${e.name}：${e.value}${e.unit ?? ""}（${e.sourceSystem}）`),
    },
    {
      key: "attribution", name: "归因分析", status: partialAttribution ? "部分完成" : "完成",
      startedAt: clockStr(startedAt, 2), finishedAt: clockStr(startedAt, 5), ms: NODE_DEFS[1].ms,
      summary: partialAttribution
        ? "剔梗量数据缺失，数值归因受限，仅完成 E1/E2/E4 维度比对"
        : t.code === "XCCG"
          ? "按规则比对（计划-产出-出库链路），无统计归因模型"
          : "完成 4 个维度的贡献度计算",
    },
    {
      key: "case-search", name: "案例检索", status: "完成", startedAt: clockStr(startedAt, 2), finishedAt: clockStr(startedAt, 4),
      ms: NODE_DEFS[2].ms,
      summary: cases.length ? `命中 ${cases.length} 条相似案例` : "未命中相似案例（知识库无同缺陷可用案例）",
      details: cases.map((c) => `${c.title}（${c.source}）`),
    },
    {
      key: "advice", name: "结论生成", status: "完成", startedAt: clockStr(startedAt, 5), finishedAt: clockStr(startedAt, 7),
      ms: NODE_DEFS[3].ms,
      summary: `生成 ${t.scenario === "dataFail" ? "受限" : ""}诊断建议（候选原因 ${t.scenario === "dataFail" ? 0 : (t.code === "XCCG" ? 2 : 3)} 项）`.replace("（）", ""),
    },
  ];
  const v: AiVersion = {
    version, startedAt, finishedAt: clockStr(startedAt, 7), nodes, evidences, cases,
  };
  if (t.code === "CPSFBH") v.contributions = moistureContributions();
  else if (t.code === "YZCB") v.contributions = punctureContributions(missingStem);
  else v.ruleNote = "箱储超限为规则型缺陷：按 MES 计划-产出-出库链路与制度上限比对，无统计归因模型，贡献度不适用。";
  if (t.scenario === "dataFail") v.advice = buildFailAdvice(t);
  else v.advice = buildAdvice(t, evidences, cases);
  if (partialAttribution) v.limitations = ["卷包数采剔梗量缺失（E3），贡献度与候选原因可信度受限"];
  return v;
}

// 诊断中种子版本的静态构造（半途：数据准备完成，归因/案例执行中，建议待执行）
function runningVersion(t: DiagTask, version: number, startedAt: string): AiVersion {
  const evidences = punctureEvidences(t, false);
  return {
    version, startedAt,
    nodes: [
      { key: "data-prep", name: "数据准备", status: "完成", startedAt, finishedAt: clockStr(startedAt, 2), ms: NODE_DEFS[0].ms, summary: `获取 ${evidences.length} 项关联数据` },
      { key: "attribution", name: "归因分析", status: "执行中", startedAt: clockStr(startedAt, 2) },
      { key: "case-search", name: "案例检索", status: "执行中", startedAt: clockStr(startedAt, 2) },
      { key: "advice", name: "结论生成", status: "待执行" },
    ],
    evidences, cases: [],
  };
}

function mkTask(
  occurrence: DefectRecord, scenario: DiagScenario, timeType: "检验时间" | "发现时间",
  extra?: { storage?: StorageInfo; versions?: AiVersion[]; judgments?: Judgment[] }
): DiagTask {
  return {
    id: occurrence.id,
    code: occurrence.code,
    occurrence,
    timeType,
    storage: extra?.storage,
    scenario,
    status: "未诊断",
    aiVersions: extra?.versions ?? [],
    judgments: extra?.judgments ?? [],
  };
}

function judged(
  version: number, conclusion: "原因已确定" | "暂未查明", finalCause: string | undefined,
  judge: string, judgedAt: string, aiVersion: number,
  checkNote?: string, kbCaseId?: string
): Judgment {
  return { version, conclusion, finalCause: conclusion === "原因已确定" ? finalCause : undefined, checkNote, judge, judgedAt, aiVersion, kbCaseId };
}

// 13 条任务（与 quality-defect 的 diagnoses 按 缺陷代码+登记日期 一一对应：
// 已判定任务 ↔ 已人工修正的 dg；未诊断/诊断中/待判定任务 ↔ 未修正或无 dg）
let tasks: DiagTask[] = [
  // —— 成品水分不合格（A类）——
  mkTask(occ("CPSFBH", "娇子", "3#烘丝机", "甲班", "硬盒 84mm", "10013", 2, 118, "2026-08-27", "10:15"),
    "normal", "检验时间", {
      versions: [],
      judgments: [judged(1, "原因已确定", "3#烘丝机出口水分仪标定漂移，显示值偏低导致实际水分超出上限，重新标定后复检合格。", "苏恒", "2026/08/27 10:41:18", 1, "标定记录与标定液复核完成，偏移 -0.4%；复检 3 批全部合格。", "kb-007")],
    }),
  mkTask(occ("CPSFBH", "长城", "1#烘丝机", "乙班", "软盒 84mm", "10029", 3, 124, "2026-09-05", "15:40"),
    "normal", "检验时间", {
      judgments: [judged(1, "原因已确定", "排潮风门开度未按来料水分变化调整，出口水分偏高，已更新参数卡并对班组培训。", "叶洛星", "2026/09/05 15:44:20", 1)],
    }),
  mkTask(occ("CPSFBH", "娇子", "1#烘丝机", "乙班", "硬盒 84mm", "10060", 3, 121, "2026-09-10", "16:05"),
    "caseMiss", "检验时间"),
  mkTask(occ("CPSFBH", "宽窄", "3#烘丝机", "丙班", "细支 97mm", "10052", 2, 121, "2026-09-12", "09:33"),
    "normal", "检验时间", {
      judgments: [judged(1, "原因已确定", "该批烟丝来料水分偏高且凉丝时间不足，烘后成品水分超上限，已调整掺配比例并延长凉丝。", "王建国", "2026/09/12 11:30:52", 1)],
    }),
  mkTask(occ("CPSFBH", "娇子", "5#烘丝机", "甲班", "硬盒 84mm", "10088", 3, 118, "2026-09-19", "14:22"),
    "normal", "检验时间"),
  // —— 烟支刺破（C/D类）——
  mkTask(occ("YZCB", "娇子", "卷接机组ZJ17-02", "乙班", "硬盒 84mm", "10036", 2, 121, "2026-08-30", "11:08"),
    "normal", "检验时间", {
      judgments: [judged(1, "原因已确定", "ZJ17-02 烟支通道导板有毛刺刮破卷烟纸，修磨抛光后缺陷未再发生。", "苏恒", "2026/08/30 14:23:56", 1, "触摸导板边缘确认毛刺，抛光后首件 200 支全检无刺破。", "kb-008")],
    }),
  mkTask(occ("YZCB", "长城", "卷接机组ZJ19-01", "甲班", "软盒 84mm", "10045", 3, 124, "2026-09-08", "16:47"),
    "normal", "检验时间", {
      judgments: [judged(1, "原因已确定", "烙铁边角磨损刮伤烟支表面产生刺破，更换烙铁组件并首件确认合格。", "叶洛星", "2026/09/08 09:26:08", 1)],
    }),
  mkTask(occ("YZCB", "娇子", "卷接机组ZJ17-04", "乙班", "硬盒 84mm", "10061", 3, 121, "2026-09-18", "10:35"),
    "normal", "检验时间"),
  mkTask(occ("YZCB", "长城", "4#卷接包机组", "甲班", "软盒 84mm", "10090", 3, 124, "2026-09-22", "17:40"),
    "partial", "检验时间"),
  // —— 箱储存储时间超上限（B类，以 MES 为准）——
  mkTask(occ("XCCG", "长城", "装封箱机XF-01", "甲班", "软盒 84mm", "—", 0, 0, "2026-09-03", "09:20"),
    "normal", "发现时间", {
      storage: { object: "1#储丝柜", objectCode: "CG-01", batch: "YS-1025C", stored: "96h", limit: "72h", over: "24h", inAt: "2026/08/30 10:20", outAt: "2026/09/03 09:05" },
      judgments: [judged(1, "原因已确定", "库房先进先出执行不到位，角落批次滞留超期，已重新规划货位并按批次标识顺序出库。", "王建国", "2026/09/03 16:08:41", 0, "按货位台账逐批核对入库日期，重新标识 12 个批次。")],
    }),
  mkTask(occ("XCCG", "娇子", "装封箱机XF-02", "乙班", "硬盒 84mm", "—", 0, 0, "2026-09-20", "11:12"),
    "normal", "发现时间", {
      storage: { object: "2#储丝柜", objectCode: "CG-02", batch: "YS-1028A", stored: "84h", limit: "72h", over: "12h", inAt: "2026/09/16 23:10" },
    }),
  mkTask(occ("XCCG", "宽窄", "装封箱机XF-01", "甲班", "细支 97mm", "—", 0, 0, "2026-09-21", "15:11"),
    "normal", "发现时间", {
      storage: { object: "1#储丝柜", objectCode: "CG-01", batch: "YS-1026A", stored: "96h", limit: "72h", over: "24h", inAt: "2026/09/17 15:05" },
    }),
  mkTask(occ("XCCG", "娇子", "装封箱机XF-02", "乙班", "硬盒 84mm", "—", 0, 0, "2026-09-23", "09:05"),
    "dataFail", "发现时间", {
      storage: { object: "2#储丝柜", objectCode: "CG-02", batch: "YS-1027B", stored: "79h", limit: "72h", over: "7h", inAt: "2026/09/19 20:40" },
    }),
];

// 种子版本回填（依赖 task 完整构造后生成依据/案例）
(function seedVersions() {
  for (const t of tasks) {
    if (t.judgments.length > 0 && t.code !== "XCCG") {
      // 已判定且走过智能诊断：补已完成 v1（aiVersion=1）；版本时间早于判定时间
      if (t.judgments[0].aiVersion > 0) {
        t.aiVersions.push(doneVersion(t, 1, `${t.occurrence.date.replace(/-/g, "/")} 08:30:00`, false));
      }
    }
    if (t.status === "未诊断" && t.judgments.length > 0) t.status = "已判定";
  }
  // 待判定三条：AI 已完成
  const pending: Record<string, boolean> = { "dr-003": true, "dr-009": true, "dr-012": true };
  for (const t of tasks) {
    if (pending[t.id]) {
      t.status = "待判定";
      t.aiVersions.push(doneVersion(t, 1, `${t.occurrence.date.replace(/-/g, "/")} 17:00:00`, t.scenario === "partial"));
    }
  }
  // 诊断中种子：dr-008（页面挂载时由 ensureProgress 恢复推进）
  const running = tasks.find((t) => t.id === "dr-008");
  if (running) {
    running.status = "诊断中";
    running.aiVersions.push(runningVersion(running, 1, "2026/09/23 09:24:10"));
  }
})();

// ============ store API：查询 ============

export function listTasks(): DiagTask[] {
  return tasks;
}

export function getTask(id: string): DiagTask | undefined {
  return tasks.find((t) => t.id === id);
}

export function statusCounts(): { pending: number; judged: number; all: number } {
  const p = tasks.filter((t) => t.status !== "已判定").length;
  return { pending: p, judged: tasks.length - p, all: tasks.length };
}

// 最新 AI 版本（未开始诊断为 undefined）
export function latestVersion(t: DiagTask): AiVersion | undefined {
  return t.aiVersions[t.aiVersions.length - 1];
}

// ============ Agent 执行引擎 ============

// 进行中的调度标记（`${taskId}:${version}:${key}`），用于幂等与恢复判断
const runningKeys = new Set<string>();

function nodeOf(v: AiVersion, key: AgentNodeKey): AgentNode | undefined {
  return v.nodes.find((n) => n.key === key);
}

function isTerminal(n: AgentNode): boolean {
  return n.status === "完成" || n.status === "部分完成" || n.status === "失败" || n.status === "跳过";
}

function update(fn: () => void) {
  fn();
  emit();
}

// 启动 / 重新诊断：诊断中不重复发起；已判定重新诊断仅追加新版本、不重置处理状态；
// 数据准备失败也可通过「重新诊断」整体重跑（或用节点「重试」恢复）
export function startDiagnosis(taskId: string): void {
  const t = getTask(taskId);
  if (!t) return;
  if (t.status === "诊断中") return; // 不重复发起
  const version = t.aiVersions.length + 1;
  const v: AiVersion = { version, startedAt: nowStr(), nodes: freshNodes(), evidences: [], cases: [] };
  update(() => {
    t.aiVersions.push(v);
    if (t.status !== "已判定") t.status = "诊断中";
  });
  runNode(t, v, "data-prep");
}

// 页面挂载恢复：种子“诊断中”任务在无活跃调度时恢复推进（退出不取消、重进可看）
export function ensureProgress(taskId: string): void {
  const t = getTask(taskId);
  if (!t || t.status !== "诊断中") return;
  const alive = Array.from(runningKeys).some((k) => k.startsWith(`${t.id}:`));
  if (alive) return;
  const v = latestVersion(t);
  if (!v) return;
  // 执行中节点回退为待执行后按依赖序恢复
  update(() => {
    v.nodes.forEach((n) => {
      if (n.status === "执行中") n.status = "待执行";
    });
  });
  const prep = nodeOf(v, "data-prep")!;
  if (prep.status === "完成") {
    runNode(t, v, "attribution");
    runNode(t, v, "case-search");
  } else {
    runNode(t, v, "data-prep");
  }
}

function runNode(t: DiagTask, v: AiVersion, key: AgentNodeKey): void {
  const n = nodeOf(v, key);
  if (!n || n.status !== "待执行") return; // 幂等
  const mark = `${t.id}:${v.version}:${key}`;
  if (runningKeys.has(mark)) return;
  runningKeys.add(mark);
  update(() => {
    n.status = "执行中";
    n.startedAt = nowStr();
  });
  const def = NODE_DEFS.find((d) => d.key === key)!;
  setTimeout(() => {
    runningKeys.delete(mark);
    finishNode(t, v, key, def.ms);
  }, def.ms);
}

function finishNode(t: DiagTask, v: AiVersion, key: AgentNodeKey, ms: number): void {
  const n = nodeOf(v, key);
  if (!n) return;
  const finish = () => {
    n.finishedAt = nowStr();
    n.ms = ms;
  };
  if (key === "data-prep") {
    if (t.scenario === "dataFail" && !v.failedOnce) {
      v.failedOnce = true;
      update(() => {
        n.status = "失败";
        n.error = "MES 库存 / 出库接口连接失败：库存与领用出库数据未获取（接口待确认）";
        n.summary = "数据获取失败（2/7 项基础档案数据）";
        finish();
        // 归因分析跳过（上游数据缺失），案例检索本地照常
        const attr = nodeOf(v, "attribution")!;
        attr.status = "跳过";
        attr.summary = "上游数据缺失，跳过归因计算";
      });
      runNode(t, v, "case-search");
      return;
    }
    const evidences =
      t.code === "CPSFBH" ? moistureEvidences(t)
      : t.code === "YZCB" ? punctureEvidences(t, false)
      : storageEvidences(t);
    update(() => {
      n.status = "完成";
      n.summary = `获取 ${evidences.length} 项关联数据（截至 ${evidences[0]?.asOf ?? "—"}）`;
      n.details = evidences.map((e) => `${e.no} ${e.name}：${e.value}${e.unit ?? ""}（${e.sourceSystem}）`);
      finish();
      v.evidences = evidences;
    });
    runNode(t, v, "attribution");
    runNode(t, v, "case-search");
    return;
  }
  if (key === "attribution") {
    const missingStem = t.code === "YZCB" && t.scenario === "partial";
    update(() => {
      n.status = missingStem ? "部分完成" : "完成";
      n.summary = missingStem
        ? "剔梗量数据缺失，数值归因受限，仅完成 E1/E2/E4 维度比对"
        : t.code === "XCCG"
          ? "按规则比对（计划-产出-出库链路），无统计归因模型"
          : "完成 4 个维度的贡献度计算";
      finish();
      if (t.code === "CPSFBH") v.contributions = moistureContributions();
      else if (t.code === "YZCB") v.contributions = punctureContributions(missingStem);
      else v.ruleNote = "箱储超限为规则型缺陷：按 MES 计划-产出-出库链路与制度上限比对，无统计归因模型，贡献度不适用。";
      if (missingStem) v.limitations = ["卷包数采剔梗量缺失（E3），贡献度与候选原因可信度受限"];
    });
    afterParallel(t, v);
    return;
  }
  if (key === "case-search") {
    const cases = matchCases(t);
    update(() => {
      n.status = "完成";
      n.summary = cases.length ? `命中 ${cases.length} 条相似案例` : "未命中相似案例（知识库无同缺陷可用案例）";
      n.details = cases.map((c) => `${c.title}（${c.source}）`);
      finish();
      v.cases = cases;
    });
    afterParallel(t, v);
    return;
  }
  // advice：结论生成
  update(() => {
    const prep = nodeOf(v, "data-prep")!;
    const advice = prep.status === "失败" ? buildFailAdvice(t) : buildAdvice(t, v.evidences, v.cases);
    n.status = "完成";
    n.summary = `生成诊断建议（候选原因 ${advice.candidates.length} 项）`;
    finish();
    v.advice = advice;
    v.finishedAt = nowStr();
    if (t.status === "诊断中") t.status = "待判定";
  });
}

// 归因与案例检索均终结后推进结论生成
function afterParallel(t: DiagTask, v: AiVersion): void {
  const attr = nodeOf(v, "attribution");
  const cs = nodeOf(v, "case-search");
  if (attr && cs && isTerminal(attr) && isTerminal(cs)) runNode(t, v, "advice");
}

// 失败节点重试（保留已成功产物）：数据准备成功后重跑被跳过的归因并重新生成建议
export function retryNode(taskId: string, key: AgentNodeKey): void {
  const t = getTask(taskId);
  if (!t) return;
  const v = latestVersion(t);
  if (!v) return;
  const n = nodeOf(v, key);
  if (!n || n.status !== "失败") return;
  update(() => {
    n.status = "待执行";
    n.error = undefined;
    v.finishedAt = undefined;
    // 归因从“跳过”恢复重跑；结论生成重新生成（覆盖受限版建议）
    const attr = nodeOf(v, "attribution");
    if (attr && attr.status === "跳过") attr.status = "待执行";
    const adv = nodeOf(v, "advice");
    if (adv && adv.status === "完成") {
      adv.status = "待执行";
      adv.startedAt = undefined;
      adv.finishedAt = undefined;
    }
  });
  runNode(t, v, key);
}

// ============ 人工判定 ============

export function saveDraft(taskId: string, draft: JudgmentDraft): void {
  const t = getTask(taskId);
  if (!t) return;
  update(() => {
    t.draft = { ...draft };
  });
}

// 采纳智能诊断原因：取最新版本候选原因拼接文本（无有效候选返回 undefined）
export function adoptAiText(taskId: string): string | undefined {
  const t = getTask(taskId);
  if (!t) return undefined;
  const v = latestVersion(t);
  const candidates = v?.advice?.candidates.filter((c) => c.support !== "依据缺失") ?? [];
  if (candidates.length === 0) return undefined;
  return candidates
    .map((c, i) => `${i + 1}. ${c.name}（${c.support}，依据 ${c.basisNos.join("/")}）`)
    .join("\n");
}

// 知识库 upsert：同一判定记录重复提交更新原案例；修订同步更新；改判“暂未查明”停用案例
function upsertKnowledgeCase(t: DiagTask, conclusion: "原因已确定" | "暂未查明", finalCause: string | undefined, judge: string, judgedAt: string): string {
  const existing = kbCases.find((c) => c.taskId === t.id);
  const cat = diagCatalogOf(t.code);
  const grade = cat ? `${cat.grade}类` : "—";
  if (existing) {
    existing.active = conclusion === "原因已确定";
    existing.cause = finalCause ?? "暂未查明";
    existing.formedAt = judgedAt;
    existing.judge = judge;
    return existing.id;
  }
  const id = `kb-${String(kbCases.length + 1).padStart(3, "0")}`;
  kbCases.push({
    id, code: t.code,
    title: `${t.occurrence.machine}·${t.occurrence.batch} ${t.occurrence.name}`,
    grade, formedAt: judgedAt, scope: `${cat?.process ?? "—"}·${t.storage ? t.storage.object : t.occurrence.machine}`,
    cause: finalCause ?? "暂未查明",
    keyEvidence: t.aiVersions.length ? `智能诊断 v${latestVersion(t)?.version} 依据 + 人工核查确认` : "人工核查确认（无智能诊断）",
    source: "历史诊断案例", taskId: t.id, judge, active: conclusion === "原因已确定",
  });
  return id;
}

// 确认判定：校验必填 → 产生新版本判定 → 状态已判定 → 桥接写回 diagnoses store
export function confirmJudgment(
  taskId: string,
  input: { conclusion: "原因已确定" | "暂未查明"; finalCause?: string; checkNote?: string; addToKb: boolean },
  ctx: { user: string; now: string }
): { ok: true; judgment: Judgment } | { ok: false; error: string } {
  const t = getTask(taskId);
  if (!t) return { ok: false, error: "任务不存在" };
  if (!input.conclusion) return { ok: false, error: "请先选择判定结论" };
  if (input.conclusion === "原因已确定" && !input.finalCause?.trim()) {
    return { ok: false, error: "请填写最终缺陷原因" };
  }
  const finalCause = input.finalCause?.trim();
  const prev = t.judgments[t.judgments.length - 1];
  const j: Judgment = {
    version: t.judgments.length + 1,
    conclusion: input.conclusion,
    finalCause,
    checkNote: input.checkNote?.trim() || undefined,
    judge: ctx.user,
    judgedAt: ctx.now,
    aiVersion: latestVersion(t)?.version ?? 0,
  };
  // 知识库：新增判定勾选入库 → 新建；已有案例的判定 → 修订同步更新（改判暂未查明停用）
  if (prev?.kbCaseId) {
    j.kbCaseId = prev.kbCaseId;
    upsertKnowledgeCase(t, input.conclusion, finalCause, ctx.user, ctx.now);
  } else if (input.addToKb && input.conclusion === "原因已确定") {
    j.kbCaseId = upsertKnowledgeCase(t, input.conclusion, finalCause, ctx.user, ctx.now);
  }
  update(() => {
    t.judgments.push(j);
    t.status = "已判定";
    t.draft = undefined;
  });
  // 桥接：按 缺陷代码+登记日期 写回 diagnoses（诊断记录页 / 缺陷分析抽屉同源同步）
  saveDiagnosisCauseByCodeDate(
    t.code,
    t.occurrence.date,
    finalCause ?? "暂未查明（待补充核查）",
    ctx
  );
  return { ok: true, judgment: j };
}

// ============ 视图辅助 ============

// 缺陷率：抽检数为 0 或缺失 → null（展示 “—”）；箱储不适用
export function defectRateOf(t: DiagTask): number | null {
  if (t.storage) return null;
  if (!t.occurrence.sampled) return null;
  return (t.occurrence.count / t.occurrence.sampled) * 100;
}

export function gradeLabelOf(t: DiagTask): string {
  return `${diagCatalogOf(t.code)?.grade ?? "—"}类`;
}

// 诊断摘要（卡片一行展示）：未诊断=请启动智能分析；已生成结果=一句候选原因；已判定=最终结论
export function summaryOf(t: DiagTask): string {
  if (t.status === "未诊断") return "请启动智能分析";
  if (t.status === "诊断中") return "智能诊断中......";
  if (t.status === "待判定") {
    const cands = latestVersion(t)?.advice?.candidates ?? [];
    if (cands.length === 0) return "AI 依据不足，待人工核查判定";
    return cands[0].name;
  }
  const j = t.judgments[t.judgments.length - 1];
  if (!j) return "—";
  return j.conclusion === "原因已确定" ? j.finalCause ?? "—" : "暂未查明";
}

// 主按钮（卡片 / 表格操作列）：按处理状态两档——待判定（含未诊断/诊断中）打开智能诊断
// （未诊断自动启动），已判定默认进入人工判定工作区只读查看
export function primaryActionOf(t: DiagTask): { label: string; query: string } {
  if (t.status === "已判定") return { label: "查看结果", query: "?tab=judge" };
  return { label: "智能诊断", query: "?start=1" };
}
