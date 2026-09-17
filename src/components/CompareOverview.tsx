"use client";

import type { Category, Vendor } from "@/lib/types";
import {
  categoryAmount,
  categoryStatus,
  formatMan,
  marketAverage,
  summarize,
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

export default function CompareOverview({
  categories,
  vendors,
  onOpenCategory,
}: {
  categories: Category[];
  vendors: Vendor[];
  onOpenCategory: (categoryId: number) => void;
}) {
  const { baseline, chooseBaseline, ordered } = useBaseline(vendors);

  if (vendors.length === 0 || !baseline) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        아직 등록된 업체가 없습니다. <b>견적 입력</b>에서 업체를 추가하세요.
      </div>
    );
  }

  const summaries = summarize(vendors, categories);
  const summaryOf = (id: number) => summaries.find((s) => s.vendorId === id)!;
  const bestAdjusted = Math.min(...summaries.map((s) => s.adjustedTotal));
  const gridCols = {
    gridTemplateColumns: `220px repeat(${ordered.length}, minmax(160px, 1fr))`,
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900">전체 비교</h2>
        <p className="mt-1 text-sm text-slate-500">
          기준 업체가 맨 앞에, 나머지는 가나다 순으로 표시됩니다
        </p>
        <div className="mt-4">
          <BaselinePicker vendors={vendors} baseline={baseline} onChoose={chooseBaseline} />
        </div>
      </header>

      {/* 업체 요약 카드 — 업체가 많아지면 자동 줄바꿈 */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {ordered.map((v) => {
          const s = summaryOf(v.id);
          const isBaseline = v.id === baseline.id;
          const isBest = s.adjustedTotal === bestAdjusted && vendors.length > 1;
          return (
            <button
              key={v.id}
              onClick={() => chooseBaseline(v.id)}
              className={`rounded-2xl border-2 p-5 text-left transition ${
                isBaseline
                  ? "border-slate-900 bg-white shadow-md"
                  : "border-slate-200 bg-white shadow-sm hover:border-slate-400"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-800">{v.name}</span>
                {isBaseline ? (
                  <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    기준 업체
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] text-slate-300">클릭해서 기준으로</span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                {formatMan(s.grandTotal)}원
              </p>
              <p className="text-xs text-slate-400">
                총액(VAT 포함)
                {s.perPyeong !== null && (
                  <span className="ml-1.5 text-slate-500">· 평당 {formatMan(s.perPyeong)}원</span>
                )}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                공급가 {formatMan(s.subtotal)}원
                {s.overhead > 0 &&
                  ` + ${v.overheadLabel ?? "이윤"} ${v.overheadPercent}%`}
                {s.vat > 0 && " + VAT"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p
                  className={`text-sm font-semibold ${
                    isBest ? "text-emerald-600" : "text-slate-600"
                  }`}
                >
                  환산 {formatMan(s.adjustedTotal)}원
                </p>
                {isBest && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                    최저
                  </span>
                )}
              </div>
              {s.fills.size > 0 && (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  누락 {s.fills.size}개 공정을 평균가로 보정
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* 공정별 비교 — 업체가 많으면 가로 스크롤 */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="min-w-fit">
          <div className="grid border-b border-slate-200 bg-slate-50 px-5 py-3" style={gridCols}>
            <span className="text-xs font-semibold text-slate-500">공정 · 평균</span>
            {ordered.map((v) => (
              <span key={v.id} className="truncate text-right text-xs font-semibold text-slate-500">
                {v.name}
                {v.id === baseline.id && " (기준)"}
              </span>
            ))}
          </div>

          {categories.map((c) => {
            const avg = marketAverage(vendors, c.id);
            const baseAmount =
              categoryStatus(baseline, c.id) === "INCLUDED"
                ? categoryAmount(baseline, c.id)
                : null;
            const anyData = vendors.some((v) => categoryStatus(v, c.id) === "INCLUDED");
            if (c.key === "etc" && !anyData) return null;

            return (
              <button
                key={c.id}
                onClick={() => onOpenCategory(c.id)}
                className="grid w-full items-center border-b border-slate-100 px-5 py-4 text-left transition last:border-0 hover:bg-slate-50"
                style={gridCols}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {c.name} <span className="text-xs font-normal text-slate-300">›</span>
                  </p>
                  {avg !== null && (
                    <p className="mt-0.5 text-xs text-slate-400">평균 {formatMan(avg)}원</p>
                  )}
                </div>
                {ordered.map((v) => {
                  const status = categoryStatus(v, c.id);
                  if (status !== "INCLUDED") {
                    return (
                      <div key={v.id} className="text-right">
                        <StatusPill status={status} />
                      </div>
                    );
                  }
                  const amount = categoryAmount(v, c.id);
                  return (
                    <div key={v.id} className="text-right">
                      <p className="text-base font-bold text-slate-900">{formatMan(amount)}원</p>
                      {v.id !== baseline.id && baseAmount !== null && (
                        <DiffPill diff={amount - baseAmount} />
                      )}
                      {v.id === baseline.id && vendors.length > 1 && (
                        <p className="text-[11px] text-slate-300">기준</p>
                      )}
                    </div>
                  );
                })}
              </button>
            );
          })}

          <div className="grid border-t-2 border-slate-200 bg-slate-50 px-5 py-4" style={gridCols}>
            <div>
              <p className="text-sm font-bold text-slate-800">동일 조건 환산 총액</p>
              <p className="text-[11px] text-slate-400">누락·미확인 공정을 평균가로 보정</p>
            </div>
            {ordered.map((v) => {
              const s = summaryOf(v.id);
              const isBest = s.adjustedTotal === bestAdjusted && vendors.length > 1;
              const baseAdj = summaryOf(baseline.id).adjustedTotal;
              return (
                <div key={v.id} className="text-right">
                  <p
                    className={`text-lg font-bold ${
                      isBest ? "text-emerald-600" : "text-slate-900"
                    }`}
                  >
                    {formatMan(s.adjustedTotal)}원
                  </p>
                  {v.id !== baseline.id && <DiffPill diff={s.adjustedTotal - baseAdj} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        공정을 클릭하면 그 공정만 세부항목 단위로 비교합니다 · 기준 업체 대비{" "}
        <span className="font-medium text-red-500">▲ 더 비쌈</span> /{" "}
        <span className="font-medium text-blue-500">▼ 더 저렴</span>
      </p>
    </div>
  );
}
