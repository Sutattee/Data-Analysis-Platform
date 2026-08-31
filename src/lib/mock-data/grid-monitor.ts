// 重点网格监测 — 模拟数据（确定性生成：固定锚点，无 Date.now / Math.random）
// 场景：卷烟厂 车间 → 网格 → 设备 三级；指标为网格日耗电 kWh，能耗偏高即异常
import type { AlertLevel } from "@/types";
import { LEVEL_RANK } from "./grid-forecast";

// ===== 时间锚点 =====
export const LATEST_ISO = "2026-08-09"; // 最新统计日
export const MIN_ISO = "2024-01-01"; // 可查询最早日期
const DAY_MS = 86400000;

// 日期 → 自最新日偏移（0 = 最新统计日）
export function offsetOf(dateIso: string): number {
  return Math.round((Date.parse(LATEST_ISO) - Date.parse(dateIso)) / DAY_MS);
}

// "2026-08-09" → "2026/8/9 08:00"（设备检测时间）
export function fmtCheckTime(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return `${y}/${m}/${d} 08:00`;
}

// ===== 类型 =====
export type MonitorStatus = "正常" | AlertLevel;

export interface DeviceRow {
  code: string; // 设备编码（仪表号）
  name: string; // 设备名称
  reading: number | null; // 当日读数 kWh（离线为 null）
  avg: number; // 历史均值 kWh
  deviation: number | null; // 偏差率（4 位小数，离线为 null）
  status: MonitorStatus;
  time: string | null; // 检测时间（离线为 null）
  note?: string; // 异常原因（离线 / 未上报）
}

export interface GridRow {
  gridId: string;
  dept: string; // 所属车间 / 部门
  name: string; // 网格名称
  system: string; // 所属系统
  actual: number; // 实际值 kWh（当日）
  avg: number; // 历史均值 kWh
  deviation: number; // 偏差率 %（1 位小数）
  pendingAlerts: number; // 未处理告警数
  status: MonitorStatus;
  abnormalDevices: number; // 异常设备数
}

export interface DeptSummary {
  name: string;
  abnormal: number; // 该部门当日异常网格数
  grids: GridRow[]; // 部门内网格（按监测状态排序）
}

export interface MonitorStats {
  totalGrids: number;
  totalDepts: number;
  abnormal: number; // 当日异常网格数
  deltaVsPrev: number; // 较上一统计日增减
  todayNew: number; // 当日首次触发（不含持续异常）
  alarmCount: number; // 告警网格数
  dangerCount: number; // 危险网格数
}

// ===== 等级 → 目标偏差率（能耗高即异常）=====
const GRADE_DEV: Record<AlertLevel, number> = { 提示: 0.06, 关注: 0.1, 预警: 0.15, 告警: 0.21, 危险: 0.28 };
// 状态 → 未处理告警基数（rank：正常0 / 提示1 / 关注2 / 预警3 / 告警4 / 危险5）
const PENDING_BY_RANK = [0, 1, 1, 2, 3, 4];
const LEVELS: AlertLevel[] = ["提示", "关注", "预警", "告警", "危险"];
const statusRank = (s: MonitorStatus): number => (s === "正常" ? 0 : LEVEL_RANK[s]);
const round = (v: number, d: number) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);

// ===== 静态定义：设备 / 网格 / 部门 =====
interface DeviceDef {
  code: string;
  name: string;
  weight: number; // 网格耗电拆分权重
  offline?: boolean; // 离线演示（读数缺失 → 异常原因）
  note?: string;
}

interface GridDef {
  id: string;
  name: string;
  system: string;
  baseAvg: number; // 历史均值基准 kWh
  seed: number;
  // 异常窗口（自最新日偏移，start ≥ end ≥ 0；end=0 持续中，start=0 且 end=0 当日新增）
  anomaly?: { start: number; end: number; grade: AlertLevel };
  devices: DeviceDef[];
}

interface DeptDef {
  name: string;
  grids: GridDef[];
}

