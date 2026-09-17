import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: "asc" },
    include: { items: true },
  });
  return NextResponse.json(vendors);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const vendor = await prisma.vendor.create({
    data: {
      name,
      contact: body.contact ? String(body.contact) : null,
      memo: body.memo ? String(body.memo) : null,
      vatIncluded: body.vatIncluded ?? true,
    },
    include: { items: true },
  });
  return NextResponse.json(vendor, { status: 201 });
}
