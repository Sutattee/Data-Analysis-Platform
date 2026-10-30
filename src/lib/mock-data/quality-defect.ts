// 缺陷分析 / 缺陷诊断 / 诊断记录 —— 共享模拟数据 + 聚合函数 + 会话级诊断 store。
// 口径锚点 2026-09-23；近1月（8/24–9/23）Σ缺陷 58 条、Σ抽检 3152 → 总缺陷率 1.84%（与总览一致）。

// ============ 基础常量 ============

export const ANCHOR = "2026-09-23";
export const DEFECT_RATE_BASE = 3.0; // 管控值（缺陷率控制阈值 %）

export const GRADE_OPTIONS = ["A", "B", "C", "D"];
export const BRAND_OPTIONS = ["娇子", "长城", "宽窄"];
export const MACHINE_OPTIONS = ["1#卷接包机组", "2#卷接包机组", "3#卷接包机组", "4#卷接包机组", "5#卷接包机组"];
export const SHIFT_OPTIONS = ["甲班", "乙班", "丙班"];
export const SPEC_OPTIONS = ["硬盒 84mm", "软盒 84mm", "细支 97mm", "中支 89mm"];

// ============ 日期工具（纯字符串 ISO 计算，避免时区问题） ============

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function addMonthsISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

// 统计周期（月窗口）：近 N 个月（含锚点当日），如近1月 = 2026-08-24 ~ 2026-09-23
export function periodRange(months: 1 | 2 | 3): { from: string; to: string } {
  return { from: addDaysISO(addMonthsISO(ANCHOR, -months), 1), to: ANCHOR };
}