export const GRID_DEPTS: DeptDef[] = [
  {
    name: "制丝车间",
    grids: [
      {
        id: "silk-1", name: "1#制丝线", system: "制丝线", baseAvg: 12800, seed: 11,
        anomaly: { start: 8, end: 0, grade: "危险" },
        devices: [
          { code: "ET1A01_1", name: "1#烘丝机", weight: 0.4 },
          { code: "ET1A01_2", name: "加香加料机", weight: 0.3 },
          { code: "ET1A01_3", name: "切丝机", weight: 0.3 },
        ],
      },
      {
        id: "silk-2", name: "2#制丝线", system: "制丝线", baseAvg: 11800, seed: 12,
        anomaly: { start: 5, end: 0, grade: "告警" },
        devices: [
          { code: "ET1A02_1", name: "2#烘丝机", weight: 0.4 },
          { code: "ET1A02_2", name: "加香加料机", weight: 0.3 },
          { code: "ET1A02_3", name: "切丝机", weight: 0.3 },
        ],
      },
      {
        id: "silk-3", name: "3#制丝线", system: "制丝线", baseAvg: 10600, seed: 13,
        anomaly: { start: 0, end: 0, grade: "预警" }, // 当日新增
        devices: [
          { code: "ET1A03_1", name: "3#烘丝机", weight: 0.45 },
          { code: "ET1A03_2", name: "加香加料机", weight: 0.3 },
          { code: "ET1A03_3", name: "切丝机", weight: 0.25 },
        ],
      },
      {
        id: "silk-4", name: "4#制丝线", system: "制丝线", baseAvg: 9800, seed: 14,
        anomaly: { start: 200, end: 190, grade: "预警" }, // 远景历史窗口
        devices: [
          { code: "ET1A04_1", name: "4#烘丝机", weight: 0.55 },
          { code: "ET1A04_2", name: "加香加料机", weight: 0.45 },
        ],
      },
      {
        id: "silk-exp", name: "膨胀烟丝线", system: "膨胀线", baseAvg: 8600, seed: 15,
        anomaly: { start: 11, end: 0, grade: "关注" },
        devices: [
          { code: "ET1B01_1", name: "膨胀机", weight: 0.6 },
          { code: "ET1B01_2", name: "干燥机", weight: 0.4 },
        ],
      },
      {
        id: "silk-pre", name: "切片预处理线", system: "预处理线", baseAvg: 5200, seed: 16,
        anomaly: { start: 6, end: 2, grade: "提示" },
        devices: [
          { code: "ET1C01_1", name: "切片机", weight: 0.5 },
          { code: "ET1C01_2", name: "松散回潮机", weight: 0.5 },
        ],
      },
      {
        id: "silk-stem", name: "梗丝处理线", system: "梗丝线", baseAvg: 7400, seed: 17,
        anomaly: { start: 18, end: 12, grade: "预警" },
        devices: [
          { code: "ET1D01_1", name: "梗丝干燥机", weight: 0.5 },
          { code: "ET1D01_2", name: "压梗机", weight: 0.3 },
          { code: "ET1D01_3", name: "梗丝膨化塔", weight: 0.2 },
        ],
      },
      {
        id: "silk-recon", name: "薄片生产线", system: "薄片线", baseAvg: 6900, seed: 18,
        anomaly: { start: 0, end: 0, grade: "关注" }, // 当日新增
        devices: [
          { code: "ET1E01_1", name: "薄片成型机", weight: 0.55 },
          { code: "ET1E01_2", name: "薄片烘干机", weight: 0.45 },
        ],
      },
      {
        id: "silk-flavor", name: "糖香料调配中心", system: "糖香料调配", baseAvg: 4300, seed: 19,
        anomaly: { start: 260, end: 252, grade: "关注" }, // 远景历史窗口（2025 年下半年）
        devices: [
          { code: "ET1F01_1", name: "糖香料罐", weight: 0.4 },
          { code: "ET1F01_2", name: "调配搅拌罐", weight: 0.3 },
          { code: "ET1F01_3", name: "输送泵", weight: 0.3 },
        ],
      },
      {
        id: "silk-store", name: "储丝房", system: "储丝房", baseAvg: 3800, seed: 20,
        anomaly: { start: 95, end: 90, grade: "提示" },
        devices: [
          { code: "ET1G01_1", name: "储丝柜", weight: 0.6 },
          { code: "ET1G01_2", name: "储丝房空调机组", weight: 0.4 },
        ],
      },
    ],
  },
  {
    name: "卷包车间",
    grids: [
      {
        id: "pack-1", name: "1#卷接包机组", system: "卷接包机组", baseAvg: 5800, seed: 21,
        anomaly: { start: 9, end: 0, grade: "告警" },
        devices: [
          { code: "ET3A01_1", name: "1#卷烟机", weight: 0.45 },
          { code: "ET3A01_2", name: "包装机", weight: 0.35 },
          { code: "ET3A01_3", name: "滤嘴接装机", weight: 0.2 },
        ],
      },
      {
        id: "pack-2", name: "2#卷接包机组", system: "卷接包机组", baseAvg: 5400, seed: 22,
        anomaly: { start: 3, end: 1, grade: "关注" },
        devices: [
          { code: "ET3A02_1", name: "2#卷烟机", weight: 0.45 },
          { code: "ET3A02_2", name: "包装机", weight: 0.35 },
          { code: "ET3A02_3", name: "滤嘴接装机", weight: 0.2 },
        ],
      },
      {
        id: "pack-3", name: "3#卷接包机组", system: "卷接包机组", baseAvg: 5600, seed: 23,
        anomaly: { start: 0, end: 0, grade: "预警" }, // 当日新增
        devices: [
          { code: "ET3A03_1", name: "3#卷烟机", weight: 0.5 },
          { code: "ET3A03_2", name: "包装机", weight: 0.5 },
        ],
      },
      {
        id: "pack-4", name: "4#卷接包机组", system: "卷接包机组", baseAvg: 5300, seed: 24,
        anomaly: { start: 7, end: 1, grade: "提示" },
        devices: [
          { code: "ET3A04_1", name: "4#卷烟机", weight: 0.45 },
          { code: "ET3A04_2", name: "包装机", weight: 0.35 },
          { code: "ET3A04_3", name: "滤嘴接装机", weight: 0.2 },
        ],
      },
      {
        id: "pack-5", name: "5#卷接包机组", system: "卷接包机组", baseAvg: 5200, seed: 25,
        anomaly: { start: 4, end: 0, grade: "提示" },
        devices: [
          { code: "ET3A05_1", name: "5#卷烟机", weight: 0.45 },
          { code: "ET3A05_2", name: "包装机", weight: 0.35 },
          { code: "ET3A05_3", name: "滤嘴接装机", weight: 0.2 },
        ],
      },
      {
        id: "pack-6", name: "6#卷接包机组", system: "卷接包机组", baseAvg: 5500, seed: 26,
        anomaly: { start: 45, end: 38, grade: "预警" },
        devices: [
          { code: "ET3A06_1", name: "6#卷烟机", weight: 0.5 },
          { code: "ET3A06_2", name: "包装机", weight: 0.5 },
        ],
      },
      {
        id: "pack-7", name: "7#卷接包机组", system: "卷接包机组", baseAvg: 5100, seed: 27,
        anomaly: { start: 300, end: 290, grade: "预警" }, // 远景历史窗口（2025 年末）
        devices: [
          { code: "ET3A07_1", name: "7#卷烟机", weight: 0.5 },
          { code: "ET3A07_2", name: "包装机", weight: 0.5 },
        ],
      },
      {
        id: "spec-1", name: "1#异型卷接包机组", system: "异型卷接包机组", baseAvg: 3800, seed: 61,
        anomaly: { start: 100, end: 95, grade: "关注" },
        devices: [
          { code: "ET4A01_1", name: "异型卷烟机", weight: 0.5 },
          { code: "ET4A01_2", name: "异型包装机", weight: 0.5 },
        ],
      },
      {
        id: "spec-2", name: "2#异型卷接包机组", system: "异型卷接包机组", baseAvg: 3600, seed: 62,
        anomaly: { start: 880, end: 870, grade: "告警" }, // 远景历史窗口（2024 年上半年）
        devices: [
          { code: "ET4A02_1", name: "异型卷烟机", weight: 0.5 },
          { code: "ET4A02_2", name: "异型包装机", weight: 0.5 },
        ],
      },
      {
        id: "spec-pack", name: "异型烟包装线", system: "异型包装线", baseAvg: 2800, seed: 63,
        anomaly: { start: 650, end: 640, grade: "提示" }, // 远景历史窗口（2025 年上半年）
        devices: [
          { code: "ET4B01_1", name: "装封箱机", weight: 0.6 },
          { code: "ET4B01_2", name: "贴标机", weight: 0.4 },
        ],
      },
    ],
  },
  {
    name: "动力车间",
    grids: [
      {
        id: "power-air", name: "空压站", system: "空压系统", baseAvg: 38600, seed: 31,
        anomaly: { start: 14, end: 0, grade: "危险" },
        devices: [
          { code: "ET2A01_1", name: "1#空压机", weight: 0.35 },
          { code: "ET2A01_2", name: "2#空压机", weight: 0.35 },
          { code: "ET2A01_3", name: "冷冻式干燥机", weight: 0.3, offline: true, note: "设备离线，数据未上报" },
        ],
      },
      {
        id: "power-chill", name: "制冷站", system: "制冷系统", baseAvg: 22400, seed: 32,
        anomaly: { start: 0, end: 0, grade: "告警" }, // 当日新增
        devices: [
          { code: "ET2B01_1", name: "离心式冷水机组", weight: 0.5 },
          { code: "ET2B01_2", name: "冷却塔风机", weight: 0.3 },
          { code: "ET2B01_3", name: "冷冻水泵", weight: 0.2 },
        ],
      },
      {
        id: "power-boiler", name: "锅炉房", system: "锅炉系统", baseAvg: 51800, seed: 33,
        anomaly: { start: 5, end: 1, grade: "预警" },
        devices: [
          { code: "ET2C01_1", name: "燃气锅炉", weight: 0.6 },
          { code: "ET2C01_2", name: "辅机循环泵", weight: 0.4 },
        ],
      },
      {
        id: "power-trans", name: "配电站", system: "配电系统", baseAvg: 31200, seed: 34,
        anomaly: { start: 9, end: 1, grade: "关注" },
        devices: [
          { code: "ET2D01_1", name: "1号主变压器", weight: 0.55 },
          { code: "ET2D01_2", name: "2号主变压器", weight: 0.45 },
        ],
      },
      {
        id: "power-water", name: "循环水站", system: "循环水系统", baseAvg: 9200, seed: 35,
        anomaly: { start: 60, end: 52, grade: "关注" },
        devices: [
          { code: "ET2E01_1", name: "冷却水泵", weight: 0.5 },
          { code: "ET2E01_2", name: "变频补水泵", weight: 0.5 },
        ],
      },
    ],
  },
  {
    name: "物资管理科",
    grids: [
      {
        id: "store-av", name: "高架立体库", system: "立体库", baseAvg: 2900, seed: 41,
        anomaly: { start: 3, end: 0, grade: "告警" },
        devices: [
          { code: "ET5A01_1", name: "堆垛机", weight: 0.5 },
          { code: "ET5A01_2", name: "输送机", weight: 0.3 },
          { code: "ET5A01_3", name: "库区空调机组", weight: 0.2 },
        ],
      },
      {
        id: "store-f1", name: "醇化库一区", system: "醇化库", baseAvg: 2100, seed: 42,
        anomaly: { start: 6, end: 0, grade: "预警" },
        devices: [
          { code: "ET5B01_1", name: "醇化库空调机组", weight: 0.6 },
          { code: "ET5B01_2", name: "通风机", weight: 0.4 },
        ],
      },
      {
        id: "store-f2", name: "醇化库二区", system: "醇化库", baseAvg: 1900, seed: 43,
        anomaly: { start: 4, end: 1, grade: "提示" },
        devices: [
          { code: "ET5B02_1", name: "醇化库空调机组", weight: 0.6 },
          { code: "ET5B02_2", name: "通风机", weight: 0.4 },
        ],
      },
    ],
  },
  {
    name: "生产及管理用房",
    grids: [
      {
        id: "office-bld", name: "办公楼网格", system: "后勤保障", baseAvg: 4800, seed: 51,
        anomaly: { start: 12, end: 2, grade: "提示" },
        devices: [
          { code: "ET6A01_1", name: "照明配电箱", weight: 0.4 },
          { code: "ET6A01_2", name: "电梯", weight: 0.3 },
          { code: "ET6A01_3", name: "VRV空调机组", weight: 0.3 },
        ],
      },
    ],
  },
  {
    name: "工艺质量科",
    grids: [
      {
        id: "qc-lab", name: "质检实验室网格", system: "质量检验", baseAvg: 2600, seed: 71,
        anomaly: { start: 150, end: 140, grade: "提示" }, // 远景历史窗口
        devices: [
          { code: "ET7A01_1", name: "实验室空调机组", weight: 0.55 },
          { code: "ET7A01_2", name: "检测仪器配电箱", weight: 0.45 },
        ],
      },
    ],
  },
  {
    name: "后勤",
    grids: [
      {
        id: "office-canteen", name: "食堂网格", system: "后勤保障", baseAvg: 3100, seed: 52,
        anomaly: { start: 80, end: 75, grade: "提示" },
        devices: [
          { code: "ET6B01_1", name: "厨房设备配电箱", weight: 0.6 },
          { code: "ET6B01_2", name: "排油烟机", weight: 0.4 },
        ],
      },
    ],
  },
  {
    name: "信息科",
    grids: [
      {
        id: "office-idc", name: "信息机房", system: "信息化", baseAvg: 12400, seed: 53,
        anomaly: { start: 520, end: 510, grade: "关注" }, // 远景历史窗口（2025 年上半年）
        devices: [
          { code: "ET6C01_1", name: "机房精密空调", weight: 0.5 },
          { code: "ET6C01_2", name: "服务器机柜配电", weight: 0.5 },
        ],
      },
    ],
  },
];

