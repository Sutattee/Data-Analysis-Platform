"use client";

// 六张核心指标卡：点击下钻到对应业务详情页（可控费用/预算执行率为橙色警示卡）
import Link from "next/link";
import { CORE_CARDS } from "@/lib/mock-data/cockpit";

export function CoreMetricCards() {
  return (
    <section className="metric-grid" aria-label="六项核心指标">
      {CORE_CARDS.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          className={`metric${c.attention ? " attention" : ""}`}
          title={`查看${c.name}详情`}
        >
          <div className={`metric-name${c.long ? " long" : ""}`}>{c.name}</div>
          <div className="metric-value">
            {c.value}
            <small>{c.unit}</small>
          </div>
          <div className="metric-context">
            {c.ctx.label}
            {c.ctx.delta && (
              <span className={c.ctx.tone === "muted" ? "muted" : c.ctx.tone}> {c.ctx.delta}</span>
            )}
          </div>
        </Link>
      ))}
    </section>
  );
}
