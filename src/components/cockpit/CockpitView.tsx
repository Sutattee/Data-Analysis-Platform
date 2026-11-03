"use client";

// 管理驾驶舱主视图：1920×1080 设计坐标画布，外层视口等比缩放（min(视口宽/1920, 视口高/1080)）居中；
// 内部三列布局（左450 / 中948 / 右450），各滚动窗独立滚动；第三行 56px 为右下悬浮按钮安全区。
// 缩放实现：.cockpit-viewport grid 居中一个 1920×1080 的盒子，绕自身中心 scale（覆盖
// theme.css 默认的 transform-origin: top left），画布在视口中始终保持居中。
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { COCKPIT_HEADER, COCKPIT_STAT } from "@/lib/mock-data/cockpit";
import { CoreMetricCards } from "./CoreMetricCards";
import { EnergyTrendChart } from "./EnergyTrendChart";
import { BudgetTrendChart } from "./BudgetTrendChart";
import { UnitCompletionPanel } from "./UnitCompletionPanel";
import { QualityPanel } from "./QualityPanel";
import { MaterialPanel } from "./MaterialPanel";
import { AnomalyPanel } from "./AnomalyPanel";
import { CarbonWaterPanel } from "./CarbonWaterPanel";
import { InsightLayer } from "./InsightLayer";
import { CockpitAssistant } from "./CockpitAssistant";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

export function CockpitView() {
  const viewportRef = useRef<HTMLDivElement>(null);
  // 客户端初次渲染即按视口初始化（避免 SSR scale=1 首帧溢出闪烁）；SSR 阶段用 1
  const [scale, setScale] = useState(() =>
    typeof window === "undefined" ? 1 : Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT),
  );

  // 视口尺寸变化时重算缩放（ResizeObserver，卸载时断开）
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () =>
      setScale(Math.min(el.clientWidth / DESIGN_WIDTH, el.clientHeight / DESIGN_HEIGHT));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="cockpit-viewport" ref={viewportRef}>
      <div
        className="cockpit screen"
        style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
      >
        <header className="tech-header">
          <span className="header-left">
            <Link href="/home">{COCKPIT_HEADER.platform}</Link>
          </span>
          <h1>{COCKPIT_HEADER.title}</h1>
          <span className="header-right">{COCKPIT_STAT.monthLabel}</span>
        </header>

        <div className="screen-main">
          {/* 左列：16机组完成率 / 工艺质量 / 辅料消耗 */}
          <div className="column left">
            <UnitCompletionPanel />
            <QualityPanel />
            <MaterialPanel />
          </div>
          {/* 中列：六张核心指标卡 / 能耗趋势 / 预算执行率趋势 */}
          <div className="column center">
            <CoreMetricCards />
            <EnergyTrendChart />
            <BudgetTrendChart />
          </div>
          {/* 右列：全厂重点异常 / 碳与水资源 */}
          <div className="column right">
            <AnomalyPanel />
            <CarbonWaterPanel />
          </div>
        </div>

        {/* 右下角悬浮层（相对整个画布定位，随画布等比缩放） */}
        <InsightLayer />
        <CockpitAssistant />
      </div>
    </div>
  );
}
