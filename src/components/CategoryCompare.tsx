"use client";

import { useEffect, useState } from "react";
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

/** 업체 하나의 이 공정 세부항목 팝업 */
function DetailModal({
  vendor,
  category,
  onClose,
}: {
  vendor: Vendor;
  category: Category;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lines = vendor.lineItems.filter((li) => li.categoryId === category.id);
  const total = lines.reduce((a, li) => a + li.amount, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400">{category.name}</p>
            <h3 className="text-lg font-bold text-slate-900">{vendor.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="닫기 (Esc)"
          >
            ✕
          </button>
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {lines.length === 0 ? (
            <li className="py-4 text-sm text-slate-400">세부항목이 없습니다.</li>
          ) : (
            lines.map((li) => (
              <li key={li.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="text-sm text-slate-600">{li.name}</span>
                <span className="shrink-0 text-sm font-semibold text-slate-900">
                  {formatKRW(li.amount)}원
                </span>
              </li>
            ))
          )}
        </ul>

        <div className="mt-2 flex items-baseline justify-between border-t-2 border-slate-200 pt-3">
          <span className="text-sm font-semibold text-slate-700">합계</span>
          <span className="text-lg font-bold text-slate-900">{formatKRW(total)}원</span>
        </div>
      </div>
    </div>
  );
}

/** 한 공정만 비교 — 카드 클릭 시 그 업체의 세부항목 팝업 */
export default function CategoryCompare({
  category,
  vendors,
}: {
  category: Category;
  vendors: Vendor[];
}) {
  const { baseline, chooseBaseline, ordered } = useBaseline(vendors);
  const [detailVendorId, setDetailVendorId] = useState<number | null>(null);

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
  const detailVendor = vendors.find((v) => v.id === detailVendorId) ?? null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900">{category.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          카드를 클릭하면 그 업체의 세부항목이 열립니다
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <BaselinePicker vendors={vendors} baseline={baseline} onChoose={chooseBaseline} />
          {avg !== null && (
            <div className="rounded-lg bg-slate-100 px-4 py-2">
              <p className="text-[11px] text-slate-500">이 공정 평균</p>
              <p className="text-base font-bold text-slate-900">{formatMan(avg)}원</p>
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
        {ordered.map((v) => {
          const status = categoryStatus(v, category.id);
          const amount = categoryAmount(v, category.id);
          const count = v.lineItems.filter((li) => li.categoryId === category.id).length;
          const isBaseline = v.id === baseline.id;
          return (
            <button
              key={v.id}
              onClick={() => status === "INCLUDED" && setDetailVendorId(v.id)}
              className={`flex flex-col rounded-2xl border-2 bg-white p-5 text-left transition ${
                isBaseline ? "border-slate-900 shadow-md" : "border-slate-200 shadow-sm"
              } ${status === "INCLUDED" ? "cursor-pointer hover:border-slate-500 hover:shadow-md" : "cursor-default"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-800">{v.name}</span>
                {isBaseline && (
                  <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    기준
                  </span>
                )}
              </div>

              {status === "INCLUDED" ? (
                <>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                    {formatMan(amount)}원
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {!isBaseline && baseAmount !== null && <DiffPill diff={amount - baseAmount} />}
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
                  <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs font-medium text-slate-400">
                    세부항목 {count}개 보기 ›
                  </p>
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
                      <p className="mt-2 text-xs text-slate-400">포함 여부를 업체에 물어보세요</p>
                    </>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {detailVendor && (
        <DetailModal
          vendor={detailVendor}
          category={category}
          onClose={() => setDetailVendorId(null)}
        />
      )}
    </div>
  );
}
