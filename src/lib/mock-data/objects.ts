import type { ObjectMetricRef, ObjectRelation } from "@/types";
import { metricList } from "./metric-management";

/**
 * 对象管理 —— 模拟数据 + 会话级 store（刷新还原）。
 * 统一维护企业内的对象结构及"对象-指标"关联关系。
 * 对象来源以能源组织树（alerts.ts ENERGY_ORG_TREE）与重点网格监测（grid-monitor.ts）的设备/仪表为基础。
 */

// 预置对象：覆盖主要车间与系统的代表对象（含多指标关联演示）
let objects: ObjectRelation[] = [
  {
    id: "obj-001",
    name: "卷包车间空调（门前）",
    system: "中央空调（风机）",
    org: "什邡卷烟厂",
    dept: "卷包车间",
    meterNo: "ET3C06_5",
    metrics: [
      { metricId: "m7", nameCn: "单箱综合能耗", code: "I_ENG_002", domain: "能源管理" },
      { metricId: "m1", nameCn: "单位产值碳排放量", code: "I_ENG_001", domain: "能源管理" },
    ],
    createdAt: "2026-05-12 09:20",
    createdBy: "王五",
    updatedAt: "2026-07-02 15:40",
    updatedBy: "王五",
  },
  {
    id: "obj-002",
    name: "1#烘丝机",
    system: "制丝线",
    org: "什邡卷烟厂",
    dept: "制丝车间",
    meterNo: "ET1A01_1",
    metrics: [
      { metricId: "m7", nameCn: "单箱综合能耗", code: "I_ENG_002", domain: "能源管理" },
      { metricId: "m9", nameCn: "烘丝机出口水分偏差", code: "I_QUAL_002", domain: "工艺质量" },
    ],
    createdAt: "2026-05-12 09:25",
    createdBy: "王五",
  },
  {
    id: "obj-003",
    name: "1#空压机",
    system: "空压系统",
    org: "什邡卷烟厂",
    dept: "动力车间",
    meterNo: "ET2A01_1",
    metrics: [
      { metricId: "m7", nameCn: "单箱综合能耗", code: "I_ENG_002", domain: "能源管理" },
    ],
    createdAt: "2026-05-13 10:05",
    createdBy: "王五",
  },
  {
    id: "obj-004",
    name: "燃气锅炉",
    system: "锅炉系统",
    org: "什邡卷烟厂",
    dept: "动力车间",
    meterNo: "ET2C01_1",
    metrics: [
      { metricId: "m7", nameCn: "单箱综合能耗", code: "I_ENG_002", domain: "能源管理" },
      { metricId: "m1", nameCn: "单位产值碳排放量", code: "I_ENG_001", domain: "能源管理" },
    ],
    createdAt: "2026-05-13 10:10",
    createdBy: "王五",
  },
  {
    id: "obj-005",
    name: "1号主变压器",
    system: "配电系统",
    org: "什邡卷烟厂",
    dept: "动力车间",
    meterNo: "ET2D01_1",
    metrics: [
      { metricId: "m7", nameCn: "单箱综合能耗", code: "I_ENG_002", domain: "能源管理" },
    ],
    createdAt: "2026-05-13 10:15",
    createdBy: "王五",
  },
  {
    id: "obj-006",
    name: "1#卷烟机",
    system: "卷接包机组",
    org: "什邡卷烟厂",
    dept: "卷包车间",
    meterNo: "ET3A01_1",
    metrics: [
      { metricId: "m4", nameCn: "单箱耗烟叶量", code: "I_MAT_001", domain: "物耗管理" },
      { metricId: "m5", nameCn: "单箱耗嘴棒量", code: "I_MAT_002", domain: "物耗管理" },
      { metricId: "m3", nameCn: "卷接设备运行效率", code: "I_PROD_002", domain: "生产管理" },
    ],
    createdAt: "2026-05-14 08:50",
    createdBy: "张三",
  },
  {
    id: "obj-007",
    name: "包装机",
    system: "卷接包机组",
    org: "什邡卷烟厂",
    dept: "卷包车间",
    meterNo: "ET3A01_2",
    metrics: [
      { metricId: "m2", nameCn: "包装设备运行效率", code: "I_PROD_001", domain: "生产管理" },
      { metricId: "m6", nameCn: "优质品率", code: "I_QUAL_001", domain: "质量管理" },
    ],
    createdAt: "2026-05-14 08:55",
    createdBy: "张三",
  },
  {
    id: "obj-008",
    name: "2#烘丝机",
    system: "制丝线",
    org: "什邡卷烟厂",
    dept: "制丝车间",
    meterNo: "ET1A02_1",
    metrics: [
      { metricId: "m7", nameCn: "单箱综合能耗", code: "I_ENG_002", domain: "能源管理" },
      { metricId: "m9", nameCn: "烘丝机出口水分偏差", code: "I_QUAL_002", domain: "工艺质量" },
    ],
    createdAt: "2026-05-15 09:30",
    createdBy: "王五",
  },
  {
    id: "obj-009",
    name: "高架立体库",
    system: "立体库",
    org: "什邡卷烟厂",
    dept: "物资管理科",
    meterNo: "ET5A01_1",
    metrics: [
      { metricId: "m8", nameCn: "生产效率", code: "I_PROD_003", domain: "生产管理" },
      { metricId: "m10", nameCn: "百小时停机断料率", code: "I_EQUIP_001", domain: "设备管理" },
    ],
    createdAt: "2026-05-16 14:00",
    createdBy: "李四",
  },
  {
    id: "obj-010",
    name: "中央空调机组",
    system: "中央空调",
    org: "什邡卷烟厂",
    dept: "动力车间",
    meterNo: "ET2F01_1",
    metrics: [
      { metricId: "m7", nameCn: "单箱综合能耗", code: "I_ENG_002", domain: "能源管理" },
      { metricId: "m1", nameCn: "单位产值碳排放量", code: "I_ENG_001", domain: "能源管理" },
    ],
    createdAt: "2026-05-17 11:10",
    createdBy: "王五",
  },
  {
    id: "obj-011",
    name: "3#卷烟机",
    system: "卷接包机组",
    org: "什邡卷烟厂",
    dept: "卷包车间",
    meterNo: "ET3A03_1",
    metrics: [
      { metricId: "m3", nameCn: "卷接设备运行效率", code: "I_PROD_002", domain: "生产管理" },
    ],
    createdAt: "2026-05-18 10:20",
    createdBy: "张三",
  },
  {
    id: "obj-012",
    name: "实验室空调机组",
    system: "质量检验",
    org: "什邡卷烟厂",
    dept: "工艺质量科",
    meterNo: "ET7A01_1",
    metrics: [
      { metricId: "m6", nameCn: "优质品率", code: "I_QUAL_001", domain: "质量管理" },
    ],
    createdAt: "2026-05-19 15:45",
    createdBy: "赵六",
  },
  {
    id: "obj-013",
    name: "机房精密空调",
    system: "信息化",
    org: "什邡卷烟厂",
    dept: "信息科",
    meterNo: "ET6C01_1",
    metrics: [],
    createdAt: "2026-05-20 09:00",
    createdBy: "李四",
  },
  {
    id: "obj-014",
    name: "膨胀机",
    system: "膨胀线",
    org: "什邡卷烟厂",
    dept: "制丝车间",
    meterNo: "ET1B01_1",
    metrics: [
      { metricId: "m7", nameCn: "单箱综合能耗", code: "I_ENG_002", domain: "能源管理" },
    ],
    createdAt: "2026-05-21 13:30",
    createdBy: "王五",
  },
  {
    id: "obj-015",
    name: "离心式冷水机组",
    system: "制冷系统",
    org: "什邡卷烟厂",
    dept: "动力车间",
    meterNo: "ET2B01_1",
    metrics: [
      { metricId: "m7", nameCn: "单箱综合能耗", code: "I_ENG_002", domain: "能源管理" },
    ],
    createdAt: "2026-05-22 09:40",
    createdBy: "王五",
  },
];

