"use client";

// 预测记录列表 + 详情抽屉（?record= 自动打开指定记录详情，供首页最近访问直接进入）
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { FORECAST_RECORDS, recordFilterOptions, type ForecastRecord } from "@/lib/mock-data/forecast-records";
import { FORECAST_METRICS } from "@/lib/mock-data/forecast";

const th = "text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap";
const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

const STATUS_CLS: Record<ForecastRecord["status"], string> = {
  已验证: "bg-green-100 text-green-700",
  待验证: "bg-slate-100 text-slate-600",
  预测失败: "bg-red-100 text-red-700",
};

// 详情字段壳
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 flex-shrink-0 pt-0.5 text-xs text-gray-400">{label}</span>
      <span className="flex-1 break-words text-sm text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

export function ForecastRecordsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const opts = useMemo(() => recordFilterOptions(), []);
  const [fType, setFType] = useState("");
  const [fMetric, setFMetric] = useState("");
  const [fObject, setFObject] = useState("");
  const [detail, setDetail] = useState<ForecastRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 支持 URL ?record= 预打开详情抽屉（首页最近访问直接进入记录详情）
  useEffect(() => {
    const id = searchParams.get("record");
    if (id) {
      const target = FORECAST_RECORDS.find((r) => r.id === id);
      if (target) setDetail(target);
    }
  }, [searchParams]);

  const records = useMemo(() => {
    return FORECAST_RECORDS.filter(
      (r) =>
        (!fType || r.type === fType) &&
        (!fMetric || r.metricName === fMetric) &&
        (!fObject || r.object === fObject)
    );
  }, [fType, fMetric, fObject]);

  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = records.slice((safePage - 1) * pageSize, safePage * pageSize);

  function applyFilter(setter: (v: string) => void, v: string) {
    setter(v);
    setPage(1);
  }

  // 按原条件再次预测：恢复类型与指标，跳转模拟测算（重挂载 ConditionForm）
  function replay(r: ForecastRecord) {
    const key = FORECAST_METRICS.find((m) => m.name === r.metricName)?.key;
    if (!key) {
      toast("该指标已不可用，无法按原条件预测", "warning");
      return;
    }
    sessionStorage.setItem("forecast-replay", JSON.stringify({ type: r.type, metricKey: key }));
    router.push("/energy/forecast/scenario");
  }

  const failCls = "text-red-600";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">预测记录</h1>
      </div>

      {/* 筛选区 */}
      <Card padding>
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectCls} value={fType} onChange={(e) => applyFilter(setFType, e.target.value)}>
            <option value="">全部预测类型</option>
            {opts.types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className={selectCls} value={fMetric} onChange={(e) => applyFilter(setFMetric, e.target.value)}>
            <option value="">全部预测指标</option>
            {opts.metrics.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select className={selectCls} value={fObject} onChange={(e) => applyFilter(setFObject, e.target.value)}>
            <option value="">全部预测对象</option>
            {opts.objects.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* 记录列表 */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>预测类型</th>
                <th className={th}>预测指标</th>
                <th className={th}>预测对象</th>
                <th className={th}>预测周期</th>
                <th className={th}>核心预测结果</th>
                <th className={th}>实际结果</th>
                <th className={th}>预测时间</th>
                <th className={`${th} text-right`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-gray-400">暂无符合条件的预测记录</td>
                </tr>
              ) : (
                paged.map((r) => {
                  const isFail = r.status === "预测失败";
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{r.type}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{r.metricName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.object}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.periodLabel}</td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <div className={`truncate ${isFail ? failCls : "text-gray-800"}`} title={r.headline}>
                          {r.headline}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isFail ? (
                          <span className="text-gray-300">—</span>
                        ) : r.status === "已验证" ? (
                          <span className="text-gray-700">{r.actualResult}</span>
                        ) : (
                          <span className="text-gray-400">待验证</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{r.executedAt}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setDetail(r)}>
                          查看详情
                        </Button>
                        {!isFail && (
                          <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => replay(r)}>
                            再次预测
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 px-4 py-3">
          <Pagination
            total={records.length}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {/* 预测记录详情抽屉（底部返回） */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="预测记录详情"
        width={640}
        footer={
          <div className="flex">
            <Button variant="secondary" onClick={() => setDetail(null)}>返回</Button>
          </div>
        }
      >
        {detail && (
          <div className="space-y-3">
            {/* 一、基本信息 */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">基本信息</div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[detail.status]}`}>
                {detail.status}
              </span>
            </div>
            <Field
              label="预测来源"
              value={
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    detail.source === "系统自动" ? "bg-primary-50 text-primary-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {detail.source}
                </span>
              }
            />
            <Field label="预测类型" value={detail.type} />
            <Field label="预测指标" value={detail.metricName} />
            <Field label="预测对象" value={detail.object} />
            <Field label="预测问题" value={detail.question} />
            <Field label="执行时间" value={detail.executedAt} />
            <Field label="模型版本" value={detail.modelVersion} />
            <Field label="记录编号" value={<code className="text-xs">{detail.id}</code>} />

            {/* 二、预测条件 */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="mb-2 text-sm font-semibold text-gray-800">预测条件</div>
              <Field label="预测周期" value={detail.periodLabel} />
              <Field label="数据截止" value={detail.dataEnd} />
              <div className="mt-2 space-y-1.5">
                {detail.conditions.map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="min-w-0">
                      <span className="text-sm text-gray-700">{c.name}</span>
                      <span className="ml-2 text-xs text-gray-400">{c.source}</span>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {c.adjusted && (
                        <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">人工调整</span>
                      )}
                      <span className="text-sm font-medium text-gray-800">{c.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 三、预测结果 */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="mb-2 text-sm font-semibold text-gray-800">预测结果</div>
              {detail.status === "预测失败" ? (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm leading-relaxed text-red-700">
                  {detail.failReason}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5 text-sm leading-relaxed text-gray-800">
                    {detail.headline}
                  </div>
                  <div className="space-y-2">
                    <Field label="预测值" value={<span className="font-semibold">{detail.resultValue}</span>} />
                    <Field label="预测区间" value={detail.interval} />
                    <Field label="目标/基准" value={detail.targetCompare} />
                    <Field label="实际结果" value={detail.status === "已验证" ? detail.actualResult : <span className="text-gray-400">待验证</span>} />
                    <Field
                      label="预测误差"
                      value={
                        detail.error ? (
                          <span className={Number(detail.error.replace("%", "")) > 0 ? "text-orange-600" : "text-green-600"}>{detail.error}</span>
                        ) : (
                          <span className="text-gray-400">—（不适用）</span>
                        )
                      }
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-sm font-bold text-gray-900">预测结果分析</div>
                    <div className="space-y-1.5 rounded-lg bg-gray-50 p-3">
                      {detail.conclusions.map((c, i) => (
                        <p key={i} className="text-sm leading-relaxed text-gray-600">
                          · {c}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="pt-2 text-xs text-gray-400">本记录为预测完成时的独立快照，不随模型、数据或配置更新而改变。</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
