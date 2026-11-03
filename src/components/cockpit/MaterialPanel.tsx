"use client";

// 辅料消耗四行紧凑表：名称/实际值/基准（盘纸基准=历史均值，其余=目标）；
// 行悬浮展示差距说明，整行点击下钻辅料消耗页
import { useRouter } from "next/navigation";
import { MATERIAL_HREF, MATERIAL_ROWS } from "@/lib/mock-data/cockpit";

export function MaterialPanel() {
  const router = useRouter();

  return (
    <section className="panel" aria-label="辅料消耗">
      <h2 className="panel-heading">
        辅料消耗
        <span className="panel-extra">昨日口径</span>
      </h2>
      <div className="panel-body">
        <table>
          <tbody>
            {MATERIAL_ROWS.map((r) => (
              <tr
                key={r.key}
                className="row-link has-tip"
                onClick={() => router.push(MATERIAL_HREF)}
                title="查看辅料消耗详情"
              >
                <td>
                  {r.label}
                  <span className={`row-tip ${r.tone}`}>
                    {r.diffText}（基准{r.baseType}）
                  </span>
                </td>
                <td className="number">{r.valueText}</td>
                <td className="muted">
                  {r.baseText}
                  <em className="muted" style={{ display: "inline", fontSize: 11, fontStyle: "normal", marginLeft: 4 }}>{r.baseType}</em>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
