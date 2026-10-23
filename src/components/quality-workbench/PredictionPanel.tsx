"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkbenchAttention } from "@/lib/mock-data/quality-workbench";

type PredictionFilter = "all" | "stability" | "defect";

const MAX_PREDICTIONS = 6; // 首页容量上限（PRD §7.1）

// 预测关注：无待处理关联告警的有效预测（去重口径见数据层）；两列布局 + 类型筛选
export function PredictionPanel({
  attentions,
  highlighted,
}: {
  attentions: WorkbenchAttention[];
  highlighted: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<PredictionFilter>("all");

  const matched = attentions.filter((a) =>
    filter === "all"
      ? true
      : filter === "stability"
        ? a.kind === "稳定性预测"
        : a.kind === "缺陷预测"
  );
  const visible = matched.slice(0, MAX_PREDICTIONS);

  return (
    <section
      id="qw-predictions"
      className={`qw-panel qw-monitor-panel${highlighted ? " highlight" : ""}`}
      aria-labelledby="qw-predictions-title"
    >
      <div className="qw-monitor-head">
        <div className="qw-panel-title">
          <div className="qw-title-left">
            <h2 id="qw-predictions-title">预测关注</h2>
            <span className="qw-count">{matched.length}</span>
          </div>
          <div className="qw-tabs" role="group" aria-label="预测类型筛选">
            <button className="qw-tab" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              全部
            </button>
            <button
              className="qw-tab"
              aria-pressed={filter === "stability"}
              onClick={() => setFilter("stability")}
            >
              稳定性预测
            </button>
            <button className="qw-tab" aria-pressed={filter === "defect"} onClick={() => setFilter("defect")}>
              缺陷预测
            </button>
          </div>
        </div>
        <p className="qw-panel-description">尚未触发告警，或告警已处理后仍需跟踪的预测，不计入待办。</p>
      </div>
      <div className="qw-monitor-grid">
        {visible.length === 0 ? (
          <p className="qw-empty">
            {attentions.length === 0 ? "当前暂无需要持续关注的预测" : "当前无此类预测关注事项"}
          </p>
        ) : (
          visible.map((a) => (
            <article className="qw-monitor" key={a.key}>
              <div className="qw-row-top">
                <span className={`qw-badge ${a.kind === "缺陷预测" ? "prediction" : "source"}`}>{a.kind}</span>
                <span className="qw-small">{a.statusText}</span>
              </div>
              <h3>{a.name}</h3>
              <div className="qw-meta">{a.machine}</div>
              <p className="qw-monitor-message">{a.summary}</p>
              <div className="qw-monitor-foot">
                <span className="qw-small">更新于 {a.updatedLabel}</span>
                <div className="qw-actions">
                  {a.recordHref && (
                    <button className="qw-text-button" onClick={() => router.push(a.recordHref!)}>
                      处理记录
                    </button>
                  )}
                  <button className="qw-text-button" onClick={() => router.push(a.forecastHref)}>
                    预测详情 →
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
