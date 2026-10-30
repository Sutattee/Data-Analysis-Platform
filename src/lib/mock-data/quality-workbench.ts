// 工艺质量工作台（智能工作台）数据层
// 定位：「我的待办 · 已授权责任范围」视角的任务聚合页，不是告警中心全量清单——
// 从现有 mock 数据源按谓词挑选固定关注条目（与需求示例一一对应），保证工作台展示与跳转落点一致；
// 告警处理状态实时读取会话级覆盖（告警详情页确认后返回本页自动移出待处理）。
import type { AlertLevel, AlertRecord } from "@/types";
import { LEVEL_RANK, TYPE_DISPLAY } from "./quality-alerts";
import { ALERT_RECORDS, applyHandledOverride } from "./alerts";
import {
  defectRateOf,
  gradeLabelOf,
  listTasks,
  primaryActionOf,
  type DiagTask,
  type StorageInfo,
} from "./defect-diagnosis-flow";
import {
  forecastOf,
  levelChangeOf as defectLevelChangeOf,
  UPDATED_AT,
  type DefectCode,
} from "./quality-defect-forecast";
import {
  levelChangeOf,
  machineTagOf,
  stabilityForecastOf,
} from "./quality-stability-forecast";

const enc = encodeURIComponent;

/** 头部副标题的快照口径（纯前端模拟数据为静态快照，不做轮询） */
export const WORKBENCH_UPDATED_AT = "10-22 09:30";

/* ---------------- 告警 ---------------- */

export interface WorkbenchAlarm {
  id: string;
  level: AlertLevel;
  typeLabel: string; // 实测异常 / 预测风险
  title: string;
  objectName: string;
  metricName: string;
  triggerTime: string; // YYYY-MM-DD HH:mm
  valueLabel: string;
  baselineLabel: string;
  deviationValue: string;
  batchLabel?: string; // 缺陷预测类记录携带批次
  aiInsight?: string; // 重点告警（综合优先级前两条）AI 解读
  handleHref: string; // 处理告警 → 告警详情页
  forecastHref?: string; // 预测详情 → 对应预测页深链
  forecastKind?: "稳定性预测" | "缺陷预测";
}

export type AlarmSortKey = "priority" | "latest";

/** 质量域 ZL 记录（应用会话级处理覆盖后） */
function qualityRecords(): AlertRecord[] {
  return ALERT_RECORDS.filter((r) => r.id.startsWith("ZL")).map(applyHandledOverride);
}

/** 缺陷风险评分类指标 → 缺陷预测页 code */
const DEFECT_CODE_OF: Record<string, DefectCode> = {
  成品水分不合格风险评分: "CPSFBH",
  烟支刺破风险评分: "YZCB",
  箱储存储时间超上限风险评分: "XCCG",
};

/** 稳定性指标名 → 稳定性预测页 code（quality-alerts 与稳定性预测页同源） */
const SF_CODE_OF: Record<string, string> = {
  松散回潮非稳态指数: "SF02",
  成品水分标准偏差: "SF01",
  烘丝工序非稳态指数: "SF03",
  烘丝机出口水分偏差: "SF04",
  加香出口水分不达标次数: "SF05",
  "烟支单支克重偏差(毫克)": "SF07",
  非细支单支重量偏差: "SF06",
  常规烟支硬度变异系数: "SF08",
  中支烟硬度变异系数: "SF09",
};

/** 预测风险告警 → 预测页深链（缺陷评分类优先，其余按稳定性指标；无对应页则不展示按钮） */
function forecastLinkOf(r: AlertRecord): Pick<WorkbenchAlarm, "forecastHref" | "forecastKind"> {
  if (r.type !== "预测风险") return {};
  const dCode = DEFECT_CODE_OF[r.metricName];
  if (dCode && r.batch) {
    return {
      forecastHref: `/quality/forecast/defect?code=${dCode}&object=${enc(r.objectName)}&batch=${enc(r.batch)}`,
      forecastKind: "缺陷预测",
    };
  }
  const sf = SF_CODE_OF[r.metricName];
  if (sf) {
    return {
      forecastHref: `/quality/forecast/stability?metric=${sf}&machine=${enc(r.objectName)}`,
      forecastKind: "稳定性预测",
    };
  }
  return {};
}

