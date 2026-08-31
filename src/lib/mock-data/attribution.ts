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
  dataAsset: string;      // 关联数据资产
  sourceDb: string;       // 来源数据库
  sourceTable: string;    // 来源表
  sourceFieldCn: string;  // 来源字段中文名称
  sourceFieldEn: string;  // 来源字段英文名称
  caliber: string;        // 取值口径
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
    { id: "eng-m01", templateName: "生产单位电耗归因模板", metricCn: "制丝车间每公斤电耗", metricEn: "silk_power_per_kg", metricCode: "I_ING_001", factor: "制丝车间产量", dataAsset: "能耗计量表", sourceDb: "ods_energy", sourceTable: "t_meter_daily", sourceFieldCn: "制丝车间产量", sourceFieldEn: "silk_workshop_output", caliber: "按制丝工序一日一值汇总，取当日产量与电耗" },
    { id: "eng-m02", templateName: "单箱综合能耗归因模板", metricCn: "单箱综合能耗", metricEn: "unit_energy_per_box", metricCode: "I_ING_002", factor: "蒸汽管网疏水阀内漏", dataAsset: "事件管理", sourceDb: "ods_event", sourceTable: "t_event_record", sourceFieldCn: "事件类型", sourceFieldEn: "event_type", caliber: "检索「疏水阀内漏+蒸汽管网+时间范围」事件记录" },
    { id: "eng-m03", templateName: "单箱综合能耗归因模板", metricCn: "单箱综合能耗", metricEn: "unit_energy_per_box", metricCode: "I_ING_002", factor: "环境气温下降", dataAsset: "气象数据", sourceDb: "ods_weather", sourceTable: "t_weather_daily", sourceFieldCn: "日均气温", sourceFieldEn: "avg_temperature", caliber: "继承业务术语「日均气温」的字段与计算逻辑" },
    { id: "eng-m04", templateName: "蒸汽单耗归因模板", metricCn: "蒸汽单耗", metricEn: "steam_per_unit", metricCode: "I_ING_003", factor: "锅炉负荷率", dataAsset: "指标库", sourceDb: "dw_energy", sourceTable: "ads_metric_value", sourceFieldCn: "锅炉负荷率", sourceFieldEn: "boiler_load_rate", caliber: "继承指标「锅炉负荷率」的计算口径" },
    { id: "eng-m05", templateName: "循环水能耗归因模板", metricCn: "循环水吨钢电耗", metricEn: "circ_water_power", metricCode: "I_ING_004", factor: "冷却塔风机投运台数", dataAsset: "能耗计量表", sourceDb: "ods_energy", sourceTable: "t_meter_detail", sourceFieldCn: "风机投运台数", sourceFieldEn: "fan_running_count", caliber: "按工序求和风机投运台数与电耗" },
    { id: "eng-m06", templateName: "煤气放散率归因模板", metricCn: "煤气放散率", metricEn: "gas_flare_rate", metricCode: "I_ING_005", factor: "煤气产销平衡", dataAsset: "能耗计量表", sourceDb: "ods_energy", sourceTable: "t_gas_balance", sourceFieldCn: "煤气产销量", sourceFieldEn: "gas_output_sale", caliber: "煤气放散量/煤气产量，按日平均" },
    { id: "eng-m07", templateName: "总用电量归因模板", metricCn: "总用电量", metricEn: "total_power", metricCode: "I_ING_006", factor: "卷包车间排产", dataAsset: "能耗计量表", sourceDb: "ods_prod", sourceTable: "t_plan_daily", sourceFieldCn: "卷包计划产量", sourceFieldEn: "rolling_plan_output", caliber: "按卷包工序一日一值直接取值" },
    { id: "eng-m08", templateName: "单位产值碳排放归因模板", metricCn: "单位产值碳排放量", metricEn: "carbon_per_output", metricCode: "I_ING_007", factor: "外购电力碳排放因子", dataAsset: "碳排放因子库", sourceDb: "ods_carbon", sourceTable: "t_carbon_factor", sourceFieldCn: "电网碳排放因子", sourceFieldEn: "grid_carbon_factor", caliber: "继承业务术语「电网碳排放因子」定义" },
    { id: "eng-m09", templateName: "锅炉热效率归因模板", metricCn: "锅炉热效率", metricEn: "boiler_efficiency", metricCode: "I_ING_008", factor: "受热面积灰", dataAsset: "事件管理", sourceDb: "ods_event", sourceTable: "t_event_record", sourceFieldCn: "事件类型", sourceFieldEn: "event_type", caliber: "检索「吹灰/停炉+锅炉+时间范围」事件记录" },
    { id: "eng-m10", templateName: "压缩空气单耗归因模板", metricCn: "压缩空气单耗", metricEn: "air_per_unit", metricCode: "I_ING_009", factor: "管网泄漏", dataAsset: "事件管理", sourceDb: "ods_event", sourceTable: "t_event_record", sourceFieldCn: "事件类型", sourceFieldEn: "event_type", caliber: "检索「管网泄漏+空压系统+时间范围」事件记录" },
    { id: "eng-m11", templateName: "制冷系统能耗归因模板", metricCn: "制冷COP", metricEn: "chiller_cop", metricCode: "I_ING_010", factor: "冷却水进水温度", dataAsset: "能耗计量表", sourceDb: "ods_energy", sourceTable: "t_meter_detail", sourceFieldCn: "冷却水进水温度", sourceFieldEn: "cooling_inlet_temp", caliber: "制冷量/输入功率，按小时平均" },
    { id: "eng-m12", templateName: "给水单耗归因模板", metricCn: "给水泵电耗", metricEn: "feedwater_pump_power", metricCode: "I_ING_011", factor: "给水泵运行台数", dataAsset: "能耗计量表", sourceDb: "ods_energy", sourceTable: "t_meter_detail", sourceFieldCn: "给水泵运行台数", sourceFieldEn: "pump_running_count", caliber: "按给水泵台数求和电耗" },
  ],
  production: [
    // 暂未配置数据映射数据，列表显示「暂无数据」
  ],
  quality: [
    // 暂未配置数据映射数据，列表显示「暂无数据」
  ],
};
