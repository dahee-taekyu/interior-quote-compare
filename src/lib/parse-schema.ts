import { z } from "zod";

export const ParsedItemSchema = z.object({
  rawText: z.string().describe("견적서에 적힌 항목명(품명) 원문 그대로"),
  detail: z.string().nullable().describe("규격·브랜드 (예: LX장판 2.2T, 600각 포세린)"),
  unit: z.string().nullable().describe("단위 (식/ea/m/m2/py/자/품 등)"),
  qty: z.number().nullable().describe("수량"),
  unitPrice: z.number().nullable().describe("단가(원)"),
  amount: z.number().nullable().describe("금액(원). 견적서에 금액이 없으면 null"),
  isOption: z
    .boolean()
    .describe("미정·별도·소비자 직접구매 등 합계에 포함되지 않는 옵션 항목이면 true"),
  categoryKey: z
    .string()
    .nullable()
    .describe("매핑되는 표준 공정 key. 어느 공정에도 해당하지 않으면 null"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("매핑 확신도. 표현이 모호하거나 여러 공정에 걸치면 low"),
  note: z.string().nullable().describe("사용자가 확인해야 할 사항"),
});

export const ParsedQuoteSchema = z.object({
  vendorName: z.string().nullable().describe("견적서의 업체명"),
  vatIncluded: z
    .boolean()
    .nullable()
    .describe("세부항목 금액에 부가세가 포함되어 있으면 true, 별도 가산이면 false, 불명이면 null"),
  totalOnDocument: z
    .number()
    .nullable()
    .describe("견적서에 적힌 최종 총액(원). 없으면 null"),
  pyeong: z.number().nullable().describe("평형(공급면적). 없으면 null"),
  overheadPercent: z
    .number()
    .nullable()
    .describe("이윤·공과잡비 등 가산 비율(%). 예: 공사비의 7% → 7. 없으면 null"),
  overheadLabel: z.string().nullable().describe("가산액의 명칭 (이윤, 공과잡비 등)"),
  periodDays: z.number().nullable().describe("공사 기간(일). 없으면 null"),
  items: z.array(ParsedItemSchema),
});

export type ParsedQuote = z.infer<typeof ParsedQuoteSchema>;
export type ParsedItem = z.infer<typeof ParsedItemSchema>;
