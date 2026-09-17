import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const STATUSES = new Set(["INCLUDED", "EXCLUDED", "BUNDLED", "UNKNOWN"]);

/** 업체의 대공정 상태(미포함/묶임/확인필요)를 upsert. 금액은 line-items 라우트에서 다룬다 */
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const vendorId = Number(id);
  const body = await req.json();
  const items: unknown[] = Array.isArray(body.items) ? body.items : [];

  for (const raw of items) {
    const it = raw as { categoryId: number; status: string; memo?: string };
    if (!STATUSES.has(it.status)) {
      return NextResponse.json({ error: `invalid status: ${it.status}` }, { status: 400 });
    }
    const data = { status: it.status, memo: it.memo?.trim() || null };
    await prisma.quoteItem.upsert({
      where: { vendorId_categoryId: { vendorId, categoryId: it.categoryId } },
      update: data,
      create: { vendorId, categoryId: it.categoryId, ...data },
    });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { items: true, lineItems: true },
  });
  return NextResponse.json(vendor);
}
