// ========== 仪表盘 ==========
export interface KpiData {
  label: string;
  value: number;
  unit: string;
  change: number; // 百分比变化
  trend: "up" | "down" | "flat";
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface TrendSeries {
  name: string;
  data: TrendPoint[];
  color: string;
}

export interface ProductionLine {
  id: string;
  name: string;
  status: "running" | "idle" | "maintenance";
  output: number;       // 当日产量(吨)
  efficiency: number;   // OEE %
}

// ========== 问答 ==========

// AI 分析执行过程节点
export interface ExecutionNode {
  id: string;
  label: string;
  status: "running" | "completed" | "failed" | "pending";
  duration?: number; // 耗时(ms)
  errorMsg?: string;
  detail?: string;   // 该步骤的具体内容/数据
}

// 知识来源
export interface KnowledgeSource {
  kbName: string;    // 知识库名称
  docName: string;   // 文档名称
  chapter?: string;  // 章节
  version?: string;  // 版本
}

// 图表数据（用于图表类型切换）
export interface ChartMeta {
  currentType: "bar" | "line" | "pie" | "area" | "scatter" | "table";
  availableTypes: ("bar" | "line" | "pie" | "area" | "scatter" | "table")[];
  title?: string;
}

// 智能问数结构化回答（4 段式）
export interface SmartAnswer {
  queryResult: string;      // 1. 查询结果（markdown 表格 / 文本 / 列表）
  interpretation: string;   // 2. 基础数据解读（客观总结，不含归因/预测）
  chartReason?: string;     // 3. 推荐图表理由
  dataNotes: string;        // 4. 数据说明（口径/时间范围/筛选/更新时间）
}

// 点踩原因分类
export interface DislikeReasonTag {
  id: string;
  label: string;
}

export const DISLIKE_REASONS: DislikeReasonTag[] = [
  { id: "not_understood", label: "未理解我的问题" },
  { id: "inaccurate_data", label: "数据查询结果不准确" },
  { id: "missing_data", label: "缺少我需要的数据" },
  { id: "low_value", label: "分析价值不足" },
  { id: "bad_chart", label: "图表展示效果不好" },
  { id: "system_error", label: "系统异常" },
  { id: "other", label: "其它" },
];

export interface QaMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  favorited?: boolean;
  feedback?: "like" | "dislike" | null;
  dislikeReasons?: string[];       // 点踩原因标签ID数组
  dislikeNote?: string;            // "其它"的补充说明
  followUpQuestions?: string[];
  executionNodes?: ExecutionNode[]; // 思考过程节点（含详细内容）
  chartMeta?: ChartMeta;           // 图表元数据(用于图表切换)
  thinkingTime?: number;           // 思考总用时(秒)
  knowledgeSources?: KnowledgeSource[]; // 知识来源(知识问答类)
  answerType?: "analysis" | "knowledge"; // 回答类型
  smartAnswer?: SmartAnswer;        // 智能问数 4 段结构化回答
  question?: string;                // 收藏时记录的对应用户问题（仅收藏项使用）
}

// ========== 报告 ==========
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  preview?: string;
}

// ========== 数据资产 ==========
export interface DataField {
  name: string;
  type: string;
  description: string;
}

export interface DataModel {
  id: string;
  name: string;
  type: "table" | "view";
  description: string;
  fields: DataField[];
  children?: DataModel[];
}

export interface DataMetric {
  id: string;
  name: string;
  definition: string;
  dimension: string;
  updateFrequency: string;
  category: string;
}

// ========== AI演示 ==========
export interface DemoCase {
  id: string;
  title: string;
  description: string;
  icon: string;
  exampleQuery: string;
  resultRoute: string;
  category: "smart-query" | "attribution" | "trend" | "anomaly" | "report-gen" | "knowledge";
}

// ========== 用户 ==========
export interface User {
  id: string;
  username: string;
  password: string;
  phone: string;
  role: string;
  avatar?: string;   // 头像(base64)
  nickname?: string; // 我的名称(昵称)
  alias?: string;    // 我的别名(备注名)
  email?: string;    // 邮箱
  dept?: string;     // 所属部门（部门管理员账号绑定，业务构成页按此过滤）
}

