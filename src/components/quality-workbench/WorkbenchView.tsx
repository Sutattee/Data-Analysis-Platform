"use client";

import { useMemo, useState } from "react";
import { CircleQuestionMark, Sparkles } from "lucide-react";
import { buildWorkbenchSnapshot } from "@/lib/mock-data/quality-workbench";
import { AlarmPanel } from "./AlarmPanel";
import { DefectPanel } from "./DefectPanel";
import { RecommendPanel } from "./RecommendPanel";
import { PredictionPanel } from "./PredictionPanel";

type PanelKey = "alarms" | "defects" | "predictions";

/** 三步新手引导（PRD §6.9）：目标面板 id + 文案 */
const GUIDE_STEPS: { target: PanelKey; text: string }[] = [
  { target: "alarms", text: "先查看分配给你的告警，进入详情核查原因、记录措施并处理。" },
  { target: "defects", text: "已检出的缺陷在这里进行智能诊断，辅助现场核查与人工判定。" },
  { target: "predictions", text: "无待处理关联告警的预测在这里持续关注；需要分析时，从“推荐开展”发起。" },
];

const GUIDE_STORAGE_KEY = "quality-workbench-guide-visited";

const PANEL_ID: Record<PanelKey, string> = {
  alarms: "qw-alarms",
  defects: "qw-defects",
  predictions: "qw-predictions",
};

// 工艺质量工作台（智能工作台）主视图：头部 + 引导条 + 工艺助手 + 统计入口 + 主工作区 + 预测关注。
// 复刻默认已访问（引导条隐藏，右上按钮重开）；统计卡定位高亮目标面板。
export function WorkbenchView() {
  const snapshot = useMemo(() => buildWorkbenchSnapshot(), []);
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<PanelKey | null>(null);

  // 统计口径（PRD §2.4）：完整授权范围统计，不随局部筛选变化；已判定缺陷不计入待判定
  const alarms = snapshot.alarms;
  const actualCount = alarms.filter((a) => a.typeLabel === "实测异常").length;
  const defects = snapshot.defects.filter((d) => d.status !== "已判定");
  const attentions = snapshot.attentions;
  const stabilityCount = attentions.filter((a) => a.kind === "稳定性预测").length;

  // 工艺助手文案（PRD §6.3）：有告警/缺陷用优先提示；全部清零后降级
  const assistant =
    alarms.length === 0 && defects.length === 0
      ? attentions.length > 0
        ? "当前无待处理告警和待判定缺陷，可继续关注预测趋势。"
        : "当前责任范围内暂无待处理事项。"
      : null;

  /** 仅高亮目标面板，不改变滚动位置（引导步骤切换用，避免遮住顶部引导条） */
  function highlightPanel(key: PanelKey) {
    setHighlight(key);
  }

  /** 定位并高亮面板（统计卡点击：滚动到目标面板并清其他高亮） */
  function locatePanel(key: PanelKey) {
    setHighlight(key);
    document.getElementById(PANEL_ID[key])?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startGuide() {
    setGuideStep(1);
    highlightPanel(GUIDE_STEPS[0].target);
  }

  function finishGuide(skipped: boolean) {
    setGuideStep(null);
    setHighlight(null);
    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, skipped ? "skipped" : "done");
    } catch {
      // 私密模式等场景写入失败不影响使用
    }
  }

  const step = guideStep === null ? null : GUIDE_STEPS[guideStep - 1];

  return (
    <div id="quality-workbench-final">
      <div className="qw-main">
        {/* 页面头部：眉题 + 标题 + 责任范围/数据时间 + 新手引导入口 */}
        <div className="qw-heading">
          <div>
            <div className="qw-eyebrow">QUALITY WORKSPACE</div>
            <h1>工艺质量工作台</h1>
            <div className="qw-subtitle">
              <span>我的待办 · 已授权责任范围</span>
            </div>
          </div>
          <div className="qw-heading-actions">
            <button className="qw-button" onClick={startGuide}>
              <CircleQuestionMark size={14} aria-hidden="true" />
              新手引导
            </button>
          </div>
        </div>

        {/* 新手引导条：默认隐藏，三步非阻断（显式收窄 guideStep，供下方步数比较使用） */}
        {step && guideStep !== null && (
          <div className="qw-guide">
            <div>
              <div className="qw-guide-label">认识工作台 · {guideStep} / 3</div>
              <div className="qw-guide-text">{step.text}</div>
            </div>
            <div className="qw-guide-actions">
              {guideStep < GUIDE_STEPS.length ? (
                <button
                  className="qw-button primary"
                  onClick={() => {
                    const next = guideStep + 1;
                    setGuideStep(next);
                    highlightPanel(GUIDE_STEPS[next - 1].target);
                  }}
                >
                  下一步
                </button>
              ) : (
                <button className="qw-button primary" onClick={() => finishGuide(false)}>
                  开始使用
                </button>
              )}
              <button className="qw-button quiet" onClick={() => finishGuide(true)}>
                跳过
              </button>
            </div>
          </div>
        )}

        {/* 工艺助手 · 优先关注 */}
        <div className="qw-assistant">
          <span className="qw-ai-icon">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <div>
            <div className="qw-assistant-heading">
              工艺助手 · 优先关注
              <span>基于当前待办与预测结果</span>
            </div>
            {assistant ? (
              <p className="qw-assistant-message">{assistant}</p>
            ) : (
              <p className="qw-assistant-message">
                先核查持续超限机台，并对临近危险阈值的机台安排干预；随后推进缺陷人工核查。
                <strong>重点告警已附 AI 解读与核查建议。</strong>
              </p>
            )}
          </div>
        </div>

        {/* 统计入口：整卡可点，定位并高亮对应区域（不改筛选） */}
        <div className="qw-stats">
          <button
            className="qw-stat"
            onClick={() => locatePanel("alarms")}
            aria-label={`待处理告警 ${alarms.length}，定位到待处理告警区域`}
          >
            <span className="qw-stat-value">{alarms.length}</span>
            <span>
              <span className="qw-stat-name">待处理告警</span>
              <span className="qw-stat-desc">
                实测异常 {actualCount} · 预测风险 {alarms.length - actualCount}
              </span>
            </span>
          </button>
          <button
            className="qw-stat"
            onClick={() => locatePanel("defects")}
            aria-label={`待诊断缺陷 ${defects.length}，定位到待诊断缺陷区域`}
          >
            <span className="qw-stat-value">{defects.length}</span>
            <span>
              <span className="qw-stat-name">待诊断缺陷</span>
            </span>
          </button>
          <button
            className="qw-stat"
            onClick={() => locatePanel("predictions")}
            aria-label={`预测关注 ${attentions.length}，定位到预测关注区域`}
          >
            <span className="qw-stat-value">{attentions.length}</span>
            <span>
              <span className="qw-stat-name">预测关注</span>
              <span className="qw-stat-desc">
                过程指标 {stabilityCount} · 缺陷风险 {attentions.length - stabilityCount}
              </span>
            </span>
          </button>
        </div>

        {/* 主工作区：左待处理告警；右上待判定缺陷、右下推荐开展 */}
        <div className="qw-layout">
          <AlarmPanel alarms={alarms} highlighted={highlight === "alarms"} />
          <div className="qw-right">
            <DefectPanel defects={defects} highlighted={highlight === "defects"} />
            <RecommendPanel />
          </div>
        </div>

        {/* 预测关注：横跨主内容宽度 */}
        <PredictionPanel attentions={attentions} highlighted={highlight === "predictions"} />
      </div>
    </div>
  );
}