// ===== 单网格某日计算 =====
// 窗口是否覆盖偏移 o
function inWindow(def: GridDef, o: number): boolean {
  const a = def.anomaly;
  return !!a && o >= a.end && o <= a.start;
}

// 设备行生成（含离线演示；异常网格指定主异常设备 + 次级降档设备）
function buildDevices(def: GridDef, o: number, grade: AlertLevel | null, gridDev: number, gridAvg: number): DeviceRow[] {
  const n = def.devices.length;
  const rank = grade ? LEVEL_RANK[grade] : 0;
  // 主异常设备：确定性轮转，跳过离线设备
  let mainIdx = -1;
  if (grade) {
    for (let k = 0; k < n; k++) {
      const idx = (def.seed + o + k) % n;
      if (!def.devices[idx].offline) {
        mainIdx = idx;
        break;
      }
    }
  }
  // 次级降档设备：预警及以上等级时另一台降一档
  let secondIdx = -1;
  if (rank >= 3 && n > 2) {
    for (let k = 0; k < n; k++) {
      const idx = (def.seed + o + 1 + k) % n;
      if (idx !== mainIdx && !def.devices[idx].offline) {
        secondIdx = idx;
        break;
      }
    }
  }
  const demoted = rank >= 2 ? LEVELS[rank - 2] : null; // 降一档等级
  return def.devices.map((d, i) => {
    const avgR = Math.round(gridAvg * d.weight);
    if (d.offline) {
      return { code: d.code, name: d.name, reading: null, avg: avgR, deviation: null, status: "告警" as MonitorStatus, time: null, note: d.note };
    }
    let dev: number;
    let status: MonitorStatus = "正常";
    if (i === mainIdx) {
      dev = Math.max(0.04, gridDev + Math.sin(def.seed * 1.9 + o) * 0.02);
      status = grade!;
    } else if (i === secondIdx && demoted) {
      dev = GRADE_DEV[demoted] + Math.sin(def.seed * 2.3 + o + i) * 0.015;
      status = demoted;
    } else {
      dev = Math.sin(def.seed * 1.7 + i * 2.3 + o * 0.4) * 0.02;
    }
    const reading = Math.round(avgR * (1 + dev));
    return {
      code: d.code,
      name: d.name,
      reading,
      avg: avgR,
      deviation: round((reading - avgR) / avgR, 4),
      status,
      time: null, // 由调用方统一填充检测时间
    };
  });
}

