import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const vendor = await prisma.vendor.update({
    where: { id: Number(id) },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.contact !== undefined && { contact: body.contact || null }),
      ...(body.memo !== undefined && { memo: body.memo || null }),
      ...(body.vatIncluded !== undefined && { vatIncluded: !!body.vatIncluded }),
      ...(body.pyeong !== undefined && { pyeong: body.pyeong ? Number(body.pyeong) : null }),
      ...(body.overheadPercent !== undefined && {
        overheadPercent: body.overheadPercent ? Number(body.overheadPercent) : null,
      }),
      ...(body.overheadLabel !== undefined && { overheadLabel: body.overheadLabel || null }),
      ...(body.adjustment !== undefined && { adjustment: Math.round(Number(body.adjustment) || 0) }),
      ...(body.periodDays !== undefined && {
        periodDays: body.periodDays ? Math.round(Number(body.periodDays)) : null,
      }),
    },
    include: { items: true, lineItems: true },
  });
  return NextResponse.json(vendor);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.vendor.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