function toAlarm(r: AlertRecord, isFocus: boolean): WorkbenchAlarm {
  return {
    id: r.id,
    level: r.level,
    typeLabel: TYPE_DISPLAY[r.type],
    title: r.title,
    objectName: r.objectName,
    metricName: r.metricName,
    triggerTime: r.triggerTime,
    valueLabel: r.valueLabel,
    baselineLabel: r.baselineLabel,
    deviationValue: r.deviationValue,
    batchLabel: r.batch?.startsWith("P") ? r.batch : undefined,
    // 重点告警 AI 解读：派生自记录的原因摘要与处置建议
    aiInsight:
      isFocus && r.causeSummary && r.suggestion
        ? `${r.causeSummary} ${r.suggestion}`
        : undefined,
    handleHref: `/quality/alert/records/${r.id}`,
    ...forecastLinkOf(r),
  };
}

/** 待处理告警绑定谓词（对应需求示例 a1-a5，首页仅展示前 5 条；记录被会话确认处理后自动移出） */
const ALARM_BINDINGS: Array<(r: AlertRecord) => boolean> = [
  // a1 危险·实测：成品水分标准偏差 @3#松散回潮机 连续5个批次超上限（飘移）
  (r) =>
    r.metricName === "成品水分标准偏差" &&
    r.objectName === "3#松散回潮机" &&
    r.consecutiveShifts === 5,
  // a2 危险·预测：同指标同机 预测风险 危险（预计越过危险线 2.40）
  (r) =>
    r.metricName === "成品水分标准偏差" &&
    r.objectName === "3#松散回潮机" &&
    r.type === "预测风险" &&
    r.level === "危险",
  // a3 告警·预测：3#烘丝机 预测成品水分（缺陷预测，预测值 13.5% 超出上限 0.7pct）
  (r) => r.id === "ZL20261019004",
  // a4 告警·实测：常规烟支硬度变异系数 @2#卷接包机组
  (r) =>
    r.metricName === "常规烟支硬度变异系数" &&
    r.objectName === "2#卷接包机组" &&
    r.type === "当前异常",
  // a5 预警·预测：1#烘丝机 烘丝工序非稳态指数（预计越过上限）
  (r) => r.id === "ZL20260713010",
];

/**
 * 告警排序（PRD §3.2/3.3）：
 * priority 综合优先级 = 等级降序 → 同级实测先于预测 → 回退首次待处理时间升序 → 稳定主键；
 * latest 最新触发（降序）
 */
export function sortAlarms(alarms: WorkbenchAlarm[], key: AlarmSortKey): WorkbenchAlarm[] {
  const list = [...alarms];
  if (key === "latest") {
    list.sort((a, b) => b.triggerTime.localeCompare(a.triggerTime) || a.id.localeCompare(b.id));
  } else {
    list.sort(
      (a, b) =>
        (LEVEL_RANK[b.level] ?? 0) - (LEVEL_RANK[a.level] ?? 0) ||
        (a.typeLabel === b.typeLabel ? 0 : a.typeLabel === "实测异常" ? -1 : 1) ||
        a.triggerTime.localeCompare(b.triggerTime) ||
        a.id.localeCompare(b.id)
    );
  }
  return list;
}

/* ---------------- 待判定缺陷 ---------------- */

export interface WorkbenchDefect {
  taskId: string;
  name: string;
  batch: string;
  brand: string;
  shift: string;
  date: string; // MM-DD
  time: string;
  count: number;
  sampled: number;
  rate: number | null; // 缺陷率 %
  storage?: StorageInfo; // 箱储任务的对象信息（批次/对象取自 MES，数值行改储存时长口径）
  gradeLabel?: string; // 缺陷类别标签（A类 / B类 / C/D类，名称后展示）
  status: string; // 未诊断 / 待判定 / …
  href: string; // 智能诊断 → 诊断详情页（未诊断自动启动）
}

/** 工作台固定关注的两条缺陷任务（对应需求示例 d1=dr-005 未诊断、d2=dr-012 箱储超限待判定） */
const DEFECT_TASK_IDS = ["dr-005", "dr-012"];

function buildDefects(): WorkbenchDefect[] {
  const tasks = listTasks();
  return DEFECT_TASK_IDS.map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is DiagTask => !!t)
    .map((t) => {
      const action = primaryActionOf(t);
      return {
        taskId: t.id,
        name: t.occurrence.name,
        // 箱储任务批次以 MES 为准（YS-xxxx，与缺陷诊断页同口径）
        batch: t.storage ? t.storage.batch : t.occurrence.batch,
        brand: t.occurrence.brand,
        shift: t.occurrence.shift,
        date: t.occurrence.date.slice(5),
        time: t.occurrence.time,
        count: t.occurrence.count,
        sampled: t.occurrence.sampled,
        rate: defectRateOf(t),
        storage: t.storage,
        gradeLabel: gradeLabelOf(t),
        status: t.status,
        href: `/quality/diagnosis/defect/${t.id}${action.query}`,
      };
    });
}

