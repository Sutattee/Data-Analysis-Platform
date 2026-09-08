"use client";

// 重大事件（生产） - 生成报告弹窗（事件列表页 / 报告页共用）
// 报告周期类型（年度/月度单选按钮）+ 报告周期（年度→年份选择器 / 月度→年月选择器，占位「请选择报告月份」）
// 流程：选周期类型与时点（仅可选有已确认事件的年度/月度）→ 已确认事件复选（默认全选）→ 报告名称（同年度不重复）→ 生成
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { EventTypeBadge } from "@/components/yearbook/eventBadges";
import {
  PROD_CURRENT_YEAR,
  addReport,
  availableMonths,
  availableYears,
  buildReport,
  confirmedEventsOf,
  isReportNameDuplicated,
} from "@/lib/mock-data/production-events";

type PeriodType = "年度" | "月度";

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const radioCls = "h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500";

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
  const [periodType, setPeriodType] = useState<PeriodType>("年度");
  const [year, setYear] = useState<number>(PROD_CURRENT_YEAR);
  const [month, setMonth] = useState<number | null>(null); // 月度未选择时为 null（占位提示态）
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [generating, setGenerating] = useState(false);

  // 打开时重置：默认年度周期（最新年度），全选该年度已确认事件
  useEffect(() => {
    if (!open) return;
    const y0 = availableYears()[0] ?? PROD_CURRENT_YEAR;
    setPeriodType("年度");
    setYear(y0);
    setMonth(null);
    setSelected(confirmedEventsOf(y0).map((e) => e.id));
    setName(`${y0}年度重大事件报告`);
    setNameError("");
    setGenerating(false);
  }, [open]);

  const isMonthly = periodType === "月度";
  const monthKey = month !== null ? `${year}-${pad2(month)}` : "";
  const events = isMonthly && month === null ? [] : confirmedEventsOf(year, isMonthly ? month! : undefined);
  const years = availableYears();
  const months = availableMonths();

  function switchPeriodType(t: PeriodType) {
    setPeriodType(t);
    setNameError("");
    if (t === "年度") {
      const y0 = availableYears()[0] ?? PROD_CURRENT_YEAR;
      setYear(y0);
      setSelected(confirmedEventsOf(y0).map((e) => e.id));
      setName(`${y0}年度重大事件报告`);
    } else {
      // 月度：不预选，展示占位提示「请选择报告月份」
      setMonth(null);
      setSelected([]);
      setName("");
    }
  }

  function switchYear(y: number) {
    setYear(y);
    setSelected(confirmedEventsOf(y).map((e) => e.id));
    setName(`${y}年度重大事件报告`);
    setNameError("");
  }

  function switchMonth(value: string) {
    const [y, m] = value.split("-").map(Number);
    setYear(y);
    setMonth(m);
    setSelected(confirmedEventsOf(y, m).map((e) => e.id));
    setName(`${y}年${m}月重大事件报告`);
    setNameError("");
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleGenerate() {
    if (isMonthly && month === null) {
      toast("请选择报告月份", "warning");
      return;
    }
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
        month: isMonthly ? month! : undefined,
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

  const selectCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

  return (
    <Modal open={open} onClose={onClose} title="生成重大事件报告" size="lg">
      {generating ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner />
          <p className="text-sm text-gray-500">正在基于已确认事件与关联证据编制报告正文…</p>
          <div className="text-xs text-gray-400 space-y-1 text-center">
            <p>
              ① 获取{isMonthly && month !== null ? `${year}年${month}月` : `${year}年度`}已确认事件快照 → ② 统计汇总
            </p>
            <p>③ 检索相关知识 → ④ 调用报告生成 Prompt → ⑤ 校验报告结构 → ⑥ 保存报告及版本</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 报告周期类型（单选按钮）+ 报告周期（年份 / 年月选择器） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                报告周期类型 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-5 h-[38px] px-3 rounded-lg border border-gray-200 bg-gray-50">
                {(["年度", "月度"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="periodType"
                      className={radioCls}
                      checked={periodType === t}
                      onChange={() => switchPeriodType(t)}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                报告周期 <span className="text-red-500">*</span>
              </label>
              {isMonthly ? (
                <select className={selectCls} value={monthKey} onChange={(e) => switchMonth(e.target.value)}>
                  {/* 占位提示：仅未选择时展示 */}
                  <option value="" disabled hidden>请选择报告月份</option>
                  {months.map((m) => (
                    <option key={`${m.year}-${m.month}`} value={`${m.year}-${pad2(m.month)}`}>
                      {m.year}年{m.month}月
                    </option>
                  ))}
                </select>
              ) : (
                <select className={selectCls} value={year} onChange={(e) => switchYear(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y} 年
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-gray-400">仅可选择存在已确认事件的{isMonthly ? "年月" : "年度"}</p>
            </div>
          </div>

          {/* 已确认事件复选列表 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                纳入事件 <span className="text-red-500">*</span>
              </label>
              {events.length > 0 && (
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
              )}
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
              {events.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">
                  {isMonthly && month === null ? "请先选择报告月份" : "该月度暂无已确认事件"}
                </p>
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
            说明：每次生成均产生一份新的独立报告，内容为生成时点的事件快照（保存本次引用的事件编号、事件版本与数据截止时间），
            事件后续修改不改变已生成报告，重新生成时产生新的报告版本；仅「已确认」事件可纳入，「待确认」与「已排除」事件不参与生成。
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