export function diffDaysISO(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

// ============ 缺陷档案（代码 → 标准名称/部位/类别/工序/责任岗位/AI 原因） ============

export interface DefectCatalogItem {
  code: string;
  name: string;
  part: string;
  grade: string; // A/B/C/D
  process: string;
  post: string;
  aiCause: string;
}

// 真实缺陷代码表（来源：厂标缺陷代码清单）：[部位, 名称, 代码, 类别]。
// 仅收录有代码且有类别的行——「包装标识」组无代码、「其他」组无类别，均不纳入档案。
const DEFECT_ROWS: [string, string, string, string][] = [
  // 箱装杂项
  ["箱装杂项", "箱装不牢固", "XXBND", "D"],
  ["箱装杂项", "纸箱内部粘牢", "XXBND", "D"],
  ["箱装杂项", "箱装错装混装", "XTPCA", "A"],
  ["箱装杂项", "箱装少装", "XXSZA", "A"],
  ["箱装杂项", "箱内杂物", "XXZWC", "C"],
  // 箱装
  ["箱装", "纸箱破损", "XXPSC", "C"],
  ["箱装", "纸箱破损", "XXPSD", "D"],
  ["箱装", "纸箱错用", "XXCYA", "A"],
  ["箱装", "纸箱污渍", "XXWZC", "C"],
  ["箱装", "纸箱污渍", "XXWZD", "D"],
  ["箱装", "箱盖不平齐", "XXBPD", "D"],
  ["箱装", "箱装露烟", "XXLYC", "C"],
  ["箱装", "纸箱外观与设计不符", "XXSJC", "C"],
  ["箱装", "纸箱异味", "XXYWB", "B"],
  // 封箱带
  ["封箱带", "封箱带残缺", "XJQCQ", "C"],
  ["封箱带", "封箱带残缺", "XJQCQ", "D"],
  ["封箱带", "封箱带粘贴异常", "XJNJD", "D"],
  ["封箱带", "封箱带不平齐，不居中", "XJBPQ", "D"],
  ["封箱带", "封箱带错用", "XJCYC", "C"],
  ["封箱带", "封箱带多用", "XJDYD", "D"],
  // 生产标识（箱）
  ["生产标识", "无", "XMBWC", "C"],
  ["生产标识", "标识错误", "XMBCC", "C"],
  // 条装杂项
  ["条装杂项", "条轧皱", "TAZZC", "C"],
  ["条装杂项", "条轧皱", "TAZZD", "D"],
  ["条装杂项", "条轧破", "TAZPC", "C"],
  ["条装杂项", "条轧破", "TAZPD", "D"],
  ["条装杂项", "条内部粘连", "THNNC", "C"],
  ["条装杂项", "条缺包", "TBQBA", "A"],
  ["条装杂项", "条内错装混装", "TBCPA", "A"],
  ["条装杂项", "条内小盒排列不符", "TBPLA", "A"],
  ["条装杂项", "条内小盒排列不符", "TBPLD", "D"],
  ["条装杂项", "条透明纸夹杂", "TAWZC", "C"],
  ["条装杂项", "条透明纸夹杂", "TAWZD", "D"],
  ["条装杂项", "条盒内夹杂", "TANZC", "C"],
  ["条装杂项", "条盒内夹杂", "TANZD", "D"],
  ["条装杂项", "透明纸吸附条盒纸", "THXTC", "C"],
  ["条装杂项", "条盒内提带不符", "THXTD", "D"],
  ["条装杂项", "条预成型框架纸皱折", "TATDD", "D"],
  ["条装杂项", "条预成型框架纸皱折", "TAZWD", "D"],
  ["条装杂项", "条预成型框架纸皱折", "TANPD", "D"],
  ["条装杂项", "条预成型框架纸污", "TANWD", "D"],
  // 拉带（条）
  ["拉带", "拉带无", "TLWWB", "B"],
  ["拉带", "拉带残缺", "TLCQC", "C"],
  ["拉带", "拉带残缺", "TLCQD", "D"],
  ["拉带", "拉带错用", "TLCYC", "C"],
  ["拉带", "拉带倒置", "TLDZC", "C"],
  ["拉带", "拉带错位", "TLCWC", "C"],
  ["拉带", "拉带错位", "TLCWD", "D"],
  ["拉带", "拉带高低", "TLGDD", "D"],
  ["拉带", "拉带撕拉不畅", "TLSLC", "C"],
  ["拉带", "拉带头位置不符", "TLLTD", "D"],
  ["拉带", "拉带切口切偏", "TLQKC", "C"],
  ["拉带", "拉带宽度不符", "TLKDC", "D"],
  ["拉带", "拉带印刷缺陷", "TFLKD", "C"],
  ["拉带", "拉带印刷缺陷", "TFLYD", "D"],
  // 透明纸（条）
  ["透明纸", "透明纸无", "TTWWB", "B"],
  ["透明纸", "透明纸多", "TTDYC", "C"],
  ["透明纸", "透明纸残缺", "TTCQB", "B"],
  ["透明纸", "透明纸残缺", "TTCQC", "C"],
  ["透明纸", "透明纸破", "TTZPC", "C"],
  ["透明纸", "透明纸破", "TTZPD", "D"],
  ["透明纸", "透明纸无易撕口", "TTSKC", "C"],
  ["透明纸", "透明纸烫破", "TTTPC", "C"],
  ["透明纸", "透明纸烫破", "TTTPD", "D"],
  ["透明纸", "透明纸皱", "TTZZC", "C"],
  ["透明纸", "透明纸皱", "TTZZD", "D"],
  ["透明纸", "透明纸烫皱", "TTTZC", "C"],
  ["透明纸", "透明纸烫皱", "TTTZD", "D"],
  ["透明纸", "透明纸热封不牢", "TTRKC", "C"],
  ["透明纸", "透明纸热封不牢", "TTRKD", "D"],
  ["透明纸", "透明纸松紧", "TTSJC", "C"],
  ["透明纸", "透明纸松紧", "TTSJD", "D"],
  ["透明纸", "透明纸污", "TTZWC", "C"],
  ["透明纸", "透明纸污", "TTZWD", "D"],
  ["透明纸", "透明纸模糊", "TTMHD", "D"],
  ["透明纸", "透明纸划痕", "TTHHC", "C"],
  ["透明纸", "透明纸划痕", "TTHHD", "D"],
  ["透明纸", "透明纸折叠", "TTZDC", "C"],
  ["透明纸", "透明纸折叠", "TTZDD", "D"],
  ["透明纸", "透明纸出角", "TTCJC", "C"],
  ["透明纸", "透明纸出角", "TTCJD", "D"],
  ["透明纸", "透明纸长短", "TTCDC", "C"],
  ["透明纸", "透明纸长短", "TTCDD", "D"],
  ["透明纸", "透明纸热封变色", "TTRBD", "D"],
  ["透明纸", "透明纸拼接", "TTPJC", "C"],
  ["透明纸", "透明纸材料缺陷", "TFTWC", "C"],
  ["透明纸", "透明纸材料缺陷", "TFTWD", "D"],
  // 免税烟标志（条）
  ["免税烟标志", "免税烟标志错用", "TMSCA", "A"],
  ["免税烟标志", "免税烟标志无", "TMSWB", "B"],
  ["免税烟标志", "免税烟标志信息不全", "TMSBB", "B"],
  ["免税烟标志", "免税烟标志污", "TMSUC", "C"],
  ["免税烟标志", "免税烟标志污", "TMSUD", "D"],
  ["免税烟标志", "免税烟标志残缺", "TMSQB", "B"],
  ["免税烟标志", "免税烟标志残缺", "TMSQC", "C"],
  ["免税烟标志", "免税烟标志破", "TMSPC", "C"],
  ["免税烟标志", "免税烟标志破", "TMSPD", "D"],
  ["免税烟标志", "免税烟标志擦伤", "TMSID", "D"],
  ["免税烟标志", "免税烟标志翘折", "TMSZC", "C"],
  ["免税烟标志", "免税烟标志翘折", "TMSZD", "D"],
  ["免税烟标志", "免税烟标志多", "TMSYC", "C"],
  ["免税烟标志", "免税烟标志皱", "TMSFC", "C"],
  ["免税烟标志", "免税烟标志皱", "TMSFD", "D"],
  ["免税烟标志", "免税烟标志反倒", "TMSDB", "B"],
  ["免税烟标志", "免税烟标志反倒", "TMSDC", "C"],
  ["免税烟标志", "免税烟标志偏位", "TMSLC", "C"],
  ["免税烟标志", "免税烟标志偏位", "TMSLD", "D"],
  ["免税烟标志", "免税烟标志凸出", "TMSTC", "C"],
  ["免税烟标志", "免税烟标志凸出", "TMSTD", "D"],
  // 条盒纸
  ["条盒纸", "条盒纸无", "THWWA", "A"],
  ["条盒纸", "条盒纸残缺", "THCQB", "B"],
  ["条盒纸", "条盒纸残缺", "THCQC", "C"],
  ["条盒纸", "条盒纸破", "THPSC", "C"],
  ["条盒纸", "条盒纸错用", "THCYA", "A"],
  ["条盒纸", "条盒纸反包", "THFBA", "A"],
  ["条盒纸", "条盒纸皱", "THZZC", "C"],
  ["条盒纸", "条盒纸皱", "THZZD", "D"],
  ["条盒纸", "条盒纸压痕", "THYHC", "C"],
  ["条盒纸", "条盒纸压痕", "THYHD", "D"],
  ["条盒纸", "条盒纸擦伤", "THCSC", "C"],
  ["条盒纸", "条盒纸擦伤", "THCSD", "D"],
  ["条盒纸", "条盒纸污", "THWZC", "C"],
  ["条盒纸", "条盒纸污", "THWZD", "D"],
  ["条盒纸", "条盒纸多", "THDYC", "C"],
  ["条盒纸", "条盒纸抄折", "THZDB", "B"],
  ["条盒纸", "条盒纸抄折", "THZDC", "C"],
  ["条盒纸", "条盒纸抄折", "THZDD", "D"],
  ["条盒纸", "条盒纸面不平", "THPQC", "C"],
  ["条盒纸", "条盒纸面不平", "THPQD", "D"],
  ["条盒纸", "条盒纸爆墨", "THBMC", "C"],
  ["条盒纸", "条盒纸爆墨", "THBMD", "D"],
  ["条盒纸", "条盒纸粘贴", "THBKC", "C"],
  ["条盒纸", "条盒纸粘贴", "THBKD", "D"],
  ["条盒纸", "条盒纸翘折", "THQZC", "C"],
  ["条盒纸", "条盒纸翘折", "THQZD", "D"],
  ["条盒纸", "条盒纸色差", "THFCC", "C"],
  ["条盒纸", "条盒纸受热变色", "THSCD", "D"],
  ["条盒纸", "条盒纸外观缺陷", "TFHWC", "C"],
  ["条盒纸", "条盒纸印刷缺陷", "TFHYC", "C"],
  ["条盒纸", "条盒纸印刷缺陷", "TFHYD", "D"],
  ["条盒纸", "条盒纸式样不符", "TFHSB", "B"],
  // 生产标识（条）
  ["生产标识", "标识错无", "TGCWC", "C"],
  ["生产标识", "标识残缺", "TGCQD", "D"],
  ["生产标识", "标识模糊", "TGMHD", "D"],
  ["生产标识", "标识位置", "TGWZD", "D"],
  ["生产标识", "标识刻破", "TGKPC", "C"],
  ["生产标识", "标识刻破", "TGKPD", "D"],
  // 二维码（条）
  ["二维码", "二维码不能识读", "TESDA", "A"],
  ["二维码", "信息错误", "TECWA", "A"],
  ["二维码", "盒、条、件关联", "TEGLB", "B"],
  // 不干胶贴（条）
  ["不干胶贴", "贴不干胶贴错用", "TQCYA", "A"],
  ["不干胶贴", "不干胶贴无", "TQWWA", "A"],
  ["不干胶贴", "不干胶贴多", "TQDDC", "C"],
  ["不干胶贴", "不干胶贴污", "TQWZC", "C"],
  ["不干胶贴", "不干胶贴污", "TQWZD", "D"],
  ["不干胶贴", "不干胶贴残缺", "TQCQA", "A"],
  ["不干胶贴", "不干胶贴残缺", "TQCQB", "B"],
  ["不干胶贴", "不干胶贴破", "TQPSC", "C"],
  ["不干胶贴", "不干胶贴翘折", "TQPSD", "D"],
  ["不干胶贴", "不干胶贴皱", "TQQZC", "C"],
  ["不干胶贴", "不干胶贴皱", "TQQZD", "D"],
  ["不干胶贴", "不干胶贴皱", "TQZZC", "C"],
  ["不干胶贴", "不干胶贴皱", "TQZZD", "D"],
  ["不干胶贴", "不干胶贴反倒", "TQFDD", "D"],
  ["不干胶贴", "不干胶贴偏位", "TQPWC", "C"],
  ["不干胶贴", "不干胶贴偏位", "TQPWD", "D"],
  ["不干胶贴", "不干胶贴印刷缺陷", "TFQYC", "C"],
  ["不干胶贴", "不干胶贴色差", "TFQCC", "C"],
  ["不干胶贴", "不干胶贴式样不符", "TFQSC", "C"],
  // 小盒杂项
  ["小盒杂项", "小盒轧皱", "HAZZC", "C"],
  ["小盒杂项", "小盒轧皱", "HAZZD", "D"],
  ["小盒杂项", "小盒轧破", "HAZPB", "B"],
  ["小盒杂项", "小盒轧破", "HAZPC", "C"],
  ["小盒杂项", "小盒外部粘连", "HAWLC", "C"],
  ["小盒杂项", "小盒外部粘连", "HAWLD", "D"],
  ["小盒杂项", "小盒内部未粘牢", "HANJC", "C"],
  ["小盒杂项", "小盒内部未粘牢", "HANJD", "D"],
  ["小盒杂项", "内盒烟包推行不畅", "HATXC", "C"],
  ["小盒杂项", "小盒外夹杂", "HAJZC", "C"],
  ["小盒杂项", "小盒外夹杂", "HAJZD", "D"],
  ["小盒杂项", "小盒内夹杂", "HANZC", "C"],
  ["小盒杂项", "小盒内夹杂", "HANZD", "D"],
  ["小盒杂项", "盒内有与设计无关的杂物", "HAWGB", "B"],
  ["小盒杂项", "小盒外形不方正", "HAWXC", "C"],
  ["小盒杂项", "小盒外形不方正", "HAWXD", "D"],
  ["小盒杂项", "透明纸吸附商标纸（内含水雾或水渍）", "HAXFC", "C"],
  ["小盒杂项", "透明纸吸附商标纸（内含水雾或水渍）", "HAXFD", "D"],
  // 拉带（小盒）
  ["拉带", "拉带无", "HLCHB", "B"],
  ["拉带", "拉带错用", "HLCYC", "C"],
  ["拉带", "拉带残缺", "HLCQC", "C"],
  ["拉带", "拉带残缺", "HLCQD", "D"],
  ["拉带", "拉带皱", "HLLZC", "C"],
  ["拉带", "拉带皱", "HLLZD", "D"],
  ["拉带", "拉带字体反向", "HLZFD", "D"],
  ["拉带", "拉带倒置", "HLDZC", "C"],
  ["拉带", "拉带头反叠", "HLFDD", "D"],
  ["拉带", "拉带错位", "HLCWC", "C"],
  ["拉带", "拉带错位", "HLCWD", "D"],
  ["拉带", "拉带切口切偏", "HLQKC", "C"],
  ["拉带", "拉带切口切偏", "HLQKD", "D"],
  ["拉带", "拉带高低", "HLGDD", "D"],
  ["拉带", "拉带撕拉不畅", "HLSLC", "C"],
  ["拉带", "拉带头位置不符", "HLCDD", "D"],
  ["拉带", "拉带宽度不符", "HFLKC", "C"],
  ["拉带", "拉带宽度不符", "HFLKD", "D"],
  ["拉带", "拉带印刷缺陷", "HFLYD", "D"],
  // 透明纸（小盒）
  ["透明纸", "透明纸无", "HTWWB", "B"],
  ["透明纸", "透明纸多", "HTDYC", "C"],
  ["透明纸", "透明纸残缺", "HTCQB", "B"],
  ["透明纸", "透明纸残缺", "HTCQC", "C"],
  ["透明纸", "透明纸破", "HTPSC", "C"],
  ["透明纸", "透明纸破", "HTPSD", "D"],
  ["透明纸", "透明纸无易撕口", "HTSKC", "C"],
  ["透明纸", "透明纸易撕口宽度不符", "HSKKC", "C"],
  ["透明纸", "透明纸易撕口宽度不符", "HSKKD", "D"],
  ["透明纸", "透明纸烫破", "HTTPC", "C"],
  ["透明纸", "透明纸烫破", "HTTPD", "D"],
  ["透明纸", "透明纸皱", "HTZZC", "C"],
  ["透明纸", "透明纸皱", "HTZZD", "D"],
  ["透明纸", "透明纸烫皱", "HTTZC", "C"],
  ["透明纸", "透明纸烫皱", "HTTZD", "D"],
  ["透明纸", "透明纸热封变色", "HTBSC", "C"],
  ["透明纸", "透明纸热封变色", "HTBSD", "D"],
  ["透明纸", "透明纸热封不牢", "HTRKC", "C"],
  ["透明纸", "透明纸热封不牢", "HTRKD", "D"],
  ["透明纸", "透明纸松紧", "HTSJC", "C"],
  ["透明纸", "透明纸松紧", "HTSJD", "D"],
  ["透明纸", "透明纸污", "HTWZC", "C"],
  ["透明纸", "透明纸污", "HTWZD", "D"],
  ["透明纸", "透明纸划痕", "HTHHC", "C"],
  ["透明纸", "透明纸划痕", "HTHHD", "D"],
  ["透明纸", "透明纸模糊", "HTMHD", "D"],
  ["透明纸", "透明纸超平面", "HTCMC", "C"],
  ["透明纸", "透明纸超平面", "HTCMD", "D"],
  ["透明纸", "透明纸折叠", "HTZDC", "C"],
  ["透明纸", "透明纸折叠", "HTZDD", "D"],
  ["透明纸", "透明纸出角", "HTCJC", "C"],
  ["透明纸", "透明纸出角", "HTCJD", "D"],
  ["透明纸", "透明纸长短", "HTCDC", "C"],
  ["透明纸", "透明纸长短", "HTCDD", "D"],
  ["透明纸", "透明纸拼接", "HTPJC", "C"],
  ["透明纸", "透明纸材料缺陷", "HFTWC", "C"],
  ["透明纸", "透明纸材料缺陷", "HFTWD", "D"],
  // 封签
  ["封签", "封签错用", "HQCYB", "B"],
  ["封签", "封签无", "HQWWB", "B"],
  ["封签", "封签污", "HQWZC", "C"],
  ["封签", "封签污", "HQWZD", "D"],
  ["封签", "封签残缺", "HQCQB", "B"],
  ["封签", "封签残缺", "HQCQC", "C"],
  ["封签", "封签破", "HQPSC", "C"],
  ["封签", "封签破", "HQPSD", "D"],
  ["封签", "封签擦伤", "HQCSD", "D"],
  ["封签", "封签翘折", "HQQZC", "C"],
  ["封签", "封签翘折", "HQQZD", "D"],
  ["封签", "封签多", "HQDYC", "C"],
  ["封签", "封签皱", "HQZZC", "C"],
  ["封签", "封签皱", "HQZZD", "D"],
  ["封签", "封签反倒", "HQFDC", "C"],
  ["封签", "封签反倒", "HQFDD", "D"],
  ["封签", "封签偏位", "HQPWC", "C"],
  ["封签", "封签偏位", "HQPWD", "D"],
  ["封签", "封签凸出", "HQTCC", "C"],
  ["封签", "封签凸出", "HQTCD", "D"],
  ["封签", "封签吐胶", "HQTJC", "C"],
  ["封签", "封签吐胶", "HQTJD", "D"],
  ["封签", "封签印刷缺陷", "HFQYC", "C"],
  ["封签", "封签印刷缺陷", "HFQYD", "D"],
  ["封签", "封签色差", "HFQCC", "C"],
  ["封签", "封签式样不符", "HFQSC", "C"],
  // 免税烟标志（小盒）
  ["免税烟标志", "免税烟标志错用", "HMSCA", "A"],
  ["免税烟标志", "免税烟标志无", "HMSWB", "B"],
  ["免税烟标志", "免税烟标志信息不全", "HMSBB", "B"],
  ["免税烟标志", "免税烟标志污", "HMSUC", "C"],
  ["免税烟标志", "免税烟标志污", "HMSUD", "D"],
  ["免税烟标志", "免税烟标志残缺", "HMSQB", "B"],
  ["免税烟标志", "免税烟标志残缺", "HMSQC", "C"],
  ["免税烟标志", "免税烟标志破", "HMSPC", "C"],
  ["免税烟标志", "免税烟标志破", "HMSPD", "D"],
  ["免税烟标志", "免税烟标志翘折", "HMSID", "D"],
  ["免税烟标志", "免税烟标志翘折", "HMSZC", "C"],
  ["免税烟标志", "免税烟标志翘折", "HMSZD", "D"],
  ["免税烟标志", "免税烟标志多", "HMSYC", "C"],
  ["免税烟标志", "免税烟标志皱", "HMSPC", "C"],
  ["免税烟标志", "免税烟标志皱", "HMSPD", "D"],
  ["免税烟标志", "免税烟标志反倒", "HMSDB", "B"],
  ["免税烟标志", "免税烟标志反倒", "HMSCD", "C"],
  ["免税烟标志", "免税烟标志偏位", "HMSLC", "C"],
  ["免税烟标志", "免税烟标志偏位", "HMSLD", "D"],
  ["免税烟标志", "免税烟标志凸出", "HMSTC", "C"],
  ["免税烟标志", "免税烟标志凸出", "HMSTD", "D"],
  ["免税烟标志", "免税烟标志吐胶", "HMSJC", "C"],
  ["免税烟标志", "免税烟标志吐胶", "HMSJD", "D"],
  // 框架纸
  ["框架纸", "框架纸无", "HKWWB", "B"],
  ["框架纸", "框架纸残缺", "HKCQB", "B"],
  ["框架纸", "框架纸残缺", "HKCQC", "C"],
  ["框架纸", "框架纸破", "HKPSC", "C"],
  ["框架纸", "框架纸破", "HKPSD", "D"],
  ["框架纸", "框架纸露", "HKLLC", "C"],
  ["框架纸", "框架纸错用", "HKCYC", "C"],
  ["框架纸", "框架纸反", "HKKFC", "C"],
  ["框架纸", "框架纸皱", "HKZZC", "C"],
  ["框架纸", "框架纸皱", "HKZZD", "D"],
  ["框架纸", "框架纸翘边", "HKQBD", "D"],
  ["框架纸", "框架纸污", "HKWZC", "C"],
  ["框架纸", "框架纸污", "HKWZD", "D"],
  ["框架纸", "框架纸擦伤", "HKSCS", "C"],
  ["框架纸", "框架纸擦伤", "HKCSD", "D"],
  ["框架纸", "框架纸拼接", "HKPJC", "C"],
  ["框架纸", "框架纸毛刺", "HKMCD", "D"],
  ["框架纸", "框架纸卡口", "HKKKC", "C"],
  ["框架纸", "框架纸卡口", "HKKKD", "D"],
  ["框架纸", "框架纸偏位", "HKWPC", "C"],
  ["框架纸", "框架纸偏位", "HKWPD", "D"],
  ["框架纸", "框架纸色差", "HFKCC", "C"],
  ["框架纸", "框架纸式样不符", "HFKSC", "C"],
  // 商标纸
  ["商标纸", "商标纸无", "HSWWA", "A"],
  ["商标纸", "商标纸残缺", "HSCQB", "B"],
  ["商标纸", "商标纸残缺", "HSCQC", "C"],
  ["商标纸", "商标纸破", "HSPSC", "C"],
  ["商标纸", "商标纸破", "HSPSD", "D"],
  ["商标纸", "商标纸错用", "HSCYA", "A"],
  ["商标纸", "商标纸反包", "HSFBA", "A"],
  ["商标纸", "商标纸皱", "HSZZC", "C"],
  ["商标纸", "商标纸皱", "HSZZD", "D"],
  ["商标纸", "商标纸压痕", "HSYHC", "C"],
  ["商标纸", "商标纸压痕", "HSYHD", "D"],
  ["商标纸", "商标纸擦伤", "HSCSC", "C"],
  ["商标纸", "商标纸擦伤", "HSCSD", "D"],
  ["商标纸", "商标纸污", "HSWZC", "C"],
  ["商标纸", "商标纸污", "HSWZD", "D"],
  ["商标纸", "商标纸多", "HSDYC", "C"],
  ["商标纸", "商标纸爆墨", "HSBMC", "C"],
  ["商标纸", "商标纸爆墨", "HSBMD", "D"],
  ["商标纸", "商标纸爆耳", "HSBEC", "C"],
  ["商标纸", "商标纸粘贴不牢", "HSNTD", "D"],
  ["商标纸", "商标纸斜角露白", "HSXLC", "C"],
  ["商标纸", "商标纸斜角露白", "HSXLD", "D"],
  ["商标纸", "商标纸翘边", "HSQBC", "C"],
  ["商标纸", "商标纸翘边", "HSQBD", "D"],
  ["商标纸", "商标纸折叠不到位", "HSZDC", "C"],
  ["商标纸", "商标纸折叠不到位", "HSZDD", "D"],
  ["商标纸", "硬盒盒盖盖不严", "HAHYD", "D"],
  ["商标纸", "盒盖粘连", "HSGNC", "C"],
  ["商标纸", "盒盖粘连", "HSGND", "D"],
  ["商标纸", "商标纸错位", "HSCWC", "C"],
  ["商标纸", "商标纸错位", "HSCWD", "D"],
  ["商标纸", "内衬纸超高", "HSCDC", "C"],
  ["商标纸", "内衬纸超高", "HSCDD", "D"],
  ["商标纸", "商标纸印刷缺陷", "HFSYC", "C"],
  ["商标纸", "商标纸印刷缺陷", "HFSYD", "D"],
  ["商标纸", "商标纸光油缺陷", "HFSGC", "C"],
  ["商标纸", "商标纸光油缺陷", "HFSGD", "D"],
  ["商标纸", "商标纸外观缺陷", "HFSWC", "C"],
  ["商标纸", "商标纸色差", "HFSCC", "C"],
  ["商标纸", "商标纸式样不符", "HFSSB", "B"],
  // 生产标识（小盒）
  ["生产标识", "标识错无", "HGCWC", "C"],
  ["生产标识", "标识残缺", "HGCQC", "C"],
  ["生产标识", "标识残缺", "HGCQD", "D"],
  ["生产标识", "标识模糊", "HGMHC", "C"],
  ["生产标识", "标识模糊", "HGMHD", "D"],
  ["生产标识", "标识刻破", "HGKPC", "C"],
  ["生产标识", "标识刻破", "HGKPD", "D"],
  ["生产标识", "标识位置", "HGWZC", "C"],
  // 二维码（小盒）
  ["二维码", "不能识读", "HESDA", "A"],
  ["二维码", "信息错误", "HECWA", "A"],
  ["二维码", "盒、条、件关联", "HEGLB", "B"],
  // 内衬纸
  ["内衬纸", "内衬纸无", "HCWWB", "B"],
  ["内衬纸", "内衬纸残缺", "HCCQB", "B"],
  ["内衬纸", "内衬纸残缺", "HCCQC", "C"],
  ["内衬纸", "内衬纸破", "HCPSC", "C"],
  ["内衬纸", "内衬纸破", "HCPSD", "D"],
  ["内衬纸", "内衬纸错用", "HCCYB", "B"],
  ["内衬纸", "内衬纸皱", "HCZZC", "C"],
  ["内衬纸", "内衬纸皱", "HCZZD", "D"],
  ["内衬纸", "内衬纸翘边", "HCQBD", "D"],
  ["内衬纸", "内衬纸式样不符", "HFCSC", "C"],
  ["内衬纸", "内衬纸色差", "HFCCC", "C"],
  ["内衬纸", "内衬纸压纹后墨色脱落", "HFCWC", "C"],
  ["内衬纸", "内衬纸压纹后墨色脱落", "HFCWD", "D"],
  ["内衬纸", "内衬纸污", "HCWZC", "C"],
  ["内衬纸", "内衬纸污", "HCWZD", "D"],
  ["内衬纸", "内衬纸压纹残缺", "HCYQC", "C"],
  ["内衬纸", "内衬纸压纹残缺", "HCYQD", "D"],
  ["内衬纸", "内衬纸压纹模糊", "HCYHC", "C"],
  ["内衬纸", "内衬纸压纹模糊", "HCYHD", "D"],
  ["内衬纸", "压纹徽记无", "HCHWB", "B"],
  ["内衬纸", "压纹徽记残缺", "HCHQC", "C"],
  ["内衬纸", "压纹徽记残缺", "HCHQD", "D"],
  ["内衬纸", "压纹徽记不清晰", "HCBQC", "C"],
  ["内衬纸", "压纹徽记不清晰", "HCBQD", "D"],
  ["内衬纸", "压纹徽记位置", "HCHPC", "C"],
  ["内衬纸", "压纹徽记位置", "HCHPD", "D"],
  ["内衬纸", "内衬纸拼接", "HCPJC", "C"],
  ["内衬纸", "内衬纸长短", "HCCDC", "C"],
  ["内衬纸", "内衬纸长短", "HCCDD", "D"],
  ["内衬纸", "内衬纸折叠不到位", "HCZJC", "C"],
  ["内衬纸", "内衬纸折叠不到位", "HCZJD", "D"],
  ["内衬纸", "内衬纸外露", "HCWLC", "C"],
  ["内衬纸", "内衬纸撕片未切断", "HCFQC", "C"],
  ["内衬纸", "内衬纸撕片未切断", "HCFQD", "D"],
  ["内衬纸", "内衬纸撕开后不平齐", "HCBPD", "D"],
  ["内衬纸", "内衬纸擦伤", "HCCSC", "C"],
  ["内衬纸", "内衬纸擦伤", "HCCSD", "D"],
  // 烟支填装
  ["烟支填装", "缺支", "HJQYA", "A"],
  ["烟支填装", "倒支", "HJDZB", "B"],
  ["烟支填装", "多支", "HADYB", "B"],
  ["烟支填装", "烟支排列不齐", "HJPLD", "D"],
  ["烟支填装", "错支", "HJCPA", "A"],
  ["烟支填装", "短支", "HADZB", "B"],
  ["烟支填装", "残支", "HACZB", "B"],
  ["烟支填装", "轧坏烟", "HAGDB", "B"],
  ["烟支填装", "小盒烟支粘连", "HANLB", "B"],
  ["烟支填装", "滤嘴脱落", "HALTB", "B"],
  ["烟支填装", "烟支缩头", "HASTC", "C"],
  ["烟支填装", "烟支粘末", "HANMD", "D"],
  ["烟支填装", "虫烟", "HACYA", "A"],
  // 卷烟端面
  ["卷烟端面", "空头", "JKKTB", "B"],
  ["卷烟端面", "空头", "JKKTC", "C"],
  ["卷烟端面", "触头", "JACTD", "D"],
  ["卷烟端面", "滤嘴缩头", "JZSTC", "C"],
  ["卷烟端面", "滤嘴缩头", "JZSTD", "D"],
  ["卷烟端面", "滤嘴长短", "JZCDC", "C"],
  ["卷烟端面", "切口不齐", "JQBQD", "D"],
  ["卷烟端面", "切口斜", "JQXXC", "C"],
  ["卷烟端面", "切口斜", "JQXXD", "D"],
  ["卷烟端面", "切口破", "JQPSC", "C"],
  ["卷烟端面", "切口破", "JQPSD", "D"],
  ["卷烟端面", "香线露出或下陷", "JZXLC", "C"],
  ["卷烟端面", "香线露出或下陷", "JZXLD", "D"],
  ["卷烟端面", "滤嘴孔洞", "JZJKB", "B"],
  ["卷烟端面", "滤嘴孔洞", "JZJKC", "C"],
  ["卷烟端面", "沟槽不均匀", "JZGCD", "D"],
  ["卷烟端面", "滤嘴中空深度不符", "JFZKC", "C"],
  ["卷烟端面", "滤嘴中空深度不符", "JFZKD", "D"],
  ["卷烟端面", "滤嘴污", "JZWZC", "C"],
  ["卷烟端面", "滤嘴污", "JZWZD", "D"],
  ["卷烟端面", "端面夹杂", "JQJZC", "C"],
  ["卷烟端面", "端面夹杂", "JQJZD", "D"],
  ["卷烟端面", "滤嘴生丝", "JZSSC", "C"],
  ["卷烟端面", "滤嘴生丝", "JZSSD", "D"],
  // 卷烟搭口
  ["卷烟搭口", "卷烟搭口夹杂", "JDJZC", "C"],
  ["卷烟搭口", "卷烟搭口夹杂", "JDJZD", "D"],
  ["卷烟搭口", "烟支搭口宽窄不一", "JDKZC", "C"],
  ["卷烟搭口", "烟支搭口宽窄不一", "JDKZD", "D"],
  ["卷烟搭口", "卷烟搭口翘折", "JDBPB", "B"],
  ["卷烟搭口", "卷烟搭口翘折", "JDBPC", "C"],
  ["卷烟搭口", "卷烟搭口翘折", "JDBPD", "D"],
  ["卷烟搭口", "爆口", "JDBKA", "A"],
  ["卷烟搭口", "搭口脱胶", "JDHKB", "B"],
  ["卷烟搭口", "搭口脱胶", "JDHKC", "C"],
  ["卷烟搭口", "烟支搭口焦黄", "JDTJC", "C"],
  ["卷烟搭口", "烟支搭口焦黄", "JDTJD", "D"],
  ["卷烟搭口", "搭口皱", "JDZCC", "C"],
  ["卷烟搭口", "搭口皱", "JDZDD", "D"],
  ["卷烟搭口", "搭口污", "JDWZC", "C"],
  ["卷烟搭口", "搭口污", "JDWZD", "D"],
  ["卷烟搭口", "搭口破", "JDPSC", "C"],
  ["卷烟搭口", "搭口破", "JDPSD", "D"],
  ["卷烟搭口", "漏气", "JALQB", "B"],
  ["卷烟搭口", "漏气", "JALQC", "C"],
  ["卷烟搭口", "接装纸粘贴不齐", "JSBQC", "C"],
  ["卷烟搭口", "接装纸粘贴不齐", "JSBQD", "D"],
  ["卷烟搭口", "接装纸标识错位", "JSDBD", "D"],
  ["卷烟搭口", "接装纸分切", "JSFQB", "B"],
  ["卷烟搭口", "接装纸分切", "JSFQC", "C"],
  ["卷烟搭口", "接装纸分切", "JSFQD", "D"],
  // 卷烟钢印
  ["卷烟钢印", "钢印刻破", "JGKPC", "C"],
  ["卷烟钢印", "钢印刻破", "JGKPD", "D"],
  ["卷烟钢印", "钢印错无", "JGYCB", "B"],
  ["卷烟钢印", "钢印错无", "JGYCC", "C"],
  ["卷烟钢印", "钢印残缺", "JGCQC", "C"],
  ["卷烟钢印", "钢印残缺", "JGCQD", "D"],
  ["卷烟钢印", "卷烟标识重叠", "JGCDC", "C"],
  ["卷烟钢印", "卷烟标识倒置", "JGDZC", "C"],
  ["卷烟钢印", "钢印模糊", "JGMHC", "C"],
  ["卷烟钢印", "钢印模糊", "JGMHD", "D"],
  ["卷烟钢印", "钢印污点", "JGWDC", "C"],
  ["卷烟钢印", "钢印污点", "JGWDD", "D"],
  ["卷烟钢印", "钢印颜色不符", "JGYSC", "C"],
  ["卷烟钢印", "钢印颜色不符", "JGYSD", "D"],
  ["卷烟钢印", "钢印位置不对", "JGWZC", "C"],
  ["卷烟钢印", "钢印位置不对", "JGWZD", "D"],
  // 卷烟表面
  ["卷烟表面", "烟支变形", "JABXB", "B"],
  ["卷烟表面", "卷烟破", "JPPSC", "C"],
  ["卷烟表面", "卷烟破", "JPPSD", "D"],
  ["卷烟表面", "刺破", "JCPCD", "D"],
  ["卷烟表面", "卷烟纸皱", "JPZYC", "C"],
  ["卷烟表面", "卷烟纸皱", "JPZYD", "D"],
  ["卷烟表面", "接装纸皱", "JSZTC", "C"],
  ["卷烟表面", "接装纸皱", "JSZTD", "D"],
  ["卷烟表面", "卷烟表面污", "JAWZC", "C"],
  ["卷烟表面", "卷烟表面污", "JAWZD", "D"],
  ["卷烟表面", "黄斑", "JAHBC", "C"],
  ["卷烟表面", "黄斑", "JAHBD", "D"],
  ["卷烟表面", "接装纸式样不符", "JFSSC", "C"],
  ["卷烟表面", "接装纸色差", "JFSCC", "C"],
  ["卷烟表面", "接装纸拖墨", "JFSTC", "C"],
  ["卷烟表面", "接装纸拖墨", "JFSTD", "D"],
  ["卷烟表面", "接装纸印刷缺陷", "JFSYC", "C"],
  ["卷烟表面", "接装纸印刷缺陷", "JFSYD", "D"],
  ["卷烟表面", "接装纸分切偏位", "JFSFC", "C"],
  ["卷烟表面", "接装纸分切偏位", "JFSFD", "D"],
  ["卷烟表面", "卷烟纸外观不符", "JFJWB", "B"],
  ["卷烟表面", "卷烟纸外观不符", "JFJWD", "D"],
  ["卷烟表面", "布带印", "JPBDD", "D"],
  ["卷烟表面", "滤嘴挤压变形", "JZBXD", "D"],
  ["卷烟表面", "滤嘴泡皱", "JZQPC", "C"],
  ["卷烟表面", "滤嘴泡皱", "JZQPD", "D"],
  ["卷烟表面", "接装纸长短", "JSCDC", "C"],
  ["卷烟表面", "接装纸长短", "JSCDD", "D"],
  ["卷烟表面", "接装纸卷边", "JSJBC", "C"],
  ["卷烟表面", "接装纸在线打孔不完整", "JSDKB", "B"],
  ["卷烟表面", "无胶区域施胶", "JZWJC", "C"],
  ["卷烟表面", "卷烟纸多", "JPDYB", "B"],
  ["卷烟表面", "卷烟纸多", "JPDYC", "C"],
  ["卷烟表面", "卷烟纸分切", "JPFQD", "D"],
  ["卷烟表面", "接装纸多", "JSDYB", "B"],
  ["卷烟表面", "接装纸多", "JSDYC", "C"],
  ["卷烟表面", "接装纸擦痕", "JSCHC", "C"],
  ["卷烟表面", "接装纸擦痕", "JSCHD", "D"],
  // 卷烟内部
  ["卷烟内部", "杂物", "JAZWA", "A"],
  ["卷烟内部", "杂物", "JAZWB", "B"],
  ["卷烟内部", "烟支凹陷（软点）", "JKAXD", "D"],
  ["卷烟内部", "竹节烟", "JAZJD", "D"],
  ["卷烟内部", "滤嘴软", "JZSRC", "C"],
  ["卷烟内部", "滤嘴夹烟末", "JZJMD", "D"],
  ["卷烟内部", "装接间隙", "JZPHC", "C"],
  ["卷烟内部", "装接间隙", "JZPHD", "D"],
  ["卷烟内部", "烟支旋转不动", "JFYZB", "B"],
  ["卷烟内部", "爆珠不爆破", "JFBPB", "B"],
  ["卷烟内部", "爆珠位置偏移", "JFPYB", "B"],
  ["卷烟内部", "爆珠数量不符", "JFWZB", "B"],
  ["卷烟内部", "爆珠残缺", "JFCQB", "B"],
  ["卷烟内部", "爆珠破损", "JFPSB", "B"],
  ["卷烟内部", "爆珠外露", "JFWLB", "B"],
];

// 部位元数据：工序 / 责任岗位 / AI 诊断原因候选池（档案按名称确定性取一条）
const PART_META: Record<string, { process: string; post: string; causes: string[] }> = {
  箱装杂项: { process: "装箱", post: "装箱机组操作", causes: ["推杆行程不足 / 缺包检测器灵敏度漂移", "分道挡板位置偏差 / 换牌清线不彻底", "折角导板位置偏移 / 传送同步偏差"] },
  箱装: { process: "装箱", post: "装箱机组操作", causes: ["纸箱吸盘真空度不足 / 输送导板偏移", "纸箱材料批次强度不足 / 堆码压力过大", "封箱压辊间隙不当 / 送箱定位偏移"] },
  封箱带: { process: "封箱", post: "封箱机组操作", causes: ["封箱带供带张力波动 / 切刀磨损", "封箱带定位光电偏移 / 压辊间隙不当", "封箱带材料批次缺陷 / 静电吸附异常"] },
  生产标识: { process: "喷码", post: "喷码机操作", causes: ["喷码机喷头堵塞 / 墨路压力波动", "打码定位光电偏移 / 字库参数错误", "标识校验规则未更新 / 同步信号丢失"] },
  条装杂项: { process: "条装", post: "条装机组操作", causes: ["条盒输送导板偏移 / 压辊间隙过紧", "条透明纸输送张力偏紧 / 热封温度偏低", "分道挡板位置偏差 / 换牌清线不彻底"] },
  拉带: { process: "包装", post: "包装机组操作", causes: ["拉带供带张力波动 / 切刀磨损", "拉带轮定位偏移 / 静电吸附异常", "拉带材料批次缺陷 / 印刷质量波动"] },
  透明纸: { process: "包装", post: "包装机组操作", causes: ["透明纸输送张力偏紧 / 热封温度偏低", "切刀磨损 / 折叠辊间隙不当", "透明纸材料批次缺陷 / 静电吸附异常"] },
  免税烟标志: { process: "包装", post: "包装机组操作", causes: ["标志贴吸嘴真空不足 / 定位光电偏移", "标志纸批次印刷偏差 / 静电吸附异常", "贴标压辊间隙不当 / 输送同步偏差"] },
  条盒纸: { process: "条装", post: "条装机组操作", causes: ["条盒纸吸嘴双张 / 输送导板偏移", "条盒纸材料批次偏差 / 压辊压力不当", "条盒纸印刷色差 / 压痕模磨损"] },
  二维码: { process: "喷码", post: "喷码机操作", causes: ["喷码分辨率不足 / 关联数据同步异常", "读码器焦距偏移 / 打码位置超差", "喷头堵塞 / 墨路压力波动"] },
  不干胶贴: { process: "包装", post: "包装机组操作", causes: ["贴标机吸盘真空不足 / 底纸剥离角度不当", "不干胶贴材料批次缺陷 / 静电吸附异常", "贴标定位光电偏移 / 压辊间隙不当"] },
  小盒杂项: { process: "包装", post: "包装机组操作", causes: ["小盒纸输送张力偏紧 / 模压辊温度偏低", "折叠成型导板偏移 / 压辊间隙过紧", "缺包检测器灵敏度漂移 / 推杆行程不足"] },
  封签: { process: "包装", post: "包装机组操作", causes: ["封签涂胶量偏大 / 烘干温度不足", "封签输送定位偏移 / 切刀磨损", "封签材料批次缺陷 / 静电吸附异常"] },
  框架纸: { process: "包装", post: "包装机组操作", causes: ["框架纸成型模磨损 / 输送定位偏移", "框架纸吸嘴双张 / 压辊间隙不当", "框架纸材料批次缺陷 / 折叠辊温度偏低"] },
  商标纸: { process: "包装", post: "包装机组操作", causes: ["商标纸吸嘴双张 / 定位光电偏移", "商标纸印刷批次色差 / 压痕模磨损", "折叠成型导板偏移 / 烘干温度不足"] },
  内衬纸: { process: "包装", post: "包装机组操作", causes: ["内衬纸压纹模磨损 / 输送张力波动", "内衬纸裁切尺寸超差 / 折叠辊间隙不当", "内衬纸材料批次缺陷 / 静电吸附异常"] },
  烟支填装: { process: "卷制", post: "卷接机组操作", causes: ["烟支推送器位置偏移 / 缺支检测器灵敏度漂移", "烟支定位挡板偏移 / 推杆行程不足", "模轮送支同步偏差 / 静电吸附异常"] },
  卷烟端面: { process: "卷制", post: "卷接机组操作", causes: ["吸丝带风量不足 / 烟丝填充值偏低", "切刀磨损 / 烙铁温度偏低", "平整器位置偏移 / 烟丝结构波动"] },
  卷烟搭口: { process: "卷制", post: "卷接机组操作", causes: ["搭口胶量不足 / 烙铁温度偏低", "接装纸供胶不均 / 搓板压力偏小", "搭口喷嘴堵塞 / 车速与胶量不匹配"] },
  卷烟钢印: { process: "卷制", post: "卷接机组操作", causes: ["钢印模磨损 / 压印压力不当", "钢印定位偏移 / 油墨粘度波动", "压印辊沾胶 / 清洁频次不足"] },
  卷烟表面: { process: "卷制", post: "卷接机组操作", causes: ["卷烟纸输送张力波动 / 导板偏移", "接装纸印刷缺陷 / 拖墨辊沾污", "烙铁温度偏高 / 布带磨损"] },
  卷烟内部: { process: "卷制", post: "卷接机组操作", causes: ["烟丝结构波动 / 梗签含量偏高", "滤棒供应异常 / 装接间隙偏移", "爆珠注入压力不当 / 吸阻波动"] },
};
const PART_META_DEFAULT = { process: "检验", post: "质检员", causes: ["工艺参数设定偏移 / 检测仪器漂移"] };

// 同代码多行去重合并：名称取首个、类别取较重（A > B > C > D）
const GRADE_WEIGHT: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
const CATALOG_BY_CODE = new Map<string, DefectCatalogItem>();
for (const [part, name, code, grade] of DEFECT_ROWS) {
  const meta = PART_META[part] ?? PART_META_DEFAULT;
  const exist = CATALOG_BY_CODE.get(code);
  if (exist) {
    if (GRADE_WEIGHT[grade] < GRADE_WEIGHT[exist.grade]) exist.grade = grade;
    continue;
  }
  CATALOG_BY_CODE.set(code, {
    code,
    name,
    part,
    grade,
    process: meta.process,
    post: meta.post,
    aiCause: meta.causes[(name.length + code.length) % meta.causes.length],
  });
}
export const DEFECT_CATALOG: DefectCatalogItem[] = Array.from(CATALOG_BY_CODE.values());

// 部位字典：档案部位按首次出现顺序去重（真实部位口径）
export const PART_OPTIONS = Array.from(new Set(DEFECT_CATALOG.map((c) => c.part)));

export function catalogOf(code: string): DefectCatalogItem | undefined {
  return DEFECT_CATALOG.find((c) => c.code === code);
}

// ============ 缺陷明细记录 ============

export interface DefectRecord {
  id: string;
  code: string;
  name: string;
  part: string;
  grade: string; // A/B/C/D
  brand: string;
  machine: string;
  shift: string;
  spec: string;
  batch: string; // 批次号码
  count: number; // 缺陷数量
  sampled: number; // 抽检数量
  date: string; // ISO 2026-09-21
  time: string; // 14:35
}

// 批次号码池：同一检验日期 + 机台 视为同一生产批次（确定性派生，10001 起递增）
const BATCH_POOL: Record<string, string> = {};
let batchSeq = 10000;
function batchOf(date: string, machine: string): string {
  const key = `${date}|${machine}`;
  if (!BATCH_POOL[key]) {
    batchSeq += 1;
    BATCH_POOL[key] = String(batchSeq);
  }
  return BATCH_POOL[key];
}

// 记录工厂：code 关联档案带出 名称/部位/类别，批次按 日期+机台 派生
let recSeq = 0;
function R(
  code: string,
  brand: string,
  machine: string,
  shift: string,
  spec: string,
  count: number,
  sampled: number,
  date: string,
  time: string
): DefectRecord {
  const c = catalogOf(code)!;
  recSeq += 1;
  return {
    id: `dr-${String(recSeq).padStart(3, "0")}`,
    code,
    name: c.name,
    part: c.part,
    grade: c.grade,
    brand,
    machine,
    shift,
    spec,
    batch: batchOf(date, machine),
    count,
    sampled,
    date,
    time,
  };
}

// 检验日期展示格式：2026/9/21 14:35
export function formatRecordDate(r: DefectRecord): string {
  const [y, m, d] = r.date.split("-").map(Number);
  return `${y}/${m}/${d} ${r.time}`;
}

// 班次标签：按记录时间推定（8~20 点白班），格式与缺陷预测页一致（如 9-21白班）
export function shiftLabelOf(r: DefectRecord): string {
  const h = Number(r.time.slice(0, 2));
  const [, m, d] = r.date.split("-").map(Number);
  return `${m}-${d}${h >= 8 && h < 20 ? "白班" : "夜班"}`;
}

// 展示用 ID：缺陷记录 dr-013@2026-09-22 → 20260922013
export function displayRecordId(r: DefectRecord): string {
  return `${r.date.replace(/-/g, "")}${r.id.slice(-3)}`;
}

// 展示用 ID：诊断记录 dg-005@2026-09-22 → ZD20260922005
export function displayDiagId(d: DiagnosisItem): string {
  return `ZD${d.recordDate.replace(/-/g, "")}${d.id.slice(-3)}`;
}

// 近1月（8/24–9/23）26 条：Σcount=58、Σsampled=3152（总缺陷率 1.84%，与总览一致），
// 缺陷代码取自真实档案；部位分布 箱装类6/条装类10/小盒类28/烟支类14
const RECENT_1M: DefectRecord[] = [
  // 箱装类 6
  R("XXSZA", "娇子", "5#卷接包机组", "甲班", "硬盒 84mm", 2, 118, "2026-08-26", "09:12"),
  R("XXCYA", "长城", "5#卷接包机组", "丙班", "软盒 84mm", 1, 121, "2026-09-02", "14:47"),
  R("XTPCA", "娇子", "5#卷接包机组", "乙班", "硬盒 84mm", 1, 121, "2026-09-08", "10:05"),
  R("XXLYC", "宽窄", "5#卷接包机组", "甲班", "中支 89mm", 1, 118, "2026-09-15", "16:22"),
  R("XXBND", "长城", "2#卷接包机组", "乙班", "软盒 84mm", 1, 121, "2026-09-20", "08:55"),
  // 条装类 10
  R("THNNC", "娇子", "3#卷接包机组", "甲班", "硬盒 84mm", 2, 121, "2026-08-28", "11:30"),
  R("TTRKC", "长城", "3#卷接包机组", "乙班", "硬盒 84mm", 2, 118, "2026-09-04", "15:08"),
  R("TAZZC", "娇子", "3#卷接包机组", "丙班", "硬盒 84mm", 2, 124, "2026-09-09", "09:40"),
  R("TAWZC", "宽窄", "3#卷接包机组", "甲班", "细支 97mm", 2, 118, "2026-09-17", "13:26"),
  R("THZZD", "长城", "3#卷接包机组", "乙班", "软盒 84mm", 2, 127, "2026-09-21", "17:02"),
  // 小盒类 28
  R("HAWLC", "娇子", "2#卷接包机组", "甲班", "硬盒 84mm", 3, 121, "2026-08-25", "08:40"),
  R("HANZC", "娇子", "2#卷接包机组", "乙班", "硬盒 84mm", 3, 121, "2026-09-03", "14:15"),
  R("HANJC", "娇子", "2#卷接包机组", "丙班", "硬盒 84mm", 3, 124, "2026-08-30", "10:50"),
  R("HAZPB", "长城", "2#卷接包机组", "甲班", "软盒 84mm", 3, 121, "2026-09-11", "16:33"),
  R("HAZZC", "娇子", "2#卷接包机组", "乙班", "硬盒 84mm", 3, 124, "2026-08-27", "09:26"),
  R("HAZZC", "娇子", "4#卷接包机组", "丙班", "硬盒 84mm", 2, 118, "2026-09-06", "11:44"),
  R("HSZZC", "长城", "4#卷接包机组", "甲班", "软盒 84mm", 3, 121, "2026-09-12", "15:19"),
  R("HSCQC", "娇子", "2#卷接包机组", "乙班", "硬盒 84mm", 2, 118, "2026-09-18", "10:07"),
  R("HFSCC", "宽窄", "4#卷接包机组", "丙班", "细支 97mm", 3, 121, "2026-09-10", "13:58"),
  R("HLCQD", "长城", "2#卷接包机组", "甲班", "软盒 84mm", 3, 124, "2026-09-22", "09:31"),
  // 烟支类 14
  R("JDBKA", "娇子", "1#卷接包机组", "甲班", "硬盒 84mm", 3, 118, "2026-08-29", "10:22"),
  R("JDBKA", "娇子", "1#卷接包机组", "乙班", "硬盒 84mm", 3, 124, "2026-09-07", "14:56"),
  R("JDBKA", "长城", "1#卷接包机组", "丙班", "软盒 84mm", 3, 121, "2026-09-14", "09:18"),
  R("JKKTB", "娇子", "1#卷接包机组", "甲班", "硬盒 84mm", 2, 121, "2026-09-01", "15:42"),
  R("JZSTC", "宽窄", "4#卷接包机组", "乙班", "细支 97mm", 1, 124, "2026-09-16", "11:09"),
  R("JAWZC", "长城", "4#卷接包机组", "丙班", "软盒 84mm", 2, 124, "2026-09-19", "16:45"),
];

// 前1月（7/24–8/23）24 条：Σcount=52、Σsampled=3600（缺陷率 1.44%，环比 +6 条 / ↑0.40pct）
const RECENT_2M_PREV: DefectRecord[] = [
  R("XXSZA", "长城", "5#卷接包机组", "乙班", "软盒 84mm", 2, 148, "2026-07-25", "09:35"),
  R("XXCYA", "娇子", "5#卷接包机组", "甲班", "硬盒 84mm", 1, 152, "2026-07-30", "14:20"),
  R("XTPCA", "长城", "5#卷接包机组", "丙班", "软盒 84mm", 2, 150, "2026-08-06", "10:48"),
  R("XXBND", "娇子", "2#卷接包机组", "甲班", "硬盒 84mm", 2, 150, "2026-08-12", "15:33"),
  R("THCQB", "娇子", "3#卷接包机组", "乙班", "硬盒 84mm", 2, 150, "2026-07-26", "11:26"),
  R("THZDB", "宽窄", "3#卷接包机组", "甲班", "细支 97mm", 2, 152, "2026-08-02", "09:57"),
  R("TAZZC", "长城", "3#卷接包机组", "丙班", "软盒 84mm", 2, 148, "2026-08-09", "16:11"),
  R("THZZD", "娇子", "3#卷接包机组", "乙班", "硬盒 84mm", 2, 150, "2026-08-18", "10:29"),
  R("HAWLC", "娇子", "2#卷接包机组", "甲班", "硬盒 84mm", 3, 150, "2026-07-27", "08:52"),
  R("HAWLD", "长城", "2#卷接包机组", "丙班", "软盒 84mm", 2, 148, "2026-08-04", "13:40"),
  R("HANJC", "娇子", "2#卷接包机组", "乙班", "硬盒 84mm", 3, 152, "2026-08-10", "15:07"),
  R("HAZZC", "娇子", "2#卷接包机组", "甲班", "硬盒 84mm", 3, 150, "2026-07-28", "10:16"),
  R("HAZZD", "宽窄", "4#卷接包机组", "乙班", "细支 97mm", 2, 148, "2026-08-05", "14:38"),
  R("HAZPC", "长城", "4#卷接包机组", "丙班", "软盒 84mm", 2, 150, "2026-08-13", "09:23"),
  R("HSCQC", "娇子", "2#卷接包机组", "甲班", "硬盒 84mm", 2, 152, "2026-08-19", "11:51"),
  R("HFSCC", "宽窄", "4#卷接包机组", "乙班", "细支 97mm", 2, 148, "2026-08-07", "16:24"),
  R("HLCQD", "长城", "2#卷接包机组", "丙班", "软盒 84mm", 2, 150, "2026-08-16", "08:47"),
  R("JDBKA", "娇子", "1#卷接包机组", "甲班", "硬盒 84mm", 3, 148, "2026-07-29", "09:34"),
  R("JDBKA", "长城", "1#卷接包机组", "乙班", "软盒 84mm", 3, 152, "2026-08-03", "14:02"),
  R("JDBKA", "娇子", "1#卷接包机组", "丙班", "硬盒 84mm", 2, 150, "2026-08-11", "10:55"),
  R("JKKTB", "宽窄", "1#卷接包机组", "甲班", "细支 97mm", 2, 148, "2026-08-01", "15:29"),
  R("JZSTC", "娇子", "4#卷接包机组", "乙班", "硬盒 84mm", 2, 150, "2026-08-14", "13:16"),
  R("JAWZD", "长城", "4#卷接包机组", "丙班", "软盒 84mm", 2, 152, "2026-08-08", "09:43"),
  R("XXBPD", "娇子", "5#卷接包机组", "甲班", "硬盒 84mm", 2, 148, "2026-08-21", "17:12"),
];

// 近3月第3段（6/24–7/23）24 条：Σcount=62（仅覆盖近3月窗口）
const RECENT_3M_PREV: DefectRecord[] = [
  R("XXSZA", "娇子", "5#卷接包机组", "丙班", "硬盒 84mm", 2, 160, "2026-06-25", "10:06"),
  R("XXCYA", "宽窄", "5#卷接包机组", "甲班", "中支 89mm", 2, 158, "2026-07-02", "14:51"),
  R("XTPCA", "娇子", "5#卷接包机组", "乙班", "硬盒 84mm", 3, 162, "2026-07-10", "09:38"),
  R("XXBPD", "长城", "5#卷接包机组", "甲班", "软盒 84mm", 2, 160, "2026-07-18", "15:24"),
  R("TTCQB", "长城", "3#卷接包机组", "丙班", "软盒 84mm", 3, 158, "2026-06-26", "11:33"),
  R("THCQB", "娇子", "3#卷接包机组", "甲班", "硬盒 84mm", 2, 160, "2026-07-04", "16:08"),
  R("TAZZC", "娇子", "3#卷接包机组", "乙班", "硬盒 84mm", 3, 162, "2026-07-12", "10:47"),
  R("THZZD", "宽窄", "3#卷接包机组", "丙班", "细支 97mm", 2, 158, "2026-07-20", "13:29"),
  R("HAWLC", "娇子", "2#卷接包机组", "甲班", "硬盒 84mm", 3, 160, "2026-06-27", "08:59"),
  R("HANJC", "长城", "2#卷接包机组", "乙班", "软盒 84mm", 3, 158, "2026-07-05", "14:44"),
  R("HAZZC", "娇子", "2#卷接包机组", "丙班", "硬盒 84mm", 3, 162, "2026-06-29", "09:16"),
  R("HAZZC", "娇子", "2#卷接包机组", "甲班", "硬盒 84mm", 3, 160, "2026-07-07", "15:37"),
  R("HAZZD", "长城", "4#卷接包机组", "乙班", "软盒 84mm", 2, 158, "2026-07-15", "10:52"),
  R("HAZPB", "娇子", "4#卷接包机组", "丙班", "硬盒 84mm", 3, 160, "2026-07-21", "11:25"),
  R("HSCQC", "宽窄", "2#卷接包机组", "甲班", "细支 97mm", 2, 158, "2026-06-30", "16:13"),
  R("HFSCC", "长城", "4#卷接包机组", "乙班", "软盒 84mm", 3, 162, "2026-07-08", "09:48"),
  R("HLCQD", "娇子", "2#卷接包机组", "丙班", "硬盒 84mm", 2, 160, "2026-07-16", "14:31"),
  R("JDBKA", "娇子", "1#卷接包机组", "甲班", "硬盒 84mm", 3, 158, "2026-06-28", "10:19"),
  R("JDBKA", "长城", "1#卷接包机组", "乙班", "软盒 84mm", 3, 160, "2026-07-06", "15:56"),
  R("JDBKA", "娇子", "1#卷接包机组", "丙班", "硬盒 84mm", 3, 162, "2026-07-13", "09:27"),
  R("JKKTB", "娇子", "1#卷接包机组", "甲班", "硬盒 84mm", 3, 158, "2026-07-01", "14:06"),
  R("JZSTC", "宽窄", "4#卷接包机组", "乙班", "细支 97mm", 2, 160, "2026-07-14", "11:40"),
  R("JAWZC", "长城", "4#卷接包机组", "丙班", "软盒 84mm", 2, 158, "2026-07-09", "16:27"),
  R("HLCQD", "娇子", "2#卷接包机组", "甲班", "硬盒 84mm", 2, 162, "2026-07-22", "08:36"),
];

export const DEFECT_RECORDS: DefectRecord[] = [...RECENT_1M, ...RECENT_2M_PREV, ...RECENT_3M_PREV];

// ============ 筛选与聚合 ============

// 统计周期：时间窗口（预设近 N 个月 / 自定义日期范围，含两端）或批次窗口（近 N 批次）
export type DefectPeriod =
  | { kind: "preset"; months: 1 | 2 | 3 }
  | { kind: "custom"; from: string; to: string }
  | { kind: "batches"; count: number };

// 时间窗口分支（preset / custom）
export type DefectTimePeriod = Extract<DefectPeriod, { kind: "preset" | "custom" }>;

export interface DefectFilters {
  period: DefectPeriod; // 统计周期（时间窗口）
  part: string; // "all" = 全部
  grade: string;
  brand: string;
  machine: string;
  shift: string;
}

export const DEFAULT_DEFECT_FILTERS: DefectFilters = {
  period: { kind: "preset", months: 1 },
  part: "all",
  grade: "all",
  brand: "all",
  machine: "all",
  shift: "all",
};

// ===== 时间窗口（统计周期按日期）=====

// 统计周期 → 日期窗口：预设用锚点回推 N 个月；自定义直接取给定范围
export function periodRangeOf(period: DefectTimePeriod): { from: string; to: string } {
  return period.kind === "preset" ? periodRange(period.months) : { from: period.from, to: period.to };
}

// 环比上一期窗口：预设 = 再往前推等长 N 个月；自定义 = 等长前一段
export function prevRangeOf(period: DefectTimePeriod): { from: string; to: string } {
  if (period.kind === "preset") {
    const { from } = periodRange(period.months);
    return { from: addDaysISO(addMonthsISO(from, -period.months), 1), to: addMonthsISO(from, -period.months) };
  }
  const days = diffDaysISO(period.from, period.to) + 1;
  return { from: addDaysISO(period.from, -days), to: addDaysISO(period.from, -1) };
}

// 按日期窗过滤（含两端）
export function filterByRange(records: DefectRecord[], range: { from: string; to: string }): DefectRecord[] {
  return records.filter((r) => r.date >= range.from && r.date <= range.to);
}

// 窗口内批次列表（批次号升序，供趋势图从左到右展示）
export function batchesInRange(records: DefectRecord[]): string[] {
  return Array.from(new Set(records.map((r) => r.batch))).sort((a, b) => Number(a) - Number(b));
}

// ===== 批次窗口（统计周期按批次）=====

// 批次周期可选项
export const BATCH_COUNT_OPTIONS = [1, 10, 20, 30, 40, 50, 60];

// 数据流最近 n 个批次号（升序返回；批次号为全局递增序列，大小即先后）
export function latestBatchesOf(records: DefectRecord[], n: number): string[] {
  return batchesInRange(records).slice(-n);
}

// 环比上一期批次窗口：再往前等长 n 个批次（不足时有多少取多少）
export function prevBatchesOf(records: DefectRecord[], n: number): string[] {
  const all = batchesInRange(records);
  return all.slice(Math.max(0, all.length - 2 * n), Math.max(0, all.length - n));
}

// 按批次集合过滤
export function filterByBatches(records: DefectRecord[], batches: string[]): DefectRecord[] {
  const set = new Set(batches);
  return records.filter((r) => set.has(r.batch));
}

// 维度过滤（不含时间窗）：环比对比窗口复用同一维度条件
export function filterDims(records: DefectRecord[], f: DefectFilters): DefectRecord[] {
  return records.filter(
    (r) =>
      (f.part === "all" || r.part === f.part) &&
      (f.grade === "all" || r.grade === f.grade) &&
      (f.brand === "all" || r.brand === f.brand) &&
      (f.machine === "all" || r.machine === f.machine) &&
      (f.shift === "all" || r.shift === f.shift)
  );
}

// 完整筛选：统计周期（时间窗或批次窗）+ 部位/类别/牌号/机台/班组
export function filterRecords(records: DefectRecord[], f: DefectFilters): DefectRecord[] {
  const byDims = filterDims(records, f);
  return f.period.kind === "batches"
    ? filterByBatches(byDims, latestBatchesOf(records, f.period.count))
    : filterByRange(byDims, periodRangeOf(f.period));
}

// 指标卡汇总：缺陷总数 / 抽检 / 缺陷率 / 基准 / 偏差 / 环比
export interface DefectSummary {
  total: number;
  sampled: number;
  rate: number; // %
  base: number;
  deviation: number; // pct（rate - base）
  prevTotal: number;
  momCount: number; // 环比条数差
  momRate: number; // 环比缺陷率差（pct）
}

export function summarize(cur: DefectRecord[], prev: DefectRecord[]): DefectSummary {
  const total = cur.reduce((s, r) => s + r.count, 0);
  const sampled = cur.reduce((s, r) => s + r.sampled, 0);
  const prevTotal = prev.reduce((s, r) => s + r.count, 0);
  const prevSampled = prev.reduce((s, r) => s + r.sampled, 0);
  const rate = sampled ? (total / sampled) * 100 : 0;
  const prevRate = prevSampled ? (prevTotal / prevSampled) * 100 : 0;
  return {
    total,
    sampled,
    rate,
    base: DEFECT_RATE_BASE,
    deviation: rate - DEFECT_RATE_BASE,
    prevTotal,
    momCount: total - prevTotal,
    momRate: rate - prevRate,
  };
}

// 批次粒度趋势：窗口内逐批次缺陷条数（维度筛选后无记录的批次补 0，保持折线连续）
export function batchTrend(records: DefectRecord[], batches: string[]): { batch: string; count: number }[] {
  const byBatch = new Map<string, number>();
  for (const r of records) byBatch.set(r.batch, (byBatch.get(r.batch) ?? 0) + r.count);
  return batches.map((b) => ({ batch: b, count: byBatch.get(b) ?? 0 }));
}

// 窗口内日期列表（含两端，含无记录日；供时间口径趋势图横轴）
export function daysInRange(range: { from: string; to: string }): string[] {
  const out: string[] = [];
  for (let d = range.from; d <= range.to; d = addDaysISO(d, 1)) out.push(d);
  return out;
}

// 日粒度趋势：窗口内逐日缺陷条数（维度筛选后无记录的日期补 0，保持折线连续）
export function dayTrend(records: DefectRecord[], days: string[]): { day: string; count: number }[] {
  const byDay = new Map<string, number>();
  for (const r of records) byDay.set(r.date, (byDay.get(r.date) ?? 0) + r.count);
  return days.map((d) => ({ day: d, count: byDay.get(d) ?? 0 }));
}

// 热力图列取值（固定顺序，保证矩阵稳定；与筛选值同构，列头展示时再格式化）
const HEAT_COLS: Record<HeatDim, string[]> = {
  grade: GRADE_OPTIONS,
  brand: BRAND_OPTIONS,
  machine: MACHINE_OPTIONS,
  shift: SHIFT_OPTIONS,
};

export type HeatDim = "grade" | "brand" | "machine" | "shift";

export interface HeatmapData {
  cols: string[];
  rows: string[]; // 部位
  cells: number[][]; // [partIdx][colIdx] = Σcount
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

export function heatmapOf(records: DefectRecord[], dim: HeatDim): HeatmapData {
  const cols = HEAT_COLS[dim];
  // 部位字典较多，仅保留当前窗口内有记录的部位行（按档案顺序）
  const rows = PART_OPTIONS.filter((p) => records.some((r) => r.part === p));
  const cells = rows.map(() => cols.map(() => 0));
  for (const r of records) {
    const pi = rows.indexOf(r.part);
    // 列值与 HEAT_COLS 同构（grade 存 A/B/C/D，「类」后缀仅在表头/浮层渲染时加）
    const v = r[dim] as string;
    const ci = cols.indexOf(v);
    if (pi >= 0 && ci >= 0) cells[pi][ci] += r.count;
  }
  const rowTotals = cells.map((row) => row.reduce((s, v) => s + v, 0));
  const colTotals = cols.map((_, ci) => cells.reduce((s, row) => s + row[ci], 0));
  return { cols, rows, cells, rowTotals, colTotals, grandTotal: rowTotals.reduce((s, v) => s + v, 0) };
}

// ============ 缺陷诊断口径（3 个重点缺陷） ============

// 诊断域（缺陷诊断页 / 诊断记录页 / 诊断抽屉）围绕 3 个重点缺陷组织，
// 与缺陷分析页的全量缺陷档案（DEFECT_CATALOG）分属不同口径。
// 质量类别与缺陷预测页口径对齐：成品水分 A类 / 烟支刺破 C/D类 / 箱储 B类
export const DIAG_CATALOG: DefectCatalogItem[] = [
  {
    code: "CPSFBH", name: "成品水分不合格", part: "成品", grade: "A",
    process: "烘丝", post: "烘丝机组操作",
    aiCause: "烘丝出口水分设定偏差 / 排潮风门开度不当",
  },
  {
    code: "YZCB", name: "烟支刺破", part: "烟支", grade: "C/D",
    process: "卷制", post: "卷接机组操作",
    aiCause: "烟支通道导板毛刺 / 烙铁边角刮伤",
  },
  {
    code: "XCCG", name: "箱储存储时间超上限", part: "箱储", grade: "B",
    process: "仓储", post: "库房管理",
    aiCause: "先进先出执行不到位 / 库房周转调度滞后",
  },
];

export function diagCatalogOf(code: string): DefectCatalogItem | undefined {
  return DIAG_CATALOG.find((c) => c.code === code);
}

// 3 缺陷发生记录（诊断明细的检验日期关联与抽屉的发生上下文口径）
let diagRecSeq = 0;
function DR(
  code: string,
  brand: string,
  machine: string,
  shift: string,
  spec: string,
  count: number,
  sampled: number,
  date: string,
  time: string
): DefectRecord {
  const c = diagCatalogOf(code)!;
  diagRecSeq += 1;
  return {
    id: `dr-${String(diagRecSeq).padStart(3, "0")}`,
    code,
    name: c.name,
    part: c.part,
    grade: c.grade,
    brand,
    machine,
    shift,
    spec,
    batch: batchOf(date, machine),
    count,
    sampled,
    date,
    time,
  };
}

const DIAG_OCCURRENCES: DefectRecord[] = [
  // 成品水分不合格（烘丝）
  DR("CPSFBH", "娇子", "3#烘丝机", "甲班", "硬盒 84mm", 2, 118, "2026-08-27", "10:15"),
  DR("CPSFBH", "长城", "1#烘丝机", "乙班", "软盒 84mm", 3, 124, "2026-09-05", "15:40"),
  DR("CPSFBH", "宽窄", "3#烘丝机", "丙班", "细支 97mm", 2, 121, "2026-09-12", "09:33"),
  DR("CPSFBH", "娇子", "5#烘丝机", "甲班", "硬盒 84mm", 3, 118, "2026-09-19", "14:22"),
  // 烟支刺破（卷制）
  DR("YZCB", "娇子", "2#卷接包机组", "乙班", "硬盒 84mm", 2, 121, "2026-08-30", "11:08"),
  DR("YZCB", "长城", "4#卷接包机组", "甲班", "软盒 84mm", 3, 124, "2026-09-08", "16:47"),
  DR("YZCB", "宽窄", "2#卷接包机组", "丙班", "中支 89mm", 2, 118, "2026-09-16", "10:52"),
  // 箱储存储时间超上限（仓储）
  DR("XCCG", "长城", "5#卷接包机组", "甲班", "软盒 84mm", 2, 150, "2026-09-03", "09:20"),
  DR("XCCG", "娇子", "5#卷接包机组", "乙班", "硬盒 84mm", 2, 148, "2026-09-14", "13:36"),
  DR("XCCG", "宽窄", "5#卷接包机组", "甲班", "细支 97mm", 2, 152, "2026-09-21", "15:11"),
];

// 该缺陷代码最近一次发生记录（诊断明细/抽屉的牌号、班组展示口径）
export function latestOccurrenceOf(code: string): DefectRecord | undefined {
  return DIAG_OCCURRENCES.filter((r) => r.code === code)
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))[0];
}

