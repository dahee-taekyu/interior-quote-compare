// 실제 견적서 2건(같은 단지 24/25평형)을 데모 데이터로 등록한다. `npm run db:demo`
// 금액 검증:
//  - 모빌: 공급가 43,470,040 → +공과잡비 4% → +VAT 10% = 49,729,726 ✓
//  - 박목수: 공급가 45,226,000 → +이윤 7% → 단수 -1,820 → +VAT 10% = 53,229,000 ✓
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Line = {
  cat: string;
  name: string;
  spec?: string;
  unit?: string;
  qty?: number;
  unitPrice?: number;
  amount: number;
  memo?: string;
  isOption?: boolean;
};

// ───── 모빌인테리어 (상계은빛2단지 24평형, 2026-09-16 견적) ─────
const MOBIL_LINES: Line[] = [
  // 1) 가설공사 900,000
  { cat: "scaffold", name: "공사 신고", spec: "입주민동의 59세대 미만/행위허가X", unit: "건", qty: 1, unitPrice: 200000, amount: 200000, memo: "엘리베이터 사용료·보증금·면허세 별도" },
  { cat: "scaffold", name: "입주민 동의서 추가", spec: "20세대 추가", unit: "ea", unitPrice: 80000, amount: 0, memo: "동의 수량에 따라 다름", isOption: true },
  { cat: "scaffold", name: "행위허가", spec: "행위허가 신고/공사신고 포함", unit: "건", qty: 1, unitPrice: 500000, amount: 500000 },
  { cat: "scaffold", name: "승강기 보양", spec: "관리사무소 내규", unit: "건", qty: 1, unitPrice: 200000, amount: 200000, memo: "15인승 미만 올보양 기준/동선보양 별도" },
  { cat: "scaffold", name: "동선 보양", spec: "플로베니아", unit: "장", qty: 0, unitPrice: 10000, amount: 0, isOption: true },
  // 2) 철거공사 2,410,000
  { cat: "demolition", name: "싱크대 철거", spec: "상하부장 및 인조대리석", unit: "식", qty: 1, unitPrice: 150000, amount: 150000 },
  { cat: "demolition", name: "신발장 철거", unit: "식", qty: 1, unitPrice: 100000, amount: 100000 },
  { cat: "demolition", name: "욕실 철거", spec: "완파/타일 1겹 기준", unit: "식", qty: 1, unitPrice: 1050000, amount: 1050000, memo: "방수 1회 포함/마페이 아쿠아디펜스" },
  { cat: "demolition", name: "벽장 철거", spec: "날개벽+임방철거 포함가능", unit: "식", qty: 1, unitPrice: 250000, amount: 250000 },
  { cat: "demolition", name: "주방타일 철거", unit: "식", qty: 1, unitPrice: 200000, amount: 200000 },
  { cat: "demolition", name: "현관타일 철거", spec: "주꾸미까지 철거", unit: "식", qty: 1, unitPrice: 150000, amount: 150000 },
  { cat: "demolition", name: "몰딩 철거", spec: "천장몰딩+걸레받이", unit: "식", qty: 1, unitPrice: 150000, amount: 150000 },
  { cat: "demolition", name: "문 및 문틀 철거", unit: "조", qty: 4, unitPrice: 90000, amount: 360000 },
  // 3) 확장공사 2,950,000
  { cat: "extension", name: "확장철거(거실)", spec: "본바닥 철거 포함", unit: "식", qty: 1, unitPrice: 800000, amount: 800000, memo: "단높임 시 150,000원 추가" },
  { cat: "extension", name: "날개벽 철거", spec: "조적벽 1겹 기준", unit: "m", qty: 1, unitPrice: 300000, amount: 300000 },
  { cat: "extension", name: "바닥 난방배관 연결", unit: "식", qty: 1, unitPrice: 400000, amount: 400000 },
  { cat: "extension", name: "바닥 미장", unit: "식", qty: 1, unitPrice: 400000, amount: 400000 },
  { cat: "extension", name: "4면 단열공사", spec: "아이소핑크, 온도리", unit: "식", qty: 1, unitPrice: 800000, amount: 800000, memo: "바닥 아이소핑크·온도리/벽 아이소핑크" },
  { cat: "extension", name: "확장 기타", amount: 250000 },
  // 4) 샤시공사 6,500,000
  { cat: "windows", name: "샤시 일괄(KCC 제품 기준)", spec: "외창 뉴프라임 복층로이 26mm 자동손잡이+내창 복층 24mm [E-MAX Club Platinum]", unit: "식", qty: 1, amount: 6500000, memo: "실측 후 상세 견적 변동" },
  // 5) 설비공사 300,000
  { cat: "plumbing", name: "가스 배관 철거", unit: "식", qty: 1, unitPrice: 150000, amount: 150000 },
  { cat: "plumbing", name: "주방수도 내림", unit: "식", qty: 1, unitPrice: 150000, amount: 150000 },
  { cat: "plumbing", name: "스탠드 에어컨 선배관", spec: "2 in 1 기준", unit: "식", unitPrice: 550000, amount: 0, memo: "미정", isOption: true },
  { cat: "plumbing", name: "욕실 환풍기 설비", spec: "벽풍기→천정형 변경", unit: "식", unitPrice: 80000, amount: 0, memo: "현장상황 체크", isOption: true },
  { cat: "plumbing", name: "라디에이터 철거", unit: "식", unitPrice: 150000, amount: 0, isOption: true },
  // 6) 전기공사 3,662,000
  { cat: "electric", name: "매립조명", spec: "3인치 주백색", unit: "ea", qty: 25, unitPrice: 8000, amount: 200000, memo: "2인치 단가 동일/타공비 포함" },
  { cat: "electric", name: "엣지 면조명", spec: "540×540 주백색", unit: "ea", qty: 3, unitPrice: 80000, amount: 240000 },
  { cat: "electric", name: "신발장 간접조명", spec: "T5", unit: "식", qty: 1, unitPrice: 70000, amount: 70000 },
  { cat: "electric", name: "주방 상부장 간접조명", spec: "LED 바", unit: "식", qty: 1, unitPrice: 150000, amount: 150000 },
  { cat: "electric", name: "욕실 간접조명", spec: "LED 바", unit: "식", qty: 1, unitPrice: 150000, amount: 150000 },
  { cat: "electric", name: "베란다 조명", spec: "원형 직부등", unit: "ea", qty: 2, unitPrice: 30000, amount: 60000 },
  { cat: "electric", name: "콘센트/스위치 교체", spec: "르그랑 아펠라 화이트", unit: "py", qty: 24, unitPrice: 15000, amount: 360000, memo: "감지기 포함" },
  { cat: "electric", name: "등기구 시공비", unit: "품", qty: 2, unitPrice: 350000, amount: 700000 },
  { cat: "electric", name: "전기 배선비", unit: "품", qty: 2, unitPrice: 350000, amount: 700000 },
  { cat: "electric", name: "배선 자재비", unit: "py", qty: 24, unitPrice: 18000, amount: 432000, memo: "콘센트/SW 신설·이설 시 1구당 8만원" },
  { cat: "electric", name: "분전함 교체", unit: "식", qty: 1, unitPrice: 250000, amount: 250000 },
  { cat: "electric", name: "인덕션 단독배선", spec: "4SQ", unit: "식", qty: 1, unitPrice: 350000, amount: 350000 },
  { cat: "electric", name: "인터넷 공사", unit: "ea", unitPrice: 100000, amount: 0, memo: "1개소당/콘센트 까대기 별도", isOption: true },
  // 7) 목공사 1,376,000
  { cat: "carpentry", name: "천장몰딩", spec: "마이너스 몰딩 or 평몰딩 40mm", unit: "식", qty: 24, unitPrice: 24000, amount: 576000 },
  { cat: "carpentry", name: "9mm 문선 마감", unit: "식", qty: 4, unitPrice: 150000, amount: 600000 },
  { cat: "carpentry", name: "벽장 마감", spec: "석고 떡가베 or 미장마감", unit: "식", qty: 1, unitPrice: 200000, amount: 200000 },
  // 7-1) 도어공사 3,030,000
  { cat: "door", name: "문 및 문틀 교체", spec: "영림/ABS", unit: "식", qty: 4, unitPrice: 530000, amount: 2120000 },
  { cat: "door", name: "손잡이", spec: "도무스 905ss", unit: "식", qty: 4, unitPrice: 40000, amount: 160000 },
  { cat: "door", name: "현관 중문", spec: "이노핸즈 3연동 초슬림", unit: "식", unitPrice: 1210000, amount: 0, memo: "추후 고려", isOption: true },
  { cat: "door", name: "터닝도어", spec: "LX 터닝도어/확장부·주방베란다", unit: "식", qty: 1, unitPrice: 750000, amount: 750000 },
  // 8) 타일공사 1,450,000
  { cat: "tile", name: "현관타일", spec: "600각 포세린", unit: "식", qty: 1, unitPrice: 400000, amount: 400000 },
  { cat: "tile", name: "주방타일", spec: "800각 포세린", unit: "식", qty: 1, unitPrice: 700000, amount: 700000, memo: "싱크대 너비 3m 미만 기준" },
  { cat: "tile", name: "베란다 타일", spec: "300각 자기질", unit: "식", qty: 1, unitPrice: 350000, amount: 350000 },
  // 9-1) 거실 욕실공사 5,549,000 (안방 욕실 제외)
  { cat: "bathroom", name: "천장공사", spec: "SMC 평돔천정", unit: "식", qty: 1, unitPrice: 250000, amount: 250000 },
  { cat: "bathroom", name: "세면기", spec: "대림바스 DL-522", unit: "식", qty: 1, unitPrice: 210000, amount: 210000 },
  { cat: "bathroom", name: "양변기/투피스", spec: "아메리칸 스탠다드 웨이브 R 치마형", unit: "식", qty: 1, unitPrice: 300000, amount: 300000 },
  { cat: "bathroom", name: "샤워파티션", spec: "유리파티션", unit: "식", qty: 1, unitPrice: 300000, amount: 300000 },
  { cat: "bathroom", name: "세면수전", spec: "DOT N340 비반트", unit: "식", qty: 1, unitPrice: 80000, amount: 80000 },
  { cat: "bathroom", name: "샤워수전", spec: "S-VAR600 비반트", unit: "식", qty: 1, unitPrice: 150000, amount: 150000 },
  { cat: "bathroom", name: "슬라이더바", spec: "VA 307 비반트", unit: "식", qty: 1, unitPrice: 80000, amount: 80000 },
  { cat: "bathroom", name: "거울 수건장", spec: "슬라이딩 거울 수건장", unit: "식", qty: 1, unitPrice: 250000, amount: 250000 },
  { cat: "bathroom", name: "수건걸이", spec: "DOT N01A", unit: "식", qty: 1, unitPrice: 40000, amount: 40000 },
  { cat: "bathroom", name: "휴지걸이", spec: "DOT N01B", unit: "식", qty: 1, unitPrice: 40000, amount: 40000 },
  { cat: "bathroom", name: "환풍기", spec: "힘펠 C-100LF", unit: "식", qty: 1, unitPrice: 60000, amount: 60000 },
  { cat: "bathroom", name: "배수구", spec: "그릴 유가", unit: "식", qty: 2, unitPrice: 40000, amount: 80000 },
  { cat: "bathroom", name: "대리석 식기", unit: "식", qty: 1, unitPrice: 70000, amount: 70000 },
  { cat: "bathroom", name: "타일 자재비(벽면)", spec: "600×600각 포세린", unit: "m2", qty: 21, unitPrice: 30000, amount: 630000, memo: "에폭시 시공" },
  { cat: "bathroom", name: "타일 자재비(바닥)", spec: "600×600각 포세린", unit: "m2", qty: 6, unitPrice: 30000, amount: 180000 },
  { cat: "bathroom", name: "타일 부자재/건재", unit: "m2", qty: 27, unitPrice: 12000, amount: 324000 },
  { cat: "bathroom", name: "타일 인건비", unit: "m2", qty: 27, unitPrice: 55000, amount: 1485000 },
  { cat: "bathroom", name: "젠다이", spec: "끝까지", unit: "식", qty: 1, unitPrice: 500000, amount: 500000 },
  { cat: "bathroom", name: "젠다이 마감", spec: "졸리컷 마감", unit: "식", qty: 1, unitPrice: 170000, amount: 170000 },
  { cat: "bathroom", name: "집기류 시공비", unit: "품", qty: 1, unitPrice: 350000, amount: 350000 },
  // 10) 필름/도장공사 940,000
  { cat: "film", name: "필름 자재비", spec: "현관 방화문 내부면, 9mm 문선", unit: "m", qty: 10, unitPrice: 16000, amount: 160000, memo: "솔리드 필름 기준" },
  { cat: "film", name: "필름 인건비", unit: "품", qty: 1, unitPrice: 330000, amount: 330000, memo: "부자재비용 포함" },
  { cat: "film", name: "수성 페인트", unit: "식", qty: 1, unitPrice: 450000, amount: 450000, memo: "최소시공금액 45만원" },
  // 11) 바닥공사 1,968,000
  { cat: "flooring", name: "장판", spec: "LX장판 2.2T", unit: "py", qty: 24, unitPrice: 53000, amount: 1272000, memo: "로스율 20% 반영" },
  { cat: "flooring", name: "걸레받이", spec: "4전 걸레받이", unit: "py", qty: 24, unitPrice: 22000, amount: 528000 },
  { cat: "flooring", name: "기존 바닥재 철거", spec: "기존 장판 1겹 기준", unit: "py", qty: 24, unitPrice: 7000, amount: 168000, memo: "실측·철거 당일 재견적 산출" },
  // 12) 도배공사 3,512,640
  { cat: "wallpaper", name: "자재비", spec: "베스트 실크", unit: "py", qty: 24, unitPrice: 135360, amount: 3248640, memo: "실크/퍼티 1회 포함, 확장평수 포함" },
  { cat: "wallpaper", name: "부자재", unit: "py", qty: 24, unitPrice: 11000, amount: 264000 },
  // 13) 가구공사 7,218,400
  { cat: "furniture", name: "싱크대 상부장", spec: "PET 무광도어 E0", unit: "m", qty: 3.7, unitPrice: 221000, amount: 817700, memo: "가구깊이 300 이하" },
  { cat: "furniture", name: "싱크대 하부장", spec: "PET 무광도어 E0", unit: "m", qty: 3.7, unitPrice: 221000, amount: 817700, memo: "가구깊이 600 이하" },
  { cat: "furniture", name: "싱크대 인조대리석", spec: "LX 하이막스 12T 001~499", unit: "m", qty: 3.7, unitPrice: 216000, amount: 799200, memo: "깊이 760 이하" },
  { cat: "furniture", name: "가구 시공비", unit: "m", qty: 7.4, unitPrice: 37000, amount: 273800 },
  { cat: "furniture", name: "빌트인후드", spec: "하츠 IB 60S 전동댐퍼형", unit: "식", qty: 1, unitPrice: 180000, amount: 180000 },
  { cat: "furniture", name: "싱크볼", spec: "백조 GD 860", unit: "식", qty: 1, unitPrice: 310000, amount: 310000, memo: "올스텐 배수구 70,000원 추가" },
  { cat: "furniture", name: "가열대", spec: "가스렌지/인덕션", unit: "식", unitPrice: 230000, amount: 0, memo: "소비자 직접구매", isOption: true },
  { cat: "furniture", name: "싱크수전", spec: "JT-A300(B)", unit: "식", qty: 1, unitPrice: 150000, amount: 150000 },
  { cat: "furniture", name: "서라운딩", spec: "싱크대 3m당 1개", unit: "식", qty: 2, unitPrice: 60000, amount: 120000 },
  { cat: "furniture", name: "EP(상하부장)", spec: "가구 측면 마감", unit: "식", qty: 1, unitPrice: 130000, amount: 130000 },
  { cat: "furniture", name: "냉장고장", spec: "PET 무광도어 E0", unit: "m", qty: 1, unitPrice: 260000, amount: 260000 },
  { cat: "furniture", name: "EP(키큰장·냉장고장)", spec: "가구 측면 마감", unit: "식", qty: 2, unitPrice: 160000, amount: 320000 },
  { cat: "furniture", name: "붙박이장", spec: "PET 무광도어 E0(여닫이)", unit: "자", qty: 13, unitPrice: 180000, amount: 2340000, memo: "슬라이딩 희망 시 자당 30,000원 추가" },
  { cat: "furniture", name: "신발장", spec: "PET 무광도어 E0(여닫이)", unit: "자", qty: 3, unitPrice: 180000, amount: 540000, memo: "하부띄움 기본/오픈박스 50,000원 추가" },
  { cat: "furniture", name: "EP(신발장)", spec: "가구 측면 마감", unit: "식", qty: 1, unitPrice: 160000, amount: 160000 },
  // 14) 기타공사 1,704,000
  { cat: "etc", name: "현관 방화문 부속교체", spec: "도어체크, 말발굽, 안전고리", unit: "식", qty: 1, unitPrice: 100000, amount: 100000 },
  { cat: "etc", name: "준공청소", unit: "py", qty: 24, unitPrice: 21000, amount: 504000 },
  { cat: "etc", name: "실리콘 마감", unit: "식", qty: 1, unitPrice: 300000, amount: 300000 },
  { cat: "etc", name: "마감폐자재 반출", unit: "차", qty: 2, unitPrice: 300000, amount: 600000 },
  { cat: "etc", name: "폐자재반출 인건비", unit: "품", qty: 1, unitPrice: 200000, amount: 200000 },
];

