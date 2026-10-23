"use client";

import { useRouter } from "next/navigation";
import type { WorkbenchDefect } from "@/lib/mock-data/quality-workbench";

// 待判定缺陷面板：已检出 · 待人工核查；未诊断=蓝色实心启动，已有初判=线框继续（PRD §6.6）
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
            <h2 id="qw-defects-title">待判定缺陷</h2>
            <span className="qw-count">{defects.length}</span>
          </div>
        </div>
      </div>
      <div className="qw-defect-list">
        {defects.length === 0 ? (
          <p className="qw-empty">当前暂无待人工判定的缺陷</p>
        ) : (
          defects.map((d) => (
            <article className="qw-defect-row" key={d.taskId}>
              <div className="qw-row-top">
                <span className="qw-badge defect">待判定</span>
                <span className="qw-state">{d.fresh ? "尚未诊断" : "已有初步诊断"}</span>
              </div>
              <h3>{d.name}</h3>
              <div className="qw-defect-context">
                {d.machine} · 批次 {d.batch}
              </div>
              <div className="qw-defect-context">
                {d.brand} · {d.shift} · {d.date} {d.time}
              </div>
              <div className="qw-sample-values">
                缺陷数 {d.count} ｜ 抽检数 {d.sampled} ｜ 缺陷率{" "}
                {d.rate === null ? "—" : `${d.rate.toFixed(2)}%`}
              </div>
              {!d.fresh && (
                <p className="qw-ai-summary">
                  诊断摘要：{d.summary}，待现场核查。
                </p>
              )}
              <div className="qw-defect-actions">
                <span className="qw-small">{d.fresh ? "启动分析后核查判定" : "继续核查与人工判定"}</span>
                <button className="qw-button primary" onClick={() => router.push(d.href)}>
                  {d.actionLabel}
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