function calcGrid(def: GridDef, dept: string, o: number): GridRow {
  const abnormal = inWindow(def, o);
  const grade = abnormal && def.anomaly ? def.anomaly.grade : null;
  // 历史均值微波动；实际值 = 均值 ×（1 + 偏差率）
  const avg = Math.round(def.baseAvg * (1 + Math.sin(def.seed * 0.7 + o * 0.2) * 0.012));
  const dev = grade
    ? GRADE_DEV[grade] + Math.sin(def.seed * 2.1 + o * 0.6) * 0.02
    : Math.sin(def.seed * 1.3 + o * 0.5) * 0.03;
  const actual = Math.round(avg * (1 + dev));
  const status: MonitorStatus = grade ?? "正常";
  const devices = buildDevices(def, o, grade, dev, avg);
  const rank = statusRank(status);
  const pending = rank === 0 ? 0 : PENDING_BY_RANK[rank] + Math.round(Math.abs(Math.sin(def.seed + o * 0.3)));
  return {
    gridId: def.id,
    dept,
    name: def.name,
    system: def.system,
    actual,
    avg,
    deviation: round(((actual - avg) / avg) * 100, 1),
    pendingAlerts: pending,
    status,
    abnormalDevices: devices.filter((d) => d.status !== "正常").length,
  };
}