// ========== 管理后台（原配置中心）==========
export interface DataSource {
  id: string;
  name: string;
  type: "mysql" | "postgresql" | "oracle" | "api" | "file";
  host: string;
  status: "connected" | "disconnected";
  updatedAt: string;
}

// ========== 数据源管理（完整版）==========
// 数据源类型枚举键
export type DataSourceTypeKey =
  | "mysql"
  | "oracle"
  | "postgresql"
  | "sqlserver"
  | "clickhouse"
  | "api";

// 数据源类型可选项（键 + 展示名）
export interface DataSourceTypeOption {
  key: DataSourceTypeKey;
  label: string;
}

// 数据源完整记录
export interface DataSourceRecord {
  id: string;
  name: string;                       // 数据源名称
  type: DataSourceTypeKey;            // 数据源类型
  uniqueKey: string;                  // 数据源唯一标识，如 mysql_brb
  host: string;                       // 地址
  database: string;                   // 数据库名称
  port: string;                       // 端口号
  username: string;                   // 用户名
  password?: string;                  // 密码（仅表单用，详情不展示）
  owner: string;                      // 负责人
  creator: string;                    // 创建人
  createdAt: string;                  // 创建时间 YYYY-MM-DD HH:mm:ss
  updater: string;                    // 更新人
  updatedAt: string;                  // 更新时间 YYYY-MM-DD HH:mm:ss
  status: "available" | "unavailable"; // 可用状态
  remark?: string;                    // 备注
}

// 连接测试结果
export interface TestConnectionResult {
  success: boolean;
  latencyMs?: number;
  message: string;                    // 成功："连接成功"；失败："连接超时/认证失败/网络不可达"等
}

// Sparta 平台数据
export interface SpartaType {
  key: DataSourceTypeKey;
  label: string;
}
export interface SpartaSource {
  id: string;
  name: string;
  typeKey: DataSourceTypeKey;
}
export interface SpartaDatabase {
  id: string;
  name: string;
  sourceId: string;
}
export interface SpartaTable {
  id: string;
  name: string;
  databaseId: string;
  typeKey: DataSourceTypeKey;
}

// 已集成到元数据管理的数据表
export interface IntegratedTable {
  id: string;                         // 唯一 ID（库名+表名）
  name: string;                       // 数据表名称
  typeKey: DataSourceTypeKey;         // 数据源类型
  sourceName: string;                 // 所属数据源名称
  databaseName: string;               // 所属数据库名称
  integratedAt: string;               // 集成时间
  lastSyncedAt: string;               // 最近同步时间
}

// ========== 元数据 ==========
export interface FieldDef {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  description: string;
}

export interface TableRelation {
  targetTable: string;
  cardinality: string;                // 基数，如 "1:N" / "N:1"
  joinField: string;                  // 关联字段
}

export interface TableMetadata {
  rowCount: number;
  fieldCount: number;
  sizeMb: number;
  remark: string;
  fields: FieldDef[];
  relations: TableRelation[];
  preview: Record<string, string | number>[]; // 数据预览行
}

// ========== 元数据管理 ==========
export interface MetadataField {
  name: string;                 // 字段英文名（只读）
  dataType: string;             // 数据类型（只读）
  businessMeaning: string;      // 业务含义（可编辑）
  synonyms: string[];           // 同义词（可编辑）
  fk: { table: string; field: string } | null; // 外键关联（可编辑）
}

export type TableType = "物理表" | "视图" | "维度表" | "事实表";

export interface MetadataTable {
  id: string;
  name: string;                 // 表英文名（只读）
  chineseName: string;          // 表中文名（可编辑）
  databaseId: string;
  databaseName: string;         // 所属数据库（只读上下文）
  typeKey: DataSourceTypeKey;   // 数据源类型
  tableType: TableType;         // 表类型（可编辑下拉）
  synonyms: string[];           // 表名同义词（可编辑）
  description: string;          // 业务描述（可编辑）
  rowCount: number;
  fields: MetadataField[];
  relations: TableRelation[];
  preview: Record<string, string | number>[];
}

