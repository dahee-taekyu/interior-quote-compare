import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const max = await prisma.category.aggregate({ _max: { order: true } });
  const category = await prisma.category.create({
    data: {
      key: `custom-${Date.now()}`,
      name,
      order: (max._max.order ?? 0) + 1,
    },
  });
  return NextResponse.json(category, { status: 201 });
}
