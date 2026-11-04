"use client";

// 碳与水资源五行表：指标/当前值/基准或变化，每条均可下钻能源总览
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
        <table className="cw-table">
          <thead>
            <tr>
              <th style={{ width: "27%" }}>指标</th>
              <th style={{ width: "43%" }}>当前值</th>
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
                <td className="number">{r.valueText}</td>
                <td className={"cw-ref " + (r.tone === "muted" ? "muted" : r.tone)}>{r.refText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