// 诊断行关联的发生上下文（牌号/班组/批次）：优先取登记日期当天的发生记录
// （同日多条取最新），否则回退最近一次发生记录
export function occurrenceContextOf(code: string, recordDate: string): DefectRecord | undefined {
  const sameDay = DIAG_OCCURRENCES.filter((r) => r.code === code && r.date === recordDate);
  if (sameDay.length > 0) return sameDay[sameDay.length - 1];
  return latestOccurrenceOf(code);
}

// ============ 诊断原因修正（会话级 store：缺陷分析抽屉 / 缺陷诊断页 / 诊断记录页 共享） ============

export interface DiagnosisItem {
  id: string;
  code: string;
  process: string; // 关联工序
  machine: string; // 关联机台（无关联为 "-"）
  post: string; // 责任岗位
  aiCause: string; // AI 生成的缺陷原因
  recordDate: string; // 登记日期（时间筛选用，均有值）
  causeText?: string; // 人工修正后的缺陷原因（未修正为空 = 原因类型 AI生成）
  diagnoser?: string; // 修正人 / 诊断人（未修正为空）
  diagnosedAt?: string; // 修正时间 / 诊断时间 2026/09/23 09:20:00（未修正为空）
}

// 原因类型：人工修正过 = 人工补录，否则 AI 生成
export function causeSourceOf(d: DiagnosisItem): "AI生成" | "人工补录" {
  return d.causeText ? "人工补录" : "AI生成";
}

