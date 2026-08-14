// 领域归因配置 mock 数据
// 场景：卷烟厂。三领域（能源管理 / 生产管理 / 工艺质量）× 两类（归因关系 / 数据映射）。

// ========== 领域映射 ==========
export type AttributionDomainKey = "energy" | "production" | "quality";

export const DOMAIN_LABEL_MAP: Record<AttributionDomainKey, string> = {
  energy: "能源管理",
  production: "生产管理",
  quality: "工艺质量",
};

// ========== 枚举常量 ==========
// 影响方向
export const INFLUENCE_DIRS = ["正向", "负向"] as const;
// 因素属性
export const FACTOR_ATTRS = ["正常业务驱动", "异常波动"] as const;
// 取数方式（对应取值口径 5 种填写规范）
export const DATA_FETCH_MODES = [
  "引用已有指标",
  "引用业务术语",
  "引用事件数据",
  "引用已有日汇总字段",
  "引用原始明细字段",
] as const;

// 取数方式 → 取值口径填写说明
export const FETCH_MODE_CALIBER_HINT: Record<string, string> = {
  引用已有指标: "继承该指标的计算口径",
  引用业务术语: "继承业务术语的定义/字段/计算逻辑",
  引用事件数据: '从事件管理检索「事件类型+影响对象+时间范围」的事件记录',
  引用已有日汇总字段: "一日一值，取数方式选「直接取值」",
  引用原始明细字段: "确认求和/平均/最大/最新值的取值口径",
};

// ========== 归因关系 ==========
export interface AttributionRelation {
  id: string;
  templateName: string;   // 归因模板名称
  metricCn: string;       // 指标中文名称
  metricEn: string;       // 指标英文名称（备用：列表/搜索已改用 metricCode）
  metricCode: string;     // 指标编码
  factor: string;         // 候选因素
  influenceDir: string;   // 影响方向
  mechanism: string;      // 影响机制
  factorAttr: string;     // 因素属性
  remark?: string;        // 特殊说明（选填）
}

// ========== 数据映射 ==========
export interface AttributionMapping {
  id: string;
  templateName: string;   // 归因模板名称
  metricCn: string;       // 指标中文名称
  metricEn: string;       // 指标英文名称（备用：列表/搜索已改用 metricCode）
  metricCode: string;     // 指标编码
  factor: string;         // 候选因素
  fetchMode: string;      // 取数方式
  dataAsset: string;      // 关联数据资产
  caliber: string;        // 取值口径
  scope?: string;         // 适用对象（选填，全厂或具体对象）
}

