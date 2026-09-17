// 붙여넣은 견적서 텍스트를 사전 + 정규식으로 파싱한다. AI 호출 없음(비용 0).
// 결과는 항상 사용자 검수를 거친다는 전제라, 애매하면 낮은 신뢰도로 넘긴다.

export interface RuleParsedItem {
  rawText: string;
  detail: string | null;
  amount: number | null;
  categoryKey: string | null;
  confidence: "high" | "medium" | "low";
  note: string | null;
}

export interface RuleParsedQuote {
  vendorName: string | null;
  vatIncluded: boolean | null;
  totalOnDocument: number | null;
  items: RuleParsedItem[];
}

// 표준 공정 key → 견적서에서 자주 쓰이는 표현들
const KEYWORD_DICT: Record<string, string[]> = {
  demolition: ["철거", "멸실", "폐기물", "폐자재", "해체"],
  windows: ["샤시", "샷시", "새시", "창호", "이중창", "발코니창", "하이샤시"],
  plumbing: ["설비", "배관", "난방", "보일러", "수도", "급수", "배수", "엑셀"],
  electric: ["전기", "조명", "배선", "콘센트", "스위치", "분전반", "등기구"],
  carpentry: ["목공", "목작업", "몰딩", "가벽", "문짝", "방문", "도어", "걸레받이", "목창호"],
  tile: ["타일", "줄눈"],
  bathroom: ["욕실", "화장실", "UBR", "도기", "방수", "양변기", "세면", "욕조", "수전"],
  kitchen: ["주방", "싱크", "씽크", "상판", "쿡탑", "후드", "아일랜드"],
  wallpaper: ["도배", "벽지", "실크", "합지", "도장", "페인트", "필름", "랩핑"],
  flooring: ["바닥", "마루", "장판", "강마루", "온돌마루", "데코타일", "원목마루"],
  cleaning: ["청소", "입주청소", "보양", "준공청소"],
  management: ["감리", "관리비", "현장관리", "공과잡비", "경비", "운반비", "안전관리"],
};

// 항목이 아닌 줄 (합계·메타 정보)
const NOISE_RE =
  /^(소\s*계|합\s*계|총\s*계|총\s*액|총\s*금액|견적\s*(금액|서|일)|주소|연락처|전화|담당|상호|대표|계좌|VAT|부가세|공급가|date|no\.?)/i;
// 줄 중간에 있어도 항목이 아님을 뜻하는 표현 (연락처·사업자 정보 줄 등)
const NOISE_ANYWHERE_RE = /(전화|연락처|대표\s|사업자|등록번호|계좌|팩스|이메일|@)/;
const TOTAL_RE = /(합\s*계|총\s*계|총\s*액|총\s*금액|견적\s*금액)/;

/** "1,200,000" / "120만" / "1200000원" → 원 단위 숫자 */
export function parseAmount(raw: string): number | null {
  // 전화번호·사업자번호·날짜가 금액으로 오인되지 않도록 제거
  raw = raw
    .replace(/\d{2,4}[-.]\d{2,4}[-.]\d{3,5}/g, " ")
    .replace(/\d{4}[년./]\s?\d{1,2}[월./]\s?\d{1,2}일?/g, " ");
  const manMatch = raw.match(/([\d,.]+)\s*만\s*원?/);
  if (manMatch) {
    const n = Number(manMatch[1].replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n * 10000) : null;
  }
  // 줄에서 가장 큰 숫자를 금액으로 본다 (수량·단가·면적 오인 방지)
  const nums = [...raw.matchAll(/\d{1,3}(?:,\d{3})+|\d{4,}/g)]
    .map((m) => Number(m[0].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n >= 1000);
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

export function matchCategory(text: string): { key: string; keyword: string } | null {
  let best: { key: string; keyword: string } | null = null;
  for (const [key, keywords] of Object.entries(KEYWORD_DICT)) {
    for (const kw of keywords) {
      if (text.includes(kw) && (!best || kw.length > best.keyword.length)) {
        best = { key, keyword: kw };
      }
    }
  }
  return best;
}

export function ruleParse(text: string): RuleParsedQuote {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: RuleParsedItem[] = [];
  let totalOnDocument: number | null = null;
  let vatIncluded: boolean | null = null;

  for (const line of lines) {
    if (/부가세|VAT/i.test(line)) {
      if (/포함/.test(line)) vatIncluded = true;
      else if (/별도/.test(line)) vatIncluded = false;
    }
    if (TOTAL_RE.test(line)) {
      const amount = parseAmount(line);
      if (amount !== null) totalOnDocument = amount;
      continue;
    }
    if (NOISE_RE.test(line) || NOISE_ANYWHERE_RE.test(line)) continue;

    const amount = parseAmount(line);
    if (amount === null) continue; // 금액 없는 줄은 항목으로 보지 않는다

    // 항목명 = 금액·수량 표기를 제거한 앞부분
    const name = line
      .replace(/\d{1,3}(?:,\d{3})+|\d{4,}/g, " ")
      .replace(/[\d,.]+\s*만\s*원?/g, " ")
      .replace(/\b\d+\b/g, " ")
      .replace(/(원|식|EA|ea|㎡|m2|평|개소|개|조|셋트|세트|SET|set)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!name) continue;

    const matched = matchCategory(name);
    items.push({
      rawText: line,
      detail: null,
      amount,
      categoryKey: matched?.key ?? null,
      confidence: matched ? "medium" : "low",
      note: matched
        ? `"${matched.keyword}" 키워드로 자동 분류 — 확인해주세요`
        : "자동 분류하지 못해 '기타'로 두었습니다 — 필요하면 공정을 바꿔주세요",
    });
  }

  return { vendorName: null, vatIncluded, totalOnDocument, items };
}
