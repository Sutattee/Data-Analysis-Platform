"use client";

// 16台卷接包装机组月度计划完成率：升序条形（最低在前），滚动窗独立滚动；
// 行悬浮展示10月未完成计划的日期，点击下钻设备运行效率页
import Link from "next/link";
import { COCKPIT_STAT, UNIT_RATES } from "@/lib/mock-data/cockpit";

// 名称缩短展示（“12#卷接包装机组” → “12#机组”），悬浮提示展示全名
const shortName = (name: string) => name.replace("卷接包装机组", "机组");

export function UnitCompletionPanel() {
  return (
    <section className="panel" aria-label="16机组月度计划完成率">
      <h2 className="panel-heading">
        16机组月度计划完成率
        <span className="panel-extra">{COCKPIT_STAT.monthLabel} · 最低在前</span>
      </h2>
      <div className="panel-body">
        <div className="scroll-window" role="region" aria-label="机组完成率列表">
          {UNIT_RATES.map((u) => (
            <Link
              key={u.name}
              href="/production/equipment-efficiency"
              className="bar-row has-tip"
              title={`查看${u.name}详情`}
            >
              <span className="bar-name">{shortName(u.name)}</span>
              <span className="bar-track">
                <span className="bar-mark" style={{ width: `${u.rate}%` }} />
              </span>
              <span className="bar-number">{u.rate.toFixed(1)}%</span>
              <span className="row-tip">
                {u.missedDays.length > 0
                  ? `${u.name}：10月未完成计划的日期 ${u.missedDays.join("、")}`
                  : `${u.name}：10月每日均完成计划`}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
