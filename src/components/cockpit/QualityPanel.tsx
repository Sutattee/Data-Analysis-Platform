"use client";

// 工艺质量：双环形图（成品/制丝优质品率，悬浮批次与检验时间）+
// 过程管控/缺陷Top5 页签：过程管控复用平台 9 项指标（超限标橙、悬浮偏离说明、点击下钻稳定性分析）；
// 缺陷Top5 复用质量总览口径（占比 = 条数/总数58）
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEFECT_TOP,
  DEFECT_TOTAL_COUNT,
  PROCESS_LINK,
  YIELD_RINGS,
  processDeviationOf,
} from "@/lib/mock-data/cockpit";
import { PROCESS_METRICS } from "@/lib/mock-data/quality";

// 超限判定：区间型看上下限，上限型看 toleranceNum（待配置不判定）
function isExceeded(latestNum: number, toleranceNum: number | null, tolRange?: [number, number]): boolean {
  if (tolRange) return latestNum < tolRange[0] || latestNum > tolRange[1];
  if (toleranceNum == null) return false;
  return latestNum > toleranceNum;
}

export function QualityPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<"process" | "defect">("process");
  const maxDefectCount = DEFECT_TOP[0]?.count ?? 1;

  return (
    <section className="panel" aria-label="工艺质量">
      <h2 className="panel-heading">
        工艺质量
        <span className="panel-extra">优质品率 · 过程管控 · 缺陷</span>
      </h2>
      <div className="panel-body">
        <div className="yield-pair">
          {YIELD_RINGS.map((y) => (
            <Link key={y.name} href={y.href} title={`查看${y.name}详情`} style={{ textDecoration: "none" }}>
              <figure
                className="yield-item has-tip"
                style={{ "--value": y.value, "--ring-color": y.color } as React.CSSProperties}
              >
                <span className="yield-ring" role="img" aria-label={`${y.name}${y.value}%`}>
                  <span className="yield-value">
                    {y.value.toFixed(1)}
                    <small>%</small>
                  </span>
                </span>
                <figcaption>{y.name}</figcaption>
                <span className="row-tip">
                  {y.batch} ｜ {y.time}
                </span>
              </figure>
            </Link>
          ))}
        </div>

        <div className="tabs" role="tablist" aria-label="工艺质量页签">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "process"}
            className="tab"
            onClick={() => setTab("process")}
          >
            过程管控
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "defect"}
            className="tab"
            onClick={() => setTab("defect")}
          >
            缺陷Top5
          </button>
        </div>

        {tab === "process" ? (
          <div className="scroll-window" role="region" aria-label="过程管控指标">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "52%" }}>指标</th>
                  <th>实际值</th>
                  <th>管控值</th>
                </tr>
              </thead>
              <tbody>
                {PROCESS_METRICS.map((m) => {
                  const exceeded = isExceeded(m.latestNum, m.toleranceNum, m.tolRange);
                  return (
                    <tr
                      key={m.id}
                      className="row-link has-tip"
                      onClick={() => router.push(PROCESS_LINK[m.id] ?? "/quality/overview")}
                      title="查看稳定性预测"
                    >
                      <td>
                        {m.name}
                        <span className="row-tip">
                          工序：{m.stage} ｜ 偏离：{processDeviationOf(m)} ｜ 近期均值 {m.recent}（{m.recentNote}）
                        </span>
                      </td>
                      <td className={exceeded ? "warning" : undefined}>{m.latestValue}</td>
                      <td>{m.tolerance}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="scroll-window" role="region" aria-label="缺陷Top5">
            {DEFECT_TOP.map((d) => (
              <Link
                key={d.name}
                href="/quality/overview"
                className="bar-row wide has-tip"
                title={`查看${d.name}缺陷详情`}
              >
                <span className="bar-name">{d.name}</span>
                <span className="bar-track">
                  <span className="bar-mark" style={{ width: `${(d.count / maxDefectCount) * 100}%` }} />
                </span>
                <span className="bar-number">
                  {d.count}条<em>{d.pct.toFixed(1)}%</em>
                </span>
                <span className="row-tip">
                  近1个月 {d.name} {d.count} 条，占全部 {DEFECT_TOTAL_COUNT} 条缺陷的 {d.pct.toFixed(1)}%
                </span>
              </Link>
            ))}
            <p className="chart-footnote">全部缺陷 {DEFECT_TOTAL_COUNT} 条（近1个月） ｜ 点击查看质量总览</p>
          </div>
        )}
      </div>
    </section>
  );
}