// 展示用缺陷原因：人工修正文字优先，否则 AI 生成原因
export function causeTextOf(d: DiagnosisItem): string {
  return d.causeText ?? d.aiCause;
}

let diagSeq = 0;
function DG(
  cat: DefectCatalogItem,
  machine: string,
  recordDate: string,
  revised?: { causeText: string; diagnoser: string; diagnosedAt: string }
): DiagnosisItem {
  diagSeq += 1;
  return {
    id: `dg-${String(diagSeq).padStart(3, "0")}`,
    code: cat.code,
    process: cat.process,
    machine,
    post: cat.post,
    aiCause: cat.aiCause,
    recordDate,
    ...revised,
  };
}

// 预置 14 条（9 条已人工修正 + 5 条未修正；登记日期与 3 缺陷发生记录对齐，默认近1月窗口内可见）
const [CPSF_CAT, YZCB_CAT, XCCG_CAT] = DIAG_CATALOG;
let diagnoses: DiagnosisItem[] = [
  // 成品水分不合格（烘丝）
  DG(CPSF_CAT, "3#烘丝机", "2026-08-27", { causeText: "3#烘丝机出口水分仪标定漂移，显示值偏低导致实际水分超出上限，重新标定后复检合格。", diagnoser: "苏恒", diagnosedAt: "2026/08/27 10:41:18" }),
  DG(CPSF_CAT, "1#烘丝机", "2026-09-05", { causeText: "排潮风门开度未按来料水分变化调整，出口水分偏高，已更新参数卡并对班组培训。", diagnoser: "叶洛星", diagnosedAt: "2026/09/05 15:44:20" }),
  DG(CPSF_CAT, "3#烘丝机", "2026-09-12", { causeText: "该批烟丝来料水分偏高且凉丝时间不足，烘后成品水分超上限，已调整掺配比例并延长凉丝。", diagnoser: "王建国", diagnosedAt: "2026/09/12 11:30:52" }),
  DG(CPSF_CAT, "5#烘丝机", "2026-09-19", undefined),
  // 烟支刺破（卷制）
  DG(YZCB_CAT, "卷接机组ZJ17-02", "2026-08-30", { causeText: "ZJ17-02 烟支通道导板有毛刺刮破卷烟纸，修磨抛光后缺陷未再发生。", diagnoser: "苏恒", diagnosedAt: "2026/08/30 14:23:56" }),
  DG(YZCB_CAT, "卷接机组ZJ19-01", "2026-09-08", { causeText: "烙铁边角磨损刮伤烟支表面产生刺破，更换烙铁组件并首件确认合格。", diagnoser: "叶洛星", diagnosedAt: "2026/09/08 09:26:08" }),
  DG(YZCB_CAT, "卷接机组ZJ17-04", "2026-09-16", { causeText: "卷烟纸盘接头进入机台未及时剔除，接头处刺破烟支，已加强换纸巡检与接头剔除确认。", diagnoser: "王建国", diagnosedAt: "2026/09/16 13:05:59" }),
  DG(YZCB_CAT, "2#卷接包机组", "2026-09-18", undefined),
  DG(YZCB_CAT, "4#卷接包机组", "2026-09-22", undefined),
  // 箱储存储时间超上限（仓储）
  DG(XCCG_CAT, "装封箱机XF-01", "2026-09-03", { causeText: "库房先进先出执行不到位，角落批次滞留超期，已重新规划货位并按批次标识顺序出库。", diagnoser: "王建国", diagnosedAt: "2026/09/03 16:08:41" }),
  DG(XCCG_CAT, "-", "2026-09-11", { causeText: "出入库台账更新延迟，系统库存与实物不一致导致超期未预警，已规范台账录入时效。", diagnoser: "叶洛星", diagnosedAt: "2026/09/11 10:55:19" }),
  DG(XCCG_CAT, "-", "2026-09-14", { causeText: "库容压力集中、周转调度滞后造成局部批次超期，已与生产计划联动均衡出库。", diagnoser: "苏恒", diagnosedAt: "2026/09/14 14:29:38" }),
  DG(XCCG_CAT, "装封箱机XF-02", "2026-09-21", undefined),
  DG(XCCG_CAT, "-", "2026-09-23", undefined),
];

