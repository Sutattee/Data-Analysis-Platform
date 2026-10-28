"use client";

import { Button } from "@/components/ui/Button";
import {
  latestVersion,
  retryNode,
  type DiagTask,
} from "@/lib/mock-data/defect-diagnosis-flow";
import { AgentStatusPanel } from "./AgentStatusPanel";
import { GrowBar, StreamText } from "@/components/ui/StreamText";

// 比较结果配色：超上限/超限红，达标绿，数据缺失琥珀，其余灰
function compareCls(compare: string): string {
  if (compare.includes("超上限") || compare.includes("低于下限") || compare.includes("偏离") || compare.includes("超限")) {
    return "text-red-600 font-medium";
  }
  if (compare.includes("达标") || compare.includes("允差")) return "text-green-600";
  if (compare.includes("缺失")) return "text-amber-600 font-medium";
  return "text-gray-400";
}

//智能诊断工作区：Agent 执行过程（仅此处展示）+ 左列（诊断依据 + 贡献度/规则说明 + 相似历史案例）
// + 右列（智能诊断结论，候选原因以文字行展示；底部「重新诊断 / 进入人工判定」）
export function AiDiagnosisWorkspace({
  task,
  onEnterJudgment,
  onStart,
  canOperate,
}: {
  task: DiagTask;
  onEnterJudgment: () => void;
  onStart: () => void;
  canOperate: boolean;
}) {
  const latest = latestVersion(task);

  // 未诊断：启动引导（已判定的人工独立判定任务不可启动）
  if (!latest) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white py-16">
        <span className="text-2xl">🤖</span>
        <p className="text-sm text-gray-500">{task.status === "已判定" ? "未进行智能诊断" : "尚未启动智能诊断"}</p>
        {task.status === "已判定" ? (
          <p className="max-w-md text-center text-xs leading-5 text-gray-400">本任务为人工独立判定，未进行智能诊断。</p>
        ) : (
          <>
            <p className="max-w-md text-center text-xs leading-5 text-gray-400">
              AI 将自动获取该条记录的关联数据（质检平台 / MES / 卷包数采 / 车间环境），
              完成归因分析、相似案例检索与诊断结论生成。
            </p>
            {canOperate ? (
              <Button onClick={onStart}>启动智能诊断</Button>
            ) : (
              <p className="text-xs text-gray-400">当前角色无诊断操作权限，请联系管理员</p>
            )}
          </>
        )}
      </div>
    );
  }

  const v = latest;
  const adv = v.advice; // 结论区引用（const 收窄在 map 回调内保持有效）
  const th = "text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="space-y-4">
      {/* Agent 执行过程（仅智能诊断工作区展示） */}
      <AgentStatusPanel
        version={latest}
        onRetry={() => retryNode(task.id, "data-prep")}
        canRetry={canOperate}
      />

      {/* 诊断进行中：仅展示 Agent 执行过程（诊断依据在诊断完成后随结果区一起展示） */}
      {!latest.finishedAt ? null : (
        <>
          {/* key 随诊断版本切换：重新诊断后整段流式重放 */}
          <div key={`${v.version}-${v.startedAt}`} className="grid gap-4 lg:grid-cols-5">
            {/* 左列：诊断依据 + 贡献度/规则说明 + 相似历史案例 */}
            <div className="space-y-4 lg:col-span-3">
              <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-gray-800">诊断依据</h3>
                  <span className="text-xs text-gray-400">共 {v.evidences.length} 项 · 本条记录关联数据</span>
                </div>
                <div className="overflow-x-auto p-2">
                  <table className="w-full min-w-[760px] text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className={th}>编号</th>
                        <th className={th}>名称</th>
                        <th className={th}>实测值</th>
                        <th className={th}>统计范围</th>
                        <th className={th}>参考值</th>
                        <th className={th}>比较结果</th>
                        <th className={th}>来源系统</th>
                        <th className={th}>关联对象·批次</th>
                        <th className={th}>数据截至</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {v.evidences.map((e, i) => {
                        const d = i * 80; // 同行单元格同拍输出 → 整行像被逐字写入
                        return (
                          <tr key={e.no} className="transition-colors hover:bg-gray-50/60">
                            <td className="px-3 py-2 font-mono text-gray-500"><StreamText text={e.no} delay={d} /></td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-700"><StreamText text={e.name} delay={d} /></td>
                            <td className="px-3 py-2 whitespace-nowrap font-medium tabular-nums">
                              <StreamText
                                text={e.value}
                                delay={d}
                                className={e.missing ? "text-gray-300" : "text-gray-800"}
                                suffix={e.unit ? <span className="ml-0.5 text-[10px] font-normal text-gray-400">{e.unit}</span> : null}
                              />
                            </td>
                            <td className="max-w-[180px] truncate px-3 py-2 text-gray-500" title={e.scope}><StreamText text={e.scope} delay={d} /></td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-500"><StreamText text={e.ref} delay={d} /></td>
                            <td className={`px-3 py-2 whitespace-nowrap ${compareCls(e.compare)}`}><StreamText text={e.compare} delay={d} /></td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-500"><StreamText text={e.sourceSystem} delay={d} /></td>
                            <td className="max-w-[180px] truncate px-3 py-2 text-gray-500" title={e.object}><StreamText text={e.object} delay={d} /></td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-400"><StreamText text={e.asOf} delay={d} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 贡献度（归因服务结果；无统计归因时展示规则说明） */}
              {v.contributions && v.contributions.length > 0 && (
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">贡献度</h3>
                    <span className="text-xs text-gray-400">数值归因（正向贡献占比）</span>
                  </div>
                  <div className="space-y-2.5">
                    {v.contributions.map((c, i) => {
                      const d = i * 150;
                      return (
                        <div key={c.name} className="flex items-center gap-3" title={c.note}>
                          <div className="w-44 shrink-0 truncate text-xs text-gray-600">
                            <StreamText text={c.name} delay={d} />
                          </div>
                          <div className="h-4 flex-1 overflow-hidden rounded bg-gray-100">
                            <GrowBar width={Math.min(parseInt(c.pct, 10) * 2, 100)} delay={d + 120} />
                          </div>
                          <div className="w-10 shrink-0 text-right text-xs tabular-nums text-gray-700">
                            <StreamText text={c.pct} delay={d + 120} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {v.ruleNote && (
                <div className="rounded-xl border border-gray-100 bg-white p-5 text-xs leading-5 text-gray-500 shadow-sm">
                  <span className="mr-1.5 font-semibold text-gray-700">归因说明：</span>
                  <StreamText text={v.ruleNote} delay={200} caret />
                </div>
              )}

              {/* 相似历史案例 */}
              <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-gray-800">相似历史案例</h3>
                  <span className="text-xs text-gray-400">最多展示 3 条</span>
                </div>
                <div className="space-y-3 p-4">
                  {v.cases.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">暂无相似历史案例</p>
                  ) : (
                    v.cases.map((c, i) => {
                      const d = i * 450; // 案例卡片逐张生成
                      return (
                        <div key={c.id} className="rounded-lg border border-gray-100 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">
                              <StreamText text={c.title} delay={d} caret />
                            </span>
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{c.grade}</span>
                          </div>
                          <div className="mt-1.5 text-xs text-gray-400">
                            <StreamText text={`诊断时间 ${c.formedAt}`} delay={d + 100} />
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <div>
                              <div className="text-[11px] font-medium text-green-700">匹配点</div>
                              <ul className="mt-1 space-y-0.5">
                                {c.matchPoints.map((m, j) => (
                                  <li key={m} className="text-xs leading-5 text-gray-600">✓ <StreamText text={m} delay={d + 220 + j * 110} /></li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="text-[11px] font-medium text-gray-500">差异点</div>
                              <ul className="mt-1 space-y-0.5">
                                {c.diffs.map((x, j) => (
                                  <li key={x} className="text-xs leading-5 text-gray-500">△ <StreamText text={x} delay={d + 220 + j * 110} /></li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="mt-3 border-t border-gray-50 pt-3">
                            <p className="text-xs leading-5"><span className="font-medium text-gray-700">人工判定原因：</span><span className="text-gray-600"><StreamText text={c.cause + c.checkNote} delay={d + 380} /></span></p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* 右列：智能诊断结论 */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-50 px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-gray-800">智能诊断结论</h3>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <div className="text-[11px] font-medium text-gray-400">异常概况</div>
                    <p className="mt-1 text-xs leading-5 text-gray-600">
                      <StreamText text={v.advice?.overview ?? ""} caret />
                    </p>
                  </div>

                  <div>
                    <div className="text-[11px] font-medium text-gray-400">候选原因</div>
                    {v.advice && v.advice.candidates.length > 0 ? (
                      <ul className="mt-1.5 space-y-1.5">
                        {v.advice.candidates.map((c, i) => (
                          <li key={c.name} className="text-xs leading-5 text-gray-700">
                            <StreamText
                              text={`${i + 1}. ${c.name}（${c.support}，依据 ${c.basisNos.join("/")}）${c.caseTitle ? `（案例：${c.caseTitle}）` : ""}`}
                              delay={250 + i * 180}
                              caret
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1.5 text-xs leading-5 text-amber-700">
                        <StreamText text="当前依据不足，无可推荐的候选原因，需人工核查后判定。" delay={250} caret />
                      </p>
                    )}
                  </div>

                  {adv && adv.checks.length > 0 && (
                    <div>
                      <div className="text-[11px] font-medium text-gray-400">建议核查</div>
                      <ul className="mt-1.5 space-y-1">
                        {adv.checks.map((c, i) => {
                          const d = 400 + adv.candidates.length * 180 + i * 150;
                          return (
                            <li key={c} className="text-xs leading-5 text-gray-600">
                              · <StreamText text={c} delay={d} caret />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-gray-50 px-5 py-4">
                  <span className="block text-xs text-gray-400">诊断时间：{v.startedAt}</span>
                  <div className="flex items-center gap-2">
                    {canOperate && (
                      <Button variant="secondary" className="flex-1" onClick={onStart}>
                        重新诊断
                      </Button>
                    )}
                    <Button className="flex-1" onClick={onEnterJudgment}>
                      查看人工判定 →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
