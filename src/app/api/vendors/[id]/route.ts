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
    },
    include: { items: true },
  });
  return NextResponse.json(vendor);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.vendor.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
