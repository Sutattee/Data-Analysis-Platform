"use client";

import { Button } from "@/components/ui/Button";
import { diagCatalogOf } from "@/lib/mock-data/quality-defect";
import {
  defectRateOf,
  isDiagnosed,
  primaryActionOf,
  type DiagTask,
} from "@/lib/mock-data/defect-diagnosis-flow";

// 任务表格：固定列（不含判定结论等扩展字段，无列设置）；箱储时长三列仅箱储缺陷适用
// （全部/箱储筛选时展示，单一非箱储缺陷筛选时隐藏）；
// 缺陷率 = 缺陷数÷抽检数×100%（抽检数 0/缺失/箱储 → "—"）
export function DiagnosisTaskTable({
  tasks,
  onOpen,
  codeFilter,
}: {
  tasks: DiagTask[];
  onOpen: (t: DiagTask) => void;
  codeFilter: string; // 应用态缺陷名称筛选（all / 缺陷代码）
}) {
  // 箱储时长三列可见性：全部或箱储（XCCG）筛选时展示
  const storageCols = codeFilter === "all" || codeFilter === "XCCG";

  const th = "text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";
  const td = "px-3 py-2.5 whitespace-nowrap";
  const dash = <span className="text-gray-300">—</span>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-100">
            <th className={th}>缺陷名称</th>
            <th className={th}>机台</th>
            <th className={th}>箱储对象</th>
            <th className={th}>批次</th>
            <th className={th}>牌号</th>
            <th className={th}>班组</th>
            <th className={th}>工序</th>
            <th className={th}>缺陷数</th>
            <th className={th}>抽检数</th>
            <th className={th}>缺陷率</th>
            <th className={th}>检验发现时间</th>
            {storageCols && <th className={th}>储存时长</th>}
            {storageCols && <th className={th}>储存时长上限</th>}
            {storageCols && <th className={th}>超限时长</th>}
            <th className={th}>处理状态</th>
            <th className={`${th} sticky right-0 bg-gray-50 text-right`}>操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={storageCols ? 18 : 15} className="py-14 text-center text-sm text-gray-400">
                所选条件下暂无诊断任务
              </td>
            </tr>
          ) : (
            tasks.map((t) => {
              const rate = defectRateOf(t);
              const isStorage = !!t.storage;
              return (
                <tr key={t.id} className="group transition-colors hover:bg-gray-50">
                  <td className={`${td} font-medium text-gray-700`}>{t.occurrence.name}</td>
                  <td className={`${td} text-gray-600`}>{isStorage ? dash : t.occurrence.machine}</td>
                  <td className={`${td} text-gray-600`}>{t.storage ? `${t.storage.object}（${t.storage.objectCode}）` : dash}</td>
                  <td className={`${td} text-gray-600`}>{t.storage ? t.storage.batch : t.occurrence.batch}</td>
                  <td className={`${td} text-gray-600`}>{t.occurrence.brand}</td>
                  <td className={`${td} text-gray-600`}>{t.occurrence.shift}</td>
                  <td className={`${td} text-gray-600`}>{diagCatalogOf(t.code)?.process ?? "—"}</td>
                  <td className={`${td} text-gray-700`}>{isStorage ? dash : t.occurrence.count}</td>
                  <td className={`${td} text-gray-600`}>{isStorage ? dash : t.occurrence.sampled}</td>
                  <td className={`${td} text-red-600`}>{rate === null ? dash : `${rate.toFixed(2)}%`}</td>
                  <td className={`${td} text-xs text-gray-500`}>
                    {t.occurrence.date.replace(/-/g, "/")} {t.occurrence.time}
                  </td>
                  {storageCols && <td className={`${td} text-gray-700`}>{t.storage ? t.storage.stored : dash}</td>}
                  {storageCols && <td className={`${td} text-gray-600`}>{t.storage ? t.storage.limit : dash}</td>}
                  {storageCols && <td className={`${td} text-red-600`}>{t.storage ? t.storage.over : dash}</td>}
                  <td className={td}>
                    {isDiagnosed(t) ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">已诊断</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">待诊断</span>
                    )}
                  </td>
                  <td className="sticky right-0 bg-white px-3 py-2.5 text-right whitespace-nowrap group-hover:bg-gray-50">
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:bg-primary-50" onClick={() => onOpen(t)}>
                      {primaryActionOf(t).label}
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
