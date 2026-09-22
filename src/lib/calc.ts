import type { Category, ItemStatus, Vendor } from "./types";

/** 대공정별 금액 = 해당 공정 세부항목 합계 (옵션 항목 제외) */
export function categoryAmount(vendor: Vendor, categoryId: number): number {
  return vendor.lineItems
    .filter((li) => li.categoryId === categoryId && !li.isOption)
    .reduce((a, li) => a + li.amount, 0);
}

/** 대공정 상태: 세부항목이 있으면 포함, 없으면 명시된 상태(기본 '확인 필요') */
export function categoryStatus(vendor: Vendor, categoryId: number): ItemStatus {
  if (vendor.lineItems.some((li) => li.categoryId === categoryId && !li.isOption))
    return "INCLUDED";
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

export interface VendorTotals {
  /** 세부항목(공급가) 합계 */
  subtotal: number;
  /** 이윤·공과잡비 가산액 */
  overhead: number;
  /** 부가세 (vatIncluded면 0) */
  vat: number;
  /** 최종 총액 = subtotal + overhead + adjustment + vat */
  grandTotal: number;
  /** 평당가 (평형 미입력 시 null) */
  perPyeong: number | null;
}

/** 공급가 합계에 이윤·단수조정·부가세를 적용한 최종 총액. 실제 견적서 구조와 동일:
 *  (공급가 × (1+이윤%)) + 단수조정, 여기에 부가세 별도면 ×1.1 */
export function applyVendorMeta(vendor: Vendor, subtotal: number): VendorTotals {
  const overhead = Math.round(subtotal * ((vendor.overheadPercent ?? 0) / 100));
  const beforeVat = subtotal + overhead + vendor.adjustment;
  const vat = vendor.vatIncluded ? 0 : Math.round(beforeVat * 0.1);
  const grandTotal = beforeVat + vat;
  return {
    subtotal,
    overhead,
    vat,
    grandTotal,
    perPyeong: vendor.pyeong ? Math.round(grandTotal / vendor.pyeong) : null,
  };
}

export interface VendorSummary extends VendorTotals {
  vendorId: number;
}

export function summarize(vendors: Vendor[], categories: Category[]): VendorSummary[] {
  return vendors.map((v) => {
    const subtotal = categories.reduce(
      (a, c) => (categoryStatus(v, c.id) === "INCLUDED" ? a + categoryAmount(v, c.id) : a),
      0
    );
    return { vendorId: v.id, ...applyVendorMeta(v, subtotal) };
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
