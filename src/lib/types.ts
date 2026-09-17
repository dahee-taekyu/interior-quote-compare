export type ItemStatus = "INCLUDED" | "EXCLUDED" | "BUNDLED" | "UNKNOWN";

export const STATUS_LABEL: Record<ItemStatus, string> = {
  INCLUDED: "포함",
  EXCLUDED: "미포함",
  BUNDLED: "다른 공정에 묶임",
  UNKNOWN: "확인 필요",
};

export interface SubItemTemplate {
  id: number;
  categoryId: number;
  name: string;
  order: number;
}

export interface Category {
  id: number;
  key: string;
  name: string;
  order: number;
  templates: SubItemTemplate[];
}

/** 대공정 단위 상태 (금액은 LineItem에) */
export interface QuoteItem {
  id: number;
  vendorId: number;
  categoryId: number;
  status: ItemStatus;
  memo: string | null;
}

/** 견적의 실제 금액 줄 — 품명·규격·단위·수량·단가·금액·비고 */
export interface LineItem {
  id: number;
  vendorId: number;
  categoryId: number;
  name: string;
  spec: string | null;
  unit: string | null;
  qty: number | null;
  unitPrice: number | null;
  amount: number;
  memo: string | null;
  /** 미정·별도·직접구매 등 합계 제외 옵션 항목 */
  isOption: boolean;
}

export interface Vendor {
  id: number;
  name: string;
  contact: string | null;
  memo: string | null;
  /** true = 세부항목 금액에 부가세 포함 / false = 공급가(총액에 10% 가산) */
  vatIncluded: boolean;
  pyeong: number | null;
  overheadPercent: number | null;
  overheadLabel: string | null;
  adjustment: number;
  periodDays: number | null;
  items: QuoteItem[];
  lineItems: LineItem[];
}
