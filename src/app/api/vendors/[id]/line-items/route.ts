import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * 업체의 세부항목을 통째로 교체한다.
 * body.categoryId가 있으면 그 공정만, 없으면 업체 전체를 교체.
 * items: [{ categoryId, name, amount, memo? }]
 */
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const vendorId = Number(id);
  const body = await req.json();
  const items: { categoryId: number; name: string; amount: number; memo?: string }[] =
    Array.isArray(body.items) ? body.items : [];
  const scopeCategoryId: number | undefined =
    typeof body.categoryId === "number" ? body.categoryId : undefined;

  const cleaned = items
    .map((it) => ({
      categoryId: Number(it.categoryId),
      name: String(it.name ?? "").trim(),
      amount: Math.max(0, Math.round(Number(it.amount) || 0)),
      memo: it.memo?.trim() || null,
    }))
    .filter((it) => it.name && it.amount > 0);

  await prisma.$transaction([
    prisma.lineItem.deleteMany({
      where: { vendorId, ...(scopeCategoryId !== undefined && { categoryId: scopeCategoryId }) },
    }),
    prisma.lineItem.createMany({
      data: cleaned.map((it) => ({ vendorId, ...it })),
    }),
  ]);

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { items: true, lineItems: true },
  });
  return NextResponse.json(vendor);
}