// ───── 박목수의 열린 견적서 (상계은빛2단지 25평형/81㎡) ─────
// 상세내역 이미지가 저해상도라 공사별 합계만 등록 (합계는 요약표 기준으로 정확)
const PARK_LINES: Line[] = [
  { cat: "extension", name: "확장공사 일괄", unit: "식", qty: 1, amount: 3090000, memo: "철거·단열재·방화문 포함" },
  { cat: "windows", name: "창호공사 일괄", spec: "KCC창호 9,500,000 + 터닝도어", unit: "식", qty: 1, amount: 10300000 },
  { cat: "door", name: "도어공사 일괄", spec: "중문(스윙) 1,200,000 + ABS도어 등", unit: "식", qty: 1, amount: 3295000 },
  { cat: "bathroom", name: "도기공사 일괄", spec: "세면도기·양변기 등", unit: "식", qty: 1, amount: 770000 },
  { cat: "tile", name: "타일공사 일괄", spec: "욕실 600각·현관·주방·발코니, 인건비 포함", unit: "식", qty: 1, amount: 4276000 },
  { cat: "bathroom", name: "수전공사 일괄", spec: "수전·액세서리·SMC천장 등", unit: "식", qty: 1, amount: 1157000 },
  { cat: "furniture", name: "가구공사 일괄", spec: "싱크대·신발장·냉장고장 등", unit: "식", qty: 1, amount: 6715000 },
  { cat: "electric", name: "전기공사 일괄", unit: "식", qty: 1, amount: 1335000 },
  { cat: "electric", name: "조명공사 일괄", spec: "매입등(6W LED)×20 등", unit: "식", qty: 1, amount: 812000 },
  { cat: "film", name: "도장공사 일괄", spec: "친환경 수성페인트", unit: "식", qty: 1, amount: 430000 },
  { cat: "film", name: "시트공사 일괄", unit: "식", qty: 1, amount: 210000 },
  { cat: "flooring", name: "바닥공사 일괄", spec: "강마루 150,000×21평 + 걸레받이", unit: "식", qty: 1, amount: 3230000 },
  { cat: "wallpaper", name: "도배공사 일괄", spec: "실크벽지(LX·신한) 11,000×65롤 + 인건비", unit: "식", qty: 1, amount: 2449500 },
  { cat: "carpentry", name: "목공사 일괄", spec: "문선·몰딩(영림·예림)·석고보드 등", unit: "식", qty: 1, amount: 1916500 },
  { cat: "demolition", name: "철거공사 일괄", spec: "욕실·방수 1,2차 포함", unit: "식", qty: 1, amount: 3290000 },
  { cat: "etc", name: "기타공사 일괄", spec: "입주청소·보양 등", unit: "식", qty: 1, amount: 1950000, memo: "이미지 판독 불확실 — 공사비 합계(45,226,000) 기준 역산, 원본 대조 필요" },
];

