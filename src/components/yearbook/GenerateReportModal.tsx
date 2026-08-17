"use client";

// 重大事件年鉴 - 生成年度报告弹窗（事件列表页 / 报告页共用）
// 流程：选年度（仅可选有已确认事件的年度）→ 已确认事件复选（默认全选，≥1 条）→ 报告名称（同年度不重复）→ 生成
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { EventTypeBadge } from "./eventBadges";
import {
  CURRENT_YEAR,
  DATA_CUTOFF,
  addReport,
  availableYears,
  buildReport,
  confirmedEventsOf,
  isReportNameDuplicated,
} from "@/lib/mock-data/major-events";

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 报告周期（只读）：历史年 = 完整自然年；当前年 = 年初至数据截止日
function periodLabelOf(year: number): string {
  return year < CURRENT_YEAR
    ? `${year}-01-01 至 ${year}-12-31`
    : `${year}-01-01 至 ${DATA_CUTOFF}（数据截止）`;
}

export function GenerateReportModal({
  open,
  onClose,
  user,
  onCreated, // 生成成功回调（reportId），页面自行跳转/刷新
}: {
  open: boolean;
  onClose: () => void;
  user: string;
  onCreated?: (reportId: string) => void;
}) {
  const toast = useToast();
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [generating, setGenerating] = useState(false);

  // 打开时重置为默认年度（最新）并全选该年度已确认事件
  useEffect(() => {
    if (!open) return;
    const years = availableYears();
    const y0 = years[0] ?? CURRENT_YEAR;
    setYear(y0);
    setSelected(confirmedEventsOf(y0).map((e) => e.id));
    setName(`${y0}年度重大事件年鉴报告`);
    setNameError("");
    setGenerating(false);
  }, [open]);

  const events = confirmedEventsOf(year);

  function switchYear(y: number) {
    setYear(y);
    setSelected(confirmedEventsOf(y).map((e) => e.id));
    setName(`${y}年度重大事件年鉴报告`);
    setNameError("");
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleGenerate() {
    if (!selected.length) {
      toast("请至少选择 1 条已确认事件", "warning");
      return;
    }
    const finalName = name.trim();
    if (!finalName) {
      setNameError("请输入报告名称");
      return;
    }
    if (finalName.length > 100) {
      setNameError("报告名称不能超过 100 字");
      return;
    }
    if (isReportNameDuplicated(year, finalName)) {
      setNameError("该年度已存在同名报告，请修改名称");
      return;
    }
    setGenerating(true);
    // 模拟生成耗时
    setTimeout(() => {
      const report = buildReport({
        year,
        events: events.filter((e) => selected.includes(e.id)),
        name: finalName,
        user,
        generatedAt: formatNow(),
      });
      addReport(report);
      setGenerating(false);
      onClose();
      toast(`「${finalName}」生成成功（纳入 ${report.includedEvents.length} 件事件）`, "success");
      onCreated?.(report.id);
    }, 1500);
  }

  const years = availableYears();

  return (
    <Modal open={open} onClose={onClose} title="生成年度报告" size="lg">
      {generating ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner />
          <p className="text-sm text-gray-500">正在汇总已确认事件并编制报告正文…</p>
          <div className="text-xs text-gray-400 space-y-1 text-center">
            <p>① 汇总 {year} 年度已确认事件快照</p>
            <p>② 生成「年度事件概览 — 重大事件纪要 — 综合分析与管理建议」三章内容</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 报告年度 + 周期（只读） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                报告年度 <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={year}
                onChange={(e) => switchYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} 年
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">仅可选择存在已确认事件的年度</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">报告周期（只读）</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50">
                {periodLabelOf(year)}
              </div>
            </div>
          </div>

          {/* 已确认事件复选列表 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                纳入事件 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3 text-xs">
                <button
                  className="text-primary-600 hover:text-primary-700"
                  onClick={() => setSelected(events.map((e) => e.id))}
                >
                  全选
                </button>
                <button className="text-gray-400 hover:text-gray-600" onClick={() => setSelected([])}>
                  清空
                </button>
                <span className="text-gray-400">
                  已选 {selected.length}/{events.length} 条
                </span>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {events.map((e) => (
                <label
                  key={e.id}
                  className="flex items-start gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={selected.includes(e.id)}
                    onChange={() => toggle(e.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-400">{e.id}</span>
                      <EventTypeBadge type={e.type} />
                    </div>
                    <p className="mt-0.5 text-sm text-gray-800 truncate">{e.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {e.startTime} 起｜{e.objects.join("／")}
                    </p>
                  </div>
                </label>
              ))}
              {!events.length && (
                <p className="py-8 text-center text-sm text-gray-400">该年度暂无已确认事件</p>
              )}
            </div>
          </div>

          {/* 报告名称 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              报告名称 <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                nameError ? "border-red-400 focus:ring-red-400" : "border-gray-300"
              }`}
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
              placeholder="请输入报告名称"
            />
            <div className="mt-1 flex justify-between">
              {nameError ? <p className="text-xs text-red-500">{nameError}</p> : <span />}
              <span className="text-xs text-gray-400">{name.length}/100</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            说明：每次生成均产生一份新的独立报告，内容为生成时点的事件快照，不随后续事件修改自动更新；仅「已确认」事件可纳入年鉴。
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleGenerate} disabled={!selected.length}>
              生成报告
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