export interface MetadataDatabase {
  id: string;
  name: string;
  typeKey: DataSourceTypeKey;
  tables: MetadataTable[];
}

export interface BizTerm {
  id: string;
  name: string;
  synonyms: string;
  definition: string;
  domain: string;
  creator: string;
  updatedAt: string;
}

export interface BizLogic {
  id: string;
  name: string;
  expression: string;
  description: string;
  creator: string;
  updatedAt: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  uploadDate: string;
  status: "indexed" | "processing" | "failed";
}

export interface AiSkill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface ConversationRecord {
  id: string;
  userId: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
}

// ========== 告警中心 ==========
// 告警等级（优先级：危险 > 告警 > 预警 > 关注 > 提示）
export type AlertLevel = "提示" | "关注" | "预警" | "告警" | "危险";

// 告警类型：当前异常（已发生）/ 预测风险（未来可能越界）
export type AlertType = "当前异常" | "预测风险";

// 业务领域
export type AlertDomain = "生产管理" | "工艺质量" | "能源消耗" | "费用预算执行";

// 一条告警记录
export interface AlertRecord {
  id: string;                 // 告警编号 YJ202607270035（兼作路由参数）
  level: AlertLevel;          // 等级
  title: string;              // 告警标题
  type: AlertType;            // 告警类型（当前异常 / 预测风险）
  domain: AlertDomain;        // 业务领域
  objectCode: string;         // 告警对象编号
  objectName: string;         // 告警对象名称
  metricName: string;         // 指标中文名称
  triggerTime: string;        // 告警触发时间 YYYY-MM-DD HH:mm
  // —— 核心告警数据 ——
  valueLabel: string;         // 告警值（当前异常=当前值 / 预测风险=预测值）
  baselineLabel: string;      // 基准 / 阈值
  deviationValue: string;     // 偏离值（带方向与单位，如 +220.47 kWh）
  deviationRate: string;      // 偏离率（带方向，如 +647.8%）
  // —— 费用预算执行扩展（列表「数据指标/执行进度偏差」列与详情三件套）——
  metricLabel?: string;       // 原始指标名（不带"-执行进度偏差"后缀，如「日常招待费」）
  subjectPath?: string;       // 预算科目全路径（费用科目筛选用）
  executionRate?: string;     // 预算执行率（如 "50.1%"）
  planProgress?: string;      // 计划执行进度（如 "66.4%"）
  deviationLabel?: string;    // 执行进度偏差（如 "+22pct"）
  confidenceRange?: string;   // 置信区间（仅预测风险）
  duration?: string;          // 持续时间（仅当前异常）
  forecastTime?: string;      // 预计越界时间（仅预测风险；能源口径如「预计2026年8月越界」）
  riskProb?: string;          // 风险概率（仅预测模型可提供时）
  // —— 工艺质量扩展（详情基本信息：批次/班组/牌号/工序）——
  batch?: string;             // 批次（实测如「第 2417 批」/预测如「第 2418 批（3个批次后）」；月度指标为「本月」）
  process?: string;           // 来源工序（SF 稳定性指标关联，如「松散回潮」；结果类指标无 → 不展示）
  forecastWindow?: string;    // 预测窗口（仅预测风险，如「未来 10 个已排产批次」；实测异常不展示）
  shift?: string;             // 班组（甲班/乙班/丙班）
  shiftLabel?: string;        // 班次（白班/夜班，如「7-19 白班」；批/班周期指标按触发时间推定，月度指标不生成）
  brand?: string;             // 牌号（如「娇子」；结果类指标为「—」）
  consecutiveShifts?: number; // 连续同向偏离周期数（飘移类记录；详情展示如「3个批次」，列表置顶排序）
  modelVersion?: string;      // 模型版本（缺陷预测模型或工艺标准版本，追溯字段）
  // —— 判定依据 ——
  strategyName: string;       // 告警策略名称
  triggerCondition: string;   // 触发条件
  // —— 原因与处置建议 ——
  causeSummary?: string;      // 异常原因（空表示暂未识别到明确原因）
  causeType?: "AI生成" | "AI生成·人工修正" | "人工补录"; // 原因类型（causeSummary 存在时有值）
  suggestion?: string;        // 处置建议
  manualCause?: string;       // 人工补录内容（质量口径「没帮助」后补录，独立展示于 AI 生成内容下方）
  // —— 责任与处理情况 ——
  receiver: string;           // 接收人
  notifyMethods: string[];    // 通知方式
  notifyStatus: "已发送" | "发送失败"; // 通知状态
  handleNote?: string;        // 处置说明
  handledAt?: string;         // 处理时间
  handledBy?: string;         // 处理人
  handleResult?: string;      // 确认结果（质量口径：确认为异常/判为偶发）
}

