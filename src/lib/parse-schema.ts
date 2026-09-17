import { z } from "zod";

export const ParsedItemSchema = z.object({
  rawText: z.string().describe("견적서에 적힌 항목명 원문 그대로"),
  detail: z.string().nullable().describe("자재 스펙, 수량 등 세부 설명"),
  amount: z.number().nullable().describe("금액(원). 견적서에 금액이 없으면 null"),
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
    .describe("부가세 포함 여부. 견적서에 명시가 없으면 null"),
  totalOnDocument: z
    .number()
    .nullable()
    .describe("견적서에 적힌 총액(원). 없으면 null"),
  items: z.array(ParsedItemSchema),
});

export type ParsedQuote = z.infer<typeof ParsedQuoteSchema>;
export type ParsedItem = z.infer<typeof ParsedItemSchema>;
