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

/** 한 공정만 세부항목 단위로 업체 간 비교 */
export default function CategoryCompare({
  category,
  vendors,
}: {
  category: Category;
  vendors: Vendor[];
}) {
  const { baseline, chooseBaseline } = useBaseline(vendors);

  if (vendors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        아직 등록된 업체가 없습니다. <b>견적 입력</b>에서 업체를 추가하세요.
      </div>
    );
  }

  const avg = marketAverage(vendors, category.id);
  const baseAmount =
    baseline && categoryStatus(baseline, category.id) === "INCLUDED"
      ? categoryAmount(baseline, category.id)
      : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{category.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            이 공정만 세부항목 단위로 비교합니다 · 카드를 클릭하면 기준 업체가 바뀝니다
          </p>
        </div>
        {avg !== null && (
          <div className="rounded-xl bg-slate-100 px-4 py-2.5 text-right">
            <p className="text-xs text-slate-500">이 공정 평균</p>
            <p className="text-lg font-bold text-slate-900">{formatMan(avg)}원</p>
          </div>
        )}
      </header>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
        {vendors.map((v) => {
          const status = categoryStatus(v, category.id);
          const amount = categoryAmount(v, category.id);
          const lines = v.lineItems.filter((li) => li.categoryId === category.id);
          const isBaseline = baseline?.id === v.id;
          return (
            <button
              key={v.id}
              onClick={() => chooseBaseline(v.id)}
              className={`flex flex-col rounded-2xl border-2 bg-white p-5 text-left transition ${
                isBaseline
                  ? "border-slate-900 shadow-md"
                  : "border-slate-200 shadow-sm hover:border-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{v.name}</span>
                {isBaseline && (
                  <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    기준
                  </span>
                )}
              </div>

              {status === "INCLUDED" ? (
                <>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                    {formatMan(amount)}원
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {!isBaseline && baseAmount !== null && (
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
                        평균 대비 {amount >= avg ? "+" : "−"}
                        {Math.abs(Math.round(((amount - avg) / avg) * 100))}%
                      </span>
                    )}
                  </div>
                  <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                    {lines.map((li) => (
                      <div key={li.id} className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm text-slate-500" title={li.name}>
                          {li.name}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-slate-800">
                          {formatKRW(li.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  {status === "EXCLUDED" ? (
                    <>
                      <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                        미포함
                      </span>
                      <p className="mt-2 text-xs text-slate-400">
                        계약 후 추가금이 될 수 있어요 — 업체에 비용을 확인하세요
                      </p>
                    </>
                  ) : status === "BUNDLED" ? (
                    <>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                        다른 공정에 묶임
                      </span>
                      <p className="mt-2 text-xs text-slate-400">
                        금액이 다른 공정에 포함되어 있습니다 (중복 아님)
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-600">
                        확인 필요
                      </span>
                      <p className="mt-2 text-xs text-slate-400">
                        포함 여부를 업체에 물어보세요
                      </p>
                    </>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
