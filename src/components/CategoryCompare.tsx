"use client";

import type { Category, Vendor } from "@/lib/types";
import {
  categoryAmount,
  categoryStatus,
  formatKRW,
  formatMan,
  marketAverage,
} from "@/lib/calc";
import { useBaseline } from "@/lib/useBaseline";
import BaselinePicker from "./BaselinePicker";

function DiffPill({ diff }: { diff: number }) {
  if (diff === 0)
    return <span className="text-xs font-medium text-slate-400">기준과 동일</span>;
  const higher = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        higher ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
      }`}
    >
      {higher ? "▲" : "▼"} {formatMan(Math.abs(diff))}원
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "EXCLUDED")
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
        미포함
      </span>
    );
  if (status === "BUNDLED")
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
        다른 공정에 묶임
      </span>
    );
  return (
    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
      확인 필요
    </span>
  );
}

/** 한 공정만 세부항목 단위로 업체 간 비교 */
export default function CategoryCompare({
  category,
  vendors,
}: {
  category: Category;
  vendors: Vendor[];
}) {
  const { baseline, chooseBaseline, ordered } = useBaseline(vendors);

  if (vendors.length === 0 || !baseline) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        아직 등록된 업체가 없습니다. <b>견적 입력</b>에서 업체를 추가하세요.
      </div>
    );
  }

  const avg = marketAverage(vendors, category.id);
  const baseAmount =
    categoryStatus(baseline, category.id) === "INCLUDED"
      ? categoryAmount(baseline, category.id)
      : null;

  const linesOf = (v: Vendor) => v.lineItems.filter((li) => li.categoryId === category.id);

  // 세부항목 이름 합집합: 기본 세부항목 순서 먼저, 그 외(커스텀·파싱)는 가나다 순
  const templateNames = category.templates.map((t) => t.name);
  const extraNames = [
    ...new Set(
      vendors.flatMap((v) => linesOf(v).map((li) => li.name)).filter((n) => !templateNames.includes(n))
    ),
  ].sort((a, b) => a.localeCompare(b, "ko"));
  const rowNames = [
    ...templateNames.filter((n) => vendors.some((v) => linesOf(v).some((li) => li.name === n))),
    ...extraNames,
  ];

  const amountFor = (v: Vendor, name: string) =>
    linesOf(v)
      .filter((li) => li.name === name)
      .reduce((a, li) => a + li.amount, 0);

  const gridCols = {
    gridTemplateColumns: `240px repeat(${ordered.length}, minmax(150px, 1fr))`,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{category.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            이 공정만 세부항목 단위로 비교합니다 · 업체마다 견적에 넣은 세부항목이 다르면 &lsquo;없음&rsquo;으로 표시됩니다
          </p>
        </div>
        <div className="flex items-end gap-3">
          {avg !== null && (
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-right">
              <p className="text-[11px] text-slate-500">이 공정 평균</p>
              <p className="text-base font-bold text-slate-900">{formatMan(avg)}원</p>
            </div>
          )}
          <BaselinePicker vendors={vendors} baseline={baseline} onChoose={chooseBaseline} />
        </div>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="min-w-fit">
          {/* 업체 헤더: 공정 합계 + 기준 대비 */}
          <div className="grid border-b border-slate-200 bg-slate-50 px-5 py-4" style={gridCols}>
            <span className="self-end text-xs font-semibold text-slate-500">세부항목</span>
            {ordered.map((v) => {
              const status = categoryStatus(v, category.id);
              const amount = categoryAmount(v, category.id);
              return (
                <div key={v.id} className="text-right">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {v.name}
                    {v.id === baseline.id && (
                      <span className="ml-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                        기준
                      </span>
                    )}
                  </p>
                  {status === "INCLUDED" ? (
                    <>
                      <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                        {formatMan(amount)}원
                      </p>
                      <div className="mt-0.5 flex items-center justify-end gap-1.5">
                        {v.id !== baseline.id && baseAmount !== null && (
                          <DiffPill diff={amount - baseAmount} />
                        )}
                        {avg !== null && amount > 0 && (
                          <span
                            className={`text-[11px] ${
                              amount > avg * 1.3 || amount < avg * 0.7
                                ? "font-semibold text-amber-600"
                                : "text-slate-400"
                            }`}
                          >
                            평균 {amount >= avg ? "+" : "−"}
                            {Math.abs(Math.round(((amount - avg) / avg) * 100))}%
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="mt-1.5">
                      <StatusPill status={status} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 세부항목 행: 업체별 유무·금액 정렬 비교 */}
          {rowNames.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              아직 이 공정에 입력된 세부항목이 없습니다.
            </p>
          ) : (
            rowNames.map((name) => {
              const isTemplate = templateNames.includes(name);
              const missingSomewhere = ordered.some(
                (v) =>
                  categoryStatus(v, category.id) === "INCLUDED" && amountFor(v, name) === 0
              );
              return (
                <div
                  key={name}
                  className="grid items-center border-b border-slate-100 px-5 py-3 last:border-0"
                  style={gridCols}
                >
                  <div className="flex items-center gap-1.5 pr-3">
                    <span className="truncate text-sm text-slate-700" title={name}>
                      {name}
                    </span>
                    {!isTemplate && (
                      <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-400">
                        커스텀
                      </span>
                    )}
                    {missingSomewhere && (
                      <span
                        className="shrink-0 text-[11px] text-amber-500"
                        title="일부 업체 견적에는 이 항목이 없습니다"
                      >
                        ⚠
                      </span>
                    )}
                  </div>
                  {ordered.map((v) => {
                    const amount = amountFor(v, name);
                    const included = categoryStatus(v, category.id) === "INCLUDED";
                    return (
                      <div key={v.id} className="text-right">
                        {amount > 0 ? (
                          <span className="text-sm font-semibold text-slate-800">
                            {formatKRW(amount)}
                          </span>
                        ) : included ? (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-600">
                            없음
                          </span>
                        ) : (
                          <span className="text-xs text-slate-200">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        <span className="font-medium text-amber-600">없음</span> = 이 업체 견적에는 해당 세부항목이
        없습니다 (다른 항목에 묶였거나 빠진 것 — 업체에 확인) · — = 공정 자체가 미포함/미확인 ·
        같은 이름의 세부항목끼리 같은 행에 정렬됩니다
      </p>
    </div>
  );
}
