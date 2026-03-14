import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.record.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete record:", error);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as { isPublic?: unknown } | null;
    if (!body || typeof body.isPublic !== "boolean") {
      return NextResponse.json({ error: "Missing isPublic" }, { status: 400 });
    }

    const record = await prisma.record.update({
      where: { id },
      data: { isPublic: body.isPublic },
    });
    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    console.error("Failed to update record visibility:", error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}