// ========== 告警管理（数据告警策略）==========
export type AlertOperator = "<" | "≤" | ">" | "≥" | "≠" | "=" | "超出正常区间" | "处于区间";
export type AlertBaselineType = "目标值" | "基准值" | "上限" | "下限" | "历史均值" | "正常区间";
export type AlertDetectCycle = "每小时" | "每日" | "每月" | "每批次" | "每班次";
export type AlertScope = "全部适用对象" | "指定对象"; // 保留类型兼容；新表单固定为指定对象

// 单条触发条件
export interface AlertCondition {
  metric: string;                 // 数据指标
  forecastRange?: string;         // 预测范围（仅预测风险）
  operator: AlertOperator;        // 判断方式
  baselineType: AlertBaselineType; // 基准类型
  baselineValue: string;          // 基准值；正常区间为 "下限~上限"；目标值为系统带入的目标值
  deviation?: string;             // 超出量（绝对量，单位随指标；正常区间类型不填）
  consecutiveShifts?: number;     // 连续同向偏离周期数（质量口径；连续 N 个统计周期同向越界触发）
}

// 数据告警策略
export interface AlertStrategy {
  id: string;
  name: string;                   // 告警名称
  description?: string;           // 策略说明
  type: AlertType;                // 当前异常 / 预测风险
  domain: AlertDomain;            // 业务域
  scope: AlertScope;              // 适用范围
  objects: string[];              // 指定对象名称（scope=指定对象时）
  conditions: AlertCondition[];   // 触发条件
  relation: "且" | "或";          // 多条件关系
  level: AlertLevel;              // 告警等级
  detectCycle: AlertDetectCycle;  // 检测周期
  notifyTemplate: string;         // 通知预览模板
  notifyMethods: string[];        // 通知方式
  receivers: string[];            // 接收人
  repeatAlert: boolean;           // 重复提醒开关
  repeatCount?: number;           // 重复次数（默认3）
  repeatInterval?: number;        // 提醒间隔（分钟，默认5）
  enabled: boolean;               // 启用状态（新建默认停用）
  updatedAt: string;              // 更新时间 YYYY-MM-DD HH:mm
  creator?: string;               // 创建人用户名（质量口径：策略详情展示）
  createdAt?: string;             // 创建时间 YYYY-MM-DD HH:mm（质量口径）
  editedBy?: string;              // 最近编辑人用户名（质量口径；未被编辑过则无）
}

// ========== 指标管理 ==========
export interface MetricManage {
  id: string;
  nameCn: string;          // 指标中文名称
  nameEn: string;          // 指标英文名称（保留：溯源拓扑等仍在用，列表/详情改用 code）
  code: string;            // 指标编码
  metricType?: "atomic" | "derived"; // 指标类型（atomic=原子 / derived=派生）
  domain: string;          // 业务域
  definition: string;      // 业务定义
  formula: string;         // 计算口径
  decimals: number;        // 小数位数
  unit: string;            // 度量单位
  synonyms?: string;       // 同义词（选填）
  dimensions: string;      // 支持维度
  statObject: string;      // 统计对象
  statGranularity: string; // 统计粒度
  updateFrequency: string; // 数据更新频率
  description?: string;    // 描述（选填）
  owner: string;           // 负责人
  createdAt: string;       // 创建时间
  updatedAt?: string;      // 更新时间
  calcFormula?: string;    // 计算公式
  defaultAgg?: string;     // 默认聚合
  derivedFormula?: string; // 派生公式
  sourceId?: string;       // 数据源ID
  mainTable?: string;      // 主表
  measureExpr?: string;    // 度量表达式
  target?: { value: number; direction: "不高于" | "不低于" }; // 目标值（目标值管理）
  reverseItems?: string[]; // 达标反推内容（由 AI 生成 / 手动维护，仅配置目标值的指标开放）
}

