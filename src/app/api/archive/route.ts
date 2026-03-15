import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const records = await prisma.record.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error("Failed to fetch records:", error);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { initialMood, moodCategory, healingMessage, movieTitle } = body;

    const record = await prisma.record.create({
      data: {
        initialMood,
        moodCategory,
        healingMessage,
        movieTitle,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to create record:", error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, userMemo } = body;

    const record = await prisma.record.update({
      where: { id },
      data: { userMemo },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to update record:", error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}
