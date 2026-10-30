"use client";

import { useRouter } from "next/navigation";
import type { WorkbenchDefect } from "@/lib/mock-data/quality-workbench";

// 待诊断缺陷面板：已检出 · 待智能诊断；未诊断=蓝色实心启动，已有初判=线框继续（PRD §6.6）
export function DefectPanel({
  defects,
  highlighted,
}: {
  defects: WorkbenchDefect[];
  highlighted: boolean;
}) {
  const router = useRouter();

  return (
    <section
      id="qw-defects"
      className={`qw-panel${highlighted ? " highlight" : ""}`}
      aria-labelledby="qw-defects-title"
    >
      <div className="qw-panel-head">
        <div className="qw-panel-title">
          <div className="qw-title-left">
            <h2 id="qw-defects-title">待诊断缺陷</h2>
            <span className="qw-count">{defects.length}</span>
          </div>
        </div>
      </div>
      <div className="qw-defect-list">
        {defects.length === 0 ? (
          <p className="qw-empty">当前暂无待诊断的缺陷</p>
        ) : (
          defects.map((d) => (
            <article className="qw-defect-row" key={d.taskId}>
              <div className="qw-row-top">
                <span className="qw-badge defect">待诊断</span>
              </div>
              {/* 名称后跟缺陷类别标签（A类 / B类 / C/D类） */}
              <h3>
                {d.name}
                {d.gradeLabel && (
                  <span className="ml-1.5 whitespace-nowrap rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal text-gray-500">
                    {d.gradeLabel}
                  </span>
                )}
              </h3>
              <div className="qw-defect-context">批次 {d.batch}</div>
              <div className="qw-defect-context">
                {d.brand} · {d.shift} · {d.date} {d.time}
              </div>
              {/* 数值行：箱储任务不适用抽检口径，改展示储存时长（与缺陷诊断页同口径） */}
              {d.storage ? (
                <div className="qw-sample-values">
                  储存时长 {d.storage.stored} ｜ 上限 {d.storage.limit} ｜ 超限 {d.storage.over}
                </div>
              ) : (
                <div className="qw-sample-values">
                  缺陷数 {d.count} ｜ 抽检数 {d.sampled} ｜ 缺陷率{" "}
                  {d.rate === null ? "—" : `${d.rate.toFixed(2)}%`}
                </div>
              )}
              {/* 操作按钮统一「智能诊断」：未诊断进入即自动启动；已有初判进入智能诊断环节查看结果 */}
              <div className="qw-defect-actions">
                <button className="qw-button primary" onClick={() => router.push(d.href)}>
                  智能诊断
                </button>
              </div>
            </article>
          ))
        )}
      </div>
      <div className="qw-footer-link">
        <button className="qw-text-button" onClick={() => router.push("/quality/diagnosis/defect")}>
          全部缺陷 →
        </button>
      </div>
    </section>
  );
}
