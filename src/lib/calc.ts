import type { Category, Vendor, QuoteItem } from "./types";

export interface VendorSummary {
  vendorId: number;
  /** 견적서에 적힌 포함 항목 합계 */
  rawTotal: number;
  /** 누락 공정을 타 업체 평균가로 채운 동일 조건 환산 총액 */
  adjustedTotal: number;
  /** 채워 넣은 공정별 추정 금액 (categoryId → 평균가) */
  fills: Map<number, number>;
  missingCount: number;
  unknownCount: number;
}

function itemFor(vendor: Vendor, categoryId: number): QuoteItem | undefined {
  return vendor.items.find((i) => i.categoryId === categoryId);
}

/** 해당 공정을 '포함'으로 견적한 다른 업체들의 평균가 */
export function marketAverage(
  vendors: Vendor[],
  categoryId: number,
  excludeVendorId?: number
): number | null {
  const amounts = vendors
    .filter((v) => v.id !== excludeVendorId)
    .map((v) => itemFor(v, categoryId))
    .filter((i): i is QuoteItem => !!i && i.status === "INCLUDED" && i.amount > 0)
    .map((i) => i.amount);
  if (amounts.length === 0) return null;
  return Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);
}

export function summarize(vendors: Vendor[], categories: Category[]): VendorSummary[] {
  return vendors.map((v) => {
    let rawTotal = 0;
    const fills = new Map<number, number>();
    let missingCount = 0;
    let unknownCount = 0;

    for (const c of categories) {
      const item = itemFor(v, c.id);
      const status = item?.status ?? "UNKNOWN";

      if (status === "INCLUDED") {
        rawTotal += item?.amount ?? 0;
      } else if (status === "BUNDLED") {
        // 다른 항목 금액에 이미 반영 — 보정 없음
      } else {
        if (status === "EXCLUDED") missingCount += 1;
        else unknownCount += 1;
        const avg = marketAverage(vendors, c.id, v.id);
        if (avg !== null) fills.set(c.id, avg);
      }
    }

    const adjustedTotal =
      rawTotal + [...fills.values()].reduce((a, b) => a + b, 0);

    return { vendorId: v.id, rawTotal, adjustedTotal, fills, missingCount, unknownCount };
  });
}

/** 해당 공정에서 '포함' 기준 최저가 업체 id 목록 (동률 포함) */
export function cheapestVendorIds(vendors: Vendor[], categoryId: number): number[] {
  const included = vendors
    .map((v) => ({ v, item: itemFor(v, categoryId) }))
    .filter((x) => x.item?.status === "INCLUDED" && (x.item?.amount ?? 0) > 0);
  if (included.length < 2) return [];
  const min = Math.min(...included.map((x) => x.item!.amount));
  return included.filter((x) => x.item!.amount === min).map((x) => x.v.id);
}

export function formatKRW(n: number): string {
  return n.toLocaleString("ko-KR");
}