// ========== 指标值管理（人工填报指标数据，月度值口径） ==========
export interface MetricValueRecord {
  id: string;                 // mv-001 递增
  metricId: string;           // 关联指标管理（固定 m18 工业总产值）
  metricName: string;         // 指标名称快照
  month: string;              // 数据月份 YYYY-MM（每条记录对应一个自然月）
  value: number;              // 指标值
  unit: string;               // 单位（随指标自动带出）
  source?: string;            // 数据来源（选填）
  remark?: string;            // 备注（选填）
  createdBy: string;          // 创建人
  createdAt: string;          // 创建时间
  updatedBy?: string;         // 最近更新人
  updatedAt?: string;         // 最近更新时间
}

// ========== 管控值管理（指标值管理 · 管控值页签） ==========
// 指标分类：过程管控指标 / 缺陷部位缺陷率 / 缺陷指标
export type ControlCategory = "process" | "defectPart" | "defect";

// 判断方向（在控条件："between" = 处于允许区间，含上下边界）
export type ControlDir = "<" | "≤" | ">" | "≥" | "=" | "between";

// 数值口径（校验规则：percent 0~100 / count 非负整数 / duration 非负数）
export type ControlValueKind = "percent" | "count" | "duration";

// 管控指标目录（预置，按分类展示；新增表单的可选指标来源）
export interface ControlMetricDef {
  id: string;                 // cm-001 递增
  category: ControlCategory;  // 所属分类
  name: string;               // 指标名称
  unit: string;               // 计量单位（随指标带出，不可修改）
  decimals: number;           // 数值精度（小数位）
  valueKind: ControlValueKind;// 数值口径（决定校验规则）
  defaultDir: ControlDir;     // 默认判断方向（缺陷率 ≤ / 优质品率 ≥ / 水分允许范围 between）
}

// 管控值配置（每个指标仅一条配置，停用后仍占用、不可重复新增）
export interface MetricControlConfig {
  id: string;                 // mc-001 递增
  metricId: string;           // 关联目录指标
  category: ControlCategory;  // 指标分类（快照）
  metricName: string;         // 指标名称（快照）
  unit: string;               // 单位（快照）
  dir: ControlDir;            // 判断方向
  value?: number;             // 单值比较（非 between 必填）
  low?: number;               // 允许区间下限（between 必填）
  high?: number;              // 允许区间上限（between 必填，必须大于下限）
  enabled: boolean;           // 启停状态（停用后不参与管控判断）
  updatedBy: string;          // 最近更新人
  updatedAt: string;          // 最近更新时间 YYYY-MM-DD HH:mm
}

// 管控值变更记录（新增 / 修改 / 启用 / 停用自动留痕，时间倒序展示）
export interface ControlChangeLog {
  id: string;                 // cl-001 递增
  controlId: string;          // 所属配置
  type: "新增" | "修改" | "启用" | "停用";
  before: string;             // 变更前内容（配置快照摘要，新增时为 "—")
  after: string;              // 变更后内容
  by: string;                 // 操作人
  at: string;                 // 变更时间 YYYY-MM-DD HH:mm
}

// ========== 目标值管理（指标详情内，版本化） ==========
export type TargetPeriod = "日度" | "月度" | "季度" | "年度";

// 判断方向（单值方向用 value；"处于目标区间"用 lower/upper）
export type TargetDirection = "<" | "≤" | ">" | "≥" | "=" | "处于目标区间";

export type TargetVersionStatus = "待生效" | "生效中" | "已失效";

