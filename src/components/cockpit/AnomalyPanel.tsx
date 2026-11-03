"use client";

// 全厂重点异常：仅汇总各业务域预警/告警/危险级未处理记录（“当前异常”展示为“实测异常”）；
// 等级降序 → 同级实测优先 → 时间倒序；类型筛选页签带计数，点击直达对应域告警详情
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  cockpitAnomalies,
  type AnomalyFilter,
  type CockpitAnomalyItem,
} from "@/lib/mock-data/cockpit";
import type { AlertLevel } from "@/types";

// 等级 → 标签类名（theme.css .level 变体）
const LEVEL_CLASS: Record<AlertLevel, string> = {
  提示: "",
  关注: "",
  预警: "warning",
  告警: "alarm",
  危险: "danger",
};

const FILTERS: AnomalyFilter[] = ["全部", "实测异常", "预测风险"];

const filterCount = (full: { actualCount: number; predictionCount: number; total: number }, f: AnomalyFilter) =>
  f === "全部" ? full.total : f === "实测异常" ? full.actualCount : full.predictionCount;

function AnomalyRow({ item }: { item: CockpitAnomalyItem }) {
  return (
    <Link href={item.href} className="anomaly-item" title="查看告警详情">
      <span className="anomaly-top">
        <span className={`level ${LEVEL_CLASS[item.level]}`}>{item.level}</span>
        <span className={`risk-type${item.type === "预测风险" ? " prediction" : ""}`}>{item.type}</span>
      </span>
      <span className="anomaly-title">{item.title}</span>
      <span className="anomaly-meta">
        <span>
          {item.object} · {item.value}
        </span>
        <span className="domain">{item.domain}</span>
        <span>{item.time}</span>
      </span>
    </Link>
  );
}

export function AnomalyPanel() {
  const [filter, setFilter] = useState<AnomalyFilter>("全部");
  const full = useMemo(() => cockpitAnomalies("全部"), []);
  const view = useMemo(
    () => (filter === "全部" ? full : cockpitAnomalies(filter)),
    [filter, full],
  );

  return (
    <section className="panel" aria-label="全厂重点异常">
      <h2 className="panel-heading">
        全厂重点异常
        <span className="panel-extra">未处理 · 等级降序</span>
      </h2>
      <div className="panel-body">
        <p className="anomaly-summary">
          共 <b>{full.total}</b> 项
          <span className="cnt danger">危险 {full.danger}</span>
          <span className="cnt alarm">告警 {full.alarm}</span>
          <span className="cnt warning">预警 {full.warning}</span>
        </p>
        <div className="tabs" role="tablist" aria-label="异常类型筛选">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className="tab"
              onClick={() => setFilter(f)}
            >
              {f} {filterCount(full, f)}
            </button>
          ))}
        </div>
        <div className="scroll-window" role="region" aria-label="重点异常列表">
          {view.items.length === 0 ? (
            <p className="muted" style={{ padding: "12px 4px", fontSize: 13 }}>当前筛选下暂无异常</p>
          ) : (
            view.items.map((item) => <AnomalyRow key={item.id} item={item} />)
          )}
        </div>
      </div>
    </section>
  );
}