async function main() {
  const categories = await prisma.category.findMany();
  const idOf = new Map(categories.map((c) => [c.key, c.id]));

  const createVendor = async (
    data: Parameters<typeof prisma.vendor.create>[0]["data"],
    lines: Line[],
    statuses: { cat: string; status: string; memo?: string }[]
  ) => {
    const vendor = await prisma.vendor.create({ data });
    await prisma.lineItem.createMany({
      data: lines.map((l) => ({
        vendorId: vendor.id,
        categoryId: idOf.get(l.cat)!,
        name: l.name,
        spec: l.spec ?? null,
        unit: l.unit ?? null,
        qty: l.qty ?? null,
        unitPrice: l.unitPrice ?? null,
        amount: l.amount,
        memo: l.memo ?? null,
        isOption: l.isOption ?? false,
      })),
    });
    for (const s of statuses) {
      await prisma.quoteItem.create({
        data: {
          vendorId: vendor.id,
          categoryId: idOf.get(s.cat)!,
          status: s.status,
          memo: s.memo ?? null,
        },
      });
    }
    return vendor;
  };

  await createVendor(
    {
      name: "모빌인테리어",
      memo: "상계은빛2단지 24평형 · 2026-09-16 견적 · 예상 견적(실측 후 변동)",
      vatIncluded: false,
      pyeong: 24,
      overheadPercent: 4,
      overheadLabel: "공과잡비",
      adjustment: 0,
    },
    MOBIL_LINES,
    []
  );

  await createVendor(
    {
      name: "박목수의 열린견적",
      memo: "상계은빛2단지 25평형(81㎡) · 상세내역은 요약 수준으로 등록",
      vatIncluded: false,
      pyeong: 25,
      overheadPercent: 7,
      overheadLabel: "이윤",
      adjustment: -1820,
      periodDays: 40,
    },
    PARK_LINES,
    [
      { cat: "scaffold", status: "UNKNOWN", memo: "견적서에 가설·신고 항목 없음 — 확인 필요" },
      { cat: "plumbing", status: "UNKNOWN", memo: "설비 공사 별도 항목 없음(방수는 철거에 포함) — 확인 필요" },
    ]
  );

  console.log("Seeded 2 real demo vendors");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
