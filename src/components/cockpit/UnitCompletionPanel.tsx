"use client";

// 卷接包装机台月度计划完成率：升序条形（最低在前，统一蓝青渐变），滚动窗独立滚动；
// 点击下钻设备运行效率页（行悬浮提示暂隐藏，no-tips）
import Link from "next/link";
import { UNIT_RATES } from "@/lib/mock-data/cockpit";

// 名称缩短展示（“12#卷接包装机组” → “12#机组”）
const shortName = (name: string) => name.replace("卷接包装机组", "机组");

export function UnitCompletionPanel() {
  return (
    <section className="panel no-tips" aria-label="机台月度计划完成率">
      <h2 className="panel-heading">机台月度计划完成率</h2>
      <div className="panel-body">
        <div className="scroll-window" role="region" aria-label="机台完成率列表">
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
