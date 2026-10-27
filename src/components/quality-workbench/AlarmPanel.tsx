"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  sortAlarms,
  type AlarmSortKey,
  type WorkbenchAlarm,
} from "@/lib/mock-data/quality-workbench";

type AlarmFilter = "all" | "actual" | "forecast";

/** 等级标签配色（提示级未配专用色 → 普通灰底灰字，PRD §5.2） */
const LEVEL_CLASS: Record<string, string> = {
  危险: "danger",
  告警: "alarm",
  预警: "warning",
  关注: "attention",
  提示: "source",
};

/** 类型标签文案（PRD §6.5.2：实测异常 / 预测风险 · 过程指标 / 预测风险 · 缺陷） */
function typeBadgeOf(a: WorkbenchAlarm): { text: string; cls: string } {
  if (a.typeLabel === "实测异常") return { text: "实测异常", cls: "source" };
  return a.forecastKind === "缺陷预测"
    ? { text: "预测风险 · 缺陷", cls: "prediction" }
    : { text: "预测风险 · 过程指标", cls: "prediction" };
}

const MAX_ALARMS = 5; // 首页容量上限（展示前 5 条待处理告警）

// 待处理告警面板：类型筛选（计数为完整范围分类总数，不随筛选变化）+ 三档排序 + 重点告警 AI 解读 + 底部全量入口
export function AlarmPanel({
  alarms,
  highlighted,
}: {
  alarms: WorkbenchAlarm[];
  highlighted: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<AlarmFilter>("all");
  const [sortKey, setSortKey] = useState<AlarmSortKey>("priority");

  const actualCount = alarms.filter((a) => a.typeLabel === "实测异常").length;
  const forecastCount = alarms.length - actualCount;
  const filtered = alarms.filter((a) =>
    filter === "all" ? true : filter === "actual" ? a.typeLabel === "实测异常" : a.typeLabel !== "实测异常"
  );
  const visible = sortAlarms(filtered, sortKey).slice(0, MAX_ALARMS);
  const overflow = filtered.length > visible.length;
  const totalText =
    filter === "all" ? "待处理告警" : filter === "actual" ? "实测异常告警" : "预测风险告警";

  function gotoRecords() {
    const type = filter === "actual" ? "实测异常" : filter === "forecast" ? "预测风险" : null;
    router.push(type ? `/quality/alert/records?type=${encodeURIComponent(type)}` : "/quality/alert/records");
  }

  return (
    <section id="qw-alarms" className={`qw-panel${highlighted ? " highlight" : ""}`} aria-labelledby="qw-alarms-title">
      <div className="qw-panel-head">
        <div className="qw-panel-title">
          <div className="qw-title-left">
            <h2 id="qw-alarms-title">待处理告警</h2>
            <span className="qw-count">{filtered.length}</span>
          </div>
          <span className="qw-small">与告警中心同步</span>
        </div>
        <p className="qw-panel-description">进入告警详情，查看智能原因分析与处置建议并处理。</p>
      </div>
      <div className="qw-toolbar">
        <div className="qw-tabs" role="group" aria-label="告警类型筛选">
          <button className="qw-tab" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            全部 {alarms.length}
          </button>
          <button className="qw-tab" aria-pressed={filter === "actual"} onClick={() => setFilter("actual")}>
            实测异常 {actualCount}
          </button>
          <button className="qw-tab" aria-pressed={filter === "forecast"} onClick={() => setFilter("forecast")}>
            预测风险 {forecastCount}
          </button>
        </div>
        <label className="qw-small">
          排序：
          <select
            className="qw-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as AlarmSortKey)}
            aria-label="告警排序"
          >
            <option value="priority">综合优先级</option>
            <option value="oldest">等待时间最长</option>
            <option value="latest">最新触发</option>
          </select>
        </label>
      </div>
      <div className="qw-alert-list">
        {alarms.length === 0 ? (
          <p className="qw-empty">当前责任范围内暂无待处理告警</p>
        ) : visible.length === 0 ? (
          <p className="qw-empty">当前筛选下暂无待处理告警</p>
        ) : (
          visible.map((a) => {
            const type = typeBadgeOf(a);
            return (
              <article className="qw-alert-row" key={a.id}>
                <div className="qw-row-top">
                  <span className={`qw-badge ${LEVEL_CLASS[a.level] ?? "source"}`}>{a.level}</span>
                  <span className={`qw-badge ${type.cls}`}>{type.text}</span>
                </div>
                <h3 className="qw-alert-title">{a.title}</h3>
                {a.aiInsight && (
                  <p className="qw-alert-insight">
                    <strong>AI 解读</strong>
                    {a.aiInsight}
                  </p>
                )}
                <div className="qw-row-bottom">
                  <span className="qw-meta">
                    {a.triggerTime.slice(5)}
                  </span>
                  <div className="qw-actions">
                    {a.forecastHref && (
                      <button className="qw-text-button" onClick={() => router.push(a.forecastHref!)}>
                        预测详情
                      </button>
                    )}
                    <button
                      className={`qw-button${a.level === "危险" ? " primary" : ""}`}
                      onClick={() => router.push(a.handleHref)}
                    >
                      处理告警
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
        {overflow && (
          <p className="qw-empty">显示前{visible.length}条，共{filtered.length}条</p>
        )}
      </div>
      <div className="qw-footer-link">
        <span className="qw-small">共 {filtered.length} 条{totalText}</span>
        <button className="qw-text-button" onClick={gotoRecords}>
          全部告警记录 →
        </button>
      </div>
    </section>
  );
}