// ========== 归因关系数据 ==========
export const ATTRIBUTION_RELATIONS: Record<AttributionDomainKey, AttributionRelation[]> = {
  energy: [
    { id: "eng-r01", templateName: "生产单位电耗归因模板", metricCn: "制丝车间每公斤电耗", metricEn: "silk_power_per_kg", metricCode: "I_ING_001", factor: "制丝车间产量", influenceDir: "负向", mechanism: "产量下降时除尘、纯水等固定负荷占比上升，单位电耗随之升高", factorAttr: "正常业务驱动", remark: "对应制丝除尘、纯水系统等重点网格" },
    { id: "eng-r02", templateName: "单箱综合能耗归因模板", metricCn: "单箱综合能耗", metricEn: "unit_energy_per_box", metricCode: "I_ING_002", factor: "蒸汽管网疏水阀内漏", influenceDir: "正向", mechanism: "疏水阀内漏导致蒸汽泄漏损耗，综合能耗上升", factorAttr: "异常波动", remark: "需结合点检记录定位泄漏点" },
    { id: "eng-r03", templateName: "单箱综合能耗归因模板", metricCn: "单箱综合能耗", metricEn: "unit_energy_per_box", metricCode: "I_ING_002", factor: "环境气温下降", influenceDir: "正向", mechanism: "气温下降致采暖、伴热负荷增加，综合能耗上升", factorAttr: "正常业务驱动", remark: "季节性因素，建议结合气温同比分析" },
    { id: "eng-r04", templateName: "蒸汽单耗归因模板", metricCn: "蒸汽单耗", metricEn: "steam_per_unit", metricCode: "I_ING_003", factor: "锅炉负荷率", influenceDir: "负向", mechanism: "锅炉低负荷运行时热效率下降，单位产汽耗能上升", factorAttr: "正常业务驱动" },
    { id: "eng-r05", templateName: "循环水能耗归因模板", metricCn: "循环水吨钢电耗", metricEn: "circ_water_power", metricCode: "I_ING_004", factor: "冷却塔风机投运台数", influenceDir: "正向", mechanism: "风机投运过多超过水温控制需要，电耗上升", factorAttr: "异常波动", remark: "建议结合水温联锁控制评估" },
    { id: "eng-r06", templateName: "煤气放散率归因模板", metricCn: "煤气放散率", metricEn: "gas_flare_rate", metricCode: "I_ING_005", factor: "煤气产销平衡", influenceDir: "正向", mechanism: "产大于用且储配能力不足时，多余煤气被迫放散", factorAttr: "正常业务驱动" },
    { id: "eng-r07", templateName: "总用电量归因模板", metricCn: "总用电量", metricEn: "total_power", metricCode: "I_ING_006", factor: "卷包车间排产", influenceDir: "正向", mechanism: "排产增加、机台投运增多，总用电量上升", factorAttr: "正常业务驱动", remark: "对应卷接、包装机组" },
    { id: "eng-r08", templateName: "单位产值碳排放归因模板", metricCn: "单位产值碳排放量", metricEn: "carbon_per_output", metricCode: "I_ING_007", factor: "外购电力碳排放因子", influenceDir: "正向", mechanism: "电网季节性碳排放因子偏高时间接排放上升", factorAttr: "正常业务驱动" },
    { id: "eng-r09", templateName: "锅炉热效率归因模板", metricCn: "锅炉热效率", metricEn: "boiler_efficiency", metricCode: "I_ING_008", factor: "受热面积灰", influenceDir: "负向", mechanism: "积灰增加传热热阻，排烟温度升高、热效率下降", factorAttr: "异常波动", remark: "需结合停炉吹灰记录" },
    { id: "eng-r10", templateName: "压缩空气单耗归因模板", metricCn: "压缩空气单耗", metricEn: "air_per_unit", metricCode: "I_ING_009", factor: "管网泄漏", influenceDir: "正向", mechanism: "管路泄漏致空压机频繁加卸载，单耗上升", factorAttr: "异常波动" },
    { id: "eng-r11", templateName: "制冷系统能耗归因模板", metricCn: "制冷COP", metricEn: "chiller_cop", metricCode: "I_ING_010", factor: "冷却水进水温度", influenceDir: "负向", mechanism: "冷却水温度偏高致冷凝压力升高、COP 下降", factorAttr: "正常业务驱动" },
    { id: "eng-r12", templateName: "给水单耗归因模板", metricCn: "给水泵电耗", metricEn: "feedwater_pump_power", metricCode: "I_ING_011", factor: "给水泵运行台数", influenceDir: "正向", mechanism: "小流量时多台泵并联运行、未及时切换，电耗上升", factorAttr: "异常波动" },
  ],
  production: [
    // 暂未配置归因关系数据，列表显示「暂无数据」
  ],
  quality: [
    // 暂未配置归因关系数据，列表显示「暂无数据」
  ],
};