// 部门内排序：状态等级 → 偏差率绝对值 → 异常设备数
function sortGrids(rows: GridRow[]): GridRow[] {
  return [...rows].sort(
    (a, b) =>
      statusRank(b.status) - statusRank(a.status) ||
      Math.abs(b.deviation) - Math.abs(a.deviation) ||
      b.abnormalDevices - a.abnormalDevices
  );
}

// ===== 对外查询 =====
// 某统计日全量数据：概览卡 + 部门页签（异常部门在前）+ 各部门网格
export function getMonitorData(dateIso: string): { stats: MonitorStats; depts: DeptSummary[] } {
  const o = offsetOf(dateIso);
  const oPrev = o + 1;
  const all = GRID_DEPTS.flatMap((d) => d.grids.map((g) => calcGrid(g, d.name, o)));
  const allPrev = GRID_DEPTS.flatMap((d) => d.grids.map((g) => calcGrid(g, d.name, oPrev)));
  const abnormal = all.filter((r) => r.status !== "正常").length;
  const abnormalPrev = allPrev.filter((r) => r.status !== "正常").length;
  // 当日首次触发：窗口起点等于当日偏移（且为单日窗口内的首日）
  const todayNew = GRID_DEPTS.reduce(
    (s, d) => s + d.grids.filter((g) => g.anomaly && g.anomaly.start === o).length,
    0
  );
  const stats: MonitorStats = {
    totalGrids: all.length,
    totalDepts: GRID_DEPTS.length,
    abnormal,
    deltaVsPrev: abnormal - abnormalPrev,
    todayNew,
    alarmCount: all.filter((r) => r.status === "告警").length,
    dangerCount: all.filter((r) => r.status === "危险").length,
  };
  const depts: DeptSummary[] = GRID_DEPTS.map((d) => {
    const grids = sortGrids(d.grids.map((g) => calcGrid(g, d.name, o)));
    return { name: d.name, abnormal: grids.filter((r) => r.status !== "正常").length, grids };
  }).sort((a, b) => b.abnormal - a.abnormal); // 异常部门排前（同数保持原序）
  return { stats, depts };
}

// 某网格某日的关联设备明细（检测时间统一为统计日 08:00）
export function getGridDevices(gridId: string, dateIso: string): DeviceRow[] {
  const o = offsetOf(dateIso);
  for (const dept of GRID_DEPTS) {
    const def = dept.grids.find((g) => g.id === gridId);
    if (!def) continue;
    const grade = inWindow(def, o) && def.anomaly ? def.anomaly.grade : null;
    const avg = Math.round(def.baseAvg * (1 + Math.sin(def.seed * 0.7 + o * 0.2) * 0.012));
    const dev = grade
      ? GRADE_DEV[grade] + Math.sin(def.seed * 2.1 + o * 0.6) * 0.02
      : Math.sin(def.seed * 1.3 + o * 0.5) * 0.03;
    const time = fmtCheckTime(dateIso);
    return buildDevices(def, o, grade, dev, avg).map((d) => ({ ...d, time: d.time ?? time }));
  }
  return [];
}