// 指标目标值版本：编辑不修改原记录而是生成新版本，历史版本永久保留
export interface MetricTargetVersion {
  id: string;
  version: string;               // 版本号 V1、V2…（同指标同考核周期下系统递增）
  metricId: string;              // 所属指标
  metricName: string;            // 指标名称（只读带入）
  period: TargetPeriod;          // 考核周期
  direction: TargetDirection;    // 判断方向
  value?: number;                // 目标值（单值方向必填）
  lower?: number;                // 目标区间下限（区间方向必填，下限 < 上限）
  upper?: number;                // 目标区间上限
  unit: string;                  // 指标单位（只读带入）
  effectiveStart: string;        // 生效周期开始 YYYY-MM-DD
  effectiveEnd: string;          // 生效周期结束 YYYY-MM-DD
  enabled: boolean;              // 是否启用
  status: TargetVersionStatus;   // 状态（按生效周期 + 启用 + 替代/停用记录推导）
  effectiveTime: string;         // 实际开始生效时间
  createdAt: string;             // 创建时间 YYYY-MM-DD HH:mm
  createdBy: string;             // 创建人
  basis?: string;                // 目标依据（≤200 字）
  remark?: string;               // 备注（≤200 字）
  changeNote?: string;           // 变更说明（编辑生成新版本时必填，≤200 字）
  replacedAt?: string;           // 被新版本替代时间
  disabledAt?: string;           // 停用时间
  disabledBy?: string;           // 停用操作人
  disableReason?: string;        // 停用原因
}

// ========== 折标系数管理（能源折标准煤系数，版本化） ==========
export type CoeffEnergyType = "电（一类碳排放）" | "天然气（二类碳排放）" | "蒸汽";

export type CoeffStatus = "待生效" | "生效中" | "已失效";

// 折标煤系数版本：按能源类型维护，版本化永久保留不可删除
export interface CoefficientVersion {
  id: string;
  version: string;               // 版本号 V1、V2…（同能源类型下系统递增）
  energyType: CoeffEnergyType;   // 能源类型
  value: number;                 // 折标煤系数（>0，支持小数；单位 kgce/能源计量单位）
  effectiveStart: string;        // 生效周期开始 YYYY-MM-DD
  effectiveEnd: string;          // 生效周期结束 YYYY-MM-DD
  enabled: boolean;              // 是否启用（是否参与业务计算）
  status: CoeffStatus;           // 状态（待生效 / 生效中 / 已失效，按周期与启用开关推导）
  basis: string;                 // 来源依据（国家标准 / 政府公告 / 公司内部文件，必填）
  remark?: string;               // 备注（≤200 字）
  createdAt: string;             // 创建时间 YYYY-MM-DD HH:mm
  createdBy: string;             // 创建人
  changeNote?: string;           // 变更说明（编辑生成新版本时系统记录）
  replacedAt?: string;           // 被新版本替代时间
  disabledAt?: string;           // 停用时间
  disabledBy?: string;           // 停用操作人
  disableReason?: string;        // 停用原因
}

// ========== 重大事件年鉴 ==========
export type MajorEventType =
  | "设备故障"
  | "检修维护"
  | "技改投运"
  | "生产计划调整"
  | "运行或工艺调整"
  | "能源供应异常"
  | "外部环境影响"
  | "其他事件";

export type EventFormation = "AI识别" | "AI识别·人工修订" | "人工补录";

export type EventConfirmStatus = "待确认" | "已确认" | "已排除";

// 事件经过时间轴节点
export interface EventTimelineItem {
  time: string; // 节点时间 YYYY-MM-DD HH:mm
  label: string; // 阶段名（发生 / 扩大 / 处置 / 恢复…）
  desc?: string; // 节点描述
}

// 修订记录（AI识别事件被人工修改后保留）
export interface EventRevision {
  time: string;
  user: string;
  summary: string; // 修改内容摘要
}