// ========== 数据映射数据 ==========
export const ATTRIBUTION_MAPPINGS: Record<AttributionDomainKey, AttributionMapping[]> = {
  energy: [
    { id: "eng-m01", templateName: "生产单位电耗归因模板", metricCn: "制丝车间每公斤电耗", metricEn: "silk_power_per_kg", metricCode: "I_ING_001", factor: "制丝车间产量", fetchMode: "引用已有日汇总字段", dataAsset: "能耗计量表", caliber: "按制丝工序一日一值汇总，取当日产量与电耗", scope: "制丝车间" },
    { id: "eng-m02", templateName: "单箱综合能耗归因模板", metricCn: "单箱综合能耗", metricEn: "unit_energy_per_box", metricCode: "I_ING_002", factor: "蒸汽管网疏水阀内漏", fetchMode: "引用事件数据", dataAsset: "事件管理", caliber: "检索「疏水阀内漏+蒸汽管网+时间范围」事件记录", scope: "动力车间" },
    { id: "eng-m03", templateName: "单箱综合能耗归因模板", metricCn: "单箱综合能耗", metricEn: "unit_energy_per_box", metricCode: "I_ING_002", factor: "环境气温下降", fetchMode: "引用业务术语", dataAsset: "气象数据", caliber: "继承业务术语「日均气温」的字段与计算逻辑", scope: "全厂" },
    { id: "eng-m04", templateName: "蒸汽单耗归因模板", metricCn: "蒸汽单耗", metricEn: "steam_per_unit", metricCode: "I_ING_003", factor: "锅炉负荷率", fetchMode: "引用已有指标", dataAsset: "指标库", caliber: "继承指标「锅炉负荷率」的计算口径", scope: "动力车间" },
    { id: "eng-m05", templateName: "循环水能耗归因模板", metricCn: "循环水吨钢电耗", metricEn: "circ_water_power", metricCode: "I_ING_004", factor: "冷却塔风机投运台数", fetchMode: "引用原始明细字段", dataAsset: "能耗计量表", caliber: "按工序求和风机投运台数与电耗", scope: "动力车间" },
    { id: "eng-m06", templateName: "煤气放散率归因模板", metricCn: "煤气放散率", metricEn: "gas_flare_rate", metricCode: "I_ING_005", factor: "煤气产销平衡", fetchMode: "引用原始明细字段", dataAsset: "能耗计量表", caliber: "煤气放散量/煤气产量，按日平均", scope: "动力车间" },
    { id: "eng-m07", templateName: "总用电量归因模板", metricCn: "总用电量", metricEn: "total_power", metricCode: "I_ING_006", factor: "卷包车间排产", fetchMode: "引用已有日汇总字段", dataAsset: "能耗计量表", caliber: "按卷包工序一日一值直接取值", scope: "卷包车间" },
    { id: "eng-m08", templateName: "单位产值碳排放归因模板", metricCn: "单位产值碳排放量", metricEn: "carbon_per_output", metricCode: "I_ING_007", factor: "外购电力碳排放因子", fetchMode: "引用业务术语", dataAsset: "碳排放因子库", caliber: "继承业务术语「电网碳排放因子」定义", scope: "全厂" },
    { id: "eng-m09", templateName: "锅炉热效率归因模板", metricCn: "锅炉热效率", metricEn: "boiler_efficiency", metricCode: "I_ING_008", factor: "受热面积灰", fetchMode: "引用事件数据", dataAsset: "事件管理", caliber: "检索「吹灰/停炉+锅炉+时间范围」事件记录", scope: "动力车间" },
    { id: "eng-m10", templateName: "压缩空气单耗归因模板", metricCn: "压缩空气单耗", metricEn: "air_per_unit", metricCode: "I_ING_009", factor: "管网泄漏", fetchMode: "引用事件数据", dataAsset: "事件管理", caliber: "检索「管网泄漏+空压系统+时间范围」事件记录", scope: "动力车间" },
    { id: "eng-m11", templateName: "制冷系统能耗归因模板", metricCn: "制冷COP", metricEn: "chiller_cop", metricCode: "I_ING_010", factor: "冷却水进水温度", fetchMode: "引用原始明细字段", dataAsset: "能耗计量表", caliber: "制冷量/输入功率，按小时平均", scope: "动力车间" },
    { id: "eng-m12", templateName: "给水单耗归因模板", metricCn: "给水泵电耗", metricEn: "feedwater_pump_power", metricCode: "I_ING_011", factor: "给水泵运行台数", fetchMode: "引用原始明细字段", dataAsset: "能耗计量表", caliber: "按给水泵台数求和电耗", scope: "动力车间" },
  ],
  production: [
    // 暂未配置数据映射数据，列表显示「暂无数据」
  ],
  quality: [
    // 暂未配置数据映射数据，列表显示「暂无数据」
  ],
};