// 新建 id 序列（确定性递增）
let nextSeq = 100;
function nextObjectId(): string {
  nextSeq += 1;
  return `obj-${String(nextSeq).padStart(3, "0")}`;
}

// 对象列表（创建时间倒序，新增在前）
export function listObjects(): ObjectRelation[] {
  return [...objects].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getObject(id: string): ObjectRelation | undefined {
  return objects.find((o) => o.id === id);
}

// 更新对象（含对象-指标关联关系）
export function updateObject(
  id: string,
  patch: Partial<Omit<ObjectRelation, "id">>,
  ctx?: { user: string; now: string }
): ObjectRelation | undefined {
  const idx = objects.findIndex((o) => o.id === id);
  if (idx === -1) return undefined;
  objects[idx] = {
    ...objects[idx],
    ...patch,
    ...(ctx ? { updatedAt: ctx.now, updatedBy: ctx.user } : {}),
  };
  return objects[idx];
}

// 新增对象（批量导入 / 手动新增公用；仪表号冲突返回 null）
export function addObject(
  input: Omit<ObjectRelation, "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy">,
  ctx: { user: string; now: string }
): ObjectRelation | null {
  if (objects.some((o) => o.meterNo === input.meterNo)) return null;
  const created: ObjectRelation = {
    id: nextObjectId(),
    ...input,
    createdAt: ctx.now,
    createdBy: ctx.user,
  };
  objects = [created, ...objects];
  return created;
}

// 对象名 / 指标中文名称 / 指标编码 关键字过滤（页面搜索用）
export function searchObjects(keyword: string): ObjectRelation[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return listObjects();
  return listObjects().filter(
    (o) =>
      o.name.toLowerCase().includes(kw) ||
      o.metrics.some(
        (m) => m.nameCn.toLowerCase().includes(kw) || m.code.toLowerCase().includes(kw)
      )
  );
}

// 告警对象候选：按指标自动筛选已关联的对象（对象名称 + 所属组织/部门/系统聚合），供数据告警「告警对象」多选
export function objectsForMetric(metricName: string): string[] {
  const names = new Set<string>();
  for (const o of objects) {
    if (o.metrics.some((m) => m.nameCn === metricName)) {
      names.add(o.org);
      names.add(o.dept);
      names.add(o.system);
      names.add(o.name);
    }
  }
  return Array.from(names);
}

// 指标分组选项：按业务域分类（指标中文名称 + 编码），供关联指标滑出窗使用
export function metricOptionsGrouped(): { domain: string; options: { value: string; label: string; hint: string }[] }[] {
  const groups: Record<string, typeof metricList> = {};
  for (const m of metricList) {
    (groups[m.domain] ??= []).push(m);
  }
  return Object.entries(groups).map(([domain, list]) => ({
    domain,
    options: list.map((m) => ({ value: m.id, label: m.nameCn, hint: m.code })),
  }));
}