// 全量诊断项（缺陷诊断页 / 诊断记录页共用，含未修正项）
export function listDiagnoses(): DiagnosisItem[] {
  return diagnoses;
}

// 按缺陷代码取诊断项（缺陷分析抽屉回显：优先已人工修正的记录）
export function diagnosisOfCode(code: string): DiagnosisItem | undefined {
  return diagnoses.find((d) => d.code === code && d.causeText) ?? diagnoses.find((d) => d.code === code);
}

// 按 id 保存原因修正（缺陷诊断页抽屉入口）：写入人工补录原因与修正人/修正时间
export function saveDiagnosisCauseById(id: string, causeText: string, ctx: { user: string; now: string }): DiagnosisItem {
  const idx = diagnoses.findIndex((d) => d.id === id);
  if (idx < 0) throw new Error("诊断项不存在");
  const updated: DiagnosisItem = {
    ...diagnoses[idx],
    causeText,
    diagnoser: ctx.user,
    diagnosedAt: ctx.now,
  };
  diagnoses = diagnoses.map((d, i) => (i === idx ? updated : d));
  return updated;
}

// 按缺陷代码 upsert 原因修正（缺陷分析页抽屉入口）：已有诊断项则更新，否则按档案新建。
// 保存后缺陷分析抽屉 / 缺陷诊断明细 / 诊断记录三处同源同步。
export function upsertDiagnosisCause(code: string, causeText: string, ctx: { user: string; now: string }): DiagnosisItem {
  const existing = diagnosisOfCode(code);
  if (existing) return saveDiagnosisCauseById(existing.id, causeText, ctx);
  const c = catalogOf(code) ?? diagCatalogOf(code);
  if (!c) throw new Error("缺陷代码不存在");
  diagSeq += 1;
  const created: DiagnosisItem = {
    id: `dg-${String(diagSeq).padStart(3, "0")}`,
    code,
    process: c.process,
    machine: "-",
    post: c.post,
    aiCause: c.aiCause,
    recordDate: ANCHOR,
    causeText,
    diagnoser: ctx.user,
    diagnosedAt: ctx.now,
  };
  diagnoses = [created, ...diagnoses];
  return created;
}

// 按 缺陷代码 + 登记日期 精确保存原因（缺陷诊断任务流桥接）：
// 同代码同日的诊断项则原位更新，否则按登记日期新建（区别于按代码 upsert）。
export function saveDiagnosisCauseByCodeDate(
  code: string,
  recordDate: string,
  causeText: string,
  ctx: { user: string; now: string }
): DiagnosisItem {
  const hit = diagnoses.find((d) => d.code === code && d.recordDate === recordDate);
  if (hit) return saveDiagnosisCauseById(hit.id, causeText, ctx);
  const c = diagCatalogOf(code) ?? catalogOf(code);
  if (!c) throw new Error("缺陷代码不存在");
  diagSeq += 1;
  const created: DiagnosisItem = {
    id: `dg-${String(diagSeq).padStart(3, "0")}`,
    code,
    process: c.process,
    machine: "-",
    post: c.post,
    aiCause: c.aiCause,
    recordDate,
    causeText,
    diagnoser: ctx.user,
    diagnosedAt: ctx.now,
  };
  diagnoses = [created, ...diagnoses];
  return created;
}
