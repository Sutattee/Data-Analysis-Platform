"use client";

// 年鉴报告 — 三章正文渲染（固定目录：年度事件概览 / 重大事件纪要 / 综合分析与管理建议）
// 事件编号（SJ + 11 位数字）渲染为可点击链接，跳转事件列表并自动打开详情抽屉
import Link from "next/link";
import type { YearbookReport } from "@/types";

const EVENT_ID_RE = /^SJ\d{11}$/;

function TextWithEventLinks({ text }: { text: string }) {
  const parts = text.split(/(SJ\d{11})/g);
  return (
    <>
      {parts.map((p, i) =>
        EVENT_ID_RE.test(p) ? (
          <Link
            key={i}
            href={`/energy/yearbook/events?id=${p}`}
            className="font-mono text-primary-600 hover:text-primary-700 hover:underline"
          >
            {p}
          </Link>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export function ReportContent({ report }: { report: YearbookReport }) {
  const chapters = [
    { title: "一、年度事件概览", body: report.sections.overview },
    { title: "二、重大事件纪要", body: report.sections.chronicle },
    { title: "三、综合分析与管理建议", body: report.sections.analysis },
  ];
  return (
    <article className="space-y-8">
      {chapters.map((c) => (
        <section key={c.title}>
          <h2 className="text-base font-semibold text-gray-900 border-l-4 border-primary-600 pl-3 mb-3">
            {c.title}
          </h2>
          <div className="space-y-2 pl-1">
            {c.body
              .split("\n")
              .filter((l) => l.trim())
              .map((line, i) => (
                <p key={i} className="text-sm leading-7 text-gray-700 whitespace-pre-wrap">
                  <TextWithEventLinks text={line} />
                </p>
              ))}
          </div>
        </section>
      ))}
    </article>
  );
}
