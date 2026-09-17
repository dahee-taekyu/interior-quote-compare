export type ItemStatus = "INCLUDED" | "EXCLUDED" | "BUNDLED" | "UNKNOWN";

export const STATUS_LABEL: Record<ItemStatus, string> = {
  INCLUDED: "포함",
  EXCLUDED: "미포함",
  BUNDLED: "타 항목에 포함",
  UNKNOWN: "확인 필요",
};

export interface Category {
  id: number;
  key: string;
  name: string;
  order: number;
}

export interface QuoteItem {
  id: number;
  vendorId: number;
  categoryId: number;
  status: ItemStatus;
  amount: number;
  detail: string | null;
  memo: string | null;
}

export interface Vendor {
  id: number;
  name: string;
  contact: string | null;
  memo: string | null;
  vatIncluded: boolean;
  items: QuoteItem[];
}

export interface ItemDraft {
  categoryId: number;
  status: ItemStatus;
  amount: number;
  detail: string;
  memo: string;
}
