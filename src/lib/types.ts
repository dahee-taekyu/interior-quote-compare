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

/** 견적의 실제 금액 줄 — 기본 세부항목 또는 커스텀 */
export interface LineItem {
  id: number;
  vendorId: number;
  categoryId: number;
  name: string;
  amount: number;
  memo: string | null;
}

export interface Vendor {
  id: number;
  name: string;
  contact: string | null;
  memo: string | null;
  vatIncluded: boolean;
  items: QuoteItem[];
  lineItems: LineItem[];
}
