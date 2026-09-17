"use client";

import type { Category, Vendor } from "@/lib/types";
import { cheapestVendorIds, formatKRW, summarize } from "@/lib/calc";

export default function ComparisonMatrix({
  categories,
  vendors,
}: {
  categories: Category[];
  vendors: Vendor[];
}) {
  if (vendors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        아직 등록된 업체가 없습니다. <b>견적 입력</b> 탭에서 업체를 추가하세요.
      </div>
    );
  }

  const summaries = summarize(vendors, categories);
  const summaryOf = (id: number) => summaries.find((s) => s.vendorId === id)!;
  const bestAdjusted = Math.min(...summaries.map((s) => s.adjustedTotal));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left font-semibold">
                공정
              </th>
              {vendors.map((v) => (
                <th key={v.id} className="px-4 py-3 text-right font-semibold">
                  {v.name}
                  {!v.vatIncluded && (
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      VAT 별도
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const cheapest = new Set(cheapestVendorIds(vendors, c.id));
              return (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="sticky left-0 bg-white px-4 py-2.5 font-medium text-slate-700">
                    {c.name}
                  </td>
                  {vendors.map((v) => {
                    const item = v.items.find((i) => i.categoryId === c.id);
                    const status = item?.status ?? "UNKNOWN";
                    return (
                      <td key={v.id} className="px-4 py-2.5 text-right align-top">
                        {status === "INCLUDED" ? (
                          <div>
                            <span
                              className={
                                cheapest.has(v.id)
                                  ? "rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700"
                                  : "text-slate-800"
                              }
                            >
                              {formatKRW(item!.amount)}
                            </span>
                            {item?.detail && (
                              <p className="mt-0.5 max-w-[180px] truncate text-right text-xs text-slate-400 ml-auto" title={item.detail}>
                                {item.detail}
                              </p>
                            )}
                          </div>
                        ) : status === "EXCLUDED" ? (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600">
                            미포함
                          </span>
                        ) : status === "BUNDLED" ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                            타 항목 포함
                          </span>
                        ) : c.key === "etc" && !item ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600">
                            확인 필요
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-4 py-3 font-semibold">
                견적서 합계
              </td>
              {vendors.map((v) => (
                <td key={v.id} className="px-4 py-3 text-right font-semibold">
                  {formatKRW(summaryOf(v.id).rawTotal)}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-4 py-3 font-semibold">
                동일 조건 환산 총액
                <p className="text-xs font-normal text-slate-400">
                  누락·미확인 공정을 타 업체 평균가로 보정
                </p>
              </td>
              {vendors.map((v) => {
                const s = summaryOf(v.id);
                const isBest = s.adjustedTotal === bestAdjusted;
                return (
                  <td key={v.id} className="px-4 py-3 text-right align-top">
                    <span
                      className={`text-base font-bold ${
                        isBest ? "text-emerald-600" : "text-slate-900"
                      }`}
                    >
                      {formatKRW(s.adjustedTotal)}
                    </span>
                    {s.fills.size > 0 && (
                      <p className="text-xs text-slate-400">
                        보정 +{formatKRW(s.adjustedTotal - s.rawTotal)} ({s.fills.size}개 공정)
                      </p>
                    )}
                    {isBest && vendors.length > 1 && (
                      <p className="text-xs font-medium text-emerald-600">최저</p>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span><span className="mr-1 inline-block rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">금액</span>공정별 최저가</span>
        <span><span className="mr-1 inline-block rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-600">미포함</span>추가금 위험</span>
        <span><span className="mr-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">타 항목 포함</span>다른 공정 금액에 반영됨</span>
        <span><span className="mr-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-600">확인 필요</span>업체에 문의할 것</span>
      </div>
    </div>
  );
}
