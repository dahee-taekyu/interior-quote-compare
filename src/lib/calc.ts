import type { Category, ItemStatus, Vendor } from "./types";

/** 대공정별 금액 = 해당 공정 세부항목(LineItem) 합계 */
export function categoryAmount(vendor: Vendor, categoryId: number): number {
  return vendor.lineItems
    .filter((li) => li.categoryId === categoryId)
    .reduce((a, li) => a + li.amount, 0);
}

/** 대공정 상태: 세부항목이 있으면 포함, 없으면 명시된 상태(기본 '확인 필요') */
export function categoryStatus(vendor: Vendor, categoryId: number): ItemStatus {
  if (vendor.lineItems.some((li) => li.categoryId === categoryId)) return "INCLUDED";
  const item = vendor.items.find((i) => i.categoryId === categoryId);
  return (item?.status as ItemStatus) ?? "UNKNOWN";
}

/** 해당 공정을 포함한 업체들의 평균가 (excludeVendorId 제외) */
export function marketAverage(
  vendors: Vendor[],
  categoryId: number,
  excludeVendorId?: number
): number | null {
  const amounts = vendors
    .filter((v) => v.id !== excludeVendorId)
    .filter((v) => categoryStatus(v, categoryId) === "INCLUDED")
    .map((v) => categoryAmount(v, categoryId))
    .filter((n) => n > 0);
  if (amounts.length === 0) return null;
  return Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);
}

export interface VendorSummary {
  vendorId: number;
  /** 견적서에 있는 세부항목 합계 */
  rawTotal: number;
  /** 누락 공정을 타 업체 평균가로 채운 동일 조건 환산 총액 */
  adjustedTotal: number;
  fills: Map<number, number>;
  missingCount: number;
  unknownCount: number;
}

export function summarize(vendors: Vendor[], categories: Category[]): VendorSummary[] {
  return vendors.map((v) => {
    let rawTotal = 0;
    const fills = new Map<number, number>();
    let missingCount = 0;
    let unknownCount = 0;

    for (const c of categories) {
      const status = categoryStatus(v, c.id);
      if (status === "INCLUDED") {
        rawTotal += categoryAmount(v, c.id);
      } else if (status === "BUNDLED") {
        // 다른 공정 금액에 이미 반영 — 보정 없음
      } else {
        if (status === "EXCLUDED") missingCount += 1;
        else unknownCount += 1;
        // '기타'는 업체마다 내용물이 달라 평균 보정이 왜곡되므로 제외
        if (c.key !== "etc") {
          const avg = marketAverage(vendors, c.id, v.id);
          if (avg !== null) fills.set(c.id, avg);
        }
      }
    }

    const adjustedTotal = rawTotal + [...fills.values()].reduce((a, b) => a + b, 0);
    return { vendorId: v.id, rawTotal, adjustedTotal, fills, missingCount, unknownCount };
  });
}

/** 해당 공정 포함 기준 최저가 업체 id 목록 (동률 포함, 2개 업체 이상일 때만) */
export function cheapestVendorIds(vendors: Vendor[], categoryId: number): number[] {
  const included = vendors
    .map((v) => ({ v, amount: categoryAmount(v, categoryId) }))
    .filter((x) => categoryStatus(x.v, categoryId) === "INCLUDED" && x.amount > 0);
  if (included.length < 2) return [];
  const min = Math.min(...included.map((x) => x.amount));
  return included.filter((x) => x.amount === min).map((x) => x.v.id);
}

export function formatKRW(n: number): string {
  return n.toLocaleString("ko-KR");
}

/** 만원 단위 축약 표기 (카드 UI용) */
export function formatMan(n: number): string {
  if (n === 0) return "0";
  const man = n / 10000;
  return man >= 10000
    ? `${(man / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억`
    : `${Math.round(man).toLocaleString("ko-KR")}만`;
}
