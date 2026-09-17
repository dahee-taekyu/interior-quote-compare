import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 실제 견적서 2종(박목수 열린견적, 모빌인테리어)의 공사 구조 교집합 기반 표준 공사 체계
const CATEGORIES: { key: string; name: string; subs: string[] }[] = [
  { key: "scaffold", name: "가설·신고", subs: ["공사 신고·행위허가", "입주민 동의", "승강기·동선 보양"] },
  { key: "demolition", name: "철거·폐기물", subs: ["욕실 철거", "싱크대·가구 철거", "바닥재 철거", "몰딩·문틀 철거", "폐기물 처리"] },
  { key: "extension", name: "확장·단열", subs: ["확장 철거", "난방배관 연결", "바닥 미장", "단열 공사"] },
  { key: "windows", name: "샤시(창호)", subs: ["외창 샤시", "내창 샤시", "발코니 샤시"] },
  { key: "door", name: "도어·중문", subs: ["방문·문틀 교체", "현관 중문", "터닝도어", "손잡이·부속"] },
  { key: "carpentry", name: "목공", subs: ["천장·몰딩", "문선 마감", "가벽·벽장 마감", "석고보드 작업"] },
  { key: "plumbing", name: "설비(배관·난방·환기)", subs: ["배관 공사", "보일러·난방", "환기·환풍기", "에어컨 배관"] },
  { key: "electric", name: "전기·조명", subs: ["배선·분전함", "콘센트·스위치", "매립·간접 조명", "방등·주방등·현관등"] },
  { key: "tile", name: "타일", subs: ["현관 타일", "주방 타일", "베란다 타일"] },
  { key: "bathroom", name: "욕실", subs: ["도기(양변기·세면기)", "수전·샤워기", "욕실 타일·방수", "천장(SMC·돔)", "액세서리·거울", "젠다이·파티션"] },
  { key: "furniture", name: "주방·가구", subs: ["싱크대 상·하부장", "상판·싱크볼", "후드·쿡탑", "붙박이장", "신발장", "냉장고장"] },
  { key: "wallpaper", name: "도배", subs: ["벽지(실크·합지)", "부자재·인건비"] },
  { key: "film", name: "도장·필름", subs: ["필름(시트)", "도장(페인트)"] },
  { key: "flooring", name: "바닥(마루·장판)", subs: ["마루·장판 시공", "걸레받이"] },
  { key: "etc", name: "기타(청소·보양·잡비)", subs: ["입주·준공 청소", "실리콘 마감", "폐자재 반출", "공과잡비"] },
];

async function main() {
  for (const [i, c] of CATEGORIES.entries()) {
    const category = await prisma.category.upsert({
      where: { key: c.key },
      update: { name: c.name, order: i },
      create: { key: c.key, name: c.name, order: i },
    });
    for (const [j, sub] of c.subs.entries()) {
      const exists = await prisma.subItemTemplate.findFirst({
        where: { categoryId: category.id, name: sub },
      });
      if (!exists) {
        await prisma.subItemTemplate.create({
          data: { categoryId: category.id, name: sub, order: j },
        });
      }
    }
  }
  console.log(`Seeded ${CATEGORIES.length} categories with sub-item templates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
