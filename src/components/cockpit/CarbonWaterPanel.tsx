"use client";

// 碳与水资源四行表：指标/当前值/基准或变化，每条均可下钻能源总览；
// 「碳排放（本月）」行为四类排放子项（标签+数值+共享单位小字）
import { useRouter } from "next/navigation";
import { CARBON_WATER, COCKPIT_STAT } from "@/lib/mock-data/cockpit";

export function CarbonWaterPanel() {
  const router = useRouter();

  return (
    <section className="panel" aria-label="碳与水资源">
      <h2 className="panel-heading">
        碳与水资源
        <span className="panel-extra">{COCKPIT_STAT.quarter}</span>
      </h2>
      <div className="panel-body">
        <table>
          <thead>
            <tr>
              <th style={{ width: "28%" }}>指标</th>
              <th style={{ width: "42%" }}>当前值</th>
              <th>基准 / 变化</th>
            </tr>
          </thead>
          <tbody>
            {CARBON_WATER.map((r) => (
              <tr
                key={r.name}
                className={r.href ? "row-link" : undefined}
                onClick={r.href ? () => router.push(r.href!) : undefined}
                title={r.href ? "查看能源总览" : undefined}
              >
                <td>{r.name}</td>
                <td className="number">
                  {r.valueLines ? (
                    <span className="cw-lines">
                      {r.valueLines.map((v) => (
                        <span key={v.label} className="cw-line">
                          <span className="cw-label">{v.label}</span>
                          <span className="cw-val">{v.value}</span>
                          {r.valueUnit && <span className="cw-unit">{r.valueUnit}</span>}
                        </span>
                      ))}
                    </span>
                  ) : (
                    r.valueText
                  )}
                </td>
                <td className={"cw-ref " + (r.tone === "muted" ? "muted" : r.tone)}>{r.refText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
