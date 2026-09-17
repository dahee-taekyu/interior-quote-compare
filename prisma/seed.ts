import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { key: "demolition", name: "철거·폐기물 처리" },
  { key: "windows", name: "샷시(창호)" },
  { key: "plumbing", name: "설비(배관·난방)" },
  { key: "electric", name: "전기·조명" },
  { key: "carpentry", name: "목공(문·몰딩·가벽)" },
  { key: "tile", name: "타일" },
  { key: "bathroom", name: "욕실(도기·방수)" },
  { key: "kitchen", name: "주방(싱크대·상판)" },
  { key: "wallpaper", name: "도배·도장·필름" },
  { key: "flooring", name: "바닥(마루·장판)" },
  { key: "cleaning", name: "입주청소·보양" },
  { key: "management", name: "감리·현장관리비" },
];

async function main() {
  for (const [i, c] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { key: c.key },
      update: { name: c.name, order: i },
      create: { ...c, order: i },
    });
  }
  console.log(`Seeded ${CATEGORIES.length} categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
