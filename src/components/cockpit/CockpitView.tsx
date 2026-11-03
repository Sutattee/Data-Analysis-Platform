"use client";

// 管理驾驶舱主视图：1920×1080 设计坐标画布，外层视口等比缩放（min(视口宽/1920, 视口高/1080)）居中；
// 内部三列布局（左450 / 中948 / 右450），各滚动窗独立滚动；第三行 56px 为右下悬浮按钮安全区。
// 缩放实现：画布绝对定位在视口中心（CSS top/left 50%），内联 transform 先 translate(-50%,-50%)
// 把画布中心对准视口中心，再绕自身中心 scale —— 任意窗口尺寸下画布始终完整居中展示。
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
        style={{ transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center" }}
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

      </div>

      {/* 右下角 AI 助手悬浮球 + 滑出对话面板（面板内含「智能解读」一键报告）。
          挂在 viewport 层而非 .cockpit 画布内：脱离深色画布的全局样式作用域
          （.cockpit button { color: inherit } 会把面板内按钮文字压成浅色），
          ChatPanel 恢复原生浅色渲染；面板与悬浮球也不再随画布等比缩放 */}
      <CockpitAssistant />
    </div>
  );
}
