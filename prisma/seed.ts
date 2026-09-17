import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES: { key: string; name: string; subs: string[] }[] = [
  { key: "demolition", name: "철거·폐기물 처리", subs: ["전체 철거", "폐기물 처리", "보양"] },
  { key: "windows", name: "샷시(창호)", subs: ["거실 샷시", "방 샷시", "발코니 샷시"] },
  { key: "plumbing", name: "설비(배관·난방)", subs: ["배관 교체", "보일러", "수전·배수"] },
  { key: "electric", name: "전기·조명", subs: ["배선 교체", "조명 기구", "스위치·콘센트"] },
  { key: "carpentry", name: "목공(문·몰딩·가벽)", subs: ["방문 교체", "몰딩·걸레받이", "가벽·목작업"] },
  { key: "tile", name: "타일", subs: ["바닥 타일", "벽 타일", "현관·발코니 타일"] },
  { key: "bathroom", name: "욕실(도기·방수)", subs: ["도기(변기·세면대)", "방수", "욕실 타일", "수전·액세서리"] },
  { key: "kitchen", name: "주방(싱크대·상판)", subs: ["싱크대 상·하부장", "상판", "후드·쿡탑"] },
  { key: "wallpaper", name: "도배·도장·필름", subs: ["도배", "필름", "도장"] },
  { key: "flooring", name: "바닥(마루·장판)", subs: ["거실·방 바닥", "현관·주방 바닥"] },
  { key: "cleaning", name: "입주청소·보양", subs: ["입주청소"] },
  { key: "management", name: "감리·현장관리비", subs: ["현장 관리비"] },
  { key: "etc", name: "기타", subs: [] },
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
