"use client";

import { TraceMetric, ViewMode } from "@/lib/mock-data/metric-trace";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}

// 概要/上下文网格
function Grid({ items }: { items: { label: string; value?: string }[] }) {
  const rows = items.filter((it) => it.value);
  if (rows.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs bg-gray-50 rounded-lg p-3">
      {rows.map((it, i) => (
        <div key={i} className="min-w-0">
          <div className="text-gray-400">{it.label}</div>
          <div className="text-gray-800 break-words">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-gray-500 mt-1">{children}</div>;
}

export function TraceDetail({ metric, viewMode, showValues }: { metric: TraceMetric; viewMode: ViewMode; showValues?: boolean }) {
  const resultD = viewMode === "business" ? metric.businessDetail : metric.technicalDetail;
  const defineD = viewMode === "business" ? metric.businessDetailDefine : metric.technicalDetailDefine;
  const d = showValues === false && defineD ? defineD : resultD;

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
        <h3 className="font-semibold text-gray-800">详细解释</h3>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        {/* 指标名称 */}
        <div className="text-base font-medium text-gray-800">{d.name}</div>

        {/* ===== 业务视角 ===== */}
        {viewMode === "business" ? (
          <>
            {/* 指标概览 */}
            <Grid
              items={[
                // 统计对象：指标列表（定义溯源）展示全部，历史记录/计算过程展示当次
                { label: "统计对象", value: d.statObjects ?? d.statObject },
                { label: "当次结果", value: d.overview?.result },
                // 标准指标列表（定义溯源，showValues===false）不展示统计周期、数据截至时间
                ...(showValues !== false
                  ? [{ label: "统计周期", value: d.overview?.period }]
                  : []),
                { label: "更新频率", value: d.updateFreq },
                ...(showValues !== false
                  ? [{ label: "数据截至时间", value: d.overview?.dataAsOf }]
                  : []),
              ]}
            />

            {d.definition && <Row label="业务定义">{d.definition}</Row>}
            {/* 标准指标列表（定义溯源，showValues===false）不展示统计口径 */}
            {showValues !== false && d.formula && (
              <Row label="统计口径">{d.formula}</Row>
            )}

            {/* 指标值形成过程（计算步骤、公式结构不含具体数值，定义溯源同样展示） */}
            {(d.formationDescription || (d.calcSteps && d.calcSteps.length > 0) || (d.calcBreakdown && d.calcBreakdown.length > 0) || d.calcFormula) && (
              <div>
                <SectionTitle>指标值形成过程</SectionTitle>
                {d.formationDescription && (
                  <div className="text-sm text-gray-700 leading-relaxed mt-1 mb-2">{d.formationDescription}</div>
                )}
                {d.calcSteps && d.calcSteps.length > 0 && (
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 mb-2">
                    {d.calcSteps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                )}
                {d.calcBreakdown && d.calcBreakdown.length > 0 && (
                  <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                    <table className="w-full text-sm">
                      <tbody>
                        {d.calcBreakdown.map((item) => (
                          <tr key={item.label} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-1.5 text-gray-600">{item.label}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-gray-800 font-mono">{item.value}</td>
                          </tr>
                        ))}
                        {d.calcBreakdownTotal && (
                          <tr className="bg-primary-50/50">
                            <td className="px-3 py-1.5 font-medium text-primary-800">合计</td>
                            <td className="px-3 py-1.5 text-right font-bold text-primary-800 font-mono">{d.calcBreakdownTotal}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {d.calcFormula && (
                  <div className="mt-2 bg-primary-50/60 border border-primary-100 rounded-lg px-3 py-2 text-sm text-primary-900 font-medium whitespace-pre-line leading-relaxed">
                    {d.calcFormula}
                  </div>
                )}
              </div>
            )}

            {d.formationPath && (
              <Row label="业务形成路径">
                <ol className="list-decimal list-inside space-y-1">
                  {d.formationPath.map((p, i) => <li key={i}>{p}</li>)}
                </ol>
              </Row>
            )}
            {d.influenceFactors && (
              <Row label="相关影响因素">
                <ul className="space-y-0.5">
                  {d.influenceFactors.map((f, i) => (
                    <li key={i} className="flex gap-1.5"><span className="text-gray-300">•</span>{f}</li>
                  ))}
                </ul>
              </Row>
            )}
            {d.application && <Row label="应用价值">{d.application}</Row>}
          </>
        ) : (
          /* ===== 技术视角 ===== */
          <>
            {/* 基础信息（定义溯源）/ 结果上下文（结果溯源） */}
            {showValues === false ? (
              <Grid
                items={[
                  { label: "指标编码", value: metric.code },
                  // 统计对象：指标列表（定义溯源）展示全部
                  { label: "统计对象", value: d.statObjects ?? d.statObject },
                  { label: "更新频率", value: d.updateFreq },
                ]}
              />
            ) : (
              <Grid
                items={[
                  { label: "当次结果", value: d.value ? `${d.value}${d.unit ?? ""}` : undefined },
                  { label: "指标编码", value: metric.code },
                  { label: "时间范围", value: d.context?.timeRange },
                  // 统计对象：历史记录/计算过程展示当次统计对象
                  { label: "统计对象", value: d.statObject ?? d.statObjects },
                  { label: "更新频率", value: d.updateFreq },
                  { label: "数据截至时间", value: d.context?.dataAsOf },
                  { label: "计算时间", value: d.context?.calcTime },
                ]}
              />
            )}

            {/* 指标计算逻辑 */}
            {d.formula && (
              <div>
                <SectionTitle>指标计算逻辑</SectionTitle>
                <code className="text-xs bg-gray-100 px-2 py-1.5 rounded block break-all whitespace-pre-line mt-1 mb-2">{d.formula}</code>
              </div>
            )}
            {d.calcRules && d.calcRules.length > 0 && (
              <div className="text-xs text-gray-500 mb-1">计算规则：</div>
            )}
            {d.calcRules && (
              <ul className="space-y-0.5 text-sm text-gray-700 mb-1">
                {d.calcRules.map((r, i) => (
                  <li key={i} className="flex gap-1.5"><span className="text-gray-300">•</span>{r}</li>
                ))}
              </ul>
            )}

            {/* 逻辑DSL / DSL 执行逻辑 */}
            {d.dslLogic && (
              <Row label={showValues === false ? "逻辑DSL" : "DSL 执行逻辑"}>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700 whitespace-pre-line leading-relaxed">{d.dslLogic}</div>
              </Row>
            )}
            {/* 逻辑SQL / SQL 执行逻辑 */}
            {d.sqlLogic && (
              <Row label={showValues === false ? "逻辑SQL" : "SQL 执行逻辑"}>
                <pre className="bg-gray-800 text-gray-100 rounded-lg p-3 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">{d.sqlLogic}</pre>
              </Row>
            )}
            {/* 执行结果（仅结果溯源展示） */}
            {showValues !== false && d.executionResult && (
              <Row label="执行结果">
                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm text-green-800 font-mono font-medium whitespace-pre-line">
                  {d.executionResult}
                </div>
              </Row>
            )}

            {/* 数据来源 */}
            {(d.sourceSystem || d.db || d.sourceTable || d.coreField) && (
              <Row label="数据来源">
                <div className="space-y-0.5">
                  {d.sourceSystem && <div><span className="text-gray-400">数据源：</span>{d.sourceSystem}{d.sourceSystemEn && <code className="text-xs ml-1">（{d.sourceSystemEn}）</code>}</div>}
                  {d.db && <div><span className="text-gray-400">数据库：</span>{d.db}{d.dbEn && <code className="text-xs ml-1">（{d.dbEn}）</code>}</div>}
                  {d.sourceTable && <div><span className="text-gray-400">数据表：</span><code className="text-xs">{d.sourceTable}</code></div>}
                  {d.coreField && <div><span className="text-gray-400">核心字段：</span>{d.coreField}</div>}
                </div>
              </Row>
            )}
            {d.dataFlow && (
              <Row label="数据链路">
                <div className="space-y-1">
                  {d.dataFlow.map((f, i) => (
                    <div key={i} className="text-xs bg-gray-50 rounded px-2 py-1">{f}</div>
                  ))}
                </div>
              </Row>
            )}
          </>
        )}
      </div>
    </div>
  );
}
