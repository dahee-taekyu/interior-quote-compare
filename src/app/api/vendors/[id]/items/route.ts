import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const STATUSES = new Set(["INCLUDED", "EXCLUDED", "BUNDLED", "UNKNOWN"]);

/** 업체 하나의 공정별 견적을 통째로 upsert */
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const vendorId = Number(id);
  const body = await req.json();
  const items: unknown[] = Array.isArray(body.items) ? body.items : [];

  for (const raw of items) {
    const it = raw as {
      categoryId: number;
      status: string;
      amount: number;
      detail?: string;
      memo?: string;
    };
    if (!STATUSES.has(it.status)) {
      return NextResponse.json({ error: `invalid status: ${it.status}` }, { status: 400 });
    }
    const data = {
      status: it.status,
      amount: Math.max(0, Math.round(Number(it.amount) || 0)),
      detail: it.detail?.trim() || null,
      memo: it.memo?.trim() || null,
    };
    await prisma.quoteItem.upsert({
      where: { vendorId_categoryId: { vendorId, categoryId: it.categoryId } },
      update: data,
      create: { vendorId, categoryId: it.categoryId, ...data },
    });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { items: true },
  });
  return NextResponse.json(vendor);
}