/* ---------------- 预测关注 ---------------- */

export interface WorkbenchAttention {
  key: string;
  kind: "稳定性预测" | "缺陷预测";
  name: string; // 指标名称 / 缺陷名称
  machine: string;
  statusText: string;
  summary: string; // 预测结论
  updatedLabel: string; // 更新于 HH:mm
  recordHref?: string; // 处理记录 → 已处理告警详情
  forecastHref: string; // 预测详情深链
}

/**
 * 预测关注（容量 ≤6，去重口径：已有关联待处理告警的对象只在告警区展示）：
 * p1 稳定性：SF07 烟支单支克重偏差 —— 关联告警已确认处理，持续跟踪预测走势；
 * p2 缺陷：CPSFBH 成品水分 @1#烘丝机 —— 预测值恰达允许上限，本轮有预测、未触发告警
 * （3#烘丝机预测成品水分已有关联待处理告警 a3，按去重口径只在告警区展示）
 */
function buildAttentions(): WorkbenchAttention[] {
  const list: WorkbenchAttention[] = [];

  const handled = qualityRecords().find(
    (r) => r.metricName === "烟支单支克重偏差(毫克)" && !!r.handledBy
  );
  if (handled) {
    const f = stabilityForecastOf("SF07", handled.objectName);
    const trend = f ? `${machineTagOf(f).text}，${levelChangeOf(f).text}` : "暂无有效预测";
    list.push({
      key: "p1",
      kind: "稳定性预测",
      name: "烟支单支克重偏差",
      machine: handled.objectName,
      statusText: "告警已处理 · 持续关注",
      summary: trend,
      updatedLabel: f ? f.updatedAt.slice(-5) : "—",
      recordHref: `/quality/alert/records/${handled.id}`,
      forecastHref: `/quality/forecast/stability?metric=SF07&machine=${enc(handled.objectName)}`,
    });
  }

  const f2 = forecastOf("CPSFBH", "1#烘丝机", "P20261019-01");
  const m = f2.moisture;
  const change = defectLevelChangeOf(f2);
  list.push({
    key: "p2",
    kind: "缺陷预测",
    name: "预测成品水分",
    machine: "1#烘丝机",
    statusText: "未触发告警",
    summary: m ? `预测窗口超限最大预测值 ${m.predicted}（${m.overText}），${change.text}` : change.text,
    updatedLabel: UPDATED_AT.slice(-5),
    forecastHref: `/quality/forecast/defect?code=CPSFBH&object=${enc("1#烘丝机")}&batch=${enc("P20261019-01")}`,
  });

  return list;
}

/* ---------------- 推荐开展 ---------------- */

export interface WorkbenchRecommend {
  title: string;
  desc: string;
  href: string;
  icon: "sliders" | "messages" | "file";
}

/** 三项顺序固定（PRD §6.7，说明文案为 PRD 原文） */
export const WORKBENCH_RECOMMENDS: WorkbenchRecommend[] = [
  { title: "工艺参数推荐", desc: "设定目标，获取调参建议", href: "/quality/parameter-recommend", icon: "sliders" },
  { title: "智能问数", desc: "查指标、比批次、追问变化", href: "/quality/qa", icon: "messages" },
  { title: "报告生成", desc: "汇总质量态势与处理情况", href: "/reports", icon: "file" },
];

/* ---------------- 快照 ---------------- */

export interface WorkbenchSnapshot {
  alarms: WorkbenchAlarm[]; // 已按综合优先级排序；前两条为重点告警（带 AI 解读）
  defects: WorkbenchDefect[];
  attentions: WorkbenchAttention[];
}

/** 构建工作台快照（每次挂载重建，实时反映告警处理覆盖与诊断任务状态） */
export function buildWorkbenchSnapshot(): WorkbenchSnapshot {
  const records = qualityRecords();
  const bound = ALARM_BINDINGS.map((pred) => records.find(pred)).filter(
    (r): r is AlertRecord => !!r && !r.handledBy
  );
  const alarms = sortAlarms(bound.map((r) => toAlarm(r, false)), "priority");
  // AI 解读仅重点告警：综合优先级前两条
  for (const a of alarms.slice(0, 2)) {
    const rec = bound.find((r) => r.id === a.id);
    if (rec?.causeSummary && rec?.suggestion) a.aiInsight = `${rec.causeSummary} ${rec.suggestion}`;
  }
  return {
    alarms,
    defects: buildDefects(),
    attentions: buildAttentions(),
  };
}