// 重大事件
export interface MajorEvent {
  id: string; // SJ + YYYYMMDD + 3位序号
  title: string;
  type: MajorEventType;
  startTime: string; // "YYYY-MM-DD HH:mm"
  endTime: string | null; // null = 进行中
  objects: string[]; // 影响对象（车间/网格/设备名）
  metrics: string[]; // 影响指标名
  impactSummary: string; // 影响摘要（有数据依据的主要影响结果）
  process: string; // 事件经过（≤2000 字）
  causeAnalysis?: string; // 原因分析（AI 生成的异常原因分析结论）
  timeline: EventTimelineItem[]; // 时间轴（缺处置/恢复信息时为空段）
  alertIds: string[]; // 关联预警记录 id（技改投运/计划调整等可为空）
  aiBasis?: string; // AI 识别依据（AI识别事件）
  isSuspected?: boolean; // 疑似事件（仅有指标异常、缺少业务证据）
  formation: EventFormation;
  status: EventConfirmStatus;
  excludeReason?: string; // 排除原因
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  revisions: EventRevision[]; // 修订记录
}

// 年鉴报告纳入事件的快照行
export interface ReportEventSnapshot {
  id: string;
  title: string;
  type: string;
  timeLabel: string; // 起止时间展示
  impact: string; // 影响摘要
  duration: string; // 持续时长
  version: string; // 生成时的版本标记（事件最后更新时间）
}

// 年鉴报告
export interface YearbookReport {
  id: string;
  year: number;
  periodType?: "年度" | "月度"; // 报告周期类型（生产管理重大事件报告支持月度；缺省为年度）
  month?: number; // 月度报告的月份（periodType 为"月度"时有值）
  name: string; // ≤100 字，同年度内不重复
  periodStart: string;
  periodEnd: string;
  includedEvents: ReportEventSnapshot[]; // 生成时的事件快照（不随后续变化更新）
  dataCutoff: string; // 数据截止时间
  sections: { overview: string; chronicle: string; analysis: string }; // 三章正文
  generatedAt: string;
  generatedBy: string;
  updatedAt?: string;
  updatedBy?: string;
  editLog: { time: string; user: string; note: string }[]; // 人工编辑记录
}

// ========== 导航 ==========
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  children?: NavItem[]; // 二级菜单（可折叠）
  matchPrefixes?: string[]; // 一级激活态匹配前缀（当二级路由分散在多个路径前缀时使用）
}

// ========== 对象管理（对象结构 + 对象-指标关联） ==========
// 对象关联的指标（含指标编码，用于列表展示与关联编辑）
export interface ObjectMetricRef {
  metricId: string;      // 指标 id（metricList）
  nameCn: string;        // 指标中文名称
  code: string;          // 指标编码
  domain: string;        // 业务域
}

// 统一维护的企业对象结构及"对象-指标"关联关系
export interface ObjectRelation {
  id: string;
  name: string;             // 对象名称
  system: string;           // 所属系统
  org: string;              // 所属组织
  dept: string;             // 所属部门
  meterNo: string;          // 对应仪表号
  metrics: ObjectMetricRef[]; // 关联指标（可多个）
  createdAt: string;        // 创建时间
  createdBy: string;        // 创建人
  updatedAt?: string;
  updatedBy?: string;
}

// ========== 首页最近访问 ==========
// 所属板块（首页板块：生产管理 / 工艺质量 / 能源消耗 / 费用预算执行）
export type VisitBoard = "生产管理" | "工艺质量" | "能源消耗" | "费用预算执行";

// 内容类型（对应不同的打开方式）
export type VisitContentType =
  | "智能问数对话"
  | "预测分析记录"
  | "告警记录"
  | "重大事件记录"
  | "重大事件报告"
  | "年度报告"
  | "年鉴报告"
  | "普通报告"
  | "重点网格监测"
  | "指标溯源"
  | "数据资产";

// 最近访问记录（同一内容重复访问仅更新最近访问时间，不生成重复记录）
export interface RecentVisit {
  id: string;                // 内容唯一键（同内容去重依据）
  title: string;             // 标题
  board: VisitBoard;         // 所属板块
  contentType: VisitContentType; // 内容类型
  creator: string;           // 创建人（告警记录为"系统"）
  editable: boolean;         // 本人创建且具备编辑权限时可继续编辑
  lastVisitedAt: string;     // 最近访问时间 YYYY-MM-DD HH:mm
  route: string;             // 跳转路由（查看/继续处理/继续对话）
}
